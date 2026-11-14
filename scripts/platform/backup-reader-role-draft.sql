-- DRAFT ONLY – Do not execute against production.
-- Issue #664: capital_ai_backup_reader role design

-- 1. Create role
CREATE ROLE capital_ai_backup_reader
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  CONNECTION LIMIT 1;

ALTER ROLE capital_ai_backup_reader
  SET default_transaction_read_only = on;

-- 2. Minimal grants (to be refined after inventory)
-- GRANT CONNECT ON DATABASE <db> TO capital_ai_backup_reader;
-- GRANT USAGE ON SCHEMA public, private TO capital_ai_backup_reader;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public, private TO capital_ai_backup_reader;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public, private TO capital_ai_backup_reader;

-- 3. Explicit revokes for dangerous extensions
REVOKE ALL ON SCHEMA cron FROM capital_ai_backup_reader;
REVOKE ALL ON SCHEMA net FROM capital_ai_backup_reader;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cron FROM capital_ai_backup_reader;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM capital_ai_backup_reader;

-- 4. Negative test placeholders (run as the role)
-- INSERT INTO private.dashboard_notes (...) VALUES (...);  -- must fail
-- SELECT cron.schedule('test', '* * * * *', 'SELECT 1');     -- must fail
-- SELECT net.http_get('https://example.com');               -- must fail
