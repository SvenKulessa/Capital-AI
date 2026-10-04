-- SH-02.5 / ADR-0054 -- bounded worker/job recovery.
begin;

create table if not exists public.outbox_recovery_events (
  id                   uuid primary key default gen_random_uuid(),
  job_id               uuid not null references public.outbox_jobs(id) on delete cascade,
  event_type           text not null
                       check (event_type in ('stale_lease_reclaimed', 'work_item_quarantined')),
  lease_owner          text,
  previous_lease_owner text,
  attempts             integer not null check (attempts >= 0),
  max_attempts         integer not null check (max_attempts > 0),
  reason               text not null,
  created_at           timestamptz not null default now()
);

create index if not exists outbox_recovery_events_job_created_idx
  on public.outbox_recovery_events (job_id, created_at desc);

alter table public.outbox_recovery_events enable row level security;
revoke all on table public.outbox_recovery_events from anon, authenticated;
grant select, insert on table public.outbox_recovery_events to service_role;

drop policy if exists "service_role_recovery_evidence" on public.outbox_recovery_events;
create policy "service_role_recovery_evidence" on public.outbox_recovery_events
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.heartbeat_outbox_job(
  p_job_id uuid,
  p_lease_owner text,
  p_lease_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if nullif(trim(p_lease_owner), '') is null then
    raise exception 'heartbeat_outbox_job requires a non-empty lease_owner';
  end if;
  update public.outbox_jobs
     set lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 1)),
         updated_at = now()
   where id = p_job_id
     and status = 'processing'
     and lease_owner = p_lease_owner
     and lease_expires_at > now();
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;
revoke all on function public.heartbeat_outbox_job(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.heartbeat_outbox_job(uuid, text, integer) to service_role;

create or replace function public.quarantine_outbox_job(
  p_job_id uuid,
  p_lease_owner text,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.outbox_jobs%rowtype;
  v_previous_owner text;
begin
  if nullif(trim(p_lease_owner), '') is null then
    raise exception 'quarantine_outbox_job requires a non-empty lease_owner';
  end if;
  select lease_owner into v_previous_owner
    from public.outbox_jobs
   where id = p_job_id
     and status = 'processing'
     and lease_owner = p_lease_owner
   for update;
  if not found then return false; end if;
  update public.outbox_jobs
     set status = 'dead_letter',
         lease_owner = null,
         lease_expires_at = null,
         last_error = left(coalesce(p_reason, 'worker recovery quarantine'), 4000),
         updated_at = now()
   where id = p_job_id
   returning * into v_row;
  insert into public.outbox_recovery_events (
    job_id,event_type,previous_lease_owner,attempts,max_attempts,reason
  ) values (
    v_row.id,'work_item_quarantined',v_previous_owner,v_row.attempts,v_row.max_attempts,
    left(coalesce(p_reason, 'worker recovery quarantine'), 4000)
  );
  return true;
end;
$$;
revoke all on function public.quarantine_outbox_job(uuid, text, text) from public, anon, authenticated;
grant execute on function public.quarantine_outbox_job(uuid, text, text) to service_role;

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
    select candidate.id,candidate.lease_owner as previous_lease_owner,candidate.attempts,
           candidate.max_attempts,candidate.job_type,
      case when candidate.attempts >= candidate.max_attempts
        then 'stalled lease exhausted max_attempts'
        else 'stalled lease requires reconciliation; handler not replay-safe' end as reason
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
       set status='dead_letter', lease_owner=null, lease_expires_at=null,
           last_error=left(c.reason,4000), updated_at=now()
      from candidates c where o.id=c.id
    returning o.id,c.previous_lease_owner,o.attempts,o.max_attempts,c.reason
  )
  insert into public.outbox_recovery_events (
    job_id,event_type,previous_lease_owner,attempts,max_attempts,reason
  )
  select q.id,'work_item_quarantined',q.previous_lease_owner,q.attempts,q.max_attempts,q.reason
  from quarantined q;

  return query
  with candidate as (
    select candidate.id,candidate.status as previous_status,
           candidate.lease_owner as previous_lease_owner
    from public.outbox_jobs candidate
    where (
      candidate.status='pending'
      and candidate.available_at <= now()
      and candidate.attempts < candidate.max_attempts
    ) or (
      candidate.status='processing'
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
       set status='processing',
           attempts=o.attempts+1,
           lease_owner=p_lease_owner,
           lease_expires_at=now()+make_interval(secs=>greatest(p_lease_seconds,1)),
           updated_at=now()
      from candidate c where o.id=c.id
    returning o.id as job_id,o.job_type,o.payload,o.attempts,o.max_attempts,
              c.previous_status,c.previous_lease_owner
  ),
  replay_evidence as (
    insert into public.outbox_recovery_events (
      job_id,event_type,lease_owner,previous_lease_owner,attempts,max_attempts,reason
    )
    select c.job_id,'stale_lease_reclaimed',p_lease_owner,c.previous_lease_owner,
           c.attempts,c.max_attempts,
           'expired lease reclaimed for explicitly replay-safe handler'
    from claimed c
    where c.previous_status='processing'
    returning job_id
  )
  select c.job_id,c.job_type,c.payload,c.attempts,c.max_attempts
  from claimed c;
end;
$$;
revoke all on function public.claim_outbox_job_v2(text, integer, text[]) from public, anon, authenticated;
grant execute on function public.claim_outbox_job_v2(text, integer, text[]) to service_role;

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
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from public.claim_outbox_job_v2(p_lease_owner,p_lease_seconds,'{}'::text[]);
$$;
revoke all on function public.claim_outbox_job(text, integer) from public, anon, authenticated;
grant execute on function public.claim_outbox_job(text, integer) to service_role;

commit;