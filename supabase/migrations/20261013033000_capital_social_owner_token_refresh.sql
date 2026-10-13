-- CAPITAL_AI_SOCIAL_TOKEN_REFRESH@1
-- Additive owner-only credential lifecycle; no browser grants and no publishing authority.
begin;

alter table public.social_media_accounts
  add column if not exists refresh_lease_id uuid,
  add column if not exists refresh_lease_until timestamptz,
  add column if not exists refresh_retry_after timestamptz,
  add column if not exists refresh_reconnect_required boolean not null default false;

-- All RPCs execute as service_role from the signed/JWT-verified Edge workload,
-- NOT as a browser role. SECURITY INVOKER does not bypass RLS.
create or replace function public.capital_social_claim_token_refresh(
  p_user_id uuid, p_platform text, p_lease_id uuid
) returns public.social_media_accounts
language plpgsql security invoker set search_path = ''
as $$
declare v_account public.social_media_accounts%rowtype;
begin
  if p_platform not in ('x','youtube') or p_lease_id is null then
    raise exception 'SOCIAL_REFRESH_CONTEXT_INVALID';
  end if;
  update public.social_media_accounts
     set refresh_lease_id = p_lease_id,
         refresh_lease_until = now() + interval '2 minutes',
         updated_at = now()
   where user_id = p_user_id and platform = p_platform
     and status = 'connected'
     and refresh_reconnect_required = false
     and (refresh_lease_until is null or refresh_lease_until < now())
     and (refresh_retry_after is null or refresh_retry_after < now())
     and token_expires_at < now() + interval '10 minutes'
     and access_token_encrypted like 'v1.%'
     and refresh_token_encrypted like 'v1.%'
  returning * into v_account;
  if not found then raise exception 'SOCIAL_REFRESH_NOT_DUE_OR_LOCKED'; end if;
  return v_account;
end;
$$;

create or replace function public.capital_social_finish_token_refresh(
  p_user_id uuid, p_platform text, p_lease_id uuid,
  p_previous_cipher text, p_access_cipher text, p_refresh_cipher text,
  p_expires_at timestamptz
) returns public.social_media_accounts
language plpgsql security invoker set search_path = ''
as $$
declare v_account public.social_media_accounts%rowtype;
begin
  if p_platform not in ('x','youtube') or p_lease_id is null
     or p_previous_cipher not like 'v1.%'
     or p_access_cipher not like 'v1.%'
     or p_refresh_cipher not like 'v1.%'
     or p_expires_at <= now() + interval '1 minute'
     or p_expires_at >= now() + interval '1 day' then
    raise exception 'SOCIAL_REFRESH_RESULT_INVALID';
  end if;
  update public.social_media_accounts
     set access_token_encrypted = p_access_cipher,
         refresh_token_encrypted = p_refresh_cipher,
         token_expires_at = p_expires_at,
         refresh_lease_id = null,
         refresh_lease_until = null,
         refresh_retry_after = null,
         refresh_reconnect_required = false,
         status = 'connected',
         updated_at = now()
   where user_id = p_user_id and platform = p_platform
     and refresh_lease_id = p_lease_id and refresh_lease_until > now()
     and refresh_token_encrypted = p_previous_cipher
     and status = 'connected'
  returning * into v_account;
  if not found then raise exception 'SOCIAL_REFRESH_CAS_LOST'; end if;
  return v_account;
end;
$$;

create or replace function public.capital_social_end_token_refresh(
  p_user_id uuid, p_platform text, p_lease_id uuid, p_outcome text
) returns public.social_media_accounts
language plpgsql security invoker set search_path = ''
as $$
declare v_account public.social_media_accounts%rowtype;
begin
  if p_platform not in ('x','youtube') or p_lease_id is null
     or p_outcome not in ('reconnect','rate_limited') then
    raise exception 'SOCIAL_REFRESH_OUTCOME_INVALID';
  end if;
  update public.social_media_accounts
     set refresh_lease_id = null,
         refresh_lease_until = null,
         refresh_retry_after = case when p_outcome = 'rate_limited'
           then now() + interval '15 minutes' else null end,
         refresh_reconnect_required = p_outcome = 'reconnect',
         status = case when p_outcome = 'reconnect'
           then 'token_expired' else status end,
         updated_at = now()
   where user_id = p_user_id and platform = p_platform
     and refresh_lease_id = p_lease_id
     and refresh_lease_until > now()
  returning * into v_account;
  if not found then raise exception 'SOCIAL_REFRESH_OUTCOME_CAS_LOST'; end if;
  return v_account;
end;
$$;

revoke all on function public.capital_social_claim_token_refresh(uuid,text,uuid)
  from public, anon, authenticated;
revoke all on function public.capital_social_finish_token_refresh(uuid,text,uuid,text,text,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.capital_social_end_token_refresh(uuid,text,uuid,text)
  from public, anon, authenticated;
grant execute on function public.capital_social_claim_token_refresh(uuid,text,uuid) to service_role;
grant execute on function public.capital_social_finish_token_refresh(uuid,text,uuid,text,text,text,timestamptz) to service_role;
grant execute on function public.capital_social_end_token_refresh(uuid,text,uuid,text) to service_role;
-- Original account SELECT/UPDATE service_role ACL and RLS remain unchanged.
commit;
