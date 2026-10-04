-- ADR-0085 / DSGVO_REMEDIATION_2026-08-19
-- Privacy governance hardening:
-- 1) classify legacy user_consents rows by their actual legal/evidence character,
-- 2) add auditable privacy-rights request workflow,
-- 3) provide service-role-only retention cleanup for short-lived/operational privacy data.

begin;

alter table public.user_consents
  add column if not exists evidence_kind text;

update public.user_consents
set evidence_kind = case consent_type
  when 'privacy' then 'acknowledgement'
  when 'terms' then 'contract_acceptance'
  when 'marketing' then 'consent'
  else 'consent'
end
where evidence_kind is null;

alter table public.user_consents
  alter column evidence_kind set default 'consent',
  alter column evidence_kind set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_consents_evidence_kind_check'
      and conrelid = 'public.user_consents'::regclass
  ) then
    alter table public.user_consents
      add constraint user_consents_evidence_kind_check
      check (evidence_kind in ('consent', 'acknowledgement', 'contract_acceptance'));
  end if;
end $$;

comment on column public.user_consents.evidence_kind is
  'Legal/evidence character: marketing=consent, privacy notice=acknowledgement, terms=contract_acceptance. The table name is legacy compatibility and does not imply that every row is GDPR consent.';

create or replace function public.classify_user_consent_evidence()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.consent_type = 'privacy' then
    new.evidence_kind := 'acknowledgement';
    new.document_version := '2026-08-19';
  elsif new.consent_type = 'terms' then
    new.evidence_kind := 'contract_acceptance';
  elsif new.consent_type = 'marketing' then
    new.evidence_kind := 'consent';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_classify_user_consent_evidence on public.user_consents;
create trigger trg_classify_user_consent_evidence
before insert or update of consent_type on public.user_consents
for each row execute function public.classify_user_consent_evidence();

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (
    request_type in ('access', 'rectification', 'erasure', 'restriction', 'objection', 'portability')
  ),
  status text not null default 'received' check (
    status in ('received', 'identity_verified', 'in_progress', 'completed', 'rejected')
  ),
  details text,
  due_at timestamptz not null default (now() + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.privacy_requests is
  'Authenticated data-subject-right requests. Erasure is a managed workflow, not an unverified instant-delete claim; statutory/audit retention exceptions can therefore be reviewed before completion.';

create index if not exists idx_privacy_requests_user_created
  on public.privacy_requests (user_id, created_at desc);
create index if not exists idx_privacy_requests_status_due
  on public.privacy_requests (status, due_at)
  where status not in ('completed', 'rejected');

create or replace function public.touch_privacy_request_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if new.status in ('completed', 'rejected') and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_touch_privacy_request_updated_at on public.privacy_requests;
create trigger trg_touch_privacy_request_updated_at
before update on public.privacy_requests
for each row execute function public.touch_privacy_request_updated_at();

alter table public.privacy_requests enable row level security;

revoke all on table public.privacy_requests from anon, authenticated;
grant select on table public.privacy_requests to authenticated;
grant select, insert, update, delete on table public.privacy_requests to service_role;

drop policy if exists privacy_requests_select_own on public.privacy_requests;
create policy privacy_requests_select_own on public.privacy_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists privacy_requests_service_role on public.privacy_requests;
create policy privacy_requests_service_role on public.privacy_requests
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.purge_expired_privacy_operational_data(
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_security_events integer := 0;
  v_oauth_states integer := 0;
  v_step_up_tokens integer := 0;
  v_user_quota integer := 0;
  v_unconfirmed_alerts integer := 0;
  v_privacy_requests integer := 0;
begin
  delete from public.security_events
   where created_at < p_now - interval '180 days';
  get diagnostics v_security_events = row_count;

  delete from public.social_media_oauth_states
   where expires_at < p_now - interval '1 day';
  get diagnostics v_oauth_states = row_count;

  delete from public.step_up_tokens
   where expires_at < p_now - interval '7 days';
  get diagnostics v_step_up_tokens = row_count;

  delete from public.user_quota
   where updated_at < p_now - interval '90 days';
  get diagnostics v_user_quota = row_count;

  delete from public.alert_subscriptions
   where confirmed = false
     and created_at < p_now - interval '14 days';
  get diagnostics v_unconfirmed_alerts = row_count;

  delete from public.privacy_requests
   where completed_at is not null
     and completed_at < p_now - interval '3 years';
  get diagnostics v_privacy_requests = row_count;

  return jsonb_build_object(
    'security_events', v_security_events,
    'social_media_oauth_states', v_oauth_states,
    'step_up_tokens', v_step_up_tokens,
    'user_quota', v_user_quota,
    'unconfirmed_alert_subscriptions', v_unconfirmed_alerts,
    'privacy_requests', v_privacy_requests,
    'purged_at', p_now
  );
end;
$$;

revoke all on function public.purge_expired_privacy_operational_data(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_expired_privacy_operational_data(timestamptz)
  to service_role;

comment on function public.purge_expired_privacy_operational_data(timestamptz) is
  'ADR-0085 retention-as-code. Service-role-only, idempotent cleanup of operational privacy data. Business/statutory records are intentionally excluded from generic purge.';

commit;