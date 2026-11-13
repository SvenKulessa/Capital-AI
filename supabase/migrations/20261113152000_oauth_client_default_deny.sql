-- CAPITAL-AI OAuth 2.1: identity-only default until explicit API permission review.
-- Deploy SQL BEFORE enabling Supabase OAuth Server / registering clients.
-- Native first-party Supabase sessions (no client_id claim) retain existing RLS behavior.
-- OAuth access tokens are denied by BOTH restrictive RLS and PostgREST pre-request
-- (the latter also protects invoker RPCs and exposed views).
-- P0: Never modify live database without an isolated recovery/negative-test gate.

DO $preflight$
DECLARE
  preexisting text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p')
      AND NOT c.relrowsecurity
      AND (has_table_privilege('authenticated',c.oid,'SELECT')
        OR has_table_privilege('authenticated',c.oid,'INSERT')
        OR has_table_privilege('authenticated',c.oid,'UPDATE')
        OR has_table_privilege('authenticated',c.oid,'DELETE'))
  ) THEN
    RAISE EXCEPTION 'OAUTH_RLS_PREFLIGHT_EXPOSED_TABLE_WITHOUT_RLS';
  END IF;

  SELECT split_part(setting,'=',2) INTO preexisting
  FROM pg_db_role_setting s JOIN pg_roles r ON r.oid=s.setrole
  CROSS JOIN LATERAL unnest(s.setconfig) setting
  WHERE r.rolname='authenticator'
    AND setting LIKE 'pgrst.db_pre_request=%'
  LIMIT 1;
  IF preexisting IS NOT NULL
    AND preexisting <> 'public.capital_ai_oauth_data_api_deny' THEN
    RAISE EXCEPTION 'OAUTH_RLS_PREFLIGHT_EXISTING_POSTGREST_HOOK';
  END IF;
END
$preflight$;

-- Deny OAuth tokens at the Data API gateway, including RPC/view calls.
-- Does not affect /auth/v1 OAuth token exchange, OIDC discovery or UserInfo.
CREATE FUNCTION public.capital_ai_oauth_data_api_deny()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $body$
BEGIN
  IF (SELECT auth.jwt() ->> 'client_id') IS NOT NULL THEN
    RAISE SQLSTATE 'PT403' USING MESSAGE = 'oauth_client_data_api_forbidden';
  END IF;
END;
$body$;
REVOKE ALL ON FUNCTION public.capital_ai_oauth_data_api_deny() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capital_ai_oauth_data_api_deny()
  TO anon, authenticated, service_role;

-- Restrictive policies are AND-ed with existing permissive policies.
-- Protect every existing RLS-enabled table in these exposed/product schemas,
-- including tables that are currently service_role-only.
DO $guard$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','storage')
      AND c.relkind IN ('r','p')
      AND c.relrowsecurity
    ORDER BY n.nspname,c.relname
  LOOP
    EXECUTE format(
      'CREATE POLICY oauth_client_default_deny ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated '
      || 'USING ((SELECT auth.jwt() ->> %L) IS NULL) '
      || 'WITH CHECK ((SELECT auth.jwt() ->> %L) IS NULL)',
      t.schema_name,t.table_name,'client_id','client_id'
    );
  END LOOP;
END
$guard$;

ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.capital_ai_oauth_data_api_deny';
NOTIFY pgrst, 'reload config';
