import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SHADOW_SCORE_CONFIG_V1 } from '../../config/shadowScoreConfig';
import { PipelineConfiguratorService, ShadowConfigurationHistory } from '../../services/pipelineConfigurator';
import { ShadowPipelineConfigSchema, type PipelineSnapshot, type ShadowPipelineConfig } from '../pipelineExecution';
import { ScoringEngineService } from '../../services/scoringEngine';
import { EvidenceEngineService } from '../../services/evidenceEngine';
import { ShadowPipelineService, type ShadowStageTelemetry } from '../../services/shadowPipeline';
import { InMemoryFeatureSnapshotStore } from '../../services/featureStore';
import { ShadowComponentRunnerRegistry } from '../../services/componentRunner';
import { FileShadowEvidenceStore } from '../../../server/shadow-evidence-store.mjs';
import { DataPlausibilityValidator } from '../dataPlausibilityValidator';
import { MarketDataRightsEvidenceSchema } from '../marketDataRightsEligibility';

// Deliberately fabricated isolated test fixtures: never provider or production evidence.
function fixture(): { snapshot: PipelineSnapshot; config: ShadowPipelineConfig } {
  const config = structuredClone(SHADOW_SCORE_CONFIG_V1), now = 1_790_000_000_000;
  config.providers = ['test-provider-a', 'test-provider-b'].map((providerId, priority) => ({ providerId,
    enabled: true, priority, featureFamilies: ['momentum', 'technical', 'fundamental', 'sentiment', 'event', 'positioning'],
    refreshIntervalMs: 1000, maxStalenessMs: 30000, retryCount: 0, timeoutMs: 1000, fallbackProviderIds: [] }));
  const asset = { assetId: 'test-asset', symbol: 'TEST', name: 'TEST FIXTURE', assetClass: 'crypto' as const,
    venue: 'TEST', currency: 'USD', status: 'active' as const };
  const required = [...Object.values(config.featureIds), ...Object.values(config.riskFeatureIds), ...config.hardGateFeatureIds];
  const features = config.providers.flatMap(p => required.map(featureId => ({ featureId, assetId: asset.assetId,
    value: config.hardGateFeatureIds.includes(featureId) ? 1 : Object.values(config.riskFeatureIds).includes(featureId) ? 10 : 80,
    unit: 'test-index', normalizedValue: 80, observedAt: now - 30, calculationVersion: '1.0.0', qualityScore: 100,
    provenance: { providerId: p.providerId, providerDataset: 'fixture', observedAt: now - 30, receivedAt: now - 20,
      publishedAt: now - 10, latencyMs: 10, isDelayed: false, isDemo: false,
      sourceReference: 'TEST-FIXTURE-NON-PRODUCTION', licenseScope: 'commercial_redistribution' as const } })));
  const rights = config.providers.map(p => MarketDataRightsEvidenceSchema.parse({ providerId: p.providerId, applicableEntityAndRegion: 'TEST',
    subscriptionTierAndAddOns: 'TEST', feedsSymbolsAndVenues: ['fixture:TEST:TEST'], contractOrPermissionReference: 'TEST-ONLY',
    validUntil: null, reviewedAt: new Date(now - 1000).toISOString(), scientificResearchTdm: null,
    permissions: Object.fromEntries(['internal_analysis', 'scientific_research_tdm', 'public_display', 'api_redistribution',
      'derived_scoring_research', 'cache_retention', 'export_resale'].map(k => [k,
      { allowed: true, evidenceReference: 'TEST-ONLY', obligations: [] }])) }));
  return { config, snapshot: { runId: 'test-run', evaluatedAt: now, horizon: '1d', regime: 'baseline',
    isDemo: false, asset, features, rights, rawInputReferences: ['TEST-ONLY'] } };
}

test('configuration edits revoke approval and unadmitted provider enablement fails closed', () => {
  const c = new PipelineConfiguratorService(), initial = c.getActiveConfig();
  assert.equal(initial.isApprovedForProduction, false);
  initial.stages.stage_01_ingestion.retryCount = 99;
  assert.equal(c.getActiveConfig().stages.stage_01_ingestion.retryCount, 3);
  const old = c.getRevisionHistory();
  c.updateActiveConfig({ isApprovedForProduction: true }, 'test');
  assert.equal(c.getActiveConfig().isApprovedForProduction, false);
  assert.throws(() => c.toggleProvider('test-provider', true), /OPEN_SOURCE_OPEN_DATA_ADMISSION_REQUIRED/);
  assert.equal(c.getActiveConfig().activeProviders.length, 0);
  assert.equal(c.getRevisionHistory().length, 2);
  assert.deepEqual(c.getRevisionHistory()[0], old[0]);
});
test('configuration revisions reject same-version content changes and isolate returned objects', async () => {
  const history = new ShadowConfigurationHistory(), { config } = fixture();
  const first = await history.append(config);
  first.config.providers[0].enabled = false;
  assert.equal(history.history()[0].config.providers[0].enabled, true);
  await history.append(config);
  assert.equal(history.history().length, 1);
  await assert.rejects(history.append({ ...config, maxRiskScore: 50 }), /CONFIG_VERSION_REUSE/);
  const next = await history.append({ ...config, version: '1.0.1', maxRiskScore: 50 });
  assert.deepEqual(history.diff(history.history()[0], next), ['maxRiskScore', 'version']);
});
test('production, invalid weights, duplicate providers, unknown fields and reordered stages fail schema', () => {
  const { config } = fixture();
  for (const bad of [{ mode: 'production' }, { productionApproved: true }, { minimumConfidence: .5 },
    { providers: [...config.providers, config.providers[0]] }, { stages: [...config.stages].reverse() }, { extra: true },
    { profiles: [{ ...config.profiles[0], weights: { ...config.profiles[0].weights, momentum: 1 } }] }])
    assert.equal(ShadowPipelineConfigSchema.safeParse({ ...config, ...bad }).success, false);
});
test('shadow formula is exact, bounded, explainable and never publishable', () => {
  const { snapshot, config } = fixture();
  const result = ScoringEngineService.computeShadowScore(snapshot, config);
  assert.ok(Math.abs(result.confidence - .999) < 1e-9);
  assert.ok(Math.abs(result.candidateScore! - (80 * .999 - 10)) < 1e-9);
  assert.equal(result.drivers.length, 6);
  assert.equal(result.eligibility, false); assert.equal(result.publishable, false); assert.equal(result.rank, null);
  assert.deepEqual(result.reasonCodes, []);
  assert.equal(result.computedAt, snapshot.evaluatedAt);
});
for (const mutation of ['missing', 'future', 'stale', 'lowQuality', 'veto', 'disagreement', 'wrongUnit',
  'wrongAsset', 'missingRights', 'wrongFeed', 'futureRights', 'obligations', 'oneProvider', 'duplicate', 'mixedDemo', 'unknownHorizon'] as const)
  test(`${mutation} cannot produce a shadow candidate`, () => {
    const { snapshot, config } = fixture();
    const first = snapshot.features[0];
    if (mutation === 'missing') snapshot.features = snapshot.features.filter(f => f.featureId !== first.featureId);
    if (mutation === 'future') first.provenance.observedAt = snapshot.evaluatedAt + 1;
    if (mutation === 'stale') first.observedAt = snapshot.evaluatedAt - 31000;
    if (mutation === 'lowQuality') first.qualityScore = 20;
    if (mutation === 'veto') snapshot.features.find(f => f.featureId === config.riskFeatureIds.manipulation)!.value = 100;
    if (mutation === 'disagreement') first.normalizedValue = 1;
    if (mutation === 'wrongUnit') first.unit = 'wrong-unit';
    if (mutation === 'wrongAsset') first.assetId = 'wrong';
    if (mutation === 'missingRights') snapshot.rights = [];
    if (mutation === 'wrongFeed') snapshot.rights[0].feedsSymbolsAndVenues = ['different:TEST:TEST'];
    if (mutation === 'futureRights') snapshot.rights[0].reviewedAt = new Date(snapshot.evaluatedAt + 1).toISOString();
    if (mutation === 'obligations') snapshot.rights[0].permissions.internal_analysis.obligations.push('TEST-OBLIGATION');
    if (mutation === 'oneProvider') snapshot.features = snapshot.features.filter(f => f.provenance.providerId === 'test-provider-a');
    if (mutation === 'duplicate') snapshot.features.push(structuredClone(first));
    if (mutation === 'mixedDemo') first.provenance.isDemo = true;
    if (mutation === 'unknownHorizon') snapshot.horizon = 'unknown';
    const result = ScoringEngineService.computeShadowScore(snapshot, config);
    assert.equal(result.candidateScore, null); assert.ok(result.reasonCodes.length > 0);
    assert.equal(result.publishable, false);
  });
test('all six independent risk families veto high opportunity scores', () => {
  for (const featureId of Object.values(SHADOW_SCORE_CONFIG_V1.riskFeatureIds)) {
    const { snapshot, config } = fixture(); snapshot.features.find(f => f.featureId === featureId)!.value = 90;
    assert.equal(ScoringEngineService.computeShadowScore(snapshot, config).candidateScore, null);
  }
});
test('explicit demo has zero confidence, no candidate and no publishability', () => {
  const { snapshot, config } = fixture(); snapshot.isDemo = true;
  // Remove second provider to avoid duplicate demo identities.
  snapshot.features = snapshot.features.filter(f => f.provenance.providerId === 'test-provider-a');
  for (const f of snapshot.features) Object.assign(f.provenance, { isDemo: true, providerId: 'capital_ai_demo_engine', licenseScope: 'sandbox_demo' });
  const result = ScoringEngineService.computeShadowScore(snapshot, config);
  assert.equal(result.confidence, 0); assert.equal(result.candidateScore, null);
  assert.ok(result.reasonCodes.includes('DEMO_NOT_ACTIONABLE'));
});
test('component registry blocks all 50 unimplemented entries without executing a fabricated runner', async () => {
  const { snapshot, config } = fixture(), runners = new ShadowComponentRunnerRegistry();
  for (const id of config.componentIds) {
    const result = await runners.run(id, snapshot);
    assert.equal(result.status, 'blocked'); assert.equal(result.score, null);
    assert.ok(result.reasonCodes.includes('COMPONENT_IMPLEMENTATION_MISSING'));
  }
  assert.throws(() => runners.register({ componentId: 'invented', calculationVersion: '1.0.0',
    execute: async () => { throw new Error('MUST NOT RUN'); } }), /RUNNER_IDENTITY_MISMATCH/);
});
test('full persisted run replays identically across a new store instance and reordered features', async () => {
  const root = await mkdtemp(join(tmpdir(), 'capital-shadow-'));
  try {
    const { snapshot, config } = fixture();
    const service = new ShadowPipelineService(new FileShadowEvidenceStore(root));
    const run = await service.run(snapshot, config);
    assert.equal(run.result.candidateScore, null); assert.equal(run.result.components.length, 50);
    assert.ok(run.result.reasonCodes.includes('COMPONENT_COHORT_BLOCKED'));
    const restarted = new ShadowPipelineService(new FileShadowEvidenceStore(root));
    assert.deepEqual(await restarted.replay(run.evidenceId), run);
    snapshot.features.reverse(); snapshot.rights.reverse();
    assert.deepEqual(await restarted.run(snapshot, config), run);
    assert.match(run.evidenceId, /^EVD-[a-f0-9]{64}$/);
    const changed = structuredClone(snapshot); changed.evaluatedAt++;
    assert.notEqual((await service.run(changed, config)).evidenceId, run.evidenceId);
    await writeFile(join(root, `${run.evidenceId}.json`), '{}', { mode: 0o600 });
    await assert.rejects(restarted.replay(run.evidenceId), /EVIDENCE_HASH_MISMATCH/);
    await assert.rejects(restarted.replay('../traversal'), /EVIDENCE_ID_INVALID/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('storage readback mismatch prevents returning any score evidence', async () => {
  const { snapshot, config } = fixture();
  const service = new ShadowPipelineService({ putImmutable: async () => {}, get: async () => null });
  await assert.rejects(service.run(snapshot, config), /EVIDENCE_READBACK_FAILED/);
});
test('even rehashed fabricated result evidence fails deterministic replay', async () => {
  const root = await mkdtemp(join(tmpdir(), 'capital-shadow-tamper-'));
  try {
    const store = new FileShadowEvidenceStore(root), service = new ShadowPipelineService(store);
    const { snapshot, config } = fixture(), run = await service.run(snapshot, config);
    const fabricated = JSON.parse((await store.get(run.evidenceId))!);
    fabricated.result.candidateScore = 100;
    const body = EvidenceEngineService.canonicalJson(fabricated);
    const fakeId = `EVD-${await EvidenceEngineService.sha256(body)}`;
    await store.putImmutable(fakeId, body);
    await assert.rejects(service.replay(fakeId), /REPLAY_DIVERGENCE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('telemetry measures only offline stages and stays outside deterministic evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'capital-shadow-telemetry-'));
  try {
    const events: ShadowStageTelemetry[] = [], { snapshot, config } = fixture();
    const store = new FileShadowEvidenceStore(root);
    const traced = new ShadowPipelineService(store, undefined, e => events.push(e));
    const run = await traced.run(snapshot, config);
    assert.deepEqual(events.map(e => e.stageId), ['stage_03_validation', 'stage_05_scoring', 'stage_07_evidence']);
    assert.ok(events.every(e => e.scope === 'offline_shadow' && e.outcome === 'ok' && Number.isFinite(e.durationMs) && e.durationMs >= 0));
    assert.deepEqual(await new ShadowPipelineService(store).run(snapshot, config), run);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('feature snapshot copies are isolated and overwrite is rejected', async () => {
  const { snapshot } = fixture(), store = new InMemoryFeatureSnapshotStore();
  await store.putImmutable('test', snapshot.features);
  const read = await store.get('test'); (read![0] as any).value = 999;
  assert.notEqual((await store.get('test'))![0].value, 999);
  await assert.rejects(store.putImmutable('test', snapshot.features), /SNAPSHOT_ID_REUSE/);
});
test('canonical hashes ignore object insertion order and reject non-finite evidence', async () => {
  assert.equal(await EvidenceEngineService.fingerprint({ b: 2, a: 1 }), await EvidenceEngineService.fingerprint({ a: 1, b: 2 }));
  assert.throws(() => EvidenceEngineService.canonicalJson({ score: NaN }), /NON_CANONICAL/);
});
test('unsupported model version and mutation of the versioned baseline fail closed', () => {
  const { snapshot, config } = fixture();
  assert.throws(() => ScoringEngineService.computeShadowScore(snapshot, { ...config, modelVersion: '9.9.9' }), /MODEL_VERSION_UNSUPPORTED/);
  assert.throws(() => { SHADOW_SCORE_CONFIG_V1.profiles[0].weights.momentum = 1; }, TypeError);
});
test('plausibility confidence threshold matches final rank contract', () => {
  const r = { assetId: 'test', computedAt: Date.now(), eligibility: true, rank: 1, confidence: .89,
    finalScore: 50, subScores: {}, topPositiveDrivers: [], topNegativeDrivers: [], evidenceId: 'EVD-test', isDemo: false };
  assert.ok(DataPlausibilityValidator.validateFinalRankResult(r as any).some(v => v.ruleId === 'PLAU-003-LOW-CONFIDENCE-RANK-PUBLISHED'));
});
