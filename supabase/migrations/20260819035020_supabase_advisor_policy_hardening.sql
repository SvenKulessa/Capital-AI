-- PR #414 follow-up: Supabase advisor hardening.
--
-- Scope:
-- 1) replace deprecated auth.role()-based service-role RLS policies with explicit TO service_role,
-- 2) add the missing covering index for seo_content_inventory.primary_keyword_id.
--
-- Intentionally NOT changed:
-- - agent_audit_events and SEO tables remain RLS-enabled with no client policies where designed
--   as server-only deny-by-default tables; adding permissive policies merely to suppress an INFO
--   advisor finding would weaken the access model.
-- - unused indexes are not removed without production workload evidence.
-- - leaked-password protection is a Supabase plan capability and is not a database migration.

begin;

drop policy if exists service_role_full_access on public.capability_grants;
create policy service_role_full_access
  on public.capability_grants
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists service_role_full_access on public.agent_action_approvals;
create policy service_role_full_access
  on public.agent_action_approvals
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists service_role_full_access on public.m10_registration_challenges;
create policy service_role_full_access
  on public.m10_registration_challenges
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists service_role_full_access on public.m10_owner_credentials;
create policy service_role_full_access
  on public.m10_owner_credentials
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists idx_seo_content_inventory_primary_keyword_id
  on public.seo_content_inventory (primary_keyword_id)
  where primary_keyword_id is not null;

commit;