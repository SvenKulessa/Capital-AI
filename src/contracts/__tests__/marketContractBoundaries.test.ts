import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InstrumentMasterSchema, inspectInstrumentMaster } from '../assetMasterInstrument';
import { ScoreResultSchema, type FeatureValue } from '../canonicalContracts';
import { DataPlausibilityValidator } from '../dataPlausibilityValidator';
import { ScoringEngineService } from '../../services/scoringEngine';
import { ShadowComponentRunnerRegistry } from '../../services/componentRunner';
import { CANONICAL_50_COMPONENTS } from '../analysisComponentRegistry';

// Synthetic inputs only. None of these identifiers, permissions or observations are live evidence.
const at = Date.parse('2026-10-08T12:00:00Z');
const provenance = {
  providerId: 'test-fixture', providerDataset: 'identity', observedAt: at - 3,
  receivedAt: at - 2, publishedAt: at - 1, latencyMs: 1, isDemo: true,
  isDelayed: false, sourceReference: 'TEST_ONLY', licenseScope: 'sandbox_demo' as const,
};
const base = {
  schemaVersion: 'CAPITAL_AI_INSTRUMENT_MASTER@1', assetId: 'TEST', symbol: 'TEST', name: 'TEST ONLY',
  venue: 'TEST', currency: 'USD', status: 'active', evaluatedAt: at, identityProvenance: provenance,
};
const derivative = { underlyingAssetId: 'UNDERLYING_TEST', expiryAt: at + 1000,
  contractMultiplier: 100, settlement: 'cash' };
const fixtures = [
  { ...base, productAssetClass: 'stocks', region: 'US', isin: null },
  { ...base, productAssetClass: 'etfs', isin: 'DE0000000001', shareClassId: 'TEST_SHARE' },
  { ...base, productAssetClass: 'indices', administrator: 'TEST_ADMIN', methodologyReference: 'TEST_METHOD', returnConvention: 'price' },
  { ...base, productAssetClass: 'crypto', baseAsset: 'BTC', quoteAsset: 'USD' },
  { ...base, productAssetClass: 'forex', baseCurrency: 'EUR', quoteCurrency: 'USD' },
  { ...base, productAssetClass: 'commodities', commodityId: 'TEST_COMMODITY', quotationUnit: 'ounce' },
  { ...base, ...derivative, productAssetClass: 'futures', deliveryUnit: 'TEST_UNIT' },
  { ...base, ...derivative, productAssetClass: 'options', strike: 100, optionType: 'call', exerciseStyle: 'european' },
  { ...base, productAssetClass: 'bonds', isin: 'DE0000000001', maturityAt: at + 1000, couponPercent: 0, faceValue: 1000 },
];

test('nine instrument descriptions preserve source and semantics without expanding scoring authority', () => {
  assert.equal(new Set(fixtures.map(x => x.productAssetClass)).size, 9);
  for (const input of fixtures) {
    const result = inspectInstrumentMaster(input);
    assert.equal(result.identityVerified, false);
    assert.equal(result.productionEligible, false);
    assert.equal(result.mapping.scoringEligible, false);
    assert.equal(result.mapping.rankingEligible, false);
    assert.deepEqual(result.instrument.identityProvenance, provenance);
    if (['etfs', 'indices', 'futures', 'options'].includes(input.productAssetClass))
      assert.equal(result.mapping.canonicalAssetClass, null);
  }
});

test('invalid derivative metadata, time, currency and cross-class fields fail closed', () => {
  const option = fixtures[7];
  for (const input of [
    { ...option, strike: -1 }, { ...option, contractMultiplier: 0 },
    { ...option, underlyingAssetId: base.assetId }, { ...option, expiryAt: at },
    { ...option, optionType: 'unknown' }, { ...option, deliveryUnit: 'wrong-class-field' },
    { ...fixtures[8], maturityAt: at - 1 }, { ...fixtures[4], quoteCurrency: 'EUR' },
    { ...fixtures[4], currency: 'USDT' }, { ...fixtures[3], quoteAsset: 'BTC' },
    { ...option, identityProvenance: { ...provenance, publishedAt: at + 1 } },
    { ...option, identityProvenance: { ...provenance, latencyMs: 100 } },
    { ...option, identityProvenance: { ...provenance, isDemo: false } },
  ]) assert.equal(InstrumentMasterSchema.safeParse(input).success, false);
  const { underlyingAssetId, ...missing } = option as typeof option & typeof derivative;
  assert.equal(InstrumentMasterSchema.safeParse(missing).success, false);
  assert.equal(InstrumentMasterSchema.safeParse({ ...option, status: 'delisted', expiryAt: at }).success, true);
});

const score = {
  componentId: 'data_quality_scorer', assetId: 'TEST', score: 75,
  scoreRange: { min: 0, max: 100 }, confidence: .95, status: 'computed',
  reasonCodes: [], inputFeatureIds: [], riskFlags: [], calculationVersion: '1.0.0',
  modelVersion: '2.0.0', computedAt: at, evidenceId: 'TEST_ONLY_NOT_PERSISTED',
};
test('component score requires model identity, declared bounds and explicit null unavailable states', () => {
  assert.equal(ScoreResultSchema.parse(score).modelVersion, '2.0.0');
  const { modelVersion, ...legacy } = score;
  assert.equal(ScoreResultSchema.safeParse(legacy).success, false);
  assert.equal(ScoreResultSchema.safeParse({ ...score, evidenceId: '' }).success, false);
  for (const input of [
    { ...score, score: null }, { ...score, status: 'stale' },
    { ...score, scoreRange: { min: 80, max: 90 } },
    { ...score, scoreRange: { min: 100, max: 0 } },
    { ...score, score: Number.POSITIVE_INFINITY },
  ]) assert.equal(ScoreResultSchema.safeParse(input).success, false);
  assert.equal(ScoreResultSchema.parse({ ...score, status: 'stale', score: null }).score, null);
});

test('one millisecond future data is rejected by scoring and plausibility checks', async t => {
  t.mock.method(Date, 'now', () => at);
  const asset = { assetId: 'TEST', symbol: 'TEST', name: 'TEST ONLY', assetClass: 'crypto' as const,
    venue: 'TEST', currency: 'USD', status: 'active' as const };
  const feature: FeatureValue = { featureId: 'rsi_14', assetId: 'TEST', value: 50, unit: 'index',
    normalizedValue: 50, observedAt: at + 1, calculationVersion: '1.0.0', qualityScore: 98,
    provenance: { ...provenance, providerId: 'capital_ai_demo_engine' } };
  const result = await ScoringEngineService.computeFinalScore(asset, new Map([[feature.featureId, feature]]), true);
  assert.ok(result.reasonCodes.includes('FEATURE_STALE_OR_TIMESTAMP_INVALID'));
  assert.equal(result.finalScore, null);
  assert.equal(result.eligibility, false);
  assert.ok(DataPlausibilityValidator.validateFinalRankResult({ ...result, computedAt: at + 1 }, at)
    .some(v => v.ruleId === 'PLAU-001-FUTURE-TIMESTAMP'));
  assert.ok(DataPlausibilityValidator.validateProvenance({ ...provenance, publishedAt: at + 1 }, at)
    .some(v => v.ruleId === 'PLAU-PROVENANCE-TIMESTAMP-INVALID'));
  assert.equal(DataPlausibilityValidator.validateProvenance(provenance, at).length, 0);
});

test('code-owned feature versions resolve references without promoting planned components', async () => {
  const entry = CANONICAL_50_COMPONENTS[0];
  const implementations = new Map(entry.featureDependencies.map(id => [id, '1.0.0']));
  const registry = new ShadowComponentRunnerRegistry(implementations);
  implementations.clear(); // caller mutation cannot change admission evidence
  const report = registry.admissionReport()[0];
  assert.ok(!report.reasonCodes.includes('FEATURE_REFERENCE_UNRESOLVED'));
  assert.equal(report.admissionAllowed, false);
  assert.ok(report.reasonCodes.includes('CONTRACT_REFERENCE_UNRESOLVED'));
  assert.throws(() => new ShadowComponentRunnerRegistry(new Map([['invented-feature', '1.0.0']])), /FEATURE_IMPLEMENTATION_IDENTITY_INVALID/);
  assert.throws(() => new ShadowComponentRunnerRegistry(new Map([[entry.featureDependencies[0], 'invalid']])), /FEATURE_IMPLEMENTATION_IDENTITY_INVALID/);
  let calls = 0;
  registry.register({ componentId: entry.componentId, calculationVersion: entry.calculationVersion,
    async execute() { calls++; throw new Error('MUST_NOT_RUN'); } });
  const snapshot = {
    runId: 'TEST', evaluatedAt: at, horizon: 'daily', regime: 'base', isDemo: true,
    asset: { assetId: 'TEST', symbol: 'TEST', name: 'TEST', assetClass: 'crypto' as const,
      currency: 'USD', venue: 'TEST', status: 'active' as const }, rights: [], rawInputReferences: [],
    features: entry.featureDependencies.map(featureId => ({ featureId, assetId: 'TEST', value: 1,
      unit: 'ratio', normalizedValue: 1, qualityScore: 98, observedAt: at + 1,
      calculationVersion: '2.0.0', provenance })),
  };
  const result = await registry.run(entry.componentId, snapshot);
  assert.equal(result.status, 'blocked');
  assert.ok(result.reasonCodes.includes('COMPONENT_INPUT_TIMESTAMP_INVALID'));
  assert.ok(result.reasonCodes.some(r => r.startsWith('COMPONENT_FEATURE_VERSION_MISMATCH:')));
  assert.equal(calls, 0);
  // Snapshot contents alone never establish code implementation coverage.
  assert.ok(new ShadowComponentRunnerRegistry().admissionReport()[0].reasonCodes.includes('FEATURE_REFERENCE_UNRESOLVED'));
});
