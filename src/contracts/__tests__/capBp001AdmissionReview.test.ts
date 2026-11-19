import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CapBp001AdmissionProbeSchema, inspectCapBp001Admission,
} from '../capBp001AdmissionReview';
import { CANONICAL_50_COMPONENTS } from '../analysisComponentRegistry';
import { componentActivationReasons } from '../analysisComponentRegistryValidator';

const NOW = 1_700_000_010_000;
function rights() {
  const permission = { allowed: true, evidenceReference: 'synthetic-test-only', obligations: [] as string[] };
  return {
    providerId: 'binance', applicableEntityAndRegion: 'SYNTHETIC-TEST',
    subscriptionTierAndAddOns: 'TEST-ONLY',
    feedsSymbolsAndVenues: ['l1:BTC:BINANCE'],
    contractOrPermissionReference: 'UNVERIFIED-TEST-FIXTURE',
    validUntil: new Date(NOW + 100000).toISOString(),
    reviewedAt: new Date(NOW - 2500).toISOString(),
    permissions: {
      internal_analysis: { ...permission },
      scientific_research_tdm: { ...permission },
      public_display: { ...permission },
      api_redistribution: { ...permission },
      derived_scoring_research: { ...permission },
      cache_retention: { ...permission },
      export_resale: { ...permission },
    },
    scientificResearchTdm: null,
  };
}
function fixture() {
  return {
    schemaVersion: 'CAP_BP_001_ADMISSION_PROBE@1',
    asset: {
      assetId: 'BTC-TEST', symbol: 'BTC', name: 'Synthetic BTC',
      assetClass: 'crypto', venue: 'BINANCE', currency: 'USDT', status: 'active',
    },
    providerId: 'binance', providerDataset: 'l1',
    provenance: {
      providerId: 'binance', providerDataset: 'l1',
      observedAt: NOW - 2000, receivedAt: NOW - 1900, publishedAt: NOW - 1800,
      latencyMs: 100, isDelayed: false, isDemo: false,
      sourceReference: 'SYNTHETIC-TEST', licenseScope: 'commercial_redistribution',
    },
    decisionAt: NOW - 1000, evaluatedAt: NOW,
    rights: rights(),
    pointInTime: {
      availableAt: NOW - 1900, retrievedAt: NOW - 1700,
      sourceReleaseReference: 'UNVERIFIED-TEST-RELEASE',
    },
    replayCandidate: null as null | { evidenceId: string; sourceCommit: string; rawInputReference: string },
  };
}
const inspect = (mutate?: (f: ReturnType<typeof fixture>) => void) => {
  const input = fixture(); mutate?.(input);
  return inspectCapBp001Admission(input);
};
const has = (code: string, mutate: (f: ReturnType<typeof fixture>) => void) => {
  const report = inspect(mutate);
  assert.equal(report.state, 'BLOCKED');
  assert.equal(report.productionEligible, false);
  assert.ok(report.reasonCodes.includes(code), JSON.stringify(report.reasonCodes));
};
test('canonical registry still defines blocked CAP-BP-001 with three unresolved contracts', () => {
  const registry = CANONICAL_50_COMPONENTS.find(x => x.componentId === 'market_integrity_gate')!;
  const r = inspect();
  assert.equal(registry.status, 'blocked');
  assert.equal(registry.provenanceMode, 'unavailable');
  assert.equal(registry.lastValidatedAt, null);
  assert.equal(r.calculationVersion, registry.calculationVersion);
  assert.deepEqual(r.unresolvedContractNames, [
    'ExchangeStatusContract', 'IntegrityStatusContract', 'RawTickStreamContract',
  ]);
  assert.ok(componentActivationReasons('market_integrity_gate').includes('COMPONENT_NOT_ACTIVE'));
  assert.ok(r.registryReasonCodes.includes('FEATURE_REFERENCE_UNRESOLVED'));
});
test('synthetic claims with internally consistent PIT and rights remain non-actionable', () => {
  const f = fixture();
  assert.equal(CapBp001AdmissionProbeSchema.safeParse(f).success, true);
  const r = inspectCapBp001Admission(f);
  assert.deepEqual(r, inspectCapBp001Admission(structuredClone(f)));
  assert.equal(r.rightsCandidateConsistent, true);
  assert.equal(r.pitCandidateConsistent, true);
  assert.equal(r.immutableReplayVerified, false);
  assert.equal(r.state, 'BLOCKED');
  assert.equal(r.scoreEligible, false);
  assert.equal(r.rankEligible, false);
  assert.equal(r.decisionEligible, false);
  assert.equal(r.productionEligible, false);
  assert.equal(r.publishable, false);
  assert.ok(r.reasonCodes.includes('CAP_BP_001_EXTERNAL_PROVIDER_RIGHTS_NOT_PROVEN'));
  assert.ok(r.reasonCodes.includes('CAP_BP_001_IMMUTABLE_REPLAY_EVIDENCE_MISSING'));
  assert.ok(r.reasonCodes.includes('CAP_BP_001_PIT_RELEASE_AUTHENTICITY_NOT_PROVEN'));
});
test('missing provider rights are blocked', () => has('CAP_BP_001_PROVIDER_RIGHTS_EVIDENCE_MISSING', x => { x.rights = null as never; }));
test('wrong provider feed rights are blocked', () => has('CAP_BP_001_PROVIDER_FEED_RIGHTS_SCOPE_MISMATCH', x => { x.rights.feedsSymbolsAndVenues = ['wrong:BTC:BINANCE']; }));
test('provider mismatches block admission', () => has('CAP_BP_001_PROVIDER_ID_MISMATCH_OR_UNREGISTERED', x => { x.providerId = 'unknown-provider'; }));
test('rights review later than historical decision is rejected', () => has('CAP_BP_001_RIGHTS_NOT_REVIEWED_AT_DECISION', x => { x.rights.reviewedAt = new Date(NOW - 100).toISOString(); }));
test('expired rights are not valid for replay retention', () => has('CAP_BP_001_RIGHTS_NOT_ADMITTED_FOR_REPLAY', x => { x.rights.validUntil = new Date(NOW - 1).toISOString(); }));
test('missing cache-retention rights prohibit an evidence replay claim', () => has('CAP_BP_001_RIGHTS_NOT_ADMITTED_FOR_REPLAY', x => { x.rights.permissions.cache_retention.allowed = null as never; }));
test('conditional obligations require independent handling', () => has('CAP_BP_001_RIGHTS_NOT_ADMITTED_FOR_REPLAY', x => { x.rights.permissions.cache_retention.obligations.push('NONEMPTY-OBLIGATION'); }));
test('delayed and demo data cannot be presented as realtime source evidence', () => {
  has('CAP_BP_001_PROVENANCE_MODE_NOT_REALTIME', x => { x.provenance.isDelayed = true; });
  has('CAP_BP_001_PROVENANCE_MODE_NOT_REALTIME', x => { x.provenance.isDemo = true; });
});
test('lookahead publication violates historical decision time', () => has('CAP_BP_001_PIT_PROVENANCE_INVALID_OR_STALE', x => { x.provenance.publishedAt = NOW + 1; }));
test('causally impossible receipt order violates PIT', () => has('CAP_BP_001_PIT_PROVENANCE_INVALID_OR_STALE', x => { x.provenance.receivedAt = NOW - 2500; }));
test('stale tick cannot be made fresh by a later replay', () => has('CAP_BP_001_PIT_PROVENANCE_INVALID_OR_STALE', x => {
  x.provenance.observedAt = NOW - 9000; x.provenance.receivedAt = NOW - 8900;
  x.provenance.publishedAt = NOW - 8800;
}));
test('missing PIT availability metadata is not silently derived from quote timestamps', () => has('CAP_BP_001_PIT_AVAILABILITY_EVIDENCE_MISSING', x => { x.pointInTime = null as never; }));
test('vintage after decision is flagged, even if observed price was earlier', () => has('CAP_BP_001_PIT_LOOKAHEAD_OR_VINTAGE_ORDER_INVALID', x => { x.pointInTime.availableAt = NOW - 500; }));
test('future retrieval is rejected', () => has('CAP_BP_001_PIT_LOOKAHEAD_OR_VINTAGE_ORDER_INVALID', x => { x.pointInTime.retrievedAt = NOW + 100; }));
test('a self-declared replay digest is not independent persisted evidence', () => {
  const r = inspect(x => { x.replayCandidate = {
    evidenceId: 'EVD-' + 'a'.repeat(64), sourceCommit: 'b'.repeat(40),
    rawInputReference: 'FAKE-REFERENCE',
  }; });
  assert.ok(r.reasonCodes.includes('CAP_BP_001_REPLAY_RECEIPT_NOT_INDEPENDENTLY_VERIFIED'));
  assert.equal(r.immutableReplayVerified, false);
});
test('invalid structures fail closed without leaking the input', () => {
  for (const raw of [null, {}, { ...fixture(), extra: 'secret' },
    { ...fixture(), evaluatedAt: -1 },
    { ...fixture(), replayCandidate: { evidenceId: '../secret', sourceCommit: 'x', rawInputReference: '' } },
    { ...fixture(), rights: { ...rights(), permissions: { cache_retention: { allowed: 'maybe' } } } },
  ]) {
    const r = inspectCapBp001Admission(raw);
    assert.deepEqual(r.reasonCodes.filter(c => c.startsWith('CAP_BP_001_ADMISSION_')), ['CAP_BP_001_ADMISSION_INPUT_INVALID']);
    assert.equal(r.immutableReplayVerified, false);
    assert.equal(r.productionEligible, false);
    assert.ok(!JSON.stringify(r).includes('secret'));
  }
});
