import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePriceHistory, calculateQuotedSpread } from '../../services/featureStore';
import { ShadowComponentRunnerRegistry } from '../../services/componentRunner';
import { EvidenceEngineService } from '../../services/evidenceEngine';
import { FeatureValueSchema } from '../canonicalContracts';
import { PriceHistoryCalculationSchema, type PriceHistoryCalculation } from '../rawFeatureCalculation';

// Synthetic demo fixtures are solely formula/admission regression inputs, never live evidence.
function fixture(prices = Array.from({length: 20}, (_, i) => 100 + i)): PriceHistoryCalculation {
  const evaluatedAt = 1790000000000, intervalMs = 60000;
  const asset = {assetId: 'fixture', symbol: 'FIXTURE', name: 'DEMO FIXTURE', assetClass: 'crypto' as const,
    venue: 'TEST', currency: 'USD', status: 'active' as const};
  const bars = prices.map((close, i) => {
    const closeAt = evaluatedAt - (prices.length - 1 - i) * intervalMs - 10;
    return {assetId: asset.assetId, venue: asset.venue, currency: asset.currency, openAt: closeAt - intervalMs,
      closeAt, close, finalized: true as const, provenance: {providerId: 'demo-formula-fixture',
        providerDataset: 'closed-bars', observedAt: closeAt, receivedAt: closeAt + 1, publishedAt: closeAt + 2,
        latencyMs: 1, isDemo: true, isDelayed: false, sourceReference: `TEST-FIXTURE-NON-PRODUCTION:${i}`,
        licenseScope: 'sandbox_demo' as const}};
  });
  return PriceHistoryCalculationSchema.parse({asset, bars, evaluatedAt, intervalMs, maxStalenessMs: 1000, mode: 'demo',
    rights: {providerId: 'demo-formula-fixture', applicableEntityAndRegion: 'TEST', subscriptionTierAndAddOns: 'TEST',
      feedsSymbolsAndVenues: ['closed-bars:FIXTURE:TEST'], contractOrPermissionReference: 'TEST-ONLY',
      validUntil: null, reviewedAt: new Date(evaluatedAt - 1).toISOString(), scientificResearchTdm: null,
      permissions: Object.fromEntries(['internal_analysis', 'scientific_research_tdm', 'public_display',
        'api_redistribution', 'derived_scoring_research', 'cache_retention', 'export_resale'].map(useCase =>
        [useCase, {allowed: true, evidenceReference: 'TEST-ONLY', obligations: []}])) }});
}
test('hand-calculated increasing series verifies raw formulas and denies score admission', () => {
  const result = calculatePriceHistory(fixture()), [rsi, sma, z, b] = result.features;
  assert.equal(rsi.value, 100); assert.equal(sma.value, 109.5);
  assert.ok(Math.abs(z.value! - 9.5 / Math.sqrt(33.25)) < 1e-12);
  assert.ok(Math.abs(b.value! - (z.value! + 2) / 4) < 1e-12);
  assert.ok(result.features.every(f => !f.scoreEligible && f.normalizedValue === null && f.qualityScore === null && f.isDemo));
  assert.ok(result.features.every(f => !FeatureValueSchema.safeParse(f).success));
});
test('Wilder smoothing uses all supplied observations, not a sliding simple average', () => {
  const prices = Array.from({length: 20}, (_, i) => i <= 14 ? 100 + i : 128 - i);
  const result = calculatePriceHistory(fixture(prices));
  assert.ok(Math.abs(result.features[0].value! - 100 * (13 / 14) ** 5) < 1e-10);
  assert.equal(calculatePriceHistory(fixture([...prices].reverse())).features[0].value! >= 0, true);
});
test('flat RSI convention is 50, zero variance produces unavailable Z and percent B', () => {
  const f = calculatePriceHistory(fixture(Array(20).fill(100))).features;
  assert.equal(f[0].value, 50); assert.equal(f[2].value, null); assert.equal(f[3].value, null);
  assert.ok(f[2].reasonCodes.includes('ZERO_VARIANCE'));
});
test('falling RSI is zero and insufficient histories fail', () => {
  assert.equal(calculatePriceHistory(fixture(Array.from({length:20},(_, i)=>100-i))).features[0].value,0);
  assert.throws(()=>calculatePriceHistory(fixture(Array(19).fill(100))));
});
test('unordered, duplicate, gapped, unfinished and future bars fail closed', () => {
  const mutations = [
    (c:any)=>c.bars.reverse(), (c:any)=>c.bars[1]=structuredClone(c.bars[0]),
    (c:any)=>c.bars.splice(1,1), (c:any)=>c.bars[0].finalized=false,
    (c:any)=>c.bars[19].closeAt=c.evaluatedAt+1,
    (c:any)=>c.bars[0].provenance.publishedAt=c.evaluatedAt+1,
    (c:any)=>c.bars[0].provenance.latencyMs=99,
  ];
  for(const mutate of mutations) {const c=fixture();mutate(c);assert.throws(()=>calculatePriceHistory(c));}
});
test('stale, identity, rights, mode and source mismatches fail closed', () => {
  const mutations = [
    (c:any)=>c.evaluatedAt+=1001, (c:any)=>c.bars[0].assetId='other',
    (c:any)=>c.bars[0].currency='EUR', (c:any)=>c.bars[0].venue='OTHER',
    (c:any)=>{c.asset.currency='XYZ';c.bars.forEach((b:any)=>b.currency='XYZ');},
    (c:any)=>c.rights.permissions.internal_analysis.allowed=false,
    (c:any)=>c.rights.permissions.cache_retention.obligations=['UNIMPLEMENTED'],
    (c:any)=>c.rights.feedsSymbolsAndVenues=['wrong:FIXTURE:TEST'],
    (c:any)=>c.rights.reviewedAt=new Date(c.evaluatedAt+1).toISOString(),
    (c:any)=>c.mode='research', (c:any)=>c.bars[0].provenance.providerDataset='other',
  ];
  for(const mutate of mutations) {const c=fixture();mutate(c);assert.throws(()=>calculatePriceHistory(c));}
});
test('raw calculation evidence replays identically and input mutation changes fingerprint', async () => {
  const first=calculatePriceHistory(fixture());
  assert.deepEqual(calculatePriceHistory(first.input),first);
  const hash=await EvidenceEngineService.fingerprint(first);
  first.input.bars[0].close+=1;
  assert.notEqual(await EvidenceEngineService.fingerprint(calculatePriceHistory(first.input)),hash);
});
test('floating-point overflow fails instead of emitting an apparently valid zero Z-score', () => {
  assert.throws(()=>calculatePriceHistory(fixture(Array.from({length:20},(_,i)=>i%2?1e308:1))),/NUMERICAL_OVERFLOW/);
});
test('quoted spread is midpoint-based and never claims effective spread', () => {
  const {bars, intervalMs, ...context}=fixture();
  const {openAt,closeAt,close,finalized,...source}=bars[19];
  const input={...context,quote:{...source,bid:99,ask:101}};
  const result=calculateQuotedSpread(input);
  assert.equal(result.features[0].featureId,'quoted_spread_bps');
  assert.equal(result.features[0].value,200);
  assert.throws(()=>calculateQuotedSpread({...input,quote:{...input.quote,ask:98}}),/CROSSED_BOOK/);
  assert.throws(()=>calculateQuotedSpread({...input,quote:{...input.quote,bid:null}}));
});
test('all registered components expose admission blockers without lifecycle promotion', () => {
  const registry=new ShadowComponentRunnerRegistry();
  const rows=registry.admissionReport();
  assert.equal(rows.length,50);
  assert.ok(rows.every(row=>!row.admissionAllowed && !row.implementationRegistered));
  assert.equal(rows.filter(row=>row.lifecycle==='planned').length,45);
  assert.equal(rows.filter(row=>row.lifecycle==='blocked').length,5);
  registry.register({componentId:rows[0].componentId,calculationVersion:rows[0].calculationVersion,
    async execute(){throw new Error('TEST MUST NOT EXECUTE');}});
  assert.equal(registry.admissionReport()[0].implementationRegistered,true);
  assert.equal(registry.admissionReport()[0].admissionAllowed,false);
});
