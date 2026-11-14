-- Negative tests for capital_ai_backup_reader
-- Run these statements AFTER switching to the backup reader role.
-- All statements MUST fail.

-- 1. Write operations
INSERT INTO private.dashboard_notes (user_id, notes) VALUES ('test', 'must-fail');
UPDATE private.dashboard_notes SET notes = 'must-fail' WHERE false;
DELETE FROM private.dashboard_notes WHERE false;

-- 2. DDL
CREATE TABLE backup_reader_must_fail (id int);
DROP TABLE IF EXISTS backup_reader_must_fail;

-- 3. pg_cron
SELECT cron.schedule('backup-reader-must-fail', '* * * * *', 'SELECT 1');

-- 4. pg_net
SELECT net.http_get('https://example.com');

-- 5. Read-only enforcement check
SHOW default_transaction_read_only;  -- expected: on
