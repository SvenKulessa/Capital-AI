-- CAPITAL-AI registration/profile convergence.
-- Production execution is intentionally gated by the canonical migration workflow.

begin;

alter table public.profiles
  add column if not exists avatar_id text not null default '1',
  add column if not exists avatar_color text not null default 'from-brand-primary to-brand-primary',
  add column if not exists preferred_asset_class text not null default 'Crypto',
  add column if not exists risk_profile text not null default 'Ausgewogen',
  add column if not exists investment_capital numeric(18,2) not null default 0,
  add column if not exists mfa_enrollment_completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_id_check') then
    alter table public.profiles add constraint profiles_avatar_id_check
      check (avatar_id in ('1', '2', '3', '4', '5'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_preferred_asset_class_check') then
    alter table public.profiles add constraint profiles_preferred_asset_class_check
      check (preferred_asset_class in ('Crypto', 'Stocks', 'Commodities', 'Forex'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_risk_profile_check') then
    alter table public.profiles add constraint profiles_risk_profile_check
      check (risk_profile in ('Sicherheitsorientiert', 'Ausgewogen', 'Spekulativ', 'Hochfrequenz-Trading'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_investment_capital_check') then
    alter table public.profiles add constraint profiles_investment_capital_check
      check (investment_capital >= 0 and investment_capital <= 1000000000000);
  end if;
end
$$;

create unique index if not exists user_consents_subject_document_uq
  on public.user_consents (user_id, consent_type, document_version);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Browser clients receive no storage.object policy. Avatar bytes remain private and are
-- exposed only through short-lived signed URLs created by the authorized backend.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'User'),
    'free'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, stripe_subscription_id, status, tier)
  values (new.id, null, 'free', 'Free')
  on conflict (user_id) do nothing;

  if new.raw_user_meta_data->>'terms_accepted' = 'true'
     and coalesce(new.raw_user_meta_data->>'terms_version', '') <> '' then
    insert into public.user_consents (
      user_id, consent_type, document_version, granted, evidence_kind
    ) values (
      new.id, 'terms', new.raw_user_meta_data->>'terms_version', true, 'contract_acceptance'
    ) on conflict (user_id, consent_type, document_version) do nothing;
  end if;

  if new.raw_user_meta_data->>'privacy_acknowledged' = 'true'
     and coalesce(new.raw_user_meta_data->>'privacy_version', '') <> '' then
    insert into public.user_consents (
      user_id, consent_type, document_version, granted, evidence_kind
    ) values (
      new.id, 'privacy', new.raw_user_meta_data->>'privacy_version', true, 'acknowledgement'
    ) on conflict (user_id, consent_type, document_version) do nothing;
  end if;

  insert into public.user_consents (
    user_id, consent_type, document_version, granted, evidence_kind
  ) values (
    new.id,
    'marketing',
    coalesce(nullif(new.raw_user_meta_data->>'privacy_version', ''), '2026-08-14'),
    new.raw_user_meta_data->>'marketing_consent' = 'true',
    'consent'
  ) on conflict (user_id, consent_type, document_version) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Lossless legacy identity convergence. Abort the migration before destructive cleanup if a
-- legacy subject or usage row cannot be mapped by normalized e-mail to auth.users.
do $$
declare
  unmapped_users integer;
  unmapped_usage integer;
begin
  if to_regclass('public.users') is null then
    return;
  end if;

  select count(*) into unmapped_users
  from public.users legacy
  left join auth.users canonical on lower(canonical.email) = lower(legacy.email)
  where canonical.id is null;

  select count(*) into unmapped_usage
  from public.usage_log usage
  left join public.users legacy on legacy.id = usage.user_id
  left join auth.users canonical on lower(canonical.email) = lower(legacy.email)
  where canonical.id is null;

  if unmapped_users <> 0 or unmapped_usage <> 0 then
    raise exception 'LEGACY_IDENTITY_MAPPING_INCOMPLETE users=% usage=%', unmapped_users, unmapped_usage;
  end if;

  alter table public.usage_log add column if not exists canonical_user_id uuid;

  update public.usage_log usage
  set canonical_user_id = canonical.id
  from public.users legacy
  join auth.users canonical on lower(canonical.email) = lower(legacy.email)
  where legacy.id = usage.user_id
    and usage.canonical_user_id is null;

  if exists (select 1 from public.usage_log where canonical_user_id is null) then
    raise exception 'LEGACY_USAGE_BACKFILL_INCOMPLETE';
  end if;

  alter table public.usage_log drop constraint if exists usage_log_user_id_fkey;
  alter table public.usage_log drop column user_id;
  alter table public.usage_log rename column canonical_user_id to user_id;
  alter table public.usage_log alter column user_id set not null;
  alter table public.usage_log add constraint usage_log_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
  create index if not exists idx_usage_log_user_id on public.usage_log(user_id);

  drop table public.users;
end
$$;

commit;
