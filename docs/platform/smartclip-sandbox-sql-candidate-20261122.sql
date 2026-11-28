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

-- TEST-only device pairing candidate; no production migration or mobile bearer auth.
-- A device grant is bound to one immutable payment row, never a mutable user-only flag.
create table if not exists private.smartclip_sandbox_devices (
  challenge text primary key check (challenge ~ '^[a-f0-9]{64}$'),
  user_id uuid not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  payment_id text not null references private.smartclip_sandbox_entitlements(stripe_payment_intent_id),
  expires_at timestamptz not null,
  state text not null check (state in ('pending','active','revoked'))
);
alter table private.smartclip_sandbox_devices enable row level security;
revoke all on private.smartclip_sandbox_devices from public, anon, authenticated;
grant select, insert, update, delete on private.smartclip_sandbox_devices to service_role;

create or replace function public.capital_ai_smartclip_sandbox_device(
  _action text, _user_id uuid, _fingerprint text, _challenge text default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  chosen_payment text;
  canonical_digest constant text := '8c2683d641f28bf466026dff1f4adb0c073bc81564bc0afd4b758a33d7b76512';
  now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if _user_id is null or _fingerprint is null or _fingerprint !~ '^[a-f0-9]{64}$' or
     _action is null or _action not in ('challenge','activate','status','revoke') or
     (_action in ('challenge','activate') and (_challenge is null or _challenge !~ '^[a-f0-9]{64}$')) or
     (_action in ('status','revoke') and _challenge is not null) then
    raise exception 'invalid_device_request';
  end if;
  -- Serialize per-user challenge issuance, activation and explicit revocation.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_user_id::text, 916));
  if _action='revoke' then
    update private.smartclip_sandbox_devices set state='revoked'
      where user_id=_user_id and fingerprint=_fingerprint and state<>'revoked';
    return pg_catalog.jsonb_build_object('revoked',true);
  elsif _action='status' then
    return pg_catalog.jsonb_build_object('active', exists(
      select 1 from private.smartclip_sandbox_devices d
      join private.smartclip_sandbox_entitlements p on p.stripe_payment_intent_id=d.payment_id
      where d.user_id=_user_id and d.fingerprint=_fingerprint and d.state='active'
        and p.user_id=_user_id and p.release_sha256=canonical_digest and p.status='paid'));
  elsif _action='challenge' then
    -- Expired unconsumed challenges can be discarded without a scheduler.
    delete from private.smartclip_sandbox_devices where user_id=_user_id and state='pending' and expires_at<=now_at;
    if (select count(*) from private.smartclip_sandbox_devices where user_id=_user_id) >= 32 then
      return pg_catalog.jsonb_build_object('issued',false);
    end if;
    select p.stripe_payment_intent_id into chosen_payment from private.smartclip_sandbox_entitlements p
      where p.user_id=_user_id and p.release_sha256=canonical_digest and p.status='paid'
      order by p.created_at,p.stripe_payment_intent_id limit 1 for share;
    if not found or exists(select 1 from private.smartclip_sandbox_devices d
      where d.user_id=_user_id and d.fingerprint=_fingerprint and d.payment_id=chosen_payment and d.state in ('active','revoked')) then
      return pg_catalog.jsonb_build_object('issued',false);
    end if;
    insert into private.smartclip_sandbox_devices(challenge,user_id,fingerprint,payment_id,expires_at,state)
      values (_challenge,_user_id,_fingerprint,chosen_payment,now_at+interval '120 seconds','pending')
      on conflict (challenge) do nothing;
    return pg_catalog.jsonb_build_object('issued',found);
  else
    -- Cryptographic proof is verified by the trusted server before this RPC.
    -- Lock the exact purchase row against concurrent refund/dispute before consuming.
    select p.stripe_payment_intent_id into chosen_payment from private.smartclip_sandbox_devices d
      join private.smartclip_sandbox_entitlements p on p.stripe_payment_intent_id=d.payment_id
      where d.challenge=_challenge and d.user_id=_user_id and d.fingerprint=_fingerprint
        and d.state='pending' and d.expires_at>pg_catalog.clock_timestamp()
        and p.user_id=_user_id and p.release_sha256=canonical_digest and p.status='paid'
      for share of p;
    if not found or exists(select 1 from private.smartclip_sandbox_devices d
      where d.user_id=_user_id and d.fingerprint=_fingerprint and d.payment_id=chosen_payment and d.state in ('active','revoked')) then
      return pg_catalog.jsonb_build_object('activated',false);
    end if;
    update private.smartclip_sandbox_devices set state='active'
      where challenge=_challenge and user_id=_user_id and fingerprint=_fingerprint and payment_id=chosen_payment
        and state='pending' and expires_at>pg_catalog.clock_timestamp();
    return pg_catalog.jsonb_build_object('activated',found);
  end if;
end
$$;
revoke all on function public.capital_ai_smartclip_sandbox_device(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.capital_ai_smartclip_sandbox_device(text,uuid,text,text) to service_role;
