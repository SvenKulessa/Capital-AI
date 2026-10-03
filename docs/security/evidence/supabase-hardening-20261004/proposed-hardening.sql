-- REVIEW ONLY. Production erst nach Owner-Freigabe und isolierten Zugriffstests.
-- Keine Auth-Tarifänderung, Retention-Löschung oder Migration-History-Reparatur.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

ALTER FUNCTION public.touch_social_media_accounts_updated_at()
  SET search_path = pg_catalog;

CREATE INDEX external_component_inventory_events_component_id_idx
  ON private.external_component_inventory_events (component_id);
CREATE INDEX owner_authorization_evidence_challenge_id_idx
  ON public.owner_authorization_evidence (challenge_id);
CREATE INDEX owner_authorization_evidence_credential_id_idx
  ON public.owner_authorization_evidence (credential_id);
CREATE INDEX owner_device_credentials_owner_user_id_idx
  ON public.owner_device_credentials (owner_user_id);

-- Bestehende Rollen/Claims und USING/WITH CHECK bleiben semantisch erhalten.
ALTER POLICY service_role_full_access ON public.social_media_accounts
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
ALTER POLICY service_role_full_access ON public.social_media_oauth_states
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
ALTER POLICY service_role_full_access ON public.social_media_publish_log
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
ALTER POLICY service_role_full_access ON public.social_media_content_approvals
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
COMMIT;
