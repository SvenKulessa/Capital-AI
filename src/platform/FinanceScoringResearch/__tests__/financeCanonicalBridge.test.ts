import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScoringEngineService } from '../../../services/scoringEngine.ts';
import { SHADOW_SCORE_CONFIG_V1 } from '../../../config/shadowScoreConfig.ts';
import { FINANCE_PINNED_SOURCE_SHA } from '../../../contracts/financeResearchFeatureBridge.ts';

const now = Date.parse('2026-10-08T12:00:00.000Z');
const provider = 'test-provider';
const evidenceRef = 'evidence://finance-rsi';
const feature = {
  featureId: 'rsi_14', assetId: 'crypto:BTC', value: 51, unit: 'index',
  normalizedValue: 51, observedAt: now - 1000, calculationVersion: '1.0.0', qualityScore: 98,
  provenance: { providerId: provider, providerDataset: 'ohlc',
    observedAt: now - 1000, receivedAt: now - 900, publishedAt: now - 800,
    latencyMs: 100, isDelayed: false, isDemo: false,
    sourceReference: evidenceRef, licenseScope: 'public_realtime' as const },
};
const snapshot = {
  runId: 'finance-shadow-bridge-test', evaluatedAt: now, horizon: '1d', regime: 'baseline',
  isDemo: false, asset: { assetId: 'crypto:BTC', symbol: 'BTC',
    name: 'Bitcoin', assetClass: 'crypto' as const,
    venue: 'BINANCE', currency: 'USD', status: 'active' as const },
  features: [], rights: [], rawInputReferences: [evidenceRef],
};
const candidate = {
  sourceRepository: 'SvenKulessa/Finance' as const,
  sourceCommit: FINANCE_PINNED_SOURCE_SHA, sourceField: 'technical.rsi14',
  sourceEvidenceRef: evidenceRef, feature,
};
test('canonical ScoringEngine rejects Finance inputs without independent provider rights', () => {
  const out = ScoringEngineService.inspectFinanceSourceForShadow({
    snapshot, candidates: [candidate], config: SHADOW_SCORE_CONFIG_V1,
  });
  assert.equal(out.state, 'SOURCE_EVIDENCE_BLOCKED');
  assert.ok(out.reasonCodes.includes('PROVIDER_RIGHTS_MISSING'));
  assert.equal(out.shadow, null);
  assert.equal(out.scoreEligible, false);
  assert.equal(out.rankEligible, false);
  assert.equal(out.decisionEligible, false);
  assert.equal(out.productionEligible, false);
});
test('source identity and rights cannot be bypassed by supplying unrelated native features', () => {
  const invalid = { ...candidate, feature: {...feature, assetId:'crypto:ETH'} };
  const out = ScoringEngineService.inspectFinanceSourceForShadow({
    snapshot, candidates:[invalid], config: SHADOW_SCORE_CONFIG_V1,
  });
  assert.ok(out.reasonCodes.includes('ASSET_IDENTITY_MISMATCH'));
  assert.equal(out.shadow, null);
});
