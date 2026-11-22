-- SmartClip test-only purchase ledger. Additive schema candidate, NOT applied to production.
-- Gate: only a separate authorized non-production Supabase environment may execute this.
-- SQL is an atomic idempotency boundary; refund tombstones block late success forever.
-- A fresh isolated sandbox may not have the private schema yet.
-- Do not install this candidate in production or on a shared recovery workload.
create schema if not exists private;
create table if not exists private.smartclip_sandbox_entitlements (
  stripe_payment_intent_id text primary key check (stripe_payment_intent_id ~ '^pi_[A-Za-z0-9_]{8,240}$'),
  checkout_session_id text unique check (checkout_session_id is null or checkout_session_id ~ '^cs_test_[A-Za-z0-9_]{8,240}$'),
  user_id uuid,
  release_sha256 text not null check (release_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('paid','revoked')),
  revocation_reason text check (revocation_reason in ('refunded','disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status='paid' and checkout_session_id is not null and user_id is not null and revocation_reason is null)
    or status='revoked'
  )
);
alter table private.smartclip_sandbox_entitlements enable row level security;
revoke all on private.smartclip_sandbox_entitlements from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on private.smartclip_sandbox_entitlements to service_role;

create or replace function public.capital_ai_smartclip_sandbox(
  _action text, _user_id uuid default null, _session_id text default null,
  _payment_intent_id text default null, _release_sha256 text default null,
  _reason text default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  existing private.smartclip_sandbox_entitlements%rowtype;
  canonical_digest constant text := '8c2683d641f28bf466026dff1f4adb0c073bc81564bc0afd4b758a33d7b76512';
begin
  if _action='access' then
    if _user_id is null then raise exception 'invalid_access'; end if;
    return pg_catalog.jsonb_build_object('entitled', exists(
      select 1 from private.smartclip_sandbox_entitlements p
      where p.user_id=_user_id and p.release_sha256=canonical_digest and p.status='paid'
    ));
  end if;
  if _release_sha256 is distinct from canonical_digest or _payment_intent_id is null or
     _payment_intent_id !~ '^pi_[A-Za-z0-9_]{8,240}$' then
    raise exception 'invalid_payment_identity';
  end if;
  if _action='revoke' then
    if _reason not in ('refunded','disputed') then raise exception 'invalid_reversal'; end if;
    -- First-observed reversal creates a durable tombstone; later grants cannot revive it.
    insert into private.smartclip_sandbox_entitlements
      (stripe_payment_intent_id, release_sha256, status, revocation_reason)
    values (_payment_intent_id, canonical_digest, 'revoked', _reason)
    on conflict (stripe_payment_intent_id) do update set
      status='revoked',
      revocation_reason=excluded.revocation_reason,
      updated_at=now();
    return pg_catalog.jsonb_build_object('revoked',true);
  elsif _action='grant' then
    if _user_id is null or _session_id is null or
       _session_id !~ '^cs_test_[A-Za-z0-9_]{8,240}$' then raise exception 'invalid_grant'; end if;
    insert into private.smartclip_sandbox_entitlements
      (stripe_payment_intent_id, checkout_session_id, user_id, release_sha256, status)
    values (_payment_intent_id, _session_id, _user_id, canonical_digest, 'paid')
    on conflict (stripe_payment_intent_id) do nothing;
    select * into existing from private.smartclip_sandbox_entitlements
      where stripe_payment_intent_id=_payment_intent_id for update;
    if not found then raise exception 'grant_unavailable'; end if;
    if existing.status='revoked' then
      return pg_catalog.jsonb_build_object('granted',false,'status','revoked');
    end if;
    if existing.checkout_session_id is distinct from _session_id or
       existing.user_id is distinct from _user_id or
       existing.release_sha256 is distinct from canonical_digest then
      raise exception 'duplicate_payment_identity_conflict';
    end if;
    return pg_catalog.jsonb_build_object('granted',true,'status','paid');
  else
    raise exception 'invalid_action';
  end if;
end
$$;
revoke all on function public.capital_ai_smartclip_sandbox(text,uuid,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.capital_ai_smartclip_sandbox(text,uuid,text,text,text,text)
  to service_role;
