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
  const altered = structuredClone(draft);
  altered.contentPlan.campaign.canonicalUrl = 'https://not-capital-ai.example/';
  assert.throws(() => growthDraftUtmUrl(altered), /GROWTH_CANONICAL_ORIGIN_INVALID/);
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
