import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  ContentCampaignBriefSchema,
  planContentCampaign,
} from './contentEngine.ts';
import {
  buildDraftContentSocialPackage,
} from './contentSocialPackage.ts';
import {
  GrowthAttributionEventSchema,
  correlateGrowthAttribution,
  assertAttributionSourceSeparation,
} from './growthAttribution.ts';

/**
 * Source-backed, deterministic Growth Intelligence -> existing Content Engine adapter.
 * Planning only. This module never calls providers, writes analytics or publishes.
 * GA4 snapshots are NOT rewritten as UMAMI_PRODUCT or other attribution events.
 */
export const GROWTH_INTELLIGENCE_CONTENT_VERSION = 'growth-intelligence-content-plan/v1' as const;
const nonempty = z.string().trim().min(1);
const ScoreComponentsSchema = z.object({
  strategic_alignment: z.number().int().nonnegative(),
  evidence_relevance: z.number().int().nonnegative(),
  repeatable_repurposing: z.number().int().nonnegative(),
  operational_readiness: z.number().int().nonnegative(),
  governance_feasibility: z.number().int().nonnegative(),
}).strict();

export const GrowthContentRecommendationSchema = z.object({
  content_id: nonempty.max(200).regex(/^CAP-GROW-[0-9]{3}$/),
  source_insight_id: nonempty.max(160),
  content_pillar: nonempty.max(200),
  topic: nonempty.max(500),
  format: nonempty.max(250),
  channel: z.enum([
    'Website', 'Learning Hub', 'LinkedIn', 'Website / Developer Docs',
    'X', 'Studio Hub / YouTube', 'Instagram',
  ]),
  audience: nonempty.max(200),
  funnel_stage: z.enum(['awareness', 'activation', 'consideration', 'conversion', 'retention']),
  hook: nonempty.max(500),
  core_message: nonempty.max(500),
  cta: nonempty.max(250),
  kpi: nonempty.max(500),
  experiment: nonempty.max(700),
  priority: z.number().int().min(0).max(100),
}).strict();

const GrowthInsightSchema = z.object({
  insight_id: nonempty.max(160),
  type: nonempty,
  status: z.enum([
    'VERIFIED_OBSERVATION_CAUSE_NOT_PROVEN',
    'VERIFIED_SMALL_SAMPLE',
    'DOCUMENTED_DRAFT',
    'DRAFT_NOT_PUBLISHED',
  ]),
  source: nonempty,
  source_url: z.string().url().startsWith('https://').optional(),
}).passthrough();

const GrowthSourceSchema = z.object({
  provider: nonempty,
  dataset: nonempty,
  status: z.enum([
    'VERIFIED_READ', 'BLOCKED_EXPIRED_TOKEN', 'BLOCKED_INVALID_GRANT',
    'NOT_PROVEN_NO_PROPERTIES', 'VERIFIED_NO_CAMPAIGNS_NO_INSIGHT_ROWS',
    'DOCUMENTED_DRAFT',
  ]),
  periods: z.array(nonempty).optional(),
  url: z.string().url().startsWith('https://').optional(),
}).strict();

export const GrowthIntelligenceContentPlanSchema = z.object({
  schema_version: z.literal(GROWTH_INTELLIGENCE_CONTENT_VERSION),
  generated_date: z.iso.date(),
  product: z.literal('CAPITAL-AI'),
  scope: nonempty,
  timezone: z.literal('Europe/Berlin'),
  measurement_notes: z.array(nonempty),
  sources: z.array(GrowthSourceSchema).min(1),
  insights: z.array(GrowthInsightSchema).min(1),
  priority_scoring: z.object({
    scale: z.literal('0-100'),
    purpose: z.literal('Editorial prioritization, not performance forecast'),
    dimensions: ScoreComponentsSchema,
  }).strict(),
  score_components: z.record(z.string(), ScoreComponentsSchema),
  recommendations: z.array(GrowthContentRecommendationSchema).min(1).max(100),
  production_sprints: z.array(z.object({
    phase: nonempty,
    window: nonempty,
    content_ids: z.array(nonempty).optional(),
    deliverables: z.array(nonempty),
    release_gate: nonempty.optional(),
  }).strict()),
  quality_gates: z.object({
    draft: nonempty,
    editorial: nonempty,
    rights: nonempty,
    instrumentation: nonempty,
    publication: nonempty,
    learning: nonempty,
  }).strict(),
}).strict();

export type GrowthIntelligenceContentPlan = z.infer<typeof GrowthIntelligenceContentPlanSchema>;
export type GrowthContentRecommendation = z.infer<typeof GrowthContentRecommendationSchema>;

const CHANNELS: Record<GrowthContentRecommendation['channel'], 'WEBSITE' | 'LINKEDIN' | 'X' | 'YOUTUBE' | 'INSTAGRAM'> = {
  Website: 'WEBSITE',
  'Learning Hub': 'WEBSITE',
  LinkedIn: 'LINKEDIN',
  'Website / Developer Docs': 'WEBSITE',
  X: 'X',
  'Studio Hub / YouTube': 'YOUTUBE',
  Instagram: 'INSTAGRAM',
};

const MAX_COMPONENTS: Readonly<Record<keyof z.infer<typeof ScoreComponentsSchema>, number>> = {
  strategic_alignment: 30,
  evidence_relevance: 25,
  repeatable_repurposing: 20,
  operational_readiness: 15,
  governance_feasibility: 10,
};

export function validateGrowthIntelligenceContentPlan(raw: unknown): GrowthIntelligenceContentPlan {
  const plan = GrowthIntelligenceContentPlanSchema.parse(raw);
  const insights = new Set<string>();
  for (const insight of plan.insights) {
    if (insights.has(insight.insight_id)) throw Error('GROWTH_INSIGHT_ID_DUPLICATE');
    insights.add(insight.insight_id);
  }
  const seen = new Set<string>();
  for (const recommendation of plan.recommendations) {
    const id = recommendation.content_id;
    if (seen.has(id)) throw Error('GROWTH_CONTENT_ID_DUPLICATE');
    seen.add(id);
    if (!insights.has(recommendation.source_insight_id)) throw Error('GROWTH_INSIGHT_REFERENCE_MISSING');
    const components = plan.score_components[id];
    if (!components) throw Error('GROWTH_PRIORITY_COMPONENTS_MISSING');
    const score = (Object.keys(MAX_COMPONENTS) as (keyof typeof MAX_COMPONENTS)[]).reduce((sum, name) => {
      if (components[name] > MAX_COMPONENTS[name] || components[name] > plan.priority_scoring.dimensions[name]) {
        throw Error('GROWTH_PRIORITY_WEIGHT_INVALID');
      }
      return sum + components[name];
    }, 0);
    if (score !== recommendation.priority) throw Error('GROWTH_PRIORITY_SCORE_MISMATCH');
  }
  if (Object.keys(plan.score_components).some((id) => !seen.has(id))) {
    throw Error('GROWTH_PRIORITY_ORPHAN_COMPONENTS');
  }
  for (const sprint of plan.production_sprints) {
    if (sprint.content_ids?.some((id) => !seen.has(id))) throw Error('GROWTH_SPRINT_CONTENT_ID_UNKNOWN');
  }
  return plan;
}

function draftLandingPage(item: GrowthContentRecommendation): string {
  // Do not invent public docs or Studio routes without runtime readback.
  if (item.channel === 'Learning Hub' || item.channel === 'Instagram') {
    return 'https://capital-ai.online/learning';
  }
  return 'https://capital-ai.online/';
}

export function buildGrowthIntelligenceContentDrafts(raw: unknown) {
  const snapshot = validateGrowthIntelligenceContentPlan(raw);
  return snapshot.recommendations.map((item) => {
    const insight = snapshot.insights.find((source) => source.insight_id === item.source_insight_id);
    if (!insight) throw Error('GROWTH_INSIGHT_REFERENCE_MISSING');
    const channel = CHANNELS[item.channel];
    const canonicalUrl = draftLandingPage(item);
    // sha256 of exact snapshot-derived source identity, not a Git commit claim.
    const sourceSha = createHash('sha256').update(JSON.stringify({
      schema: snapshot.schema_version, generated: snapshot.generated_date, insight, item,
    })).digest('hex');
    const draftText = [
      item.topic, item.hook, item.core_message, item.cta,
      'Entwurf: redaktionelle und Rechteprüfung ausstehend; keine Veröffentlichung.',
    ].join('\n');
    const campaign = ContentCampaignBriefSchema.parse({
      campaignId: 'capital-ai-growth-20261120',
      productId: 'capital-ai',
      sourceSha,
      canonicalUrl,
      locale: 'de-DE',
      objective: item.core_message,
      audience: [item.audience],
      channels: [channel],
      outputs: ['TEXT', 'ANALYTICS'],
      // Private Drive evidence is NOT copied into public source URLs.
      sourceUrls: [canonicalUrl],
    });
    const asset = {
      assetId: item.content_id + '-draft-text',
      contentId: item.content_id,
      kind: 'TEXT' as const,
      sha256: createHash('sha256').update(draftText, 'utf8').digest('hex'),
      mimeType: 'text/plain',
      evidenceRef: 'CAPITAL-AI-GROWTH/growth-intelligence/content-plan-v1.json#' + item.content_id,
      sourceSha,
    };
    const socialPackage = buildDraftContentSocialPackage({
      campaign, contentId: item.content_id, assets: [asset],
    });
    const contentPlan = planContentCampaign(campaign);
    if (contentPlan.publication.publicPublishAllowed || socialPackage.approvals.length || socialPackage.deliveries.length) {
      throw Error('GROWTH_DRAFT_AUTHORITY_VIOLATION');
    }
    return {
      contentId: item.content_id,
      insightId: insight.insight_id,
      insightStatus: insight.status,
      priority: item.priority,
      channel,
      draftText,
      contentPlan,
      socialPackage,
      review: 'REVIEW_REQUIRED' as const,
      rights: 'NOT_PROVEN' as const,
      consent: 'NOT_PROVEN' as const,
      publicPublishAllowed: false as const,
      actualMediaAssets: 0 as const,
    };
  });
}

export type GrowthIntelligenceDraft = ReturnType<typeof buildGrowthIntelligenceContentDrafts>[number];

/** Generate UTM metadata only; collecting/tracking remains governed by actual consent. */
export function growthDraftUtmUrl(draft: GrowthIntelligenceDraft): string {
  const url = new URL(draft.contentPlan.campaign.canonicalUrl);
  if (url.origin !== 'https://capital-ai.online' || url.username || url.password) {
    throw Error('GROWTH_CANONICAL_ORIGIN_INVALID');
  }
  if (draft.socialPackage.canonicalUrl !== draft.contentPlan.campaign.canonicalUrl
      || draft.socialPackage.campaignId !== draft.contentPlan.campaign.campaignId
      || draft.socialPackage.contentId !== draft.contentId) {
    throw Error('GROWTH_CANONICAL_IDENTITY_MISMATCH');
  }
  // Internal URLs must not be tagged as acquisition campaigns in GA4.
  if (draft.channel === 'WEBSITE') throw Error('GROWTH_INTERNAL_UTM_FORBIDDEN');
  url.searchParams.set('utm_source', draft.channel.toLowerCase());
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', draft.socialPackage.campaignId);
  url.searchParams.set('utm_content', draft.contentId);
  return url.href;
}

/**
 * Consent-gated, read-only reconciliation using the canonical attribution contract.
 * Do not coerce GA4 insights into UMAMI_PRODUCT events; those are different sources.
 */
export function correlateGrowthContentReadback(input: {
  draft: GrowthIntelligenceDraft;
  consentGranted: boolean;
  consentEvidenceRef: string;
  event: unknown;
}) {
  if (!input.consentGranted || !input.consentEvidenceRef?.trim()) {
    throw Error('GROWTH_ATTRIBUTION_CONSENT_REQUIRED');
  }
  const event = GrowthAttributionEventSchema.parse(input.event);
  if (event.campaignId !== input.draft.socialPackage.campaignId
      || event.contentId !== input.draft.contentId
      || event.canonicalUrl !== input.draft.socialPackage.canonicalUrl) {
    throw Error('GROWTH_ATTRIBUTION_IDENTITY_MISMATCH');
  }
  if (event.source === 'SOCIAL_PROVIDER'
      && !event.providerEntityId?.startsWith(input.draft.channel + ':')) {
    throw Error('GROWTH_ATTRIBUTION_PROVIDER_ID_MISMATCH');
  }
  const bundles = correlateGrowthAttribution([event]);
  for (const bundle of bundles) assertAttributionSourceSeparation(bundle);
  return bundles;
}


// CAI-X-GROWTH@1 — offline planning, never a provider-call authorization.
// Integer micro-EUR avoids floating point rounding. Prices are operator-entered
// conservative EUR upper bounds, including FX/tax; no embedded provider tariff.
export const X_ACQUISITION_BUDGET_MICRO_EUR = 20_000_000;
export const X_ACQUISITION_MAX_WEIGHT = 270;
export const X_ACQUISITION_OPERATIONS = [
  'linkWrites', 'textWrites', 'postReads', 'ownedReads', 'userReads', 'tokenRefreshes',
] as const;
const XAmountsSchema = z.object({
  linkWrites: z.number().int().min(0).max(20_000_000),
  textWrites: z.number().int().min(0).max(20_000_000),
  postReads: z.number().int().min(0).max(20_000_000),
  ownedReads: z.number().int().min(0).max(20_000_000),
  userReads: z.number().int().min(0).max(20_000_000),
  tokenRefreshes: z.number().int().min(0).max(20_000_000),
}).strict();
const XQuantitiesSchema = z.object({
  linkWrites: z.number().int().min(0).max(10000),
  textWrites: z.number().int().min(0).max(10000),
  postReads: z.number().int().min(0).max(10000),
  ownedReads: z.number().int().min(0).max(10000),
  userReads: z.number().int().min(0).max(10000),
  tokenRefreshes: z.number().int().min(0).max(10000),
}).strict();
const XBudgetInputSchema = z.object({
  asOf: z.string().datetime(),
  pilotStartedAt: z.string().datetime(),
  quoteObservedAt: z.string().datetime(),
  quoteEvidenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  balanceObservedAt: z.string().datetime(),
  balanceEvidenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  // Account-wide spend and unsettled reservations, not just this campaign.
  spentMicroEur: z.number().int().min(0).max(100_000_000),
  reservedMicroEur: z.number().int().min(0).max(100_000_000),
  remainingCreditMicroEur: z.number().int().min(0).max(100_000_000),
  otherCostUpperBoundMicroEur: z.number().int().min(0).max(20_000_000),
  autoRechargeDisabled: z.literal(true),
  upperBoundPerUnitMicroEur: XAmountsSchema,
  quantities: XQuantitiesSchema,
}).strict();

/**
 * A forecast from recorded inputs, not a ledger, reservation, tariff readback
 * or spend approval. Unknown/stale prices or credit never become zero.
 * An owner-authorized durable account-wide reservation must precede ANY live
 * OAuth/read/write work. This function cannot authorize that work.
 */
export function forecastXAcquisitionBudget(raw: unknown) {
  const input = XBudgetInputSchema.parse(raw);
  const now = Date.parse(input.asOf);
  const started = Date.parse(input.pilotStartedAt);
  const quoteAge = now - Date.parse(input.quoteObservedAt);
  const balanceAge = now - Date.parse(input.balanceObservedAt);
  const withinPilot = now >= started && now - started < 30 * 86400000;
  const fresh = quoteAge >= 0 && quoteAge <= 86400000
    && balanceAge >= 0 && balanceAge <= 3600000;
  // Every planned write includes at least one own-post readback. Unknown
  // outcomes must retain reservations; no retry is authorized by a forecast.
  const enoughReadbacks = input.quantities.ownedReads >=
    input.quantities.linkWrites + input.quantities.textWrites;
  const positiveCosts = X_ACQUISITION_OPERATIONS.every(key =>
    input.quantities[key] === 0 || input.upperBoundPerUnitMicroEur[key] > 0);
  const forecastMicroEur = X_ACQUISITION_OPERATIONS.reduce((sum, key) =>
    sum + input.quantities[key] * input.upperBoundPerUnitMicroEur[key],
    input.otherCostUpperBoundMicroEur);
  const totalMicroEur = input.spentMicroEur + input.reservedMicroEur + forecastMicroEur;
  // Assume credit might still need to cover unsettled reservations.
  const withinBudget = totalMicroEur <= X_ACQUISITION_BUDGET_MICRO_EUR
    && input.reservedMicroEur + forecastMicroEur <= input.remainingCreditMicroEur;
  const status = !withinPilot ? 'BLOCKED_PILOT_WINDOW'
    : !fresh ? 'BLOCKED_STALE_EVIDENCE'
    : !enoughReadbacks ? 'BLOCKED_READBACK_NOT_BUDGETED'
    : !positiveCosts ? 'BLOCKED_UNKNOWN_COST'
    : !withinBudget ? 'BLOCKED_BUDGET'
    : 'FORECAST_WITHIN_LIMIT_NOT_AUTHENTICATED';
  return {
    contractVersion: 'CAI-X-GROWTH@1',
    status, budgetMicroEur: X_ACQUISITION_BUDGET_MICRO_EUR,
    forecastMicroEur, totalMicroEur,
    remainingBudgetMicroEur: Math.max(0, X_ACQUISITION_BUDGET_MICRO_EUR - totalMicroEur),
    quoteEvidenceSha256: input.quoteEvidenceSha256,
    balanceEvidenceSha256: input.balanceEvidenceSha256,
    providerCalls: 0, autoRechargeAllowed: false, publicPublishAllowed: false,
    paidActivationAllowed: false, runtimeBudgetEnforced: false,
  } as const;
}

/**
 * Deliberately conservative length bound for an editorial subset, not a full
 * twitter-text implementation. Reject embedded URLs/mentions and invisible
 * controls; append the canonical generated HTTPS URL at t.co weight 23.
 * Count non-Latin BMP characters and each supplementary UTF-16 pair at 2;
 * emoji clusters may be overcounted but are never intentionally undercounted.
 */
export function buildXAcquisitionCandidate(draft: GrowthIntelligenceDraft, editorialBody: string) {
  if (draft.channel !== 'X') throw Error('X_ACQUISITION_CHANNEL_INVALID');
  if (typeof editorialBody !== 'string' || editorialBody.length > 1000
    || editorialBody.trim() !== editorialBody || !editorialBody
    || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(editorialBody.replace(/\n/g, ''))
    || /[\/@:\\]|\.(?=[\p{L}\p{N}])/u.test(editorialBody)
    || editorialBody.normalize('NFC') !== editorialBody) {
    throw Error('X_ACQUISITION_COPY_INVALID');
  }
  const canonical = draft.contentPlan.campaign.canonicalUrl;
  if (!['https://capital-ai.online/', 'https://capital-ai.online/learning'].includes(canonical)
    || !/^CAP-GROW-[0-9]{3}$/.test(draft.contentId)
    || !/^capital-ai-growth-[0-9]{8}$/.test(draft.socialPackage.campaignId)) {
    throw Error('X_ACQUISITION_TRACKING_IDENTITY_INVALID');
  }
  const trackedUrl = growthDraftUtmUrl(draft);
  const bodyWeight = Array.from(editorialBody).reduce((sum, char) => {
    const cp = char.codePointAt(0)!;
    const single = cp <= 0x10ff || (cp >= 0x2000 && cp <= 0x200d)
      || (cp >= 0x2010 && cp <= 0x201f) || (cp >= 0x2032 && cp <= 0x2037);
    return sum + (single ? 1 : 2);
  }, 0);
  const weightedUpperBound = bodyWeight + 1 + 23;
  if (weightedUpperBound > X_ACQUISITION_MAX_WEIGHT) throw Error('X_ACQUISITION_COPY_TOO_LONG');
  const text = editorialBody + '\n' + trackedUrl;
  return {
    contractVersion: 'CAI-X-GROWTH@1', contentId: draft.contentId,
    campaignId: draft.socialPackage.campaignId, sourceSha: draft.socialPackage.sourceSha,
    priority: draft.priority, trackedUrl, text, weightedUpperBound,
    contentSha256: createHash('sha256').update(text, 'utf8').digest('hex'),
    review: 'REVIEW_REQUIRED', rights: 'NOT_PROVEN', publicationState: 'DRAFT_ONLY',
    publicPublishAllowed: false, providerCalls: 0,
  } as const;
}

/** Source-specific conversion evidence requirements, not synthetic measurements. */
export function xAcquisitionDraftOverview(drafts: readonly GrowthIntelligenceDraft[]) {
  return {
    contractVersion: 'CAI-X-GROWTH@1', pilotDays: 30,
    budgetMicroEur: X_ACQUISITION_BUDGET_MICRO_EUR,
    maxWeightedCharacters: X_ACQUISITION_MAX_WEIGHT,
    status: 'NOT_PROVEN_COST_AND_RUNTIME',
    candidates: drafts.filter(draft => draft.channel === 'X')
      .map(draft => ({ contentId: draft.contentId, priority: draft.priority,
        campaignId: draft.socialPackage.campaignId, trackedUrl: growthDraftUtmUrl(draft),
        editorialState: 'REVIEW_REQUIRED' }))
      .sort((a, b) => b.priority - a.priority || a.contentId.localeCompare(b.contentId)),
    conversionEvidence: {
      GA4: { metric: 'campaignSessions', value: null, status: 'NOT_PROVEN' },
      SUPABASE: { metric: 'campaignRegistrations', value: null, status: 'NOT_PROVEN' },
      STRIPE: { metric: 'campaignPaidSubscriptions', value: null, status: 'NOT_PROVEN' },
    },
    attributionAllowed: false, publicPublishAllowed: false, paidActivationAllowed: false,
    runtimeBudgetEnforced: false, providerCalls: 0, graphExecution: 'NOT_PROVEN',
  } as const;
}
