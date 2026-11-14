import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../supabase/migrations/20261113152000_oauth_client_default_deny.sql', import.meta.url),
  'utf8',
);
const consent = readFileSync(new URL('../server/oauth-consent.mjs', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../server/auth.mjs', import.meta.url), 'utf8');

test('OAuth tokens are denied at the Data API pre-request boundary, including RPCs and views', () => {
  assert.match(sql, /CREATE FUNCTION public\.capital_ai_oauth_data_api_deny\(\)/i);
  assert.match(sql, /SECURITY INVOKER/i);
  assert.match(sql, /SET search_path = ''/);
  assert.match(sql, /auth\.jwt\(\)\s*->>\s*'client_id'/);
  assert.match(sql, /RAISE SQLSTATE 'PT403'/);
  assert.match(sql, /ALTER ROLE authenticator SET pgrst\.db_pre_request/i);
  assert.match(sql, /OAUTH_RLS_PREFLIGHT_EXISTING_POSTGREST_HOOK/);
  assert.doesNotMatch(sql, /SECURITY DEFINER/i);
});

test('OAuth RLS is restrictive for both reads and writes, and never overrides native ownership policies', () => {
  assert.match(sql, /CREATE POLICY oauth_client_default_deny[^;]*AS RESTRICTIVE FOR ALL TO authenticated/i);
  assert.match(sql, /USING \(\(SELECT auth\.jwt\(\) ->> %L\) IS NULL\)/);
  assert.match(sql, /WITH CHECK \(\(SELECT auth\.jwt\(\) ->> %L\) IS NULL\)/);
  assert.match(sql, /AND c\.relrowsecurity/);
  assert.doesNotMatch(sql, /DROP POLICY/i);
  assert.doesNotMatch(sql, /REVOKE ALL ON TABLE/i);
});

test('Supabase-managed storage tables are not mutated; permissive policy drift blocks cutover', () => {
  assert.match(sql, /OAUTH_RLS_PREFLIGHT_STORAGE_POLICY_REVIEW_REQUIRED/);
  assert.match(sql, /n\.nspname='public'/);
  assert.doesNotMatch(sql, /CREATE POLICY oauth_client_default_deny ON storage\./i);
  assert.doesNotMatch(sql, /ALTER TABLE storage\./i);
});

test('native PostgREST traffic retains grant and pre-request behavior when no client_id exists', () => {
  assert.match(sql, /IF \(SELECT auth\.jwt\(\) ->> 'client_id'\) IS NOT NULL THEN/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.capital_ai_oauth_data_api_deny\(\)[\s\S]*TO anon, authenticated, service_role/i);
  assert.match(sql, /NOTIFY pgrst, 'reload config'/i);
});

test('OAuth consent requires an explicit flag, registered client allowlist and same-origin decision', () => {
  assert.match(consent, /CAPITAL_AI_OAUTH_SERVER_CONSENT_ENABLED/);
  assert.match(consent, /CAPITAL_AI_OAUTH_ALLOWED_CLIENT_IDS/);
  assert.match(consent, /allowed\.has\(details\.client\.id\)/);
  assert.match(consent, /req\.headers\.origin !== origin\.origin/);
  assert.match(consent, /'approve', 'deny'/);
  assert.match(consent, /redirect: 'error'/);
  assert.match(auth, /parsed\.pathname === '\/oauth\/consent'/);
});

test('no auth-schema writes or dynamic client registration are enabled by migration', () => {
  assert.doesNotMatch(sql, /\bINSERT\s+INTO\s+auth\./i);
  assert.doesNotMatch(sql, /\bUPDATE\s+auth\./i);
  assert.doesNotMatch(sql, /\bALTER\s+TABLE\s+auth\./i);
  assert.doesNotMatch(sql, /allow_dynamic_registration\s*=\s*true/i);
});
