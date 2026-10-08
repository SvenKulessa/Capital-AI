import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProductAssetClassSchema, resolveProductAssetMapping } from '../marketAssetTaxonomy';
import { inspectResearchGateCohort } from '../../services/marketResearchGateDiagnostics';
import { CANONICAL_50_COMPONENTS } from '../analysisComponentRegistry';

function assetMapping(productAssetClass: string, region: string | null = null) {
  return { assetId: 'test-asset', symbol: 'FIXTURE', name: 'Fixture only',
    productAssetClass, venue: 'TEST', currency: 'USD', region, subclass: null, status: 'active' };
}

test('nine UI asset classes are explicit; no unsupported type is silently coerced', () => {
  assert.equal(ProductAssetClassSchema.options.length, 9);
  const expected: Record<string, string | null> = {
    stocks: 'equity_us', etfs: null, indices: null, crypto: 'crypto',
    forex: 'forex', commodities: 'commodities', futures: null, options: null, bonds: 'fixed_income',
  };
  for (const productAssetClass of ProductAssetClassSchema.options) {
    const result = resolveProductAssetMapping(assetMapping(productAssetClass, productAssetClass === 'stocks' ? 'US' : null));
    assert.equal(result.canonicalAssetClass, expected[productAssetClass]);
    assert.equal(result.scoringEligible, false);
    assert.equal(result.rankingEligible, false);
    assert.equal(result.instrumentVerified, false);
    assert.equal(result.asset === null, expected[productAssetClass] === null);
    if (expected[productAssetClass] === null)
      assert.ok(result.reasonCodes.includes('CANONICAL_INSTRUMENT_CLASS_UNIMPLEMENTED'));
  }
});

test('stock mapping requires explicit US/EU region and rejects status and malformed currency', () => {
  assert.equal(resolveProductAssetMapping(assetMapping('stocks', 'EU')).canonicalAssetClass, 'equity_eu');
  assert.equal(resolveProductAssetMapping(assetMapping('stocks')).asset, null);
  const halted = resolveProductAssetMapping({ ...assetMapping('crypto'), status: 'halted' });
  assert.equal(halted.mappingStatus, 'BLOCKED');
  assert.ok(halted.reasonCodes.includes('ASSET_NOT_ACTIVE'));
  assert.throws(() => resolveProductAssetMapping({ ...assetMapping('stocks', 'US'), currency: 'USDT' }));
  assert.throws(() => resolveProductAssetMapping({ ...assetMapping('crypto'), region: 'US', extra: 'unknown' }));
});

function researchFixture() {
  const evaluatedAt = 1790000000000, observedAt = evaluatedAt - 1_000;
  const providerId = 'fixture-research-source';
  const rightsPermission = { allowed: true, evidenceReference: 'TEST_ONLY_NOT_REAL_LICENSE', obligations: [] };
  return {
    asset: { assetId: 'test-asset', symbol: 'TEST', name: 'Fixture', assetClass: 'crypto',
      venue: 'TEST', currency: 'USD', status: 'active' },
    symbol: 'TEST', venue: 'TEST', timeSemantics: 'realtime',
    provenance: { providerId, providerDataset: 'l1_book', observedAt,
      receivedAt: observedAt + 25, publishedAt: observedAt + 50, latencyMs: 25,
      sourceReference: 'TEST_ONLY_NOT_PROVIDER_EVIDENCE', isDemo: false, isDelayed: false,
      licenseScope: 'commercial_redistribution' },
    bid: 99, ask: 101, sequenceContinuous: true, timestampJitterMs: 2,
    dailyTurnover: 200_000, orderbookDepth2Pct: 100_000,
    evaluatedAt, maxAgeMs: 3_000, maxJitterMs: 5, minimumTurnover: 100_000, minimumDepth2Pct: 50_000,
    mode: 'research_shadow',
    rights: { providerId, applicableEntityAndRegion: 'TEST_ONLY', subscriptionTierAndAddOns: 'TEST_ONLY',
      feedsSymbolsAndVenues: ['l1_book:TEST:TEST'], contractOrPermissionReference: 'TEST_ONLY',
      reviewedAt: new Date(evaluatedAt - 86_400_000).toISOString(), validUntil: null,
      scientificResearchTdm: null,
      permissions: Object.fromEntries(['internal_analysis', 'scientific_research_tdm', 'public_display',
        'api_redistribution', 'derived_scoring_research', 'cache_retention', 'export_resale']
        .map(p => [p, { ...rightsPermission }])) },
  };
}

test('three raw diagnostics calculate deterministic indicators but never output score/evidence authority', () => {
  const source = researchFixture();
  const first = inspectResearchGateCohort(source);
  assert.deepEqual(first, inspectResearchGateCohort(structuredClone(source)));
  assert.deepEqual(first.diagnostics.map(r => r.componentId),
    ['market_integrity_gate', 'data_quality_scorer', 'liquidity_eligibility_scorer']);
  assert.ok(first.diagnostics.every(r => r.status === 'shadow_observed' && r.scoreEligible === false && r.evidenceId === null));
  assert.ok(first.diagnostics.every(r => CANONICAL_50_COMPONENTS.some(c => c.componentId === r.componentId && c.status !== 'active')));
  assert.equal(first.diagnostics[0].metric, 200);
  assert.equal(first.diagnostics[1].metric, 1_000);
  assert.equal(first.diagnostics[2].metric, 2);
  assert.equal(first.productionEligible, false);
  assert.equal(first.publicDisplayEligible, false);
});

test('invalid time, missing rights, stale data, demo and reference rates fail closed', () => {
  const scenarios: Array<[string, (x: ReturnType<typeof researchFixture>) => void, string]> = [
    ['no rights', x => { x.rights = null as any; }, 'SOURCE_RIGHTS_NOT_PROVEN'],
    ['stale', x => { x.maxAgeMs = 100; }, 'OBSERVATION_STALE'],
    ['future', x => { x.provenance.observedAt = x.evaluatedAt + 1; }, 'PROVENANCE_TIMESTAMP_INVALID'],
    ['demo', x => { x.mode = 'demo'; x.provenance.isDemo = true; }, 'DEMO_NOT_ACTIONABLE'],
    ['reference', x => { x.timeSemantics = 'reference'; }, 'NON_REALTIME_REFERENCE_NOT_A_SPOT_OBSERVATION'],
    ['delayed', x => { x.provenance.isDelayed = true; }, 'DELAYED_OBSERVATION_NOT_REALTIME'],
    ['wrong feed', x => { x.rights.feedsSymbolsAndVenues = ['OTHER:TEST:TEST']; }, 'PROVIDER_DATASET_INSTRUMENT_RIGHTS_MISMATCH'],
  ];
  for (const [label, mutate, expected] of scenarios) {
    const x = researchFixture(); mutate(x);
    const result = inspectResearchGateCohort(x);
    assert.equal(result.publicDisplayEligible, false, label);
    assert.ok(result.diagnostics.every(d => d.status === 'blocked' && d.metric === null && d.reasonCodes.includes(expected)), label);
  }
});

test('crossed book, sequence gap and missing/insufficient depth prevent shadow metric admission', () => {
  const x = researchFixture();
  x.ask = 98; x.sequenceContinuous = false; x.orderbookDepth2Pct = 0;
  const result = inspectResearchGateCohort(x);
  assert.ok(result.diagnostics.every(row => row.status === 'blocked'));
  assert.ok(result.diagnostics[0].reasonCodes.includes('CROSSED_BOOK'));
  assert.ok(result.diagnostics[0].reasonCodes.includes('SEQUENCE_CONTINUITY_UNVERIFIED'));
  assert.ok(result.diagnostics[2].reasonCodes.includes('DEPTH_BELOW_POLICY'));
});

test('numeric and structural corruption are rejected before any diagnostic', () => {
  assert.throws(() => inspectResearchGateCohort({ ...researchFixture(), bid: Number.NaN }));
  assert.throws(() => inspectResearchGateCohort({ ...researchFixture(), symbol: '' }));
  assert.throws(() => inspectResearchGateCohort({ ...researchFixture(), minimumDepth2Pct: 0 }));
  assert.throws(() => inspectResearchGateCohort({ ...researchFixture(), extra: 'not allowed' }));
});
