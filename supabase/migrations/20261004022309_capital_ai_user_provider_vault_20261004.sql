-- CAPITAL-AI BYOK: user-owned provider credentials.
-- Secrets are encrypted in Supabase Vault and are only reachable through service_role RPCs.
-- This scope never grants public market-data, redistribution, cache or JetStream rights.

create table if not exists private.user_provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider = 'kraken'),
  vault_secret_id uuid not null unique,
  vault_secret_name text not null unique,
  credential_fingerprint text not null check (credential_fingerprint ~ '^[0-9a-f]{16,64}$'),
  data_scope text not null default 'USER_PRIVATE_ACCOUNT_DATA'
    check (data_scope = 'USER_PRIVATE_ACCOUNT_DATA'),
  redistribution_allowed boolean not null default false
    check (redistribution_allowed = false),
  public_display_allowed boolean not null default false
    check (public_display_allowed = false),
  shared_cache_allowed boolean not null default false
    check (shared_cache_allowed = false),
  jetstream_publication_allowed boolean not null default false
    check (jetstream_publication_allowed = false),
  permissions jsonb not null default '{}'::jsonb
    check (jsonb_typeof(permissions) = 'object'),
  status text not null default 'PENDING'
    check (status in ('PENDING','VERIFIED','INVALID','REVOKED')),
  last_verified_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists user_provider_connections_user_id_idx
  on private.user_provider_connections (user_id);

revoke all on private.user_provider_connections from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.user_provider_connections to service_role;

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
  if _provider <> 'kraken' then
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

create or replace function public.capital_ai_get_user_provider_secret(
  _user_id uuid,
  _provider text
)
returns jsonb
language sql
security definer
set search_path = pg_catalog
stable
as $$
  select jsonb_build_object(
    'connectionId', c.id,
    'provider', c.provider,
    'secretPayload', v.decrypted_secret,
    'credentialFingerprint', c.credential_fingerprint,
    'permissions', c.permissions,
    'status', c.status,
    'dataScope', c.data_scope
  )
  from private.user_provider_connections c
  join vault.decrypted_secrets v on v.id = c.vault_secret_id
  where c.user_id = _user_id and c.provider = _provider
  limit 1
$$;

create or replace function public.capital_ai_list_user_provider_connections(
  _user_id uuid
)
returns jsonb
language sql
security definer
set search_path = pg_catalog
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'provider', c.provider,
        'credentialFingerprint', c.credential_fingerprint,
        'permissions', c.permissions,
        'status', c.status,
        'dataScope', c.data_scope,
        'lastVerifiedAt', c.last_verified_at,
        'lastErrorCode', c.last_error_code,
        'updatedAt', c.updated_at
      )
      order by c.provider
    ),
    '[]'::jsonb
  )
  from private.user_provider_connections c
  where c.user_id = _user_id
$$;

create or replace function public.capital_ai_mark_user_provider_status(
  _user_id uuid,
  _provider text,
  _status text,
  _error_code text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if _status not in ('PENDING','VERIFIED','INVALID','REVOKED') then
    raise exception 'INVALID_STATUS';
  end if;

  update private.user_provider_connections
     set status = _status,
         last_verified_at = case when _status = 'VERIFIED' then pg_catalog.now() else last_verified_at end,
         last_error_code = _error_code,
         updated_at = pg_catalog.now()
   where user_id = _user_id and provider = _provider;

  if not found then
    raise exception 'CONNECTION_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.capital_ai_delete_user_provider_secret(
  _user_id uuid,
  _provider text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  _secret_id uuid;
begin
  delete from private.user_provider_connections
   where user_id = _user_id and provider = _provider
   returning vault_secret_id into _secret_id;

  if _secret_id is not null then
    delete from vault.secrets where id = _secret_id;
  end if;
end;
$$;

revoke all on function public.capital_ai_upsert_user_provider_secret(uuid,text,text,text,jsonb)
  from public, anon, authenticated;
revoke all on function public.capital_ai_get_user_provider_secret(uuid,text)
  from public, anon, authenticated;
revoke all on function public.capital_ai_list_user_provider_connections(uuid)
  from public, anon, authenticated;
revoke all on function public.capital_ai_mark_user_provider_status(uuid,text,text,text)
  from public, anon, authenticated;
revoke all on function public.capital_ai_delete_user_provider_secret(uuid,text)
  from public, anon, authenticated;

grant execute on function public.capital_ai_upsert_user_provider_secret(uuid,text,text,text,jsonb)
  to service_role;
grant execute on function public.capital_ai_get_user_provider_secret(uuid,text)
  to service_role;
grant execute on function public.capital_ai_list_user_provider_connections(uuid)
  to service_role;
grant execute on function public.capital_ai_mark_user_provider_status(uuid,text,text,text)
  to service_role;
grant execute on function public.capital_ai_delete_user_provider_secret(uuid,text)
  to service_role;
