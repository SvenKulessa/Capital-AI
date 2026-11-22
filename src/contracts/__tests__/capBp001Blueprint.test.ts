import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_50_COMPONENTS } from '../analysisComponentRegistry';
import { CAP_BP_001_BLUEPRINT, CAP_BP_001_MODULE_IDS,
  CapBp001BlueprintSchema, CapBp001SyntheticInputSchema, CapBp001SyntheticResultSchema,
  evaluateCapBp001Synthetic } from '../capBp001Blueprint';

const NOW = 1_700_000_005_000;
const fixture = () => ({
  schemaVersion: 'CAP_BP_001_INPUT@1', componentId: 'market_integrity_gate',
  mode: 'offline_synthetic', isDemo: true, provenance: 'SYNTHETIC', rights: 'sandbox_demo',
  assetId: 'BTC-TEST', venue: 'TEST-VENUE', evaluatedAt: NOW, expectedIntervalMs: 1000,
  exchange: { state: 'open', observedAt: NOW - 500 },
  ticks: [
    { sequence: 10, observedAt: NOW - 2000, bid: 100, ask: 100.1 },
    { sequence: 11, observedAt: NOW - 1000, bid: 100.05, ask: 100.15 },
  ],
});
const run = (change?: (input: ReturnType<typeof fixture>) => void) => {
  const input = fixture();
  change?.(input);
  return evaluateCapBp001Synthetic(input);
};
const blocked = (reason: string, change: (input: ReturnType<typeof fixture>) => void) => {
  const result = run(change);
  assert.equal(result.state, 'BLOCKED');
  assert.ok(result.reasonCodes.some(code => code === reason), JSON.stringify(result.reasonCodes));
  assert.equal(result.score, null);
  assert.equal(result.productionEligible, false);
};
test('14 ordered modules bind canonical registry and remain conceptual', () => {
  const registry = CANONICAL_50_COMPONENTS.find(c => c.componentId === 'market_integrity_gate')!;
  assert.equal(CAP_BP_001_BLUEPRINT.modules.length, 14);
  assert.deepEqual(CAP_BP_001_BLUEPRINT.modules.map(m => m.id), [...CAP_BP_001_MODULE_IDS]);
  assert.equal(CAP_BP_001_BLUEPRINT.calculationVersion, registry.calculationVersion);
  assert.equal(CAP_BP_001_BLUEPRINT.registryLifecycle, registry.status);
  assert.equal(CAP_BP_001_BLUEPRINT.registryProvenance, registry.provenanceMode);
  assert.ok(CAP_BP_001_BLUEPRINT.modules.every(m => m.status === 'CONCEPT' && m.runtimeEvidence === 'NOT_PROVEN'));
});
test('duplicate, missing, injected or falsely active modules are rejected', () => {
  const duplicate = structuredClone(CAP_BP_001_BLUEPRINT);
  duplicate.modules[1] = structuredClone(duplicate.modules[0]);
  assert.equal(CapBp001BlueprintSchema.safeParse(duplicate).success, false);
  const missing = structuredClone(CAP_BP_001_BLUEPRINT);
  missing.modules.pop();
  assert.equal(CapBp001BlueprintSchema.safeParse(missing).success, false);
  assert.equal(CapBp001BlueprintSchema.safeParse({ ...CAP_BP_001_BLUEPRINT, unknown: true }).success, false);
  assert.equal(CapBp001BlueprintSchema.safeParse({ ...CAP_BP_001_BLUEPRINT, registryLifecycle: 'active' }).success, false);
});
test('valid synthetic replay is deterministic yet never production eligible', () => {
  const input = fixture();
  assert.equal(CapBp001SyntheticInputSchema.safeParse(input).success, true);
  const a = evaluateCapBp001Synthetic(input);
  assert.deepEqual(a, evaluateCapBp001Synthetic(structuredClone(input)));
  assert.equal(a.state, 'DEMO_ONLY');
  assert.deepEqual(a.reasonCodes, []);
  assert.equal(a.fixtureCompleteness, 1);
  assert.equal(a.jitterMs, 0);
  assert.equal(a.confidence, 0);
  assert.equal(a.score, null);
  assert.equal(a.rank, null);
  assert.equal(a.productionEligible, false);
  assert.equal(a.decisionEligible, false);
  assert.equal(a.publishable, false);
  assert.equal(a.evidence.sourceSha, null);
});
test('crossed books', () => blocked('MIG_CROSSED_BOOK', x => { x.ticks[1].bid = 100.2; }));
test('sequence gaps', () => blocked('MIG_SEQUENCE_GAP', x => { x.ticks[1].sequence = 13; }));
test('duplicate sequence', () => blocked('MIG_SEQUENCE_GAP', x => { x.ticks[1].sequence = 10; }));
test('timestamp regression', () => blocked('MIG_TIMESTAMP_REGRESSION', x => { x.ticks[1].observedAt = NOW - 3000; }));
test('timestamp jitter', () => blocked('MIG_TIMESTAMP_JITTER', x => { x.ticks[1].observedAt = NOW - 500; }));
test('future tick', () => blocked('MIG_TIMESTAMP_FUTURE', x => { x.ticks[1].observedAt = NOW + 100; }));
test('future exchange state', () => blocked('MIG_TIMESTAMP_FUTURE', x => { x.exchange.observedAt = NOW + 100; }));
test('stale tick', () => blocked('MIG_STALE_SNAPSHOT', x => { x.ticks[0].observedAt = NOW - 6000; }));
test('stale exchange state', () => blocked('MIG_STALE_SNAPSHOT', x => { x.exchange.observedAt = NOW - 6000; }));
test('halted and unknown exchange states', () => {
  for (const state of ['halted', 'unknown']) blocked('MIG_EXCHANGE_NOT_OPEN', x => { x.exchange.state = state; });
});
test('insufficient observations', () => blocked('MIG_INSUFFICIENT_DATA', x => { x.ticks.pop(); }));
test('malformed, live, invalid rights and injected inputs fail closed', () => {
  const invalid = [
    null, {}, { ...fixture(), mode: 'live' }, { ...fixture(), isDemo: false },
    { ...fixture(), provenance: 'live' }, { ...fixture(), rights: 'unknown' },
    { ...fixture(), schemaVersion: 'CAP_BP_001_INPUT@2' },
    { ...fixture(), apiKey: 'SECRET' },
    { ...fixture(), ticks: [{ sequence: 1, observedAt: NOW - 100, bid: NaN, ask: 101 }] },
    { ...fixture(), ticks: Array.from({ length: 101 }, (_, i) => ({ sequence: i, observedAt: NOW - i, bid: 1, ask: 2 })) },
  ];
  for (const input of invalid) {
    const result = evaluateCapBp001Synthetic(input);
    assert.equal(result.state, 'BLOCKED');
    assert.deepEqual(result.reasonCodes, ['MIG_INPUT_SCHEMA_INVALID']);
    assert.equal(result.spreadBps, null);
    assert.equal(result.publishable, false);
  }
});
test('result schema rejects fabricated production status and evidence', () => {
  const result = run();
  for (const change of [
    { score: 99 }, { confidence: 0.99 }, { productionEligible: true },
    { decisionEligible: true }, { rankEligible: true }, { publishable: true },
    { rank: 1 }, { isDemo: false }, { state: 'ACTIVE' },
    { evidence: { ...result.evidence, sourceSha: 'fabricated' } }, { extra: true },
  ]) {
    assert.equal(CapBp001SyntheticResultSchema.safeParse({ ...result, ...change }).success, false);
  }
});
