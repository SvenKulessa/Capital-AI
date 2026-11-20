import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateUnitEconomics, UNIT_ECONOMICS_SCHEMA } from './unit-economics-readmodel.mjs';

const keys = ['revenue','paymentFees','directData','inference','tools','support','delivery','acquisition','visitors','leads','offers','subscriptions','agentRuns'];
const fixture = () => ({
  schemaVersion: UNIT_ECONOMICS_SCHEMA, currency:'EUR', provenanceKind:'SYNTHETIC', product:'agent_operations',
  periodStart:'2026-11-01T00:00:00Z', periodEnd:'2026-12-01T00:00:00Z',
  coverage:Object.fromEntries(keys.map(k => [k, {
    complete:true, evidenceRefs:['synthetic:' + k], ...(k === 'offers' ? {evidenceClass:'A'} : {})
  }])),
  financial:{recognizedNetRevenueMinor:10000,paymentFeesMinor:300,directDataMinor:200,inferenceMinor:1000,toolsMinor:500,supportMinor:600,deliveryMinor:100,acquisitionMinor:800},
  funnel:{eligibleConsentedVisitors:500,qualifiedLeads:20,newPaidCustomers:4,validOffers:10,acceptedOffers:4},
  subscriptions:{openingCustomers:10,lostCustomers:1,openingMrrMinor:10000,lostMrrMinor:1000,downgradeMrrMinor:500,expansionMrrMinor:2000},
  agentRuns:{successfulRuns:12,failedRuns:3},
});
const get = x => calculateUnitEconomics(x).indicators;

test('synthetic economics: deterministic cents, ratios, no duplicate refund subtraction', () => {
  const m = get(fixture());
  assert.equal(m.dbIminor.value, 8000);
  assert.equal(m.dbIIminor.value, 7300);
  assert.equal(m.dbIIIminor.value, 6500);
  assert.equal(m.dbIImargin.value, 0.73);
  assert.equal(m.leadToPaid.value, 0.2);
  assert.equal(m.realizedOfferAcceptance.value, 0.4);
  assert.equal(m.logoChurn.value, 0.1);
  assert.equal(m.grossRevenueChurn.value, 0.15);
  assert.equal(m.netRevenueRetention.value, 1.05);
  assert.equal(m.costPerSuccessfulRunMinor.value, 125);
  assert.equal(m.dbIminor.status, 'COMPUTED_FROM_SUPPLIED_INPUT');
});

test('missing inference evidence blocks DB I/II/III even with numeric zero', () => {
  const x = fixture(); x.financial.inferenceMinor=0; x.coverage.inference={complete:false,evidenceRefs:[]};
  const m = get(x);
  for (const key of ['dbIminor','dbIIminor','dbIIIminor','dbIImargin','costPerSuccessfulRunMinor']) {
    assert.equal(m[key].value,null);
    assert.equal(m[key].status,'INCOMPLETE');
    assert.deepEqual(m[key].missing,['inference']);
  }
});
test('missing support blocks DB II/III but not DB I', () => {
  const x=fixture(); x.coverage.support={complete:false,evidenceRefs:[]};
  const m=get(x); assert.equal(m.dbIminor.value,8000); assert.equal(m.dbIIminor.value,null); assert.equal(m.dbIIIminor.value,null);
});
test('unknown acquisition prevents DB III but preserves DB II', () => {
  const x=fixture(); x.coverage.acquisition={complete:false,evidenceRefs:[]};
  const m=get(x); assert.equal(m.dbIIminor.value,7300); assert.equal(m.dbIIIminor.value,null);
});
test('no provenance evidence cannot be marked complete', () => {
  const x=fixture(); x.coverage.revenue.evidenceRefs=[]; assert.throws(()=>get(x),/cannot be complete without provenance/);
});
test('zero denominators are null, not infinity or fabricated zero percent', () => {
  const x=fixture(); x.funnel={eligibleConsentedVisitors:0,qualifiedLeads:0,newPaidCustomers:0,validOffers:0,acceptedOffers:0};
  x.subscriptions={openingCustomers:0,lostCustomers:0,openingMrrMinor:0,lostMrrMinor:0,downgradeMrrMinor:0,expansionMrrMinor:0};
  x.agentRuns={successfulRuns:0,failedRuns:0};
  const m=get(x);
  for (const k of ['leadToPaid','realizedOfferAcceptance','logoChurn','grossRevenueChurn','netRevenueRetention','costPerSuccessfulRunMinor']) {
    assert.equal(m[k].value,null);
  }
});
test('reject contradictory cohort and subscription data', () => {
  const x=fixture(); x.funnel.newPaidCustomers=21; assert.throws(()=>get(x),/contradictory/);
  const y=fixture(); y.subscriptions.lostMrrMinor=10001; assert.throws(()=>get(y),/contradictory/);
  const z=fixture(); z.funnel.acceptedOffers=11; assert.throws(()=>get(z),/contradictory/);
});
test('reject non-cent fractions, overflow and negative monetary inputs', () => {
  const x=fixture(); x.financial.inferenceMinor=0.5; assert.throws(()=>get(x),/safe integer/);
  const y=fixture(); y.financial.supportMinor=-1; assert.throws(()=>get(y),/safe integer/);
  const z=fixture(); z.financial.inferenceMinor=Number.MAX_SAFE_INTEGER; assert.throws(()=>get(z),/integer overflow/);
});
test('reject unknown schema, currencies, invalid periods and unverifiable production claims', () => {
  for (const [prop,value] of [['schemaVersion','v2'],['currency','USD'],['periodEnd','2026-10-01T00:00:00Z'],['provenanceKind','PRODUCTION_VERIFIED'],['periodStart','2026-02-30T00:00:00Z']]) {
    const x=fixture();x[prop]=value; assert.throws(()=>get(x));
  }
});
test('do not return customer identifiers or raw receipts', () => {
  const x=fixture(); x.accountId='test-tenant';x.stripeSecret='test-secret';
  const payload=JSON.stringify(calculateUnitEconomics(x));
  assert.doesNotMatch(payload,/test-tenant|test-secret|stripeSecret/);
});
test('numerical inputs remain unverified even with evidence references', () => {
  const x=fixture();x.provenanceKind='UNVERIFIED_INPUT';
  assert.equal(calculateUnitEconomics(x).qualification,'SOURCE_PROOFS_NOT_INDEPENDENTLY_VERIFIED');
});
test('survey-only offers cannot be treated as realized price acceptance', () => {
  const x=fixture(); x.coverage.offers.evidenceClass='C';
  assert.throws(()=>get(x),/requires class A evidence/);
});
test('missing lead evidence blocks lead-to-paid but not DB I', () => {
  const x=fixture(); x.coverage.leads={complete:false,evidenceRefs:[]};
  const m=get(x); assert.equal(m.leadToPaid.status,'INCOMPLETE'); assert.equal(m.dbIminor.value,8000);
});
test('no implicit FX, invalid monetary counts and missing cost categories fail closed', () => {
  const x=fixture(); x.currency='USD'; assert.throws(()=>get(x),/EUR/);
  const y=fixture(); y.agentRuns.failedRuns=1.5; assert.throws(()=>get(y),/safe integer/);
  const z=fixture(); delete z.coverage.support; assert.throws(()=>get(z),/object required/);
});
test('ratio with net revenue 0 stays undefined while DB can be negative', () => {
  const x=fixture(); x.financial.recognizedNetRevenueMinor=0;
  const m=get(x); assert.equal(m.dbIImargin.value,null); assert.equal(m.dbIIminor.value,-2700);
});
