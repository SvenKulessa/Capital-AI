-- CAPITAL-AI Backup Reader Inventory for Issue #664
-- Run as a superuser or sufficiently privileged role in an ISOLATED database.
-- Do NOT run against production.

\echo '=== 1. Schemas ==='
SELECT nspname AS schema
FROM pg_namespace
WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY nspname;

\echo '=== 2. Tables with RLS ==='
SELECT 
  n.nspname AS schema,
  c.relname AS table,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname;

\echo '=== 3. Existing Policies ==='
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
ORDER BY schemaname, tablename, policyname;

\echo '=== 4. Extension Objects (cron / net) ==='
SELECT 
  n.nspname AS schema,
  p.proname AS function
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('cron', 'net')
ORDER BY n.nspname, p.proname;

\echo '=== 5. PUBLIC Privileges on Extensions ==='
-- PUBLIC is an ACL grantee (OID 0), not a login role named 'public'.
-- Resolve the object's effective ACL defaults without conflating PUBLIC with the current user.
SELECT
  n.nspname,
  EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) AS acl
    WHERE acl.grantee = 0::oid
      AND acl.privilege_type = 'USAGE'
  ) AS public_usage
FROM pg_namespace n
WHERE n.nspname IN ('cron', 'net', 'public');

\echo '=== 6. Sequences ==='
SELECT 
  n.nspname AS schema,
  c.relname AS sequence
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'S'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname;

\echo '=== Inventory complete ==='
