import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCOVERY_LIMITS, newerStableVersion, evaluateNpmCandidate,
  evaluateActionCandidate, discoverRepositoryUpdates,
} from './tool-update-discovery.mjs';

const sha = 'a'.repeat(40);
const digest = 'b'.repeat(40);
const integrity = 'sha512-' + 'Q'.repeat(86) + '==';
const npmRow = { id: 'npm:react', name: 'react', kind: 'NPM_RUNTIME', version: '19.3.0' };
const actionRow = { id: 'action:actions/checkout', name: 'actions/checkout', kind: 'GITHUB_ACTION_PIN',
  version: 'v7.0.1', revisionSha: sha, actionRepository: 'actions/checkout' };

test('version comparison refuses prerelease and unresolved versions', () => {
  assert.equal(newerStableVersion('19.3.0', '19.4.0'), true);
  assert.equal(newerStableVersion('19.3.0', '19.3.0'), false);
  assert.equal(newerStableVersion('19.3.0', '18.0.0'), false);
  assert.equal(newerStableVersion('^19.3.0', '20.0.0'), null);
  assert.equal(newerStableVersion('19.3.0-rc.1', '19.4.0'), null);
});

test('npm candidates require both SHA-1 and SHA-512 from matching registry package', () => {
  const manifest = { name: 'react', version: '19.4.0', dist: { shasum: digest, integrity } };
  const candidate = evaluateNpmCandidate(npmRow, manifest);
  assert.equal(candidate.state, 'UPDATE_CANDIDATE');
  assert.equal(candidate.sha, digest);
  assert.equal(candidate.verification, 'HASH_DECLARED_NOT_TARBALL_VERIFIED');
  assert.equal(evaluateNpmCandidate(npmRow, { ...manifest, name: 'other' }).state, 'NOT_PROVEN');
  assert.equal(evaluateNpmCandidate(npmRow, { ...manifest, dist: { shasum: digest } }).state, 'NOT_PROVEN');
  assert.equal(evaluateNpmCandidate(npmRow, { ...manifest, version: '19.3.0' }).state, 'CURRENT_OR_NEWER');
  assert.equal(evaluateNpmCandidate({ ...npmRow, version: '^19.0.0' }, manifest).state, 'REVIEW_REQUIRED');
});

test('GitHub Action update candidate requires a commit from the original repository', () => {
  const candidate = evaluateActionCandidate(actionRow, 'v7.1.0', digest);
  assert.equal(candidate.state, 'UPDATE_CANDIDATE');
  assert.equal(candidate.sha, digest);
  assert.equal(evaluateActionCandidate(actionRow, 'v7.0.1', sha).state, 'CURRENT_OR_NEWER');
  assert.equal(evaluateActionCandidate(actionRow, 'v7.0.1', digest).state, 'REVIEW_REQUIRED');
  assert.equal(evaluateActionCandidate(actionRow, 'untrusted/latest', digest).state, 'NOT_PROVEN');
});

test('real REST sequence follows original GitHub release tag and commit and never applies candidates', async () => {
  const seen = [];
  const fetchImpl = async url => {
    seen.push(url);
    let body;
    if (url === 'https://registry.npmjs.org/react/latest')
      body = { name: 'react', version: '19.4.0', dist: { shasum: digest, integrity } };
    else if (url === 'https://api.github.com/repos/actions/checkout/releases/latest')
      body = { tag_name: 'v7.1.0' };
    else if (url === 'https://api.github.com/repos/actions/checkout/git/ref/tags/v7.1.0')
      body = { object: { type: 'commit', sha: digest } };
    else if (url === 'https://api.github.com/repos/actions/checkout/commits/' + digest)
      body = { sha: digest };
    else throw new Error('Unexpected origin');
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const snapshot = await discoverRepositoryUpdates({ entries: [npmRow, actionRow], sourceSha: sha, fetchImpl,
    now: () => Date.parse('2026-10-11T11:00:00Z') });
  assert.equal(snapshot.candidates, 2);
  assert.equal(snapshot.metadataOnly, true);
  assert.equal(snapshot.autoApply, false);
  assert.equal(snapshot.autoMerge, false);
  assert.equal(snapshot.coverage.npmChecked, 1);
  assert.equal(snapshot.coverage.actionChecked, 1);
  assert.ok(seen.every(url => url.startsWith('https://registry.npmjs.org/') ||
    url.startsWith('https://api.github.com/repos/actions/checkout/')));
});

test('bounded discovery leaves unavailable providers unproven without invented SHAs', async () => {
  const report = await discoverRepositoryUpdates({ entries: [npmRow, actionRow], sourceSha: sha,
    fetchImpl: async () => new Response('{}', { status: 503 }) });
  assert.equal(report.candidates, 0);
  assert.ok(report.findings.every(finding => finding.state === 'NOT_PROVEN' && !finding.sha));
  assert.equal(DISCOVERY_LIMITS.npm <= 48, true);
  assert.equal(DISCOVERY_LIMITS.actions <= 8, true);
});
