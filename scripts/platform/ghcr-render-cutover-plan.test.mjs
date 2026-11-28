import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateGhcrRenderCutoverPlan } from './ghcr-render-cutover-plan.mjs';

const sha = 'a'.repeat(40);
const pinned = 'node:26.13.1-alpine@sha256:' + 'b'.repeat(64);
const dockerfile = `FROM ${pinned} AS crypto-base\nLABEL org.opencontainers.image.source=https://github.com/SvenKulessa/Capital-AI\n`;
const serviceId = 'srv-dau1rp893c1s73cdhm1g';
const ownerId = 'tea-d90o4rj7uimc739i86ug';
const baseline = () => ({
  expectedMainSha: sha,
  currentMainSha: sha,
  dockerfile,
  license: { status: 'REVIEW_OPEN', deployEligible: false, applicationSourceSha: 'c'.repeat(40),
    baseImage: pinned, remainingGates: ['SOURCE_DELIVERY_OPEN'], legalApproval: null },
  expectedServiceId: serviceId,
  expectedOwnerId: ownerId,
  profile: { repository: 'SvenKulessa/Capital-AI', registryRepository: 'ghcr.io/svenkulessa/capital-ai',
    platform: 'linux/amd64', workspaceId: ownerId, plan: '0.5c-512mb' },
  service: { id: serviceId, ownerId, repo: 'https://github.com/SvenKulessa/Capital-AI',
    branch: 'main', type: 'web_service', suspended: 'not_suspended',
    serviceDetails: { env: 'docker', plan: '0.5c-512mb', registryCredential: { registry: 'GITHUB' } } },
  deploy: { id: 'dep-dc11jelg1s2s73ass520', status: 'live', commit: { id: sha } },
});

const check = (r, name) => r.gates.find(x => x.name === name).status;

test('legacy Git-backed source is captured, but rights and runtime digest remain blocked', () => {
  const r = evaluateGhcrRenderCutoverPlan(baseline());
  assert.equal(check(r, 'CURRENT_MAIN_SHA'), 'VERIFIED');
  assert.equal(check(r, 'RENDER_LIVE_COMMIT_BASELINE'), 'VERIFIED');
  assert.equal(check(r, 'REDISTRIBUTION_RIGHTS'), 'BLOCKED');
  assert.equal(check(r, 'PUBLISHED_IMMUTABLE_REGISTRY_IMAGE'), 'NOT_PROVEN');
  assert.equal(check(r, 'VERIFIED_GITHUB_ATTESTATIONS'), 'NOT_PROVEN');
  assert.equal(r.readyForCutover, false);
  assert.equal(r.execution.sourceSwitch, 'NONE');
  assert.equal(r.execution.registryPush, 'NONE');
});

test('wrong source, foreign owner and unrelated service fail closed', () => {
  const stale = baseline(); stale.currentMainSha = 'f'.repeat(40);
  assert.equal(check(evaluateGhcrRenderCutoverPlan(stale), 'CURRENT_MAIN_SHA'), 'BLOCKED');
  assert.equal(check(evaluateGhcrRenderCutoverPlan(stale), 'RENDER_LIVE_COMMIT_BASELINE'), 'BLOCKED');
  const foreign = baseline(); foreign.service.ownerId = 'tea-someoneelse';
  assert.equal(check(evaluateGhcrRenderCutoverPlan(foreign), 'RENDER_GIT_SOURCE_BASELINE'), 'BLOCKED');
  const imageBacked = baseline(); imageBacked.service.imagePath = 'ghcr.io/svenkulessa/capital-ai:latest';
  assert.equal(check(evaluateGhcrRenderCutoverPlan(imageBacked), 'RENDER_GIT_SOURCE_BASELINE'), 'BLOCKED');
  const foreignDeploy = baseline(); foreignDeploy.deploy.image = { sha: 'sha256:'+'b'.repeat(64) };
  assert.equal(check(evaluateGhcrRenderCutoverPlan(foreignDeploy), 'RENDER_LIVE_COMMIT_BASELINE'), 'BLOCKED');
});

test('forged approval fields, digest and registry credential do not authorize migration', () => {
  const f = baseline();
  f.license = { status: 'APPROVED', deployEligible: true, applicationSourceSha: sha,
    baseImage: pinned, remainingGates: [], legalApproval: { reference: 'synthetic-test-evidence' } };
  f.providerClaims = { digest: 'sha256:' + '1'.repeat(64), signature: 'VERIFIED',
    registryAuth: 'VERIFIED', cutoverApproved: true, costsApproved: true };
  const r = evaluateGhcrRenderCutoverPlan(f);
  assert.equal(check(r, 'REDISTRIBUTION_RIGHTS'), 'NOT_PROVEN'); // synthetic legal inputs have no independent authority
  assert.equal(r.evidenceAuthority, 'SUPPLIED_SNAPSHOT_CONSISTENCY_ONLY');
  assert.equal(check(r, 'VERIFIED_GITHUB_ATTESTATIONS'), 'NOT_PROVEN');
  assert.equal(check(r, 'RENDER_REGISTRY_PULL_AUTHORITY'), 'NOT_PROVEN');
  assert.equal(check(r, 'CUTOVER_COST_AND_OWNER_APPROVAL'), 'NOT_PROVEN');
  assert.equal(r.readyForCutover, false);
});

test('report redacts extra provider secrets and is deterministic', () => {
  const input = baseline();
  input.service.secret = 'super-private-secret';
  input.license.token = 'should-never-leak';
  input.profile.requiredRuntimeSecrets = ['SECRET_VALUE'];
  const a = evaluateGhcrRenderCutoverPlan(input);
  const b = evaluateGhcrRenderCutoverPlan(input);
  assert.deepEqual(a,b);
  assert.equal(JSON.stringify(a).includes('super-private-secret'),false);
  assert.equal(JSON.stringify(a).includes('should-never-leak'),false);
  assert.equal(JSON.stringify(a).includes('SECRET_VALUE'),false);
});

test('no optional instance creation, secret handling or deployment action exists', () => {
  const r = evaluateGhcrRenderCutoverPlan(baseline());
  assert.deepEqual(r.execution, { registryPush: 'NONE', sourceSwitch: 'NONE',
    renderDeploy: 'NONE', registryPermissionsChanged: 'NONE', costsActivated: 'NONE' });
  assert.equal(Object.keys(r).includes('token'),false);
});

test('actual historical rights ledger remains blocked against current pinned Dockerfile', () => {
  const rights = JSON.parse(readFileSync(new URL('../../docs/security/evidence/license-rights-review.json', import.meta.url), 'utf8'));
  const docker = readFileSync(new URL('../../Dockerfile', import.meta.url), 'utf8');
  const profile = JSON.parse(readFileSync(new URL('../../deploy/render-image-profile.json', import.meta.url), 'utf8'));
  const input = baseline();
  input.dockerfile = docker;
  input.license = rights;
  input.profile = profile;
  const r = evaluateGhcrRenderCutoverPlan(input);
  assert.equal(rights.status, 'REVIEW_OPEN');
  assert.equal(rights.deployEligible, false);
  assert.ok(Array.isArray(rights.remainingGates) && rights.remainingGates.length > 0);
  assert.equal(check(r, 'REDISTRIBUTION_RIGHTS'), 'BLOCKED');
  assert.ok(r.rightsBlockers.includes('SOURCE_EVIDENCE_SHA_MISMATCH'));
  assert.ok(r.rightsBlockers.includes('BASE_IMAGE_EVIDENCE_MISMATCH'));
  assert.ok(r.rightsBlockers.includes('REMAINING_GATES_OPEN'));
  assert.equal(r.readyForCutover, false);
});

test('the plan never reclassifies a fabricated legal reference as signed evidence', () => {
  const input = baseline();
  input.license = { status: 'APPROVED', deployEligible: true, applicationSourceSha: sha,
    baseImage: pinned, remainingGates: [], legalApproval: { reference: 'invented-license-evidence' } };
  const output = evaluateGhcrRenderCutoverPlan(input);
  assert.equal(check(output, 'REDISTRIBUTION_RIGHTS'), 'NOT_PROVEN');
  assert.equal(output.admission, 'BLOCKED');
  assert.equal(output.readyForCutover, false);
});
