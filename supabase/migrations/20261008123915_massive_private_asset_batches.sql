-- Massive/Polygon joins the existing user-owned Vault.
-- Does not grant public market-data or trading rights. Private cache is server-only.
alter table private.user_provider_connections
  drop constraint if exists user_provider_connections_provider_check;

alter table private.user_provider_connections
  add constraint user_provider_connections_provider_check
  check (provider in ('kraken','binance','massive'));

create or replace function public.capital_ai_upsert_user_provider_secret(
  _user_id uuid,
  _provider text,
  _secret_payload text,
  _credential_fingerprint text,
  _permissions jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  _connection private.user_provider_connections%rowtype;
  _secret_id uuid;
  _secret_name text;
begin
  if _user_id is null or not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'INVALID_USER';
  end if;
  if _provider not in ('kraken','binance','massive') then
    raise exception 'UNSUPPORTED_PROVIDER';
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
   where user_id = _user_id and provider = _provider
   for update;

  _secret_name := 'capital-ai-user-provider:' || _user_id::text || ':' || _provider;

  if found then
    perform vault.update_secret(
      _connection.vault_secret_id,
      _secret_payload,
      _secret_name,
      'CAPITAL-AI user-owned provider credential; never expose to browser or logs'
    );
    _secret_id := _connection.vault_secret_id;

    update private.user_provider_connections
       set credential_fingerprint = _credential_fingerprint,
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
      user_id, provider, vault_secret_id, vault_secret_name,
      credential_fingerprint, permissions
    ) values (
      _user_id, _provider, _secret_id, _secret_name,
      _credential_fingerprint, _permissions
    );
  end if;

  return jsonb_build_object(
    'provider', _provider,
    'status', 'PENDING',
    'credentialFingerprint', _credential_fingerprint,
    'dataScope', 'USER_PRIVATE_ACCOUNT_DATA'
  );
end;
$$;

revoke all on function public.capital_ai_upsert_user_provider_secret(uuid,text,text,text,jsonb)
  from public, anon, authenticated;

grant execute on function public.capital_ai_upsert_user_provider_secret(uuid,text,text,text,jsonb)
  to service_role;
