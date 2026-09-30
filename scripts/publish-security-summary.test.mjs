import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const scopes = ['source', 'build-image', 'image', 'nats-image'];
function run(fn) {
  const directory = mkdtempSync(path.join(tmpdir(), 'security-summary-'));
  try { fn(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}
test('public artifacts omit secret content and mark unexecuted scopes explicitly', () => run(directory => {
  writeFileSync(path.join(directory, 'source.json'), JSON.stringify({ Results: [{
    Secrets: [{ Match: 'do-not-publish-credential', Code: { Lines: ['do-not-publish-credential'] } }],
  }] }));
  const result = spawnSync(process.execPath, ['scripts/publish-security-summary.mjs', directory], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.ok(!result.stdout.includes('do-not-publish-credential'));
  assert.equal(JSON.parse(readFileSync(path.join(directory, 'source.public.json'))).status, 'FAIL');
  assert.equal(JSON.parse(readFileSync(path.join(directory, 'image.public.json'))).status, 'NOT_RUN_OR_REPORT_MISSING');
  assert.ok(!readFileSync(path.join(directory, 'source.public.json'), 'utf8').includes('do-not-publish-credential'));
}));
test('all valid reports produce PASS; malformed reports fail the publication step', () => run(directory => {
  for (const name of scopes) writeFileSync(path.join(directory, `${name}.json`), '{"Results":[]}');
  let result = spawnSync(process.execPath, ['scripts/publish-security-summary.mjs', directory]);
  assert.equal(result.status, 0);
  writeFileSync(path.join(directory, 'nats-image.json'), '{invalid');
  result = spawnSync(process.execPath, ['scripts/publish-security-summary.mjs', directory]);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(readFileSync(path.join(directory, 'nats-image.public.json'))).status, 'INVALID_REPORT');
}));
