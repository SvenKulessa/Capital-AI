import { test } from 'node:test';
import './shadowPipeline.test';
import './rawFeatureCalculation.test';
import './marketIntelligenceReadiness.test';
import './marketTaxonomyResearchGates.test';
import './marketContractBoundaries.test';
import './binanceRetiredTicker.test';
import assert from 'node:assert/strict';
import { CANONICAL_50_COMPONENTS } from '../analysisComponentRegistry';
import { validateAnalysisComponentRegistry } from '../analysisComponentRegistryValidator';
import { FinalRankResultSchema, type AssetIdentity } from '../canonicalContracts';
import { ExplicitDemoAdapter } from './fixtures/demoAdapter';
import { FeatureStoreService } from './fixtures/demoFeatureStore';
import { ScoringEngineService } from '../../services/scoringEngine';
import { analysisComponentRuntimeGate, parseAnalysisComponentFlags } from '../../config/analysisComponentFlags';

const asset: AssetIdentity = { assetId: 'aapl_test', symbol: 'AAPL', name: 'Apple Test',
  assetClass: 'equity_us', venue: 'NASDAQ', currency: 'USD', status: 'active' };
async function demo() {
  const observation = await new ExplicitDemoAdapter().fetchObservation(asset);
  return { observation, features: new FeatureStoreService().extractFeatures({ asset, observation }) };
}
function nonActionable(result: Awaited<ReturnType<typeof ScoringEngineService.computeFinalScore>>) {
  assert.equal(result.eligibility, false); assert.equal(result.rank, null);
  assert.equal(result.scoreEligible, false); assert.equal(result.rankEligible, false); assert.equal(result.alertEligible, false); assert.equal(result.decisionEligible, false);
}

test('all 50 entries are quarantined with truthful availability and no invented validation date', () => {
  assert.equal(CANONICAL_50_COMPONENTS.length, 50);
  assert.equal(new Set(CANONICAL_50_COMPONENTS.map(c => c.componentId)).size, 50);
  assert.deepEqual(['planned', 'mock', 'blocked'].map(status => CANONICAL_50_COMPONENTS.filter(c => c.status === status).length), [45, 0, 5]);
  for (const c of CANONICAL_50_COMPONENTS) {
    assert.equal(c.lastValidatedAt, null);
    assert.equal(c.provenanceMode, c.status === 'mock' ? 'simulated' : 'unavailable');
  }
});
test('provider registration and production admission are distinct activation blockers', () => {
  const report = validateAnalysisComponentRegistry();
  assert.equal(report.schemaValid, true); assert.equal(report.activationAllowed, false);
  for (const code of ['CONTRACT_REFERENCE_UNRESOLVED', 'PROVIDER_REFERENCE_UNRESOLVED',
    'PROVIDER_NOT_PRODUCTION_ADMITTED', 'FEATURE_REFERENCE_UNRESOLVED', 'ASSET_CLASS_UNRESOLVED'])
    assert.ok(report.issues.some(i => i.code === code));
  assert.ok(report.issues.some(i => i.reference === 'binance' && i.code === 'PROVIDER_NOT_PRODUCTION_ADMITTED'));
  assert.ok(!report.issues.some(i => i.reference === 'binance' && i.code === 'PROVIDER_REFERENCE_UNRESOLVED'));
});
test('malformed, duplicate and falsely active entries cannot be admitted', () => {
  assert.equal(validateAnalysisComponentRegistry([{}]).schemaValid, false);
  const entries = structuredClone(CANONICAL_50_COMPONENTS);
  entries[1].componentId = entries[0].componentId;
  entries[0].status = 'active'; entries[0].providerDependencies = ['__proto__'];
  const report = validateAnalysisComponentRegistry(entries);
  assert.equal(report.activationAllowed, false);
  for (const code of ['DUPLICATE_COMPONENT_ID', 'ACTIVE_COMPONENT_WITHOUT_VALIDATION', 'PROVIDER_REFERENCE_UNRESOLVED'])
    assert.ok(report.issues.some(i => i.code === code));
});
test('a verified price produces no synthetic live features', async () => {
  const { observation } = await demo();
  observation.provenance = { ...observation.provenance, providerId: 'open_data_candidate_unverified', isDemo: false, licenseScope: 'public_realtime' };
  const features = new FeatureStoreService().extractFeatures({ asset, observation });
  assert.equal(features.size, 0);
  const result = await ScoringEngineService.computeFinalScore(asset, features);
  assert.equal(result.finalScore, null); assert.equal(result.dataAvailability, 'unavailable');
  assert.equal(result.resultStatus, 'insufficient_data'); nonActionable(result);
});
test('explicit demo remains reproducible, has no measured confidence and cannot rank/alert', async () => {
  const { features } = await demo();
  const result = await ScoringEngineService.computeFinalScore(asset, features, true);
  const repeated = await ScoringEngineService.computeFinalScore(asset, features, true);
  assert.equal(result.resultStatus, 'demo_fallback'); assert.equal(result.dataAvailability, 'simulated');
  assert.equal(typeof result.finalScore, 'number'); assert.equal(result.finalScore, repeated.finalScore);
  assert.equal(result.confidence, 0); assert.ok(!result.evidenceId.startsWith('EVD-')); nonActionable(result);
  for (const feature of features.values()) {
    assert.equal(feature.provenance.isDemo, true); assert.equal(feature.provenance.licenseScope, 'sandbox_demo');
    assert.equal(feature.qualityScore, 0);
  }
});
test('demo features cannot be promoted by requesting a live result', async () => {
  const { features } = await demo();
  const result = await ScoringEngineService.computeFinalScore(asset, features, false);
  assert.equal(result.isDemo, true); assert.equal(result.finalScore, null);
  assert.ok(result.reasonCodes.includes('DEMO_MODE_MISMATCH')); nonActionable(result);
});
test('mixed demo/live provenance is rejected even when demo is requested', async () => {
  const { features } = await demo();
  const f = features.get('rsi_14')!;
  f.provenance = { ...f.provenance, isDemo: false, providerId: 'open_data_candidate_unverified', licenseScope: 'public_realtime' };
  const result = await ScoringEngineService.computeFinalScore(asset, features, true);
  assert.equal(result.finalScore, null); assert.ok(result.reasonCodes.includes('DEMO_MODE_MISMATCH')); nonActionable(result);
});
test('missing event data has no constant baseline or neutral fallback', async () => {
  const { features } = await demo(); features.delete('event_impact_score');
  const result = await ScoringEngineService.computeFinalScore(asset, features, true);
  assert.equal(result.subScores.eventScore, null); assert.equal(result.finalScore, null);
  assert.ok(result.reasonCodes.includes('REQUIRED_INPUT_MISSING:event_impact_score')); nonActionable(result);
});
for (const status of ['halted', 'delisted', 'unverified'] as const) test(`${status} assets remain blocked`, async () => {
  const { features } = await demo();
  const result = await ScoringEngineService.computeFinalScore({ ...asset, status }, features, true);
  assert.equal(result.finalScore, null); assert.ok(result.reasonCodes.includes('ASSET_NOT_TRADABLE')); nonActionable(result);
});
test('high opportunity features never hide a manipulation veto', async () => {
  const { features } = await demo();
  for (const f of features.values()) f.normalizedValue = 100;
  features.get('bot_manipulation_risk_index')!.value = 90;
  const result = await ScoringEngineService.computeFinalScore(asset, features, true);
  assert.equal(result.finalScore, null); assert.equal(result.resultStatus, 'blocked_by_risk'); nonActionable(result);
});
for (const corruption of ['stale', 'future', 'nan', 'identity', 'demo_license'] as const) test(`${corruption} feature cannot enter a score`, async () => {
  const { features } = await demo(); const f = features.get('rsi_14')!;
  if (corruption === 'stale') f.observedAt = Date.now() - 60_000;
  if (corruption === 'future') f.provenance.observedAt = Date.now() + 60_000;
  if (corruption === 'nan') f.normalizedValue = NaN;
  if (corruption === 'identity') f.assetId = 'different_asset';
  if (corruption === 'demo_license') f.provenance.licenseScope = 'public_realtime';
  const result = await ScoringEngineService.computeFinalScore(asset, features, true);
  assert.equal(result.finalScore, null); assert.equal(result.subScores.momentumScore, null); nonActionable(result);
});
test('high-quality alleged live features cannot bypass missing liquidity and registry/evidence gates', async () => {
  const { features } = await demo();
  for (const f of features.values()) {
    f.qualityScore = 100;
    f.provenance = { ...f.provenance, isDemo: false, providerId: 'open_data_candidate_unverified', licenseScope: 'public_realtime' };
  }
  const result = await ScoringEngineService.computeFinalScore(asset, features);
  assert.equal(result.finalScore, null);
  for (const reason of ['REQUIRED_INPUT_MISSING:liquidity_eligible', 'COMPONENT_NOT_ACTIVE:market_integrity_gate', 'EVIDENCE_REPLAY_UNAVAILABLE'])
    assert.ok(result.reasonCodes.includes(reason));
  nonActionable(result);
});
test('result contract rejects demo eligibility and a numeric unavailable score', async () => {
  const { features } = await demo(); const result = await ScoringEngineService.computeFinalScore(asset, features, true);
  assert.equal(FinalRankResultSchema.safeParse({ ...result, rank: 1, rankEligible: true }).success, false);
  assert.equal(FinalRankResultSchema.safeParse({ ...result, resultStatus: 'insufficient_data' }).success, false);
});

test('unavailable data and low confidence cannot be admitted as actionable computed results', async () => {
  const { features } = await demo(); const result = await ScoringEngineService.computeFinalScore(asset, features, true);
  const alleged = { ...result, isDemo: false, resultStatus: 'computed', eligibility: true,
    scoreEligible: true, rankEligible: true, alertEligible: true, decisionEligible: true, rank: 1 };
  assert.equal(FinalRankResultSchema.safeParse({ ...alleged, dataAvailability: 'unavailable', confidence: 1 }).success, false);
  assert.equal(FinalRankResultSchema.safeParse({ ...alleged, dataAvailability: 'live', confidence: .1 }).success, false);
});


test('analysis component feature flags are fail-closed and reject wildcard or unknown IDs', () => {
  assert.deepEqual(parseAnalysisComponentFlags(undefined), { requested: [], enabled: [], unknown: [] });
  const configured = parseAnalysisComponentFlags('market_integrity_gate,*,unknown_component');
  assert.deepEqual(configured.enabled, ['market_integrity_gate']);
  assert.deepEqual(configured.unknown, ['*', 'unknown_component']);
  assert.equal(analysisComponentRuntimeGate('market_integrity_gate', undefined).runtimeEligible, false);
});

test('feature flag opt-in cannot override canonical activation blockers', () => {
  const gate = analysisComponentRuntimeGate('market_integrity_gate', 'market_integrity_gate');
  assert.equal(gate.flagEnabled, true);
  assert.equal(gate.runtimeEligible, false);
  assert.ok(gate.reasons.includes('COMPONENT_NOT_ACTIVE'));
  assert.ok(gate.reasons.some(reason => reason === 'CONTRACT_REFERENCE_UNRESOLVED' || reason === 'FEATURE_REFERENCE_UNRESOLVED'));
});
