-- CAPITAL-AI option B: production hardening of verified advisor findings.
-- Non-destructive: add covering indexes, pin function search_path, remove redundant
-- service_role policies before recreating them with explicit TO service_role.

create index if not exists external_component_inventory_events_component_id_idx
  on private.external_component_inventory_events (component_id);

create index if not exists owner_authorization_evidence_challenge_id_idx
  on public.owner_authorization_evidence (challenge_id);

create index if not exists owner_authorization_evidence_credential_id_idx
  on public.owner_authorization_evidence (credential_id);

create index if not exists owner_device_credentials_owner_user_id_idx
  on public.owner_device_credentials (owner_user_id);

alter function public.touch_social_media_accounts_updated_at()
  set search_path = pg_catalog;

drop policy if exists service_role_full_access on public.social_media_accounts;
drop policy if exists service_role_full_access on public.social_media_oauth_states;
drop policy if exists service_role_full_access on public.social_media_publish_log;
drop policy if exists service_role_full_access on public.social_media_content_approvals;
