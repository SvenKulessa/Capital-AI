-- Corrects the SH-02.5 outbox recovery RPC after production readback exposed
-- PL/pgSQL output-parameter ambiguity on an unqualified RETURNING job_id.
-- Runtime behavior is unchanged; only the recovery-evidence CTE return projection is disambiguated.

create or replace function public.claim_outbox_job_v2(
  p_lease_owner text,
  p_lease_seconds integer default 60,
  p_replay_safe_job_types text[] default '{}'::text[]
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
    raise exception 'claim_outbox_job_v2 requires a non-empty lease_owner';
  end if;

  with candidates as (
    select
      candidate.id,
      candidate.lease_owner as previous_lease_owner,
      candidate.attempts,
      candidate.max_attempts,
      candidate.job_type,
      case
        when candidate.attempts >= candidate.max_attempts
          then 'stalled lease exhausted max_attempts'
        else 'stalled lease requires reconciliation; handler not replay-safe'
      end as reason
    from public.outbox_jobs candidate
    where candidate.status = 'processing'
      and candidate.lease_expires_at < now()
      and (
        candidate.attempts >= candidate.max_attempts
        or not (candidate.job_type = any(coalesce(p_replay_safe_job_types, '{}'::text[])))
      )
    order by candidate.lease_expires_at
    for update skip locked
    limit 50
  ),
  quarantined as (
    update public.outbox_jobs o
       set status = 'dead_letter',
           lease_owner = null,
           lease_expires_at = null,
           last_error = left(c.reason, 4000),
           updated_at = now()
      from candidates c
     where o.id = c.id
    returning
      o.id,
      c.previous_lease_owner,
      o.attempts,
      o.max_attempts,
      c.reason
  )
  insert into public.outbox_recovery_events (
    job_id,
    event_type,
    previous_lease_owner,
    attempts,
    max_attempts,
    reason
  )
  select
    q.id,
    'work_item_quarantined',
    q.previous_lease_owner,
    q.attempts,
    q.max_attempts,
    q.reason
  from quarantined q;

  return query
  with candidate as (
    select
      candidate.id,
      candidate.status as previous_status,
      candidate.lease_owner as previous_lease_owner
    from public.outbox_jobs candidate
    where
      (
        candidate.status = 'pending'
        and candidate.available_at <= now()
        and candidate.attempts < candidate.max_attempts
      )
      or (
        candidate.status = 'processing'
        and candidate.lease_expires_at < now()
        and candidate.attempts < candidate.max_attempts
        and candidate.job_type = any(coalesce(p_replay_safe_job_types, '{}'::text[]))
      )
    order by candidate.available_at
    for update skip locked
    limit 1
  ),
  claimed as (
    update public.outbox_jobs o
       set status = 'processing',
           attempts = o.attempts + 1,
           lease_owner = p_lease_owner,
           lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 1)),
           updated_at = now()
      from candidate c
     where o.id = c.id
    returning
      o.id as job_id,
      o.job_type,
      o.payload,
      o.attempts,
      o.max_attempts,
      c.previous_status,
      c.previous_lease_owner
  ),
  replay_evidence as (
    insert into public.outbox_recovery_events (
      job_id,
      event_type,
      lease_owner,
      previous_lease_owner,
      attempts,
      max_attempts,
      reason
    )
    select
      c.job_id,
      'stale_lease_reclaimed',
      p_lease_owner,
      c.previous_lease_owner,
      c.attempts,
      c.max_attempts,
      'expired lease reclaimed for explicitly replay-safe handler'
    from claimed c
    where c.previous_status = 'processing'
    returning 1 as recorded
  )
  select
    c.job_id,
    c.job_type,
    c.payload,
    c.attempts,
    c.max_attempts
  from claimed c;
end;
$$;

revoke all on function public.claim_outbox_job_v2(text, integer, text[]) from public, anon, authenticated;
grant execute on function public.claim_outbox_job_v2(text, integer, text[]) to service_role;
