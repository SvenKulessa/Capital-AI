// Offline production preflight: pg_dump, age and clock are mocked; no network or secrets.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('backup reader transport, TLS and credential fail-closed checks', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'capital-ai-reader-'));
  const bin = path.join(tmp, 'bin'), out = path.join(tmp, 'out');
  fs.mkdirSync(bin); fs.mkdirSync(out);
  const called = path.join(tmp, 'called'), ca = path.join(tmp, 'ca'), pass = path.join(tmp, 'pass');
  fs.writeFileSync(called, ''); fs.writeFileSync(ca, 'SYNTHETIC CA');
  fs.writeFileSync(pass, 'SYNTHETIC - NOT A PASSWORD', { mode: 0o600 });
  const stub = (name, body) => fs.writeFileSync(path.join(bin, name), '#!/usr/bin/env bash\nset -Eeuo pipefail\n' + body + '\n', { mode: 0o500 });
  stub('pg_dump', '[[ "$MOCK" == 1 ]] || exit 99\nif [[ "$1" == --version ]]; then echo "pg_dump (PostgreSQL) 17.11"; exit 0; fi\necho called >> "$MOCK_CALLED"\necho "-- MOCK DATA ONLY"');
  stub('age', '[[ "$MOCK" == 1 && "$1" == --encrypt && "$2" == -r && "$4" == -o ]] || exit 99\ncat >/dev/null\nprintf "age-encryption.org/v1\\nMOCK_ONLY\\n" > "$5"');
  stub('date', 'if [[ "$2" == +%Y%m%dT%H%M%SZ ]]; then echo 20261112T000000Z; elif [[ "$2" == +%Y-%m-%dT%H:%M:%SZ ]]; then echo 2026-11-12T00:00:00Z; else /usr/bin/date "$@"; fi');
  const ref = 'ryzywoktpmyhwzxmstyu', pool = 'aws-0-eu-west-1.pooler.supabase.com';
  const exporter = path.join(path.dirname(fileURLToPath(import.meta.url)), 'backup-stream-encrypt.sh');
  const base = { PATH: bin + ':' + process.env.PATH, HOME: tmp, MOCK: '1', MOCK_CALLED: called,
    CAPITAL_BACKUP_MODE: 'production', CAPITAL_BACKUP_PRODUCTION_APPROVED: 'OWNER_APPROVED_READONLY_EXPORT',
    CAPITAL_BACKUP_PROJECT_REF: ref, CAPITAL_BACKUP_AGE_RECIPIENT: 'age1' + 'q'.repeat(58),
    PGHOST: 'db.' + ref + '.supabase.co', PGUSER: 'capital_ai_backup_reader', PGPORT: '5432',
    PGSSLMODE: 'verify-full', PGSSLROOTCERT: ca, PGPASSFILE: pass };
  const run = (override = {}) => spawnSync('bash', [exporter, 'postgres', out], { env: { ...base, ...override }, encoding: 'utf8', timeout: 5000 });
  const calls = () => fs.readFileSync(called, 'utf8').split('called\n').length - 1;
  const valid = [ {}, { PGHOST: pool, PGUSER: 'capital_ai_backup_reader.' + ref },
    { PGUSER: 'postgres' }, { PGHOST: pool, PGUSER: 'postgres.' + ref } ];
  const rejected = [
    { CAPITAL_BACKUP_PRODUCTION_APPROVED: '' }, { CAPITAL_BACKUP_PRODUCTION_APPROVED: 'OTHER' },
    { CAPITAL_BACKUP_PROJECT_REF: 'wrong' }, { PGDATABASE: 'postgres' },
    { PGHOST: 'db.wrong.supabase.co' }, { PGHOST: '127.0.0.1' },
    { PGHOST: pool, PGUSER: 'capital_ai_backup_reader' },
    { PGHOST: pool, PGUSER: 'capital_ai_backup_reader.wrong' },
    { PGUSER: 'capital_ai_backup_reader.' + ref }, { PGUSER: 'service_role' },
    { PGHOST: pool, PGUSER: 'capital_ai_backup_reader.' + ref, PGPORT: '6543' },
    { PGPORT: '6543' }, { PGSSLMODE: 'require' }, { PGSSLMODE: 'disable' },
    { PGSSLMODE: '' }, { PGSSLROOTCERT: tmp + '/missing' },
    { PGSSLROOTCERT: tmp + '/ca-link' }, { PGPASSFILE: tmp + '/missing' },
    { PGPASSFILE: tmp + '/pass-link' }, { PGPASSFILE: tmp + '/loose' },
    { PGPASSWORD: 'SYNTHETIC_ONLY' }, { PGHOSTADDR: '127.0.0.1' },
    { PGSERVICE: 'other' }, { PGSERVICEFILE: tmp + '/other' },
    { PGOPTIONS: '-cdefault_transaction_read_only=off' },
    { CAPITAL_BACKUP_AGE_RECIPIENT: '' }, { CAPITAL_BACKUP_AGE_RECIPIENT: 'invalid' } ];
  try {
    fs.symlinkSync(ca, tmp + '/ca-link'); fs.symlinkSync(pass, tmp + '/pass-link');
    fs.writeFileSync(tmp + '/loose', 'SYNTHETIC_ONLY', { mode: 0o644 });
    for (const pair of valid) {
      for (const name of fs.readdirSync(out)) fs.unlinkSync(path.join(out, name));
      const count = calls(), result = run(pair);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /^BACKUP_STREAM_ENCRYPTED/);
      assert.equal(calls(), count + 1);
    }
    for (const pair of rejected) {
      const count = calls(), result = run(pair);
      assert.notEqual(result.status, 0, JSON.stringify(pair));
      assert.match(result.stderr, /BACKUP_STREAM_BLOCKED:/);
      assert.equal(calls(), count, 'pg_dump attempted before preflight rejection');
    }
    const count = calls(), replay = run();
    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /BACKUP_STREAM_BLOCKED: refusing overwrite/);
    assert.equal(calls(), count + 1);
    const names = fs.readdirSync(out);
    assert.equal(names.filter(n => n.endsWith('.sql.age')).length, 1);
    assert.equal(names.filter(n => n.startsWith('backup-manifest-')).length, 1);
    assert.equal(names.filter(n => n.endsWith('.sql')).length, 0);
    const manifest = JSON.parse(fs.readFileSync(path.join(out, names.find(n => n.startsWith('backup-manifest-'))), 'utf8'));
    assert.equal(manifest.environment, 'PRODUCTION_EXPORT');
    assert.equal(manifest.storageUpload, 'NOT_CONFIGURED');
    assert.equal(manifest.isolatedProductionRestore, 'NOT_PROVEN');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
