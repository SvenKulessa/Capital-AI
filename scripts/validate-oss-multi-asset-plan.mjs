import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function validatePlan(p) {
  const classes = ['crypto', 'stocks', 'commodities', 'forex', 'indices'];
  assert.equal(p.schema, 'CAPITAL_AI_OSS_MULTI_ASSET_BENCHMARK_PLAN@1');
  assert.equal(p.state, 'PREPARED_NOT_EXECUTED');
  assert.equal(p.environment, 'isolated-nonproduction');
  assert.equal(p.productionActivation, false);
  assert.equal(p.automaticPromotion, false);
  assert.equal(p.scoreProfile.rankingEnabled, false);
  assert.equal(p.workload.orderExecution, false);
  assert.equal(p.firstTestPerClass, 20);
  assert.equal(p.incrementTotal, 50);
  assert.deepEqual(Object.keys(p.targets).sort(), [...classes].sort());
  assert.equal(Object.values(p.targets).reduce((a, b) => a + b, 0), 1300);
  for (const c of classes) assert.ok(Number.isSafeInteger(p.targets[c]) && p.targets[c] >= 20);
  assert.equal(p.candidates.length, 10);
  assert.equal(new Set(p.candidates.map(c => c.id)).size, 10);
  for (const c of p.candidates) {
    assert.match(c.sourceSha, /^[a-f0-9]{40}$/);
    assert.equal(c.measurementState, 'NOT_EXECUTED');
    assert.equal(c.dataRights, 'UNVERIFIED');
    assert.equal(c.buildDigest, null);
  }
  assert.equal(Object.values(p.scoreProfile.weights).reduce((a, b) => a + b, 0), 100);
  assert.equal(p.stages.length, 25);
  for (const [i, stage] of p.stages.entries()) {
    assert.equal(stage.stage, i);
    assert.equal(stage.state, 'PLANNED');
    assert.deepEqual(Object.keys(stage.counts).sort(), [...classes].sort());
    assert.equal(stage.total, Object.values(stage.counts).reduce((a, b) => a + b, 0));
    assert.equal(stage.total, 100 + i * 50);
    for (const c of classes) {
      assert.ok(Number.isSafeInteger(stage.counts[c]));
      assert.ok(stage.counts[c] <= p.targets[c]);
      if (i === 0) assert.equal(stage.counts[c], 20);
      else assert.ok(stage.counts[c] >= p.stages[i - 1].counts[c]);
    }
  }
  assert.deepEqual(p.stages.at(-1).counts, p.targets);
  assert.equal(p.workload.instrumentManifest, null);
  assert.equal(p.workload.instrumentManifestSha256, null);
  assert.equal(p.workload.repetitions, 3);
  assert.ok(p.blockers.length > 0);
  assert.equal(p.commercialPolicy.required, true);
  assert.equal(p.commercialPolicy.researchOnlyMayAuthorize, false);
  assert.equal(p.commercialPolicy.personalUseMayAuthorize, false);
  assert.equal(p.commercialPolicy.unknownRightsMayPass, false);
  assert.equal(p.commercialPolicy.paidSubscriptionMayImplyRedistributionRights, false);
  assert.equal(p.monetization.entitlementsMayOverrideRights, false);
  assert.equal(p.monetization.pricingMutation, false);
  assert.equal(p.monetization.cadsMapping.weightsMayCompensateRightsFailure, false);
  assert.equal(p.monetization.cadsMapping.currentReleaseRequirementsPreserved, true);
  assert.equal(p.monetization.cadsMapping.fullPipelineMinSamples, 600);
  assert.equal(p.monetization.cadsMapping.p95LessThanMs, 200);
  assert.equal(p.monetization.cadsMapping.maxLessThanMs, 200);
  assert.ok(!p.candidates.some(c => c.id === 'yfinance'));
  assert.ok(p.excludedCandidates.some(c => c.id === 'yfinance'));
  for (const c of p.candidates) assert.equal(c.commercialAdmission, 'BLOCKED_PENDING_EVIDENCE');
  for (const id of ['saas', 'data-api', 'white-label', 'cads-app', 'ghcr-app']) {
    assert.ok(p.monetization.products.some(p => p.id === id && p.state === 'RIGHTS_UNVERIFIED'));
  }
  const perps = p.additionalPerpetuals;
  assert.equal(perps.enabledForBenchmark, true);
  assert.deepEqual(perps.assetClasses, ['crypto', 'stocks', 'commodities']);
  assert.equal(perps.counting, 'ADDITIONAL_DERIVATIVE_INSTRUMENTS_NOT_BASE_ASSETS');
  assert.equal(perps.targetCount, null);
  assert.equal(perps.firstTestCount, null);
  assert.equal(perps.activation, false);
  assert.equal(perps.requiredInstrumentType, 'PERPETUAL');
  assert.equal(perps.expiry, null);
  assert.equal(perps.comparison.noPriceSubstitution, true);
  assert.equal(perps.comparison.separateFromSpotAndDatedFutures, true);
  assert.equal(perps.stagePolicy.totalLoadIncludesBaseAndPerpetuals, true);
  assert.equal(perps.stagePolicy.additionalInstrumentsPerStepMax, 50);
  for (const field of ['underlyingAssetId', 'venue', 'settlementCurrency',
    'collateralAsset', 'contractMultiplier', 'contractValueUnit', 'linearOrInverse']) {
    assert.ok(perps.identityFields.includes(field));
  }
  for (const field of ['markPrice', 'indexPrice', 'fundingRate',
    'fundingIntervalSeconds', 'nextFundingAt', 'openInterestUnit']) {
    assert.ok(perps.marketFields.includes(field));
  }
  return { valid: true, totalTarget: 1300, firstTestAssets: 100,
    candidates: 10, stages: 25, additionalPerpetualTarget: null, benchmarkExecuted: false, decisionEligible: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2] || new URL('../docs/benchmarks/oss-market-pipelines-sim/live-benchmark-plan.json', import.meta.url);
  try {
    console.log(JSON.stringify(validatePlan(JSON.parse(await readFile(input, 'utf8')))));
  } catch {
    console.error('INVALID_MULTI_ASSET_BENCHMARK_PLAN');
    process.exitCode = 1;
  }
}
