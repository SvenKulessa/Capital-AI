-- FT-3 least-privilege hardening for workflow current-state updates.
-- Identity/context mutation is already blocked by trigger; this additionally narrows SQL privileges.

begin;

revoke update on table fintech_core.workflow_runs from service_role;
grant update (status, sequence, updated_at, completed_at)
  on table fintech_core.workflow_runs
  to service_role;

commit;
