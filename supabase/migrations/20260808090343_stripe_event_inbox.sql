-- ADR-0045 / R-003 — Durable Stripe Event Inbox + atomic mail reservation.
--
-- IMPORTANT DEPLOYMENT CONTRACT:
--   This migration must be applied in production BEFORE deploying application code that calls
--   public.claim_stripe_event(...) or public.claim_subscription_confirmation(...).
--
-- Scope is intentionally P0-only. This is NOT the future durable worker/outbox architecture
-- (R-101), and it does NOT make PDF-credit persistence transactional (R-004). It establishes
-- a single durable ingress ownership boundary for Stripe event IDs and closes the concurrent
-- confirmation-mail reservation race.

begin;

create table if not exists public.stripe_event_inbox (
  event_id               text primary key,
  event_type             text not null,
  livemode               boolean not null,
  api_version            text,
  ingress_source         text not null,
  payload_hash           text not null,
  status                 text not null default 'processing'
                         check (status in ('processing', 'processed', 'failed')),
  attempts               integer not null default 1 check (attempts > 0),
  received_at            timestamptz not null default now(),
  processing_started_at  timestamptz not null default now(),
  processed_at           timestamptz,
  last_error             text
);

comment on table public.stripe_event_inbox is
  'R-003 durable ingress ledger for verified Stripe event IDs. Service-role only. It prevents duplicate application-side webhook execution and records failed/stuck processing for reconciliation.';

comment on column public.stripe_event_inbox.payload_hash is
  'SHA-256 over the verified Stripe Event payload used to detect an impossible event-id/payload mismatch.';

alter table public.stripe_event_inbox enable row level security;

revoke all on table public.stripe_event_inbox from anon, authenticated;
grant select, insert, update on table public.stripe_event_inbox to service_role;

drop policy if exists "service_role_full_access" on public.stripe_event_inbox;
create policy "service_role_full_access" on public.stripe_event_inbox
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.claim_stripe_event(
  p_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_api_version text,
  p_ingress_source text,
  p_payload_hash text
)
returns table (
  claimed boolean,
  claim_status text,
  claim_attempts integer,
  integrity_matches boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.stripe_event_inbox%rowtype;
  v_attempts integer;
begin
  if nullif(trim(p_event_id), '') is null
     or nullif(trim(p_event_type), '') is null
     or nullif(trim(p_ingress_source), '') is null
     or nullif(trim(p_payload_hash), '') is null then
    raise exception 'claim_stripe_event requires non-empty event_id, event_type, ingress_source and payload_hash';
  end if;

  insert into public.stripe_event_inbox (
    event_id,
    event_type,
    livemode,
    api_version,
    ingress_source,
    payload_hash,
    status,
    attempts,
    received_at,
    processing_started_at
  ) values (
    p_event_id,
    p_event_type,
    p_livemode,
    p_api_version,
    p_ingress_source,
    p_payload_hash,
    'processing',
    1,
    now(),
    now()
  )
  on conflict (event_id) do nothing
  returning * into v_row;

  if found then
    return query select true, 'claimed'::text, v_row.attempts, true;
    return;
  end if;

  select *
    into v_row
    from public.stripe_event_inbox
   where event_id = p_event_id
   for update;

  if not found then
    raise exception 'stripe_event_inbox conflict row disappeared for event %', p_event_id;
  end if;

  if v_row.event_type is distinct from p_event_type
     or v_row.livemode is distinct from p_livemode
     or coalesce(v_row.api_version, '') is distinct from coalesce(p_api_version, '')
     or v_row.payload_hash is distinct from p_payload_hash then
    return query select false, 'integrity_conflict'::text, v_row.attempts, false;
    return;
  end if;

  if v_row.status = 'failed' then
    update public.stripe_event_inbox
       set status = 'processing',
           attempts = attempts + 1,
           processing_started_at = now(),
           processed_at = null,
           last_error = null
     where event_id = p_event_id
       and status = 'failed'
     returning attempts into v_attempts;

    if found then
      return query select true, 'retry_claimed'::text, v_attempts, true;
      return;
    end if;
  end if;

  return query
    select false,
           case v_row.status
             when 'processed' then 'duplicate_processed'
             when 'processing' then 'duplicate_processing'
             else 'duplicate'
           end::text,
           v_row.attempts,
           true;
end;
$$;

revoke all on function public.claim_stripe_event(text, text, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_stripe_event(text, text, boolean, text, text, text) to service_role;

create or replace function public.claim_subscription_confirmation(p_session_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer;
begin
  if nullif(trim(p_session_id), '') is null then
    return false;
  end if;

  insert into public.subscription_confirmations_sent (session_id)
  values (p_session_id)
  on conflict (session_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

revoke all on function public.claim_subscription_confirmation(text) from public, anon, authenticated;
grant execute on function public.claim_subscription_confirmation(text) to service_role;

commit;