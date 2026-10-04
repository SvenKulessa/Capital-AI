-- M5 post-mutation least-privilege correction.
-- Supabase default privileges exposed extra service_role privileges on the new table;
-- M5 requires append-only application access, therefore service_role is restricted to SELECT + INSERT.

revoke all on table public.agent_audit_events from service_role;
grant select, insert on table public.agent_audit_events to service_role;
