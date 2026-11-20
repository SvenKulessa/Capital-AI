import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCT_OPPORTUNITY_VERSION,
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
    'Echtzeitschutz für jedes Telefon',
    'ROI von 300 Prozent ist sicher',
  ]) {
    const bad = sample();
    bad.capabilities[0].claim = text;
    assert.throws(() => validateProductOpportunity(bad), /CAPABILITY_CLAIM_/);
  }
});

test('NOT_PROVEN capability must never become a draft campaign claim', () => {
  assert.throws(() => buildOpportunityDraftCampaign(sample(), 'real-time'),
    /CLAIM_SOURCE_REQUIRED/);
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
