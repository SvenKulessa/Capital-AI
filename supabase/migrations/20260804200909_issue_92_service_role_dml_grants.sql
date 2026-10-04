-- Issue #92 / ADR-0043 — explicit SQL DML grants for privileged server persistence.
-- RLS policies do not replace table privileges. These grants restore the intended backend-only
-- access for server-managed tables after role-explicit policy hardening. No anon/authenticated
-- DML privilege is added by this migration.

begin;

grant select, insert, update, delete on table public.agent_evaluation_runs to service_role;
grant select, insert, update, delete on table public.alert_subscriptions to service_role;
grant select, insert, update, delete on table public.audit_logs_iam to service_role;
grant select, insert, update, delete on table public.break_glass_codes to service_role;
grant select, insert, update, delete on table public.compliance_certificates to service_role;
grant select, insert, update, delete on table public.compliance_runs to service_role;
grant select, insert, update, delete on table public.iam_access_log to service_role;
grant select, insert, update, delete on table public.iam_stepup_tokens to service_role;
grant select, insert, update, delete on table public.phone_stepup_challenges to service_role;
grant select, insert, update, delete on table public.promo_redemptions to service_role;
grant select, insert, update, delete on table public.score_snapshots to service_role;
grant select, insert, update, delete on table public.security_events to service_role;
grant select, insert, update, delete on table public.site_metrics to service_role;
grant select, insert, update, delete on table public.step_up_tokens to service_role;
grant select, insert, update, delete on table public.subscription_confirmations_sent to service_role;
grant select, insert, update, delete on table public.subscriptions to service_role;
grant select, insert, update, delete on table public.usage_log to service_role;
grant select, insert, update, delete on table public.user_quota to service_role;
grant select, insert, update, delete on table public.users to service_role;

commit;
