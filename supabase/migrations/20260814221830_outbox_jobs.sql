-- ADR-0054 / R-101 -- Durable worker/outbox/lease.
--
-- IMPORTANT DEPLOYMENT CONTRACT:
--   This migration must be applied in production BEFORE deploying application code that calls
--   public.enqueue_outbox_job(...), public.claim_outbox_job(...), public.complete_outbox_job(...)
--   or public.fail_outbox_job(...).
--
-- Generalizes the claim-table pattern already proven in production by
-- 20260808013000_stripe_event_inbox.sql (ADR-0045 / R-003) and
-- 20260810110642_pdf_credit_ledger.sql (ADR-0052 / R-004) into a reusable outbox: enqueue a job,
-- lease-claim it for exclusive processing, then either complete it or schedule a backoff retry up
-- to max_attempts before moving it to dead_letter for manual reconciliation.
--
-- Unlike stripe_event_inbox, a stale (lease-expired) processing row IS safely auto-reclaimed
-- here by claim_outbox_job. ADR-0045 Section 3 Rule 5 refused automatic reclaim specifically
-- because the Stripe side effects it guarded were not (yet) idempotent/transactional. R-101's
-- contract flips that: every registered outbox job handler MUST be safely re-runnable, which is
-- what makes automatic lease-expiry reclaim safe instead of a silent duplicate-side-effect risk.

begin;

create table if not exists public.outbox_jobs (
  id               uuid primary key default gen_random_uuid(),
  job_type         text not null,
  idempotency_key  text,
  payload          jsonb not null default '{}'::jsonb,
  status           text not null default 'pending'
                   check (status in ('pending', 'processing', 'succeeded', 'failed', 'dead_letter')),
  attempts         integer not null default 0 check (attempts >= 0),
  max_attempts     integer not null default 5 check (max_attempts > 0),
  available_at     timestamptz not null default now(),
  lease_owner      text,
  lease_expires_at timestamptz,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.outbox_jobs is
  'R-101 generic durable worker outbox. Service-role only. Every job_type handler MUST be safely re-runnable: a stale (lease-expired) processing row is automatically reclaimed by claim_outbox_job, unlike stripe_event_inbox (ADR-0045), which intentionally refuses automatic reclaim because its side effects were not yet idempotent.';

comment on column public.outbox_jobs.idempotency_key is
  'Optional caller-supplied dedup key (e.g. "subscription_confirmation_mail:<session_id>:<recipient_kind>"). NULL values are not deduplicated against each other -- Postgres unique indexes treat NULL as distinct.';

comment on column public.outbox_jobs.status is
  'pending = claimable once available_at arrives; processing = leased by a worker; succeeded = terminal success; failed = transient, not currently used by claim/fail (retries go back to pending); dead_letter = terminal failure after max_attempts, visible for manual reconciliation.';

create unique index if not exists outbox_jobs_idempotency_key_key
  on public.outbox_jobs (idempotency_key)
  where idempotency_key is not null;

create index if not exists outbox_jobs_claimable_idx
  on public.outbox_jobs (available_at)
  where status = 'pending';

create index if not exists outbox_jobs_status_idx
  on public.outbox_jobs (status);

alter table public.outbox_jobs enable row level security;

revoke all on table public.outbox_jobs from anon, authenticated;
grant select, insert, update on table public.outbox_jobs to service_role;

drop policy if exists "service_role_full_access" on public.outbox_jobs;
create policy "service_role_full_access" on public.outbox_jobs
  for all
  to service_role
  using (true)
  with check (true);

-- Enqueues a job. When idempotency_key is provided and a job with that key already exists
-- (regardless of its current status), the existing job's id is returned with enqueued = false
-- instead of inserting a duplicate -- callers treat that as "already scheduled/handled".
create or replace function public.enqueue_outbox_job(
  p_job_type text,
  p_payload jsonb,
  p_idempotency_key text default null,
  p_max_attempts integer default 5,
  p_available_at timestamptz default now()
)
returns table (
  enqueued boolean,
  job_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_job_type), '') is null or p_payload is null then
    raise exception 'enqueue_outbox_job requires a non-empty job_type and payload';
  end if;

  if p_idempotency_key is not null then
    select id into v_id
      from public.outbox_jobs
     where idempotency_key = p_idempotency_key;

    if found then
      return query select false, v_id;
      return;
    end if;
  end if;

  insert into public.outbox_jobs (job_type, idempotency_key, payload, max_attempts, available_at)
  values (p_job_type, p_idempotency_key, p_payload, greatest(p_max_attempts, 1), coalesce(p_available_at, now()))
  returning id into v_id;

  return query select true, v_id;
end;
$$;

revoke all on function public.enqueue_outbox_job(text, jsonb, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.enqueue_outbox_job(text, jsonb, text, integer, timestamptz) to service_role;

-- Atomically claims one eligible job for p_lease_owner: either a pending job whose available_at
-- has arrived, or a processing job whose lease has expired (safe here because job handlers are
-- required to be idempotent -- see the table comment). FOR UPDATE SKIP LOCKED lets multiple
-- worker instances poll concurrently without blocking each other on the same candidate set.
create or replace function public.claim_outbox_job(
  p_lease_owner text,
  p_lease_seconds integer default 60
)
returns table (
  job_id uuid,
  job_type text,
  payload jsonb,
  attempts integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(trim(p_lease_owner), '') is null then
    raise exception 'claim_outbox_job requires a non-empty lease_owner';
  end if;

  return query
    update public.outbox_jobs o
       set status = 'processing',
           attempts = o.attempts + 1,
           lease_owner = p_lease_owner,
           lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 1)),
           updated_at = now()
     where o.id = (
       select candidate.id
         from public.outbox_jobs candidate
        where (candidate.status = 'pending' and candidate.available_at <= now())
           or (candidate.status = 'processing' and candidate.lease_expires_at < now())
        order by candidate.available_at
        for update skip locked
        limit 1
     )
    returning o.id, o.job_type, o.payload, o.attempts, o.max_attempts;
end;
$$;

revoke all on function public.claim_outbox_job(text, integer) from public, anon, authenticated;
grant execute on function public.claim_outbox_job(text, integer) to service_role;

-- Marks a claimed job succeeded. Only the current lease owner may complete it, so a reclaimed
-- (lease-expired) job cannot be double-completed by the worker that lost the lease.
create or replace function public.complete_outbox_job(
  p_job_id uuid,
  p_lease_owner text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  update public.outbox_jobs
     set status = 'succeeded',
         lease_owner = null,
         lease_expires_at = null,
         last_error = null,
         updated_at = now()
   where id = p_job_id
     and lease_owner = p_lease_owner
     and status = 'processing';

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.complete_outbox_job(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_outbox_job(uuid, text) to service_role;

-- Records a failed attempt. Below max_attempts, the job is rescheduled with backoff (status back
-- to pending, available_at pushed out). At or beyond max_attempts, it moves to dead_letter for
-- manual reconciliation -- queryable directly by any service-role Supabase access, the same
-- visible-reconciliation pattern ADR-0045 established for stuck stripe_event_inbox rows.
create or replace function public.fail_outbox_job(
  p_job_id uuid,
  p_lease_owner text,
  p_error text,
  p_backoff_seconds integer default 30
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.outbox_jobs%rowtype;
  v_status text;
begin
  select * into v_row
    from public.outbox_jobs
   where id = p_job_id
     and lease_owner = p_lease_owner
     and status = 'processing'
   for update;

  if not found then
    return 'not_claimed';
  end if;

  if v_row.attempts >= v_row.max_attempts then
    v_status := 'dead_letter';
  else
    v_status := 'pending';
  end if;

  update public.outbox_jobs
     set status = v_status,
         lease_owner = null,
         lease_expires_at = null,
         last_error = left(coalesce(p_error, ''), 4000),
         available_at = case when v_status = 'pending'
                              then now() + make_interval(secs => greatest(p_backoff_seconds, 1))
                              else available_at
                         end,
         updated_at = now()
   where id = p_job_id;

  return v_status;
end;
$$;

revoke all on function public.fail_outbox_job(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.fail_outbox_job(uuid, text, text, integer) to service_role;

commit;
