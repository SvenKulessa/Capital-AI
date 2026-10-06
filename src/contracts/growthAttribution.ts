import { z } from 'zod';

export const GROWTH_ATTRIBUTION_POLICY_VERSION = 'GROWTH_ATTRIBUTION_POLICY@1' as const;

export const GrowthAttributionSourceSchema = z.enum([
  'GSC_SEARCH',
  'UMAMI_PRODUCT',
  'SOCIAL_PROVIDER',
]);

export const GrowthAttributionMetricSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.number().finite(),
  unit: z.enum([
    'COUNT',
    'PERCENT',
    'POSITION',
    'SECONDS',
    'EUR',
    'USD',
  ]),
}).strict();

export const GrowthAttributionEventSchema = z.object({
  policyVersion: z.literal(GROWTH_ATTRIBUTION_POLICY_VERSION),
  source: GrowthAttributionSourceSchema,
  canonicalUrl: z.string().url(),
  occurredAt: z.string().datetime(),
  campaignId: z.string().min(1).max(200).optional(),
  contentId: z.string().min(1).max(200).optional(),
  providerEntityId: z.string().min(1).max(300).optional(),
  evidenceRef: z.string().min(1),
  metrics: z.array(GrowthAttributionMetricSchema).min(1).max(50),
}).strict();

export type GrowthAttributionEvent = z.infer<typeof GrowthAttributionEventSchema>;

export const GrowthAttributionBundleSchema = z.object({
  policyVersion: z.literal(GROWTH_ATTRIBUTION_POLICY_VERSION),
  canonicalUrl: z.string().url(),
  campaignId: z.string().min(1).max(200).optional(),
  contentId: z.string().min(1).max(200).optional(),
  search: z.array(GrowthAttributionEventSchema).max(100),
  product: z.array(GrowthAttributionEventSchema).max(100),
  social: z.array(GrowthAttributionEventSchema).max(100),
}).strict();

export type GrowthAttributionBundle = z.infer<typeof GrowthAttributionBundleSchema>;

export function correlateGrowthAttribution(
  rawEvents: readonly unknown[],
): GrowthAttributionBundle[] {
  const events = rawEvents.map((event) => GrowthAttributionEventSchema.parse(event));
  const groups = new Map<string, GrowthAttributionBundle>();

  for (const event of events) {
    const key = [
      event.canonicalUrl,
      event.campaignId ?? '',
      event.contentId ?? '',
    ].join('|');

    const current = groups.get(key) ?? {
      policyVersion: GROWTH_ATTRIBUTION_POLICY_VERSION,
      canonicalUrl: event.canonicalUrl,
      ...(event.campaignId ? { campaignId: event.campaignId } : {}),
      ...(event.contentId ? { contentId: event.contentId } : {}),
      search: [],
      product: [],
      social: [],
    };

    if (event.source === 'GSC_SEARCH') current.search.push(event);
    if (event.source === 'UMAMI_PRODUCT') current.product.push(event);
    if (event.source === 'SOCIAL_PROVIDER') current.social.push(event);

    groups.set(key, current);
  }

  return [...groups.values()].map((bundle) => GrowthAttributionBundleSchema.parse(bundle));
}

export function assertAttributionSourceSeparation(bundle: GrowthAttributionBundle): void {
  if (bundle.search.some((event) => event.source !== 'GSC_SEARCH')) {
    throw new Error('GROWTH_ATTRIBUTION_SEARCH_SOURCE_MIXED');
  }
  if (bundle.product.some((event) => event.source !== 'UMAMI_PRODUCT')) {
    throw new Error('GROWTH_ATTRIBUTION_PRODUCT_SOURCE_MIXED');
  }
  if (bundle.social.some((event) => event.source !== 'SOCIAL_PROVIDER')) {
    throw new Error('GROWTH_ATTRIBUTION_SOCIAL_SOURCE_MIXED');
  }
}
