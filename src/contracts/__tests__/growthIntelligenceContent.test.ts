import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  GrowthIntelligenceContentPlanSchema,
  buildGrowthIntelligenceContentDrafts,
  validateGrowthIntelligenceContentPlan,
  growthDraftUtmUrl,
  correlateGrowthContentReadback,
} from '../growthIntelligenceContent.ts';
import { buildSocialPublisherHandoff } from '../socialPublisherAdapter.ts';

const sourceFile = fileURLToPath(new URL(
  '../../../CAPITAL-AI-GROWTH/growth-intelligence/content-plan-v1.json',
  import.meta.url,
));
const fixture = JSON.parse(readFileSync(sourceFile, 'utf8')) as Record<string, unknown>;
const deepCopy = () => structuredClone(fixture);
const eventFor = (draft: ReturnType<typeof buildGrowthIntelligenceContentDrafts>[number]) => ({
  policyVersion: 'GROWTH_ATTRIBUTION_POLICY@1',
  source: 'SOCIAL_PROVIDER',
  occurredAt: '2026-11-20T00:00:00.000Z',
  canonicalUrl: draft.socialPackage.canonicalUrl,
  campaignId: draft.socialPackage.campaignId,
  contentId: draft.contentId,
  providerEntityId: draft.channel + ':fixture-only',
  evidenceRef: 'synthetic-test-evidence:provider-readback',
  metrics: [{ name: 'clicks', value: 1, unit: 'COUNT' }],
});

test('schema: original seven source-backed recommendations and exact priorities validate', () => {
  const plan = validateGrowthIntelligenceContentPlan(fixture);
  assert.equal(plan.recommendations.length, 7);
  assert.equal(plan.insights.length, 5);
  assert.deepEqual(plan.recommendations.map((item) => item.priority), [94, 87, 83, 77, 72, 70, 62]);
  for (const row of plan.recommendations) {
    assert.ok(plan.insights.some((insight) => insight.insight_id === row.source_insight_id));
  }
});

test('schema rejects unknown authority, malformed ranges, missing fields and fabricated KPI types', () => {
  for (const change of [
    (p: Record<string, any>) => { p.recommendations[0].publicPublishAllowed = true; },
    (p: Record<string, any>) => { delete p.recommendations[0].source_insight_id; },
    (p: Record<string, any>) => { p.recommendations[0].priority = 101; },
    (p: Record<string, any>) => { p.recommendations[0].priority = -1; },
    (p: Record<string, any>) => { p.recommendations[0].priority = 94.5; },
    (p: Record<string, any>) => { p.recommendations[0].kpi = { guessed_revenue: 100000 }; },
  ]) {
    const p = deepCopy();
    change(p);
    assert.equal(GrowthIntelligenceContentPlanSchema.safeParse(p).success, false);
  }
});

test('lineage rejects duplicated, orphaned or tampered source and scoring references', () => {
  for (const change of [
    (p: Record<string, any>) => { p.recommendations[1].content_id = p.recommendations[0].content_id; },
    (p: Record<string, any>) => { p.recommendations[0].source_insight_id = 'UNKNOWN'; },
    (p: Record<string, any>) => { p.recommendations[0].priority = 93; },
    (p: Record<string, any>) => { p.score_components['CAP-GROW-001'].evidence_relevance = 26; },
    (p: Record<string, any>) => { p.score_components['CAP-GROW-999'] = p.score_components['CAP-GROW-001']; },
    (p: Record<string, any>) => { p.production_sprints[1].content_ids = ['CAP-GROW-999']; },
  ]) {
    const p = deepCopy();
    change(p);
    assert.throws(() => validateGrowthIntelligenceContentPlan(p));
  }
});

test('canonical Content Engine and Social Media Engine receive matching hashed DRAFT-only packages', () => {
  const drafts = buildGrowthIntelligenceContentDrafts(fixture);
  assert.equal(drafts.length, 7);
  const ids = new Set<string>();
  for (const draft of drafts) {
    assert.equal(ids.has(draft.contentId), false);
    ids.add(draft.contentId);
    assert.equal(draft.contentPlan.publication.publicPublishAllowed, false);
    assert.equal(draft.socialPackage.publicationAuthority, 'SOCIAL_MEDIA_ENGINE_ONLY');
    assert.deepEqual(draft.socialPackage.approvals, []);
    assert.deepEqual(draft.socialPackage.deliveries, []);
    assert.equal(draft.review, 'REVIEW_REQUIRED');
    assert.equal(draft.rights, 'NOT_PROVEN');
    assert.equal(draft.consent, 'NOT_PROVEN');
    assert.equal(draft.publicPublishAllowed, false);
    assert.equal(draft.actualMediaAssets, 0);
    assert.equal(draft.socialPackage.assets.length, 1);
    assert.equal(draft.socialPackage.assets[0].kind, 'TEXT');
    assert.equal(draft.socialPackage.assets[0].sha256,
      createHash('sha256').update(draft.draftText).digest('hex'));
    assert.equal(draft.contentPlan.campaign.sourceSha, draft.socialPackage.sourceSha);
    assert.match(draft.socialPackage.assets[0].evidenceRef,
      /^CAPITAL-AI-GROWTH\/growth-intelligence\/content-plan-v1\.json#CAP-GROW-/);
    assert.throws(
      () => buildSocialPublisherHandoff(draft.socialPackage, 'X', draft.socialPackage.assets[0].assetId),
      /CONTENT_SOCIAL_PUBLISHER_NOT_READY/,
    );
  }
});

test('rights and provider status cannot be confused with publish approval', () => {
  const drafts = buildGrowthIntelligenceContentDrafts(fixture);
  const instagram = drafts.find((item) => item.channel === 'INSTAGRAM');
  assert.ok(instagram);
  assert.equal(instagram.insightStatus, 'DOCUMENTED_DRAFT');
  assert.equal(instagram.socialPackage.approvals.length, 0);
  const linkedIn = drafts.find((item) => item.channel === 'LINKEDIN');
  assert.ok(linkedIn);
  assert.equal(linkedIn.socialPackage.approvals.length, 0);
});

test('UTM attribution is deterministic and only targets CAPITAL-AI HTTPS destinations', () => {
  const draft = buildGrowthIntelligenceContentDrafts(fixture).find((item) => item.channel === 'X');
  assert.ok(draft);
  const url = new URL(growthDraftUtmUrl(draft));
  assert.equal(url.origin, 'https://capital-ai.online');
  assert.equal(url.searchParams.get('utm_source'), 'x');
  assert.equal(url.searchParams.get('utm_medium'), 'social');
  assert.equal(url.searchParams.get('utm_campaign'), draft.socialPackage.campaignId);
  assert.equal(url.searchParams.get('utm_content'), draft.contentId);
  for (const unsafe of [
    'https://not-capital-ai.example/',
    'https://capital-ai.online:8443/',
    'https://viewer:password@capital-ai.online/',
  ]) {
    const altered = structuredClone(draft);
    altered.contentPlan.campaign.canonicalUrl = unsafe;
    assert.throws(() => growthDraftUtmUrl(altered), /GROWTH_CANONICAL_ORIGIN_INVALID/);
  }
  const mismatched = structuredClone(draft);
  mismatched.socialPackage.canonicalUrl = 'https://capital-ai.online/learning';
  assert.throws(() => growthDraftUtmUrl(mismatched), /GROWTH_CANONICAL_IDENTITY_MISMATCH/);

  const mismatchedCampaign = structuredClone(draft);
  mismatchedCampaign.socialPackage.campaignId = 'other-campaign';
  assert.throws(() => growthDraftUtmUrl(mismatchedCampaign), /GROWTH_CANONICAL_IDENTITY_MISMATCH/);
});

test('internal website destinations are never tagged as acquisition campaigns', () => {
  const internal = buildGrowthIntelligenceContentDrafts(fixture).filter((item) => item.channel === 'WEBSITE');
  assert.equal(internal.length, 3);
  for (const draft of internal) {
    assert.throws(() => growthDraftUtmUrl(draft), /GROWTH_INTERNAL_UTM_FORBIDDEN/);
  }
});

test('consent, identity and provider negative tests block attribution before correlation', () => {
  const draft = buildGrowthIntelligenceContentDrafts(fixture).find((item) => item.channel === 'X');
  assert.ok(draft);
  const event = eventFor(draft);
  assert.throws(
    () => correlateGrowthContentReadback({ draft, consentGranted: false, consentEvidenceRef: 'synthetic:test-consent', event }),
    /GROWTH_ATTRIBUTION_CONSENT_REQUIRED/,
  );
  assert.throws(
    () => correlateGrowthContentReadback({ draft, consentGranted: true, consentEvidenceRef: 'synthetic:test-consent', event: {
      ...event, contentId: 'other-content',
    } }),
    /GROWTH_ATTRIBUTION_IDENTITY_MISMATCH/,
  );
  assert.throws(
    () => correlateGrowthContentReadback({ draft, consentGranted: true, consentEvidenceRef: 'synthetic:test-consent', event: {
      ...event, providerEntityId: 'INSTAGRAM:fixture-only',
    } }),
    /GROWTH_ATTRIBUTION_PROVIDER_ID_MISMATCH/,
  );
  assert.throws(
    () => correlateGrowthContentReadback({ draft, consentGranted: true, consentEvidenceRef: 'synthetic:test-consent', event: {
      ...event, source: 'GA4',
    } }),
  );
  assert.throws(() => correlateGrowthContentReadback({ draft, consentGranted: true, consentEvidenceRef: '', event }),
    /GROWTH_ATTRIBUTION_CONSENT_REQUIRED/);
  const bundles = correlateGrowthContentReadback({ draft, consentGranted: true, consentEvidenceRef: 'synthetic:test-consent', event });
  assert.equal(bundles.length, 1);
  assert.equal(bundles[0].social.length, 1);
  assert.equal(bundles[0].product.length, 0);
  assert.equal(bundles[0].search.length, 0);
});

test('no actual provider call, publishing or invented observed outcome is performed by this adapter', () => {
  const result = buildGrowthIntelligenceContentDrafts(fixture);
  assert.ok(result.every((row) => row.publicPublishAllowed === false));
  assert.ok(result.every((row) => row.actualMediaAssets === 0));
  assert.ok(result.every((row) => row.socialPackage.deliveries.length === 0));
});


import {
  forecastXAcquisitionBudget, buildXAcquisitionCandidate, xAcquisitionDraftOverview,
} from '../growthIntelligenceContent.ts';

const xBudgetFixture = () => ({
  asOf: '2026-11-24T12:00:00.000Z', pilotStartedAt: '2026-11-24T00:00:00.000Z',
  quoteObservedAt: '2026-11-24T10:00:00.000Z', quoteEvidenceSha256: 'a'.repeat(64),
  balanceObservedAt: '2026-11-24T11:45:00.000Z', balanceEvidenceSha256: 'b'.repeat(64),
  spentMicroEur: 1_000_000, reservedMicroEur: 500_000,
  remainingCreditMicroEur: 18_000_000, otherCostUpperBoundMicroEur: 100_000,
  autoRechargeDisabled: true,
  // Synthetic upper bounds only, not actual X prices.
  upperBoundPerUnitMicroEur: {
    linkWrites: 200000, textWrites: 15000, postReads: 5000,
    ownedReads: 1000, userReads: 10000, tokenRefreshes: 10000,
  },
  quantities: {linkWrites:12,textWrites:16,postReads:400,ownedReads:600,userReads:10,tokenRefreshes:2},
});
test('X pilot forecasts all cost categories and never authorizes live work', () => {
  const result = forecastXAcquisitionBudget(xBudgetFixture());
  assert.equal(result.status, 'FORECAST_WITHIN_LIMIT_NOT_AUTHENTICATED');
  assert.equal(result.forecastMicroEur, 5_460_000);
  assert.equal(result.totalMicroEur, 6_960_000);
  assert.equal(result.remainingBudgetMicroEur, 13_040_000);
  assert.equal(result.publicPublishAllowed, false);
  assert.equal(result.paidActivationAllowed, false);
  assert.equal(result.runtimeBudgetEnforced, false);
  assert.equal(result.providerCalls, 0);
});
test('X budget fails closed for overrun, insufficient credit and exact boundary', () => {
  const fixture = xBudgetFixture();
  assert.equal(forecastXAcquisitionBudget({...fixture, spentMicroEur: 14_040_000}).status,
    'FORECAST_WITHIN_LIMIT_NOT_AUTHENTICATED');
  assert.equal(forecastXAcquisitionBudget({...fixture, spentMicroEur: 14_040_001}).status, 'BLOCKED_BUDGET');
  assert.equal(forecastXAcquisitionBudget({...fixture, remainingCreditMicroEur: 5_959_999}).status, 'BLOCKED_BUDGET');
  assert.equal(forecastXAcquisitionBudget({...fixture, reservedMicroEur: 20_000_000}).status, 'BLOCKED_BUDGET');
});
test('X pilot rejects stale or future evidence, out-of-window estimates and unbudgeted verification', () => {
  const fixture = xBudgetFixture();
  for (const invalid of [
    {...fixture, quoteObservedAt: '2026-11-23T11:59:59.000Z'},
    {...fixture, balanceObservedAt: '2026-11-24T10:59:59.000Z'},
    {...fixture, balanceObservedAt: '2026-11-24T12:00:01.000Z'},
  ]) assert.equal(forecastXAcquisitionBudget(invalid).status, 'BLOCKED_STALE_EVIDENCE');
  assert.equal(forecastXAcquisitionBudget({...fixture,pilotStartedAt:'2026-10-24T00:00:00.000Z'}).status, 'BLOCKED_PILOT_WINDOW');
  assert.equal(forecastXAcquisitionBudget({...fixture,quantities:{...fixture.quantities,ownedReads:27}}).status, 'BLOCKED_READBACK_NOT_BUDGETED');
  assert.equal(forecastXAcquisitionBudget({...fixture,upperBoundPerUnitMicroEur:{...fixture.upperBoundPerUnitMicroEur,postReads:0}}).status, 'BLOCKED_UNKNOWN_COST');
  for(const invalid of [
    {...fixture, autoRechargeDisabled:false}, {...fixture, paidActivationAllowed:true},
    {...fixture, spentMicroEur:-1}, {...fixture, reservedMicroEur:0.5},
    {...fixture, quoteEvidenceSha256:'unknown'},
    {...fixture, upperBoundPerUnitMicroEur:{...fixture.upperBoundPerUnitMicroEur,mediaUploads:10}},
  ]) assert.throws(()=>forecastXAcquisitionBudget(invalid));
});
test('X candidate has canonical UTM, existing priority, exact digest and conservative length reserve', () => {
  const draft = buildGrowthIntelligenceContentDrafts(fixture).find(item => item.channel==='X');
  assert.ok(draft);
  const candidate = buildXAcquisitionCandidate(draft, '🚀 Finanzwissen verstehen. #CapitalAI');
  const url = new URL(candidate.trackedUrl);
  assert.equal(url.searchParams.get('utm_source'),'x');
  assert.equal(url.searchParams.get('utm_content'),draft.contentId);
  assert.equal(candidate.priority,draft.priority);
  assert.equal(candidate.contentSha256,createHash('sha256').update(candidate.text,'utf8').digest('hex'));
  assert.equal(candidate.publicPublishAllowed,false);
  assert.equal(buildXAcquisitionCandidate(draft,'a'.repeat(246)).weightedUpperBound,270);
  assert.equal(buildXAcquisitionCandidate(draft,'🚀'.repeat(123)).weightedUpperBound,270);
  assert.throws(()=>buildXAcquisitionCandidate(draft,'a'.repeat(247)),/X_ACQUISITION_COPY_TOO_LONG/);
  assert.throws(()=>buildXAcquisitionCandidate(draft,'🚀'.repeat(124)),/X_ACQUISITION_COPY_TOO_LONG/);
  for(const body of ['https://x.com', 'x.de', '@account', 'abc\u202e', 'abc\u0000', 'e\u0301', ' abc'])
    assert.throws(()=>buildXAcquisitionCandidate(draft,body),/X_ACQUISITION_COPY_INVALID/);
  const wrong = structuredClone(draft);
  wrong.contentPlan.campaign.canonicalUrl = 'https://capital-ai.online/?email=test';
  wrong.socialPackage.canonicalUrl = wrong.contentPlan.campaign.canonicalUrl;
  assert.throws(()=>buildXAcquisitionCandidate(wrong,'Test'),/X_ACQUISITION_TRACKING_IDENTITY_INVALID/);
});
test('X acquisition overview preserves source scoring and missing conversion evidence as null', () => {
  const drafts = buildGrowthIntelligenceContentDrafts(fixture);
  const overview = xAcquisitionDraftOverview(drafts);
  assert.equal(overview.budgetMicroEur,20_000_000);
  assert.equal(overview.maxWeightedCharacters,270);
  assert.equal(overview.candidates.length,drafts.filter(d=>d.channel==='X').length);
  assert.ok(overview.candidates.every(d=>new URL(d.trackedUrl).searchParams.get('utm_source')==='x'));
  assert.ok(Object.values(overview.conversionEvidence).every(d=>d.value===null && d.status==='NOT_PROVEN'));
  assert.equal(overview.attributionAllowed,false);
  assert.equal(overview.graphExecution,'NOT_PROVEN');
  assert.equal(overview.providerCalls,0);
  assert.deepEqual(JSON.parse(JSON.stringify(overview)),overview);
});


import { spawnSync } from 'node:child_process';

test('X acquisition local CLI accepts bounded input and sanitizes rejection', () => {
  const cli = fileURLToPath(new URL('../../../scripts/growth/growth-intelligence-drafts.mjs', import.meta.url));
  const run = (arg: string, input: string) => spawnSync(process.execPath,
    ['--import','tsx',cli,arg], {input,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  const result = run('--x-acquisition-forecast',JSON.stringify(xBudgetFixture()));
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).forecastMicroEur,5_460_000);
  const draft=buildGrowthIntelligenceContentDrafts(fixture).find(d=>d.channel==='X');
  assert.ok(draft);
  const candidate=run('--x-acquisition-candidate',JSON.stringify({contentId:draft.contentId,editorialBody:'Finanzwissen verstehen.'}));
  assert.equal(candidate.status,0,candidate.stderr);
  assert.equal(JSON.parse(candidate.stdout).publicPublishAllowed,false);
  for(const input of ['x'.repeat(16385),'{"secret":"fixture-only"}','{']) {
    const denied=run('--x-acquisition-forecast',input);
    assert.equal(denied.status,1);
    assert.equal(denied.stdout,'');
    assert.equal(denied.stderr,'X_ACQUISITION_PLANNING_REJECTED\n');
  }
});
