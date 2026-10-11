import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createContainerIdentity, writeContainerIdentity } from './container-evidence-identity.mjs';

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
test('PR summaries expose merge, head and base identities without conflating them', () => run(directory => {
  for (const name of scopes) writeFileSync(path.join(directory, `${name}.json`), '{"Results":[]}');
  const head = 'a'.repeat(40), merge = 'b'.repeat(40), base = 'c'.repeat(40);
  writeContainerIdentity(path.join(directory, 'container-identity.json'), createContainerIdentity({
    GITHUB_EVENT_NAME: 'pull_request',
    GITHUB_SHA: merge,
    CAPITAL_PR_HEAD_SHA: head,
    CAPITAL_BASE_MAIN_SHA: base,
  }));
  const result = spawnSync(process.execPath, ['scripts/publish-security-summary.mjs', directory]);
  assert.equal(result.status, 0);
  const report = JSON.parse(readFileSync(path.join(directory, 'source.public.json')));
  assert.equal(report.sourceSha, merge);
  assert.equal(report.sourceIdentity.testedMergeSha, merge);
  assert.equal(report.sourceIdentity.pullRequestHeadSha, head);
  assert.equal(report.sourceIdentity.baseMainSha, base);
  assert.equal(report.sourceIdentity.sourceSha, head);
}));

test('NATS can be marked not applicable only for a fully identified PR with unaffected image', () => run(directory => {
  for (const name of ['source', 'build-image', 'image']) {
    writeFileSync(path.join(directory, name + '.json'), '{"Results":[]}');
  }
  const head = 'a'.repeat(40), merge = 'b'.repeat(40), base = 'c'.repeat(40);
  writeContainerIdentity(path.join(directory, 'container-identity.json'), createContainerIdentity({
    GITHUB_EVENT_NAME: 'pull_request',
    GITHUB_SHA: merge,
    CAPITAL_PR_HEAD_SHA: head,
    CAPITAL_BASE_MAIN_SHA: base,
  }));
  const args = ['scripts/publish-security-summary.mjs', directory];
  const env = { ...process.env, CAPITAL_NATS_SCOPE: 'false' };
  const result = spawnSync(process.execPath, args, { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const nats = JSON.parse(readFileSync(path.join(directory, 'nats-image.public.json'), 'utf8'));
  assert.equal(nats.status, 'SKIPPED_UNCHANGED_PR_SCOPE');
  assert.equal(nats.reason, 'PR_DIFF_HAS_NO_NATS_RELATED_FILES');
  assert.equal(nats.sourceIdentity.pullRequestHeadSha, head);
  assert.equal(JSON.parse(readFileSync(path.join(directory, 'image.public.json'), 'utf8')).status, 'PASS');
  // A requested skip never overrides a real invalid security scan.
  writeFileSync(path.join(directory, 'nats-image.json'), '{invalid');
  assert.equal(spawnSync(process.execPath, args, { env }).status, 1);
}));

test('non-PR runs, unverified scope and missing core image fail closed', () => run(directory => {
  for (const name of ['source', 'build-image', 'image']) {
    writeFileSync(path.join(directory, name + '.json'), '{"Results":[]}');
  }
  const args = ['scripts/publish-security-summary.mjs', directory];
  const env = { ...process.env, CAPITAL_NATS_SCOPE: 'false' };
  // Even with an explicit skip request, main requires a real NATS image report.
  writeContainerIdentity(path.join(directory, 'container-identity.json'), createContainerIdentity({
    GITHUB_EVENT_NAME: 'push', GITHUB_SHA: 'd'.repeat(40),
  }));
  assert.equal(spawnSync(process.execPath, args, { env }).status, 1);
  const head = 'a'.repeat(40), merge = 'b'.repeat(40), base = 'c'.repeat(40);
  writeContainerIdentity(path.join(directory, 'container-identity.json'), createContainerIdentity({
    GITHUB_EVENT_NAME: 'pull_request',
    GITHUB_SHA: merge,
    CAPITAL_PR_HEAD_SHA: head,
    CAPITAL_BASE_MAIN_SHA: base,
  }));
  assert.equal(spawnSync(process.execPath, args, { env: process.env }).status, 1);
  rmSync(path.join(directory, 'image.json'));
  assert.equal(spawnSync(process.execPath, args, { env }).status, 1);
}));
