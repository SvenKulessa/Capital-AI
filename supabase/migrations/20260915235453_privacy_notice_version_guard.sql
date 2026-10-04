-- ADR-0095 / AUTH-ADR-PRIVACY-SINGLE-SOURCE-2026-08-19
-- Align the database deployment guard for future privacy acknowledgements with
-- the public privacy notice version introduced by the CookieConsent v3 change.
-- Existing user_consents rows remain untouched and keep their immutable version.

begin;

create or replace function public.classify_user_consent_evidence()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.consent_type = 'privacy' then
    new.evidence_kind := 'acknowledgement';
    new.document_version := '2026-09-15';
  elsif new.consent_type = 'terms' then
    new.evidence_kind := 'contract_acceptance';
  elsif new.consent_type = 'marketing' then
    new.evidence_kind := 'consent';
  end if;
  return new;
end;
$$;

commit;
