import assert from 'node:assert/strict';
import test from 'node:test';
import { FINANCE_PINNED_SOURCE_SHA, inspectFinanceFeatureMapping } from '../financeResearchFeatureBridge.ts';

const now = Date.parse('2026-10-08T12:00:00.000Z');
const providerId = 'evidence-market';
const evidenceRef = 'evidence://finance/asset-rsi';
const feature = {
  featureId: 'rsi_14', assetId: 'crypto:BTC', value: 57, unit: 'index',
  normalizedValue: 57, observedAt: now - 1000, calculationVersion: '1.0.0', qualityScore: 98,
  provenance: { providerId, providerDataset: 'ohlc', observedAt: now - 1000,
    receivedAt: now - 900, publishedAt: now - 800, latencyMs: 100,
    isDelayed: false, isDemo: false, sourceReference: evidenceRef, licenseScope: 'public_realtime' as const },
};
const permission = (allowed: boolean) => ({ allowed, evidenceReference: 'license://market', obligations: [] });
const rights = {
  providerId, applicableEntityAndRegion: 'EU business', subscriptionTierAndAddOns: 'market api',
  feedsSymbolsAndVenues: ['ohlc:BTC:BINANCE'], contractOrPermissionReference: 'license://market',
  validUntil: '2027-10-08T12:00:00.000Z', reviewedAt: '2026-10-07T12:00:00.000Z',
  permissions: {
    internal_analysis: permission(true), scientific_research_tdm: permission(false),
    public_display: permission(false), api_redistribution: permission(false),
    derived_scoring_research: permission(true), cache_retention: permission(true),
    export_resale: permission(false),
  },
  scientificResearchTdm: null,
};
const snapshot = {
  runId: 'finance-test', evaluatedAt: now, horizon: '1h', regime: 'neutral',
  isDemo: false, asset: { assetId: 'crypto:BTC', symbol: 'BTC', name: 'Bitcoin',
    assetClass: 'crypto' as const, venue: 'BINANCE', currency: 'USD', status: 'active' as const },
  features: [], rights: [rights], rawInputReferences: [evidenceRef],
};
const candidate = {
  sourceRepository: 'SvenKulessa/Finance' as const, sourceCommit: FINANCE_PINNED_SOURCE_SHA,
  sourceField: 'technical.rsi14', sourceEvidenceRef: evidenceRef, feature,
};
test('matching admitted feature is only research-mappable, never a canonical score', () => {
  const result = inspectFinanceFeatureMapping({ snapshot, candidates: [candidate] });
  assert.equal(result.state, 'RESEARCH_MAPPABLE', result.reasons.join(','));
  assert.equal(result.features.length, 1);
  assert.equal(result.scoreEligible, false);
  assert.equal(result.executedByCanonicalScorer, false);
});
test('absent rights or source evidence blocks any exposed feature', () => {
  const denied = inspectFinanceFeatureMapping({
    snapshot: { ...snapshot, rights: [] },
    candidates: [candidate],
  });
  assert.equal(denied.state, 'BLOCKED');
  assert.deepEqual(denied.features, []);
  assert.ok(denied.reasons.includes('PROVIDER_RIGHTS_MISSING'));
  const missing = inspectFinanceFeatureMapping({
    snapshot: { ...snapshot, rawInputReferences: [] }, candidates: [candidate],
  });
  assert.ok(missing.reasons.includes('RAW_EVIDENCE_REFERENCE_MISSING'));
});
test('duplicate source and mismatched asset fail closed', () => {
  const result = inspectFinanceFeatureMapping({
    snapshot, candidates: [candidate, { ...candidate, feature: {
      ...feature, assetId: 'crypto:ETH',
    } }],
  });
  assert.equal(result.state, 'BLOCKED');
  assert.ok(result.reasons.includes('DUPLICATE_FINANCE_SOURCE_FIELD'));
  assert.ok(result.reasons.includes('ASSET_IDENTITY_MISMATCH'));
});
test('source commit pin and freshness cannot be overridden', () => {
  assert.throws(() => inspectFinanceFeatureMapping({ snapshot, candidates: [{
    ...candidate, sourceCommit: 'b'.repeat(40) as typeof FINANCE_PINNED_SOURCE_SHA,
  }] }));
  const result = inspectFinanceFeatureMapping({ snapshot, candidates: [{
    ...candidate, feature: { ...feature, observedAt: now - 120000,
      provenance: { ...feature.provenance, observedAt: now - 120000,
        receivedAt: now - 119900, publishedAt: now - 119800 },
    },
  }] });
  assert.ok(result.reasons.includes('FEATURE_STALE'));
});
