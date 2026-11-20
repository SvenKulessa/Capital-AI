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
  if (url.protocol !== 'https:' || url.hostname !== 'capital-ai.online') {
    throw Error('GROWTH_CANONICAL_ORIGIN_INVALID');
  }
  url.searchParams.set('utm_source', draft.channel.toLowerCase());
  url.searchParams.set('utm_medium', draft.channel === 'WEBSITE' ? 'internal' : 'social');
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
  event: unknown;
}) {
  if (!input.consentGranted) throw Error('GROWTH_ATTRIBUTION_CONSENT_REQUIRED');
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
