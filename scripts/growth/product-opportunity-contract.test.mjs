import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCT_OPPORTUNITY_VERSION,
  DISTRIBUTION_OPPORTUNITY_VERSION,
  DISTRIBUTION_OPPORTUNITY_WEIGHTS,
  evaluateDistributionOpportunity,
  buildOpportunityDraftCampaign,
  calculateOpportunityScenario,
  evaluateProductOpportunity,
  evaluateProductPortfolio,
  identifyProductSignal,
  validateProductOpportunity,
} from './product-opportunity-contract.mjs';

const sha = 'a'.repeat(40);
const evidence = (status = 'SOURCE_RECORDED') => ({
  sourceSha: sha,
  sourceUrl: 'https://github.com/SvenKulessa/DeviceCare-KI',
  evidenceRef: 'DeviceCare-KI:main:inspection',
  observedAt: '2026-11-20',
  status,
});

const sample = () => ({
  contractVersion: PRODUCT_OPPORTUNITY_VERSION,
  productId: 'devicecare-ki',
  sourceSha: sha,
  campaignId: 'devicecare-pilot-01',
  canonicalUrl: 'https://capital-ai.online/',
  problem: 'Android-Benutzer verstehen lokale Gerätediagnosen nicht ausreichend.',
  valueProposition: 'Datensparsame lokale und manuell gestartete Gerätediagnose als Entwicklervorschau.',
  audience: ['Android-Nutzer', 'Entwickler'],
  capabilities: [
    { id: 'manual-scan', claim: 'Manuell gestartete lokale Geräteprüfung als Entwicklervorschau.', evidence: evidence() },
    { id: 'real-time', claim: 'Verhaltensbasierte Laufzeitprüfung', evidence: evidence('NOT_PROVEN') },
  ],
  competitors: [
    { name: 'Beispielanbieter', differentiator: 'Vergleich muss unabhängig recherchiert werden.', evidence: evidence('NOT_PROVEN') },
  ],
  scenarios: [{
    id: 'base', paidUsers: 250, monthlyNetArpuEur: 2.5,
    monthlyVariableCostEur: 0.3, monthlyFixedCostEur: 400,
    cacEur: 3, newPaidCustomers: 80, developerHours: 50,
    developerHourlyEur: 25, horizonMonths: 12, basis: 'ASSUMPTION',
  }],
  scores: { market: 3, product: 4, economics: 2, growth: 3, trust: 3 },
  marketSizing: {
    method: 'UNKNOWN', addressableCustomers: null, penetrationPercent: null,
    period: '12_MONTHS', basis: 'ASSUMPTION', evidenceRef: null,
  },
  rights: { status: 'NOT_PROVEN', evidenceRef: null },
  estimatedDeliveryHours: 120,
});

test('only product-related commercialization prompts trigger opportunity review', () => {
  assert.equal(identifyProductSignal('Prüfe den Docker Security Gate Check in GitHub'), null);
  assert.equal(identifyProductSignal('Wie spät ist es?'), null);
  assert.equal(identifyProductSignal('Programmiere die App'), null);
  assert.deepEqual(identifyProductSignal('Vermarkte meine DeviceCare App als Produkt'),
    { state: 'REVIEW_CANDIDATE', routingDomain: 'GROWTH', requiresEvidence: true });
});

test('canonical valid opportunity remains a hypothesis with independent QUALITY required', () => {
  const value = evaluateProductOpportunity(sample());
  assert.equal(value.score, 61);
  assert.equal(value.decision, 'VALIDATE');
  assert.equal(value.confidence, 'HYPOTHESIS');
  assert.equal(value.quality.verdict, 'NOT_PROVEN');
  assert.deepEqual(value.supportedDraftClaims, ['manual-scan']);
  assert.equal(value.permissions.publication, false);
  assert.equal(value.marketSizing.estimatedReachableCustomers, null);
  assert.ok(value.evidenceGaps.includes('MARKET_SIZING_METHOD_MISSING'));
  assert.ok(value.evidenceGaps.includes('CUSTOMER_DEMAND_NOT_PROVEN'));
});

test('unit economics include fixed, variable, CAC and development cost', () => {
  const result = evaluateProductOpportunity(sample()).scenarioResults[0];
  assert.equal(result.revenueEur, 7500);
  assert.equal(result.operatingEur, 5700);
  assert.equal(result.acquisitionEur, 240);
  assert.equal(result.developmentEur, 1250);
  assert.equal(result.totalCostsEur, 7190);
  assert.equal(result.profitEur, 310);
  assert.equal(result.roiPercent, 4.31);
  assert.equal(result.breakEvenPaidUsers, 239);
  assert.equal(result.evidenceStatus, 'HYPOTHESIS_NOT_VERIFIED');
});

test('bottom-up market sizing is always a hypothesis, not verified TAM', () => {
  const p = sample();
  p.marketSizing = {
    method: 'BOTTOM_UP', addressableCustomers: 10_000, penetrationPercent: 2.5,
    period: '12_MONTHS', basis: 'ASSUMPTION', evidenceRef: 'market-research-pending',
  };
  const result = evaluateProductOpportunity(p);
  assert.equal(result.marketSizing.estimatedReachableCustomers, 250);
  assert.equal(result.marketSizing.evidenceStatus, 'HYPOTHESIS_NOT_VERIFIED');
  const bad = sample();
  bad.marketSizing.method = 'TOP_DOWN';
  assert.throws(() => validateProductOpportunity(bad), /MARKET_ADDRESSABLE_CUSTOMERS_NUMBER/);
});

test('zero contribution returns no numerical break-even or fake infinite ROI', () => {
  const zero = sample();
  zero.scenarios[0].monthlyNetArpuEur = 0;
  zero.scenarios[0].monthlyVariableCostEur = 0;
  const r = calculateOpportunityScenario(validateProductOpportunity(zero).scenarios[0]);
  assert.equal(r.breakEvenPaidUsers, null);
  assert.equal(evaluateProductOpportunity(zero).decision, 'HOLD');
});

test('zero total cost never divides by zero for ROI', () => {
  const free = sample();
  Object.assign(free.scenarios[0], {
    monthlyNetArpuEur: 0, monthlyVariableCostEur: 0, monthlyFixedCostEur: 0,
    cacEur: 0, newPaidCustomers: 0, developerHours: 0,
  });
  assert.equal(evaluateProductOpportunity(free).scenarioResults[0].roiPercent, null);
});

test('unverified ROI assertion fails closed rather than passing as measured data', () => {
  const bad = sample();
  bad.scenarios[0].basis = 'VERIFIED';
  assert.throws(() => validateProductOpportunity(bad), /SCENARIO_EVIDENCE_UNVERIFIED/);
});

test('negative, NaN, infinite and out-of-range numbers fail closed', () => {
  for (const badNumber of [-1, NaN, Infinity, 1e99]) {
    const bad = sample();
    bad.scenarios[0].monthlyNetArpuEur = badNumber;
    assert.throws(() => validateProductOpportunity(bad), /SCENARIO_monthlyNetArpuEur_NUMBER/);
  }
});

test('unrealistic magnitude fails rather than returning imprecise ROI', () => {
  const bad = sample();
  bad.scenarios[0].paidUsers = 10_000_000;
  bad.scenarios[0].monthlyNetArpuEur = 1_000_000_000;
  assert.throws(() => evaluateProductOpportunity(bad), /SCENARIO_SCALE_UNSUPPORTED/);
});

test('malformed user counts and impossible acquisition cohorts fail', () => {
  const bad = sample();
  bad.scenarios[0].newPaidCustomers = 251;
  assert.throws(() => validateProductOpportunity(bad), /SCENARIO_COHORT/);
  bad.scenarios[0].newPaidCustomers = 5.5;
  assert.throws(() => validateProductOpportunity(bad), /NEW_PAID_CUSTOMERS_INTEGER/);
});

test('cross-product and wrong-SHA capability/competitor evidence cannot be used', () => {
  const bad = sample();
  bad.capabilities[0].evidence.sourceSha = 'b'.repeat(40);
  assert.throws(() => evaluateProductOpportunity(bad), /CAPABILITY_SOURCE_BINDING/);
  const badCompetitor = sample();
  badCompetitor.competitors[0].evidence.sourceSha = 'b'.repeat(40);
  assert.throws(() => evaluateProductOpportunity(badCompetitor), /COMPETITOR_SOURCE_BINDING/);
});

test('untrusted source URLs and malformed evidence dates rejected', () => {
  const bad = sample();
  bad.capabilities[0].evidence.sourceUrl = 'http://untrusted.local/source';
  assert.throws(() => validateProductOpportunity(bad), /CAPABILITY_URL/);
  const invalid = sample();
  invalid.capabilities[0].evidence.observedAt = '2026-02-30';
  assert.throws(() => validateProductOpportunity(invalid), /CAPABILITY_DATE/);
});

test('PII, access tokens and false security claims cannot enter draft texts', () => {
  for (const text of [
    'Sende das Ergebnis an test@example.com',
    'token: ghp_abcdefghijklmnop',
    'Garantiert 100% Malware-Schutz',
    '100% sicher gegen jeden Virus',
    'Echtzeitschutz für jedes Telefon',
    'ROI von 300 Prozent ist sicher',
  ]) {
    const bad = sample();
    bad.capabilities[0].claim = text;
    assert.throws(() => validateProductOpportunity(bad), /CAPABILITY_CLAIM_/);
  }
});

test('draft and evidence URLs reject query parameters, fragments and encoded sensitive paths', () => {
  for (const url of [
    'https://capital-ai.online/?ref=private',
    'https://capital-ai.online/#private',
    'https://capital-ai.online/contact/user%40example.com',
  ]) {
    const bad = sample();
    bad.canonicalUrl = url;
    assert.throws(() => buildOpportunityDraftCampaign(bad, 'manual-scan'), /CANONICAL_/);
    const source = sample();
    source.capabilities[0].evidence.sourceUrl = url;
    assert.throws(() => validateProductOpportunity(source), /CAPABILITY_/);
  }
});

test('non-representable break-even and ROI fail closed', () => {
  const breakEven = sample();
  Object.assign(breakEven.scenarios[0], {
    monthlyNetArpuEur: Number.MIN_VALUE, monthlyVariableCostEur: 0,
  });
  assert.throws(() => evaluateProductOpportunity(breakEven), /SCENARIO_SCALE_UNSUPPORTED/);

  const roi = sample();
  Object.assign(roi.scenarios[0], {
    monthlyVariableCostEur: 0, monthlyFixedCostEur: Number.MIN_VALUE,
    cacEur: 0, developerHours: 0,
  });
  assert.throws(() => evaluateProductOpportunity(roi), /SCENARIO_SCALE_UNSUPPORTED/);
});

test('NOT_PROVEN capability must never become a draft campaign claim', () => {
  assert.throws(() => buildOpportunityDraftCampaign(sample(), 'real-time'),
    /CLAIM_SOURCE_REQUIRED/);
});

test('draft projection rejects briefs the canonical Content Engine would refuse', () => {
  for (const change of [{ campaignId: 'abc' }, { canonicalUrl: 'https://localhost:8080/' }]) {
    assert.throws(() => buildOpportunityDraftCampaign({ ...sample(), ...change }, 'manual-scan'),
      /CADS_CONTENT_IDENTITY_REJECTED/);
  }
});

test('valid source-recorded claim makes content-engine-compatible draft but no publishing', () => {
  const draft = buildOpportunityDraftCampaign(sample(), 'manual-scan');
  assert.equal(draft.mode, 'DRAFT_ONLY');
  assert.equal(draft.contentEngineContract, 'CAPITAL_AI_CONTENT_ENGINE@1');
  assert.equal(draft.brief.sourceSha, sha);
  assert.equal(draft.brief.productId, 'devicecare-ki');
  assert.deepEqual(draft.brief.channels, ['WEBSITE', 'LINKEDIN']);
  assert.equal(draft.approvedClaimStatus, 'SOURCE_RECORDED_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(draft.publishAllowed, false);
  assert.equal(draft.ownerApproval, false);
  assert.equal(draft.paidMediaAllowed, false);
  assert.equal(draft.n8n.enabled, false);
});

test('duplicate campaign IDs across opportunities must fail', () => {
  const other = sample();
  other.productId = 'other-product';
  assert.throws(() => evaluateProductPortfolio([sample(), other]), /CAMPAIGN_DUPLICATE/);
});

test('duplicate capability IDs, scenario IDs and unknown fields fail closed', () => {
  const duplicate = sample();
  duplicate.capabilities.push({ ...duplicate.capabilities[0] });
  assert.throws(() => validateProductOpportunity(duplicate), /CAPABILITY_DUPLICATE/);
  const scenario = sample();
  scenario.scenarios.push({ ...scenario.scenarios[0] });
  assert.throws(() => validateProductOpportunity(scenario), /SCENARIO_DUPLICATE/);
  const extra = sample();
  extra.publisherReady = true;
  assert.throws(() => validateProductOpportunity(extra), /INPUT_UNKNOWN_FIELD/);
});

test('missing rights do not become approval; fake rights status is invalid', () => {
  const p = sample();
  assert.ok(evaluateProductOpportunity(p).evidenceGaps.includes('RIGHTS'));
  p.rights.status = 'VERIFIED';
  assert.throws(() => validateProductOpportunity(p), /RIGHTS_STATUS/);
});

test('low trust and no viable contribution force HOLD, never auto GO', () => {
  const bad = sample();
  bad.scores.trust = 1;
  assert.equal(evaluateProductOpportunity(bad).decision, 'HOLD');
  const great = sample();
  great.scores = { market: 5, product: 5, economics: 5, growth: 5, trust: 5 };
  assert.equal(evaluateProductOpportunity(great).decision, 'VALIDATE');
});


const distributionSample=()=>({
 contractVersion:DISTRIBUTION_OPPORTUNITY_VERSION,productId:'solo2-rag',
 criteria:Object.fromEntries(Object.keys(DISTRIBUTION_OPPORTUNITY_WEIGHTS).map(k=>[k,{status:'NOT_PROVEN',score:null,evidenceRef:null}])),
 gates:Object.fromEntries(['rights','security','authorization'].map(k=>[k,{status:'NOT_PROVEN',evidenceRef:null}]))
});
test('distribution weights sum to 100, missing evidence remains null and does not inflate an overall score',()=>{
 assert.equal(Object.values(DISTRIBUTION_OPPORTUNITY_WEIGHTS).reduce((a,b)=>a+b,0),100);
 const p=distributionSample();
 assert.equal(evaluateDistributionOpportunity(p).scoreCoveragePercent,0);
 assert.equal(evaluateDistributionOpportunity(p).score,null);
 assert.equal(evaluateDistributionOpportunity(p).provisionalCoveredScore,null);
 p.criteria.demand={status:'SOURCE_RECORDED',score:80,evidenceRef:'synthetic:market'};
 const result=evaluateDistributionOpportunity(p);
 assert.equal(result.score,null);assert.equal(result.scoreCoveragePercent,20);
 assert.equal(result.observedWeightedPoints,16);assert.equal(result.provisionalCoveredScore,80);
 assert.equal(result.commercialGate,'HOLD');
});
test('complete source-recorded criteria cannot grant rights, activation or a verified commercial score',()=>{
 const p=distributionSample();
 for(const k of Object.keys(p.criteria))p.criteria[k]={status:'SOURCE_RECORDED',score:80,evidenceRef:'synthetic:criterion'};
 for(const k of Object.keys(p.gates))p.gates[k]={status:'SOURCE_RECORDED',evidenceRef:'synthetic:gate'};
 const v=evaluateDistributionOpportunity(p);assert.equal(v.score,80);assert.equal(v.scoreCoveragePercent,100);
 assert.equal(v.commercialGate,'REVIEW_REQUIRED');assert.equal(v.independentQuality,'NOT_PROVEN');
 assert.equal(v.publicationAllowed,false);assert.equal(v.liveSalesAllowed,false);assert.equal(v.spendAllowed,false);
 p.gates.rights={status:'BLOCKED',evidenceRef:'synthetic:hold'};assert.equal(evaluateDistributionOpportunity(p).commercialGate,'BLOCKED');
});
test('distribution scoring rejects fabricated verification, unknown values and extra authority fields',()=>{
 for(const bad of [
  p=>p.criteria.demand={status:'VERIFIED',score:100,evidenceRef:'synthetic'},
  p=>p.criteria.demand.score=1,
  p=>p.criteria.demand={status:'SOURCE_RECORDED',score:101,evidenceRef:'synthetic'},
  p=>delete p.criteria.demand,
  p=>p.gates.rights={status:'VERIFIED',evidenceRef:'synthetic'},
  p=>p.publicationAllowed=true,
 ]){const p=distributionSample();bad(p);assert.throws(()=>evaluateDistributionOpportunity(p));}
});
