import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, symlinkSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { verifyProductReleasePrerequisites } from './verify-product-release-prerequisites.mjs';
import { productReleaseFixture } from './test-fixtures/product-release-bundle.mjs';

const sha = 'a'.repeat(40), image = 'ghcr.io/svenkulessa/capital-ai@sha256:' + 'b'.repeat(64);
const hash = value => 'sha256:' + createHash('sha256').update(value).digest('hex');
function evaluate(fixture, overrides = {}) { return verifyProductReleasePrerequisites({ manifest: fixture.manifest, evidenceDirectory: fixture.directory, expectedSourceSha: sha, expectedImageRef: image, ...overrides }); }
function changeFile(fixture, ref, transform) {
  const file = join(fixture.directory, ref.path);
  const bytes = JSON.stringify(transform(JSON.parse(readFileSync(file, 'utf8'))));
  writeFileSync(file, bytes); ref.sha256 = hash(bytes);
}

test('all eleven requirements and the exact 50 component set bind to the evidence fingerprint', t => {
  const f = productReleaseFixture(sha, image); t.after(f.cleanup);
  const r = evaluate(f); assert.equal(r.releaseEligible, true); assert.equal(r.checks.length, 11);
  assert.match(r.fingerprint, /^sha256:[a-f0-9]{64}$/); assert.equal(r.fingerprintType, 'PRODUCT_EVIDENCE_BUNDLE_SHA256');
});
test('missing evidence cannot be replaced by a caller PASS or deployEligible flag', () => {
  const r = verifyProductReleasePrerequisites({ manifest: { status: 'PASS', deployEligible: true } });
  assert.equal(r.releaseEligible, false); assert.equal(r.checks.every(c => !c.pass), true);
});
test('each independently missing prerequisite blocks the release', t => {
  const f = productReleaseFixture(sha, image); t.after(f.cleanup);
  for (let i = 0; i < f.manifest.requirements.length; i++) {
    const manifest = structuredClone(f.manifest); const id = manifest.requirements[i].id; manifest.requirements.splice(i, 1);
    assert.ok(evaluate({ ...f, manifest }).reasons.includes('REQUIREMENT_NOT_PROVEN:' + id));
  }
});
test('old SHA, different digest, future/stale or non-production reports block', t => {
  for (const change of [{ sourceSha: 'c'.repeat(40) }, { imageRef: image + '0' }, { observedAt: '2000-01-01T00:00:00Z' }, { observedAt: '2100-01-01T00:00:00Z' }, { environment: 'fixture' }, { component: 'nats' }, { checks: {} }]) {
    const f = productReleaseFixture(sha, image); t.after(f.cleanup);
    changeFile(f, f.manifest.requirements[0].evidence, r => ({ ...r, ...change }));
    assert.equal(evaluate(f).releaseEligible, false);
  }
});
test('tampered files and duplicate requirement identities block', t => {
  const f = productReleaseFixture(sha, image); t.after(f.cleanup);
  writeFileSync(join(f.directory, f.manifest.requirements[0].evidence.path), '{}');
  assert.equal(evaluate(f).releaseEligible, false);
  f.manifest.requirements[1].id = f.manifest.requirements[0].id;
  assert.ok(evaluate(f).reasons.includes('REQUIREMENT_INVENTORY_MISMATCH'));
});
test('component counts do not replace exact unique inventory or real results', t => {
  for (const mutate of [r => ({ ...r, components: r.components.slice(1) }), r => ({ ...r, components: [...r.components.slice(1), r.components[1]] })]) {
    const f = productReleaseFixture(sha, image); t.after(f.cleanup);
    changeFile(f, f.manifest.componentCatalog, mutate); assert.equal(evaluate(f).componentInventoryPass, false);
  }
  const f = productReleaseFixture(sha, image); t.after(f.cleanup);
  const catalog = JSON.parse(readFileSync(join(f.directory, f.manifest.componentCatalog.path)));
  changeFile(f, catalog.components[0].result, r => ({ ...r, result: {} }));
  changeFile(f, f.manifest.componentCatalog, () => catalog);
  assert.equal(evaluate(f).componentInventoryPass, false);
});
test('symlinks escaping the evidence bundle are rejected even with a matching hash', t => {
  const f = productReleaseFixture(sha, image); t.after(f.cleanup);
  const external = mkdtempSync(join(tmpdir(), 'capital-release-external-')); t.after(() => rmSync(external, { recursive: true, force: true }));
  const bytes = readFileSync(join(f.directory, f.manifest.requirements[0].evidence.path));
  writeFileSync(join(external, 'report.json'), bytes); symlinkSync(join(external, 'report.json'), join(f.directory, 'escape.json'));
  f.manifest.requirements[0].evidence = { path: 'escape.json', sha256: hash(bytes) };
  assert.equal(evaluate(f).releaseEligible, false);
});
test('the shared prerequisite checker also binds NATS evidence to its explicit image', t => {
  const nats = 'ghcr.io/svenkulessa/fixture-nats@sha256:' + 'd'.repeat(64);
  const f = productReleaseFixture(sha, nats, 'nats'); t.after(f.cleanup);
  assert.equal(evaluate(f, { expectedImageRef: nats, component: 'nats' }).releaseEligible, true);
  assert.equal(evaluate(f, { expectedImageRef: image, component: 'nats' }).releaseEligible, false);
});
