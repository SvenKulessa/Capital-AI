-- CAPITAL-AI-OPS #1487 — Owner Authorization service-role least privilege.
-- Repository migration only. Provider application remains a separately authorized mutation.
--
-- Direct server consumers on CURRENT_MAIN require:
--   owner_device_credentials       SELECT, INSERT, UPDATE
--   owner_authorization_challenges SELECT, INSERT, UPDATE
--   adr0104_owner_sessions         SELECT
-- Evidence/consumption/session writes for ADR-0104 activation remain inside the existing
-- SECURITY DEFINER consume_adr0104_owner_authorization(...) RPC.
--
-- Normalize first so accidental legacy/default privileges cannot survive this migration.

begin;

revoke all on table public.owner_device_credentials
  from public, anon, authenticated, service_role;
revoke all on table public.owner_authorization_challenges
  from public, anon, authenticated, service_role;
revoke all on table public.owner_authorization_evidence
  from public, anon, authenticated, service_role;
revoke all on table public.owner_authorization_consumptions
  from public, anon, authenticated, service_role;
revoke all on table public.adr0104_owner_sessions
  from public, anon, authenticated, service_role;

grant select, insert, update
  on table public.owner_device_credentials
  to service_role;
grant select, insert, update
  on table public.owner_authorization_challenges
  to service_role;
grant select
  on table public.adr0104_owner_sessions
  to service_role;

commit;
