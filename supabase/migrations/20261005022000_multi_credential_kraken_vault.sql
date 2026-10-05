-- CAPITAL-AI multi-credential Kraken vault.
-- Supports separate user-owned credentials for Spot REST, private Spot WebSocket/Auth and Futures.
-- No credential value is exposed to browser responses; secrets remain in Supabase Vault.

begin;

alter table private.user_provider_connections
  add column if not exists credential_slot text not null default 'spot_rest',
  add column if not exists key_name text not null default 'Kraken Spot REST';

alter table private.user_provider_connections
  drop constraint if exists user_provider_connections_user_id_provider_key;

drop index if exists private.user_provider_connections_user_id_provider_key;

alter table private.user_provider_connections
  drop constraint if exists user_provider_connections_credential_slot_check,
  add constraint user_provider_connections_credential_slot_check
    check (credential_slot in ('spot_rest', 'spot_websocket', 'futures'));

alter table private.user_provider_connections
  drop constraint if exists user_provider_connections_key_name_check,
  add constraint user_provider_connections_key_name_check
    check (
      length(btrim(key_name)) between 1 and 80
      and key_name !~ '[[:cntrl:]]'
    );

create unique index if not exists user_provider_connections_user_provider_slot_key
  on private.user_provider_connections (user_id, provider, credential_slot);

create or replace function public.capital_ai_upsert_user_provider_secret_v2(
  _user_id uuid,
  _provider text,
  _credential_slot text,
  _key_name text,
  _secret_payload text,
  _credential_fingerprint text,
  _permissions jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  _connection private.user_provider_connections%rowtype;
  _secret_id uuid;
  _secret_name text;
begin
  if _user_id is null or not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'INVALID_USER';
  end if;
  if _provider <> 'kraken' then
    raise exception 'UNSUPPORTED_PROVIDER';
  end if;
  if _credential_slot not in ('spot_rest', 'spot_websocket', 'futures') then
    raise exception 'INVALID_CREDENTIAL_SLOT';
  end if;
  if _key_name is null
     or length(btrim(_key_name)) not between 1 and 80
     or _key_name ~ '[[:cntrl:]]' then
    raise exception 'INVALID_KEY_NAME';
  end if;
  if _secret_payload is null or length(_secret_payload) < 32 or length(_secret_payload) > 8192 then
    raise exception 'INVALID_SECRET_PAYLOAD';
  end if;
  if _credential_fingerprint is null or _credential_fingerprint !~ '^[0-9a-f]{16,64}$' then
    raise exception 'INVALID_CREDENTIAL_FINGERPRINT';
  end if;
  if _permissions is null or jsonb_typeof(_permissions) <> 'object' then
    raise exception 'INVALID_PERMISSIONS';
  end if;

  select *
    into _connection
    from private.user_provider_connections
   where user_id = _user_id
     and provider = _provider
     and credential_slot = _credential_slot
   for update;

  _secret_name := 'capital-ai-user-provider:' || _user_id::text || ':' || _provider || ':' || _credential_slot;

  if found then
    perform vault.update_secret(
      _connection.vault_secret_id,
      _secret_payload,
      _secret_name,
      'CAPITAL-AI user-owned provider credential; never expose to browser or logs'
    );
    _secret_id := _connection.vault_secret_id;

    update private.user_provider_connections
       set key_name = btrim(_key_name),
           vault_secret_name = _secret_name,
           credential_fingerprint = _credential_fingerprint,
           permissions = _permissions,
           status = 'PENDING',
           last_verified_at = null,
           last_error_code = null,
           updated_at = pg_catalog.now()
     where id = _connection.id;
  else
    _secret_id := vault.create_secret(
      _secret_payload,
      _secret_name,
      'CAPITAL-AI user-owned provider credential; never expose to browser or logs'
    );

    insert into private.user_provider_connections (
      user_id, provider, credential_slot, key_name,
      vault_secret_id, vault_secret_name,
      credential_fingerprint, permissions
    ) values (
      _user_id, _provider, _credential_slot, btrim(_key_name),
      _secret_id, _secret_name,
      _credential_fingerprint, _permissions
    );
  end if;

  return jsonb_build_object(
    'provider', _provider,
    'credentialSlot', _credential_slot,
    'keyName', btrim(_key_name),
    'status', 'PENDING',
    'credentialFingerprint', _credential_fingerprint,
    'dataScope', 'USER_PRIVATE_ACCOUNT_DATA'
  );
end;
$function$;

create or replace function public.capital_ai_get_user_provider_secret_v2(
  _user_id uuid,
  _provider text,
  _credential_slot text
)
returns jsonb
language sql
stable security definer
set search_path to 'pg_catalog'
as $function$
  select jsonb_build_object(
    'connectionId', c.id,
    'provider', c.provider,
    'credentialSlot', c.credential_slot,
    'keyName', c.key_name,
    'secretPayload', v.decrypted_secret,
    'credentialFingerprint', c.credential_fingerprint,
    'permissions', c.permissions,
    'status', c.status,
    'dataScope', c.data_scope
  )
  from private.user_provider_connections c
  join vault.decrypted_secrets v on v.id = c.vault_secret_id
  where c.user_id = _user_id
    and c.provider = _provider
    and c.credential_slot = _credential_slot
  limit 1
$function$;

create or replace function public.capital_ai_list_user_provider_connections_v2(_user_id uuid)
returns jsonb
language sql
stable security definer
set search_path to 'pg_catalog'
as $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'provider', c.provider,
        'credentialSlot', c.credential_slot,
        'keyName', c.key_name,
        'credentialFingerprint', c.credential_fingerprint,
        'permissions', c.permissions,
        'status', c.status,
        'dataScope', c.data_scope,
        'lastVerifiedAt', c.last_verified_at,
        'lastErrorCode', c.last_error_code,
        'updatedAt', c.updated_at
      )
      order by c.provider, c.credential_slot
    ),
    '[]'::jsonb
  )
  from private.user_provider_connections c
  where c.user_id = _user_id
$function$;

create or replace function public.capital_ai_mark_user_provider_status_v2(
  _user_id uuid,
  _provider text,
  _credential_slot text,
  _status text,
  _error_code text default null
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if _status not in ('PENDING','VERIFIED','INVALID','REVOKED') then
    raise exception 'INVALID_STATUS';
  end if;

  update private.user_provider_connections
     set status = _status,
         last_verified_at = case when _status = 'VERIFIED' then pg_catalog.now() else last_verified_at end,
         last_error_code = _error_code,
         updated_at = pg_catalog.now()
   where user_id = _user_id
     and provider = _provider
     and credential_slot = _credential_slot;

  if not found then
    raise exception 'CONNECTION_NOT_FOUND';
  end if;
end;
$function$;

create or replace function public.capital_ai_delete_user_provider_secret_v2(
  _user_id uuid,
  _provider text,
  _credential_slot text
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  _secret_id uuid;
begin
  delete from private.user_provider_connections
   where user_id = _user_id
     and provider = _provider
     and credential_slot = _credential_slot
   returning vault_secret_id into _secret_id;

  if _secret_id is not null then
    delete from vault.secrets where id = _secret_id;
  end if;
end;
$function$;

revoke all on function public.capital_ai_upsert_user_provider_secret_v2(uuid,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.capital_ai_get_user_provider_secret_v2(uuid,text,text) from public, anon, authenticated;
revoke all on function public.capital_ai_list_user_provider_connections_v2(uuid) from public, anon, authenticated;
revoke all on function public.capital_ai_mark_user_provider_status_v2(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.capital_ai_delete_user_provider_secret_v2(uuid,text,text) from public, anon, authenticated;

grant execute on function public.capital_ai_upsert_user_provider_secret_v2(uuid,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.capital_ai_get_user_provider_secret_v2(uuid,text,text) to service_role;
grant execute on function public.capital_ai_list_user_provider_connections_v2(uuid) to service_role;
grant execute on function public.capital_ai_mark_user_provider_status_v2(uuid,text,text,text,text) to service_role;
grant execute on function public.capital_ai_delete_user_provider_secret_v2(uuid,text,text) to service_role;

commit;
