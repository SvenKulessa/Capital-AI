import assert from 'node:assert/strict';
import test from 'node:test';
import type { DocumentaryEvidenceRecord } from '../Models/documentaryEvidence';
import {
  redactDocumentaryValue,
  renderDocumentaryMarkdown,
  validateDocumentaryEvidence,
} from '../Services/documentaryProjection';

function fixture(): DocumentaryEvidenceRecord {
  return {
    schema: 'DOCUMENTARY_EVIDENCE@1',
    version: '1.0.0',
    metadata: { project: 'CAPITAL-AI', domain: 'PLATFORM', consumerDomain: 'GROWTH', status: 'PROPOSED' },
    correlation: { changeId: 'CA-TEST-1' },
    identity: {
      documentaryId: 'DOC-TEST-1',
      sourceSha: '1'.repeat(40),
      parentSha: '2'.repeat(40),
      branch: 'capital-ai-growth/test',
      pullRequest: 1,
      createdAt: '2026-10-01T00:00:00Z',
    },
    change: {
      title: 'Test change',
      summary: 'Test summary',
      type: 'DOCUMENTATION',
      domains: { primary: 'GROWTH', affected: ['GROWTH'] },
    },
    intent: { problem: 'Test', desiredOutcome: 'Tested', ownerRequestRef: null },
    architecture: {
      changed: false,
      architectureChangeRef: null,
      affectedComponents: [],
      before: { summary: null },
      after: { summary: null },
      interfacesChanged: [],
      securityBoundaryChanged: false,
    },
    implementation: {
      changedFiles: ['README.md'],
      dependencies: { added: [], removed: [], updated: [] },
      executionUnits: { affected: [] },
    },
    validation: {
      tests: { status: 'UNKNOWN', evidenceRefs: [] },
      security: { status: 'UNKNOWN', evidenceRefs: [] },
      licenses: { status: 'UNKNOWN', evidenceRefs: [] },
      provenance: { status: 'UNKNOWN', evidenceRefs: [] },
      build: { status: 'UNKNOWN', evidenceRefs: [] },
      benchmark: { status: 'NOT_REQUIRED', evidenceRefs: [] },
    },
    supplyChain: {
      source: { commitSha: '1'.repeat(40) },
      sbom: { generated: false, refs: [] },
      artifacts: { images: [] },
      immutableDigests: [],
      attestations: [],
    },
    runtime: {
      deploymentRequired: false,
      deployed: false,
      environment: null,
      readback: { performed: false, sourceSha: null, imageDigest: null, evidenceRefs: [] },
    },
    observability: {
      telemetryChanged: false,
      metricsAdded: [],
      metricsRemoved: [],
      regressionsDetected: [],
      anomalies: [],
    },
    selfHealing: {
      candidateDetected: false,
      patternId: null,
      validationCycle: { current: 0, required: 3 },
      validationSteps: ['DETECT', 'CORRELATE', 'CLASSIFY', 'REMEDIATE', 'VERIFY'],
      eligibleForAutomation: false,
      repairClass: null,
      promotionConditions: {
        validationCyclesPassed: false,
        deterministicOutput: false,
        noTrustBoundaryChange: false,
        noHumanAuthorityRequired: false,
      },
    },
    commercialization: { affected: false, inventoryRefs: [], revenueGateChanged: false },
    roadmap: { affected: false, entries: [] },
    documentationProjection: {},
    documentaryProjection: {
      publicSafe: false,
      sections: {},
      redact: { secrets: true, tokens: true, personalData: true, internalCredentials: true },
    },
    state: { lifecycle: 'PROPOSED', supersededBy: null },
    integrity: {
      canonicalSerialization: 'RFC8785',
      hashAlgorithm: 'SHA-256',
      documentaryDigest: 'a'.repeat(64),
    },
    safety: {
      historicalRecordsImmutable: true,
      inferredSuccessForbidden: true,
      missingEvidenceMeansSuccess: false,
    },
  };
}

test('valid Documentary evidence preserves UNKNOWN gates without inferring success', () => {
  const record = fixture();
  assert.deepEqual(validateDocumentaryEvidence(record), []);
  const markdown = renderDocumentaryMarkdown(record);
  assert.match(markdown, /\| tests \| UNKNOWN \|/);
  assert.match(markdown, /Missing or `UNKNOWN` evidence is not interpreted as success/);
  assert.match(markdown, new RegExp(record.identity.sourceSha ?? ''));
});

test('EFFECTIVE deployment fails closed without runtime readback', () => {
  const record = fixture();
  record.metadata.status = 'EFFECTIVE';
  record.state.lifecycle = 'EFFECTIVE';
  record.runtime.deploymentRequired = true;
  record.runtime.deployed = true;

  const failures = validateDocumentaryEvidence(record);
  assert.ok(failures.includes('runtime.deployed=true requires runtime readback'));
  assert.ok(failures.includes('EFFECTIVE deployment requires runtime readback'));
});

test('automation eligibility requires completed validation cycles and promotion conditions', () => {
  const record = fixture();
  record.selfHealing.eligibleForAutomation = true;
  record.selfHealing.repairClass = 'STALE_DOCUMENTARY_PROJECTION';

  const failures = validateDocumentaryEvidence(record);
  assert.ok(failures.includes('automation eligibility requires all validation cycles'));
  assert.ok(failures.includes('automation eligibility requires all promotion conditions'));
});

test('public redaction removes token-like and credential-like values recursively', () => {
  const value = {
    apiToken: 'secret-token',
    nested: { providerCredentials: 'private', safe: 'visible' },
  };
  assert.deepEqual(redactDocumentaryValue(value), {
    apiToken: '[REDACTED]',
    nested: { providerCredentials: '[REDACTED]', safe: 'visible' },
  });
});
