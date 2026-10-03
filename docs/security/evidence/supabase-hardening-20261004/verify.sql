-- Read-only Provider-Readback. Ergebnisse prüfen; ersetzt keine Zugriffstests.
SELECT pg_get_functiondef('public.touch_social_media_accounts_updated_at()'::regprocedure);

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE indexname IN (
  'external_component_inventory_events_component_id_idx',
  'owner_authorization_evidence_challenge_id_idx',
  'owner_authorization_evidence_credential_id_idx',
  'owner_device_credentials_owner_user_id_idx'
);

SELECT tablename, policyname, roles, cmd, permissive, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND policyname = 'service_role_full_access'
  AND tablename IN ('social_media_accounts', 'social_media_oauth_states',
    'social_media_publish_log', 'social_media_content_approvals');

EXPLAIN (FORMAT JSON)
SELECT 1 FROM generate_series(1, 100) g
WHERE (SELECT auth.role()) = 'service_role';
