import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const evidence=JSON.parse(readFileSync(
  new URL('../docs/security/evidence/benchmark-cost-calibration-20261006.json',import.meta.url),
  'utf8',
));

test('cost calibration keeps measured runtime separate from projected Render pricing',()=>{
  assert.equal(evidence.schemaVersion,'CAPITAL_AI_BENCHMARK_COST_CALIBRATION@1');
  assert.equal(evidence.measuredBaseline.attempted,600);
  assert.equal(evidence.measuredBaseline.succeeded,600);
  assert.equal(evidence.measuredBaseline.failed,0);
  assert.equal(evidence.measuredBaseline.wallTimeMs,82.1);
  assert.equal(evidence.measuredBaseline.actualBilledCostEur,null);
  assert.ok(evidence.measuredBaseline.equivalentRenderCronComputeEur > 0);
});

test('credits remain uncalibrated until event-backbone execution evidence exists',()=>{
  assert.equal(evidence.credits.calibrated,false);
  assert.equal(evidence.credits.unitsCharged,null);
  assert.equal(evidence.productionEligible,false);
  assert.equal(evidence.decisionEligible,false);
  assert.match(evidence.limitations.join(' '),/not CAPITAL_AI_EVENT_BACKBONE@1/);
});

test('pricing evidence is bound to the current Render runner candidate and FX observation',()=>{
  assert.equal(evidence.render.currentWebPlan,'0.5c-512mb');
  assert.equal(evidence.render.isolatedCronCandidate.usdPerMinute,0.00016);
  assert.equal(evidence.fx.usdToEur,0.891373);
  assert.deepEqual(evidence.render.sources, [
    'https://render.com/pricing',
    'https://render.com/docs/compute-plans',
  ]);
});
