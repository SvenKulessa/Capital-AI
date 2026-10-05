-- Fix registration consent trigger so omitted optional marketing consent never writes NULL
-- into public.user_consents.granted.
-- Production execution remains gated by the canonical migration workflow.

begin;

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

  if coalesce(new.raw_user_meta_data->>'terms_accepted', 'false') = 'true'
     and coalesce(new.raw_user_meta_data->>'terms_version', '') <> '' then
    insert into public.user_consents (
      user_id, consent_type, document_version, granted, evidence_kind
    ) values (
      new.id, 'terms', new.raw_user_meta_data->>'terms_version', true, 'contract_acceptance'
    ) on conflict (user_id, consent_type, document_version) do nothing;
  end if;

  if coalesce(new.raw_user_meta_data->>'privacy_acknowledged', 'false') = 'true'
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
    coalesce(nullif(new.raw_user_meta_data->>'privacy_version', ''), '2026-10-05'),
    coalesce(new.raw_user_meta_data->>'marketing_consent', 'false') = 'true',
    'consent'
  ) on conflict (user_id, consent_type, document_version) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

commit;
