import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertGhcrPublicationRights } from './assert-ghcr-publication-rights.mjs';

const sha = 'a'.repeat(40);
const pinned = 'node:26.13.0-alpine@sha256:' + 'b'.repeat(64);
const dockerfile = 'FROM ' + pinned + ' AS crypto-base\nLABEL org.opencontainers.image.source=https://github.com/SvenKulessa/Capital-AI\nFROM crypto-base AS runtime\n';
const approved = () => ({
  status: 'APPROVED', deployEligible: true, applicationSourceSha: sha,
  baseImage: pinned, remainingGates: [], legalApproval: { reference: 'owner-reviewed-file' },
});

test('an exact-source and exact-base reviewed record is required before GHCR redistribution', () => {
  assert.deepEqual(assertGhcrPublicationRights({ license: approved(), sourceSha: sha, dockerfile }), {
    sourceSha: sha, baseImage: pinned, redistributionApproved: true,
  });
});

test('open, historical and incomplete redistribution evidence does not authorize public GHCR push', () => {
  const historical = JSON.parse(readFileSync(new URL('../docs/security/evidence/license-rights-review.json', import.meta.url), 'utf8'));
  assert.equal(historical.status, 'REVIEW_OPEN');
  assert.equal(historical.deployEligible, false);
  assert.throws(() => assertGhcrPublicationRights({ license: historical, sourceSha: sha, dockerfile }));
  const mutations = [
    x => { x.status = 'REVIEW_OPEN'; },
    x => { x.deployEligible = false; },
    x => { x.applicationSourceSha = 'c'.repeat(40); },
    x => { x.applicationSourceSha = null; },
    x => { x.remainingGates = ['SOURCE_DELIVERY_OPEN']; },
    x => { delete x.remainingGates; },
    x => { x.legalApproval = null; },
    x => { x.legalApproval = {}; },
    x => { x.baseImage = 'node:24.19.0-alpine@sha256:' + 'd'.repeat(64); },
  ];
  for (const mutate of mutations) {
    const input = approved();
    mutate(input);
    assert.throws(() => assertGhcrPublicationRights({ license: input, sourceSha: sha, dockerfile }));
  }
});

test('an unknown or unpinned base, invalid source SHA or missing legal evidence fails closed', () => {
  for (const change of [
    { sourceSha: 'main' },
    { sourceSha: '' },
    { dockerfile: 'FROM node:26.13.0-alpine AS crypto-base\n' },
    { dockerfile: dockerfile.replace('LABEL org.opencontainers.image.source=https://github.com/SvenKulessa/Capital-AI\n', '') },
    { dockerfile: dockerfile.replace('github.com/SvenKulessa/Capital-AI', 'github.com/other/missing') },
    { dockerfile: dockerfile + 'LABEL org.opencontainers.image.source=https://github.com/SvenKulessa/Capital-AI\n' },
    { dockerfile: dockerfile + 'FROM ' + pinned + ' AS crypto-base\n' },
    { dockerfile: '' },
    { license: null },
  ]) {
    assert.throws(() => assertGhcrPublicationRights({
      license: approved(), sourceSha: sha, dockerfile, ...change,
    }));
  }
});

test('publication guard precedes GHCR login and push only in main dispatch job', () => {
  const workflow = readFileSync(new URL('../.github/workflows/build-security.yml', import.meta.url), 'utf8');
  const candidate = workflow.indexOf('\n  publish_candidate:');
  const handoff = workflow.indexOf('\n  production_handoff:');
  assert.ok(candidate > 0 && handoff > candidate);
  const publish = workflow.slice(candidate, handoff);
  const guard = publish.indexOf('node scripts/assert-ghcr-publication-rights.mjs');
  const login = publish.indexOf('docker/login-action@');
  const push = publish.indexOf('docker push "$candidate_tag"');
  assert.ok(guard > 0 && login > guard && push > login);
  assert.ok(publish.includes("github.event_name == 'workflow_dispatch' && inputs.publish_candidate && github.ref == 'refs/heads/main'"));
  assert.ok(publish.includes('test "$(gh api repos/SvenKulessa/Capital-AI/branches/main --jq .commit.sha)" = "$SOURCE_SHA"'));
});
test('current Dockerfile retains the OCI source label for GitHub package linking', () => {
  const actual = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.match(actual, /^LABEL org\.opencontainers\.image\.source=https:\/\/github\.com\/SvenKulessa\/Capital-AI$/m);
  assert.ok(actual.indexOf('LABEL org.opencontainers.image.source=') > actual.indexOf(' AS crypto-base'));
});
