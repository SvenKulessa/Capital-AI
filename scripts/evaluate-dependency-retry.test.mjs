import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateDependencyRetry } from './evaluate-dependency-retry.mjs';

const evidence = JSON.parse(fs.readFileSync(
  new URL('../docs/security/evidence/dependency-decisions/typescript-7.0.2.json', import.meta.url),
  'utf8',
));

const baseline = {
  name: 'typescript',
  version: '7.0.2',
  fingerprint: {
    packageIntegrity: evidence.fingerprint.package.integrity,
    nativeArtifactIntegrity: evidence.fingerprint.nativeArtifact.integrity,
    embeddedRuntime: evidence.fingerprint.nativeArtifact.embeddedRuntime,
    securityEvidenceRevision: evidence.fingerprint.securityEvidence.evidenceRevision,
  },
};

test('suppresses identical known-blocked candidate', () => {
  const result = evaluateDependencyRetry({ evidence, candidate: baseline });
  assert.equal(result.decision, 'SUPPRESS_WITH_EVIDENCE');
});

test('new dependency version requires retry', () => {
  const result = evaluateDependencyRetry({ evidence, candidate: { ...baseline, version: '7.0.3' } });
  assert.equal(result.decision, 'RETRY_REQUIRED');
  assert.ok(result.reasons.includes('VERSION_CHANGED'));
});

test('changed native artifact integrity requires retry', () => {
  const candidate = structuredClone(baseline);
  candidate.fingerprint.nativeArtifactIntegrity = 'sha512:changed';
  const result = evaluateDependencyRetry({ evidence, candidate });
  assert.equal(result.decision, 'RETRY_REQUIRED');
  assert.ok(result.reasons.includes('NATIVE_ARTIFACT_INTEGRITY_CHANGED'));
});

test('changed embedded Go runtime requires retry', () => {
  const candidate = structuredClone(baseline);
  candidate.fingerprint.embeddedRuntime.goVersion = 'go1.26.5';
  const result = evaluateDependencyRetry({ evidence, candidate });
  assert.equal(result.decision, 'RETRY_REQUIRED');
  assert.ok(result.reasons.includes('EMBEDDED_RUNTIME_CHANGED'));
});

test('new persisted binary SHA is new evidence and requires retry', () => {
  const candidate = structuredClone(baseline);
  candidate.fingerprint.binarySha256 = 'sha256:' + 'a'.repeat(64);
  const result = evaluateDependencyRetry({ evidence, candidate });
  assert.equal(result.decision, 'RETRY_REQUIRED');
  assert.ok(result.reasons.includes('BINARY_SHA256_NEW_EVIDENCE'));
});

test('missing fingerprint fails closed to manual review', () => {
  const candidate = structuredClone(baseline);
  delete candidate.fingerprint.nativeArtifactIntegrity;
  const result = evaluateDependencyRetry({ evidence, candidate });
  assert.equal(result.decision, 'MANUAL_REVIEW_REQUIRED');
});
