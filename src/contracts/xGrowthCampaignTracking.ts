/** Exact CAI-X-GROWTH@1 landing tuple from the existing Growth Intelligence plan.
 * Self-declared UTM context only: no proof of a provider click or a purchase.
 * No storage, network access, user identifiers or publication authority.
 */
export const X_GROWTH_TRACKING = Object.freeze({
  campaignId: 'capital-ai-growth-20261120',
  contentId: 'CAP-GROW-005',
  canonicalUrl: 'https://capital-ai.online/',
  source: 'x',
  medium: 'social',
} as const);

export function readXGrowthTracking(input: unknown): typeof X_GROWTH_TRACKING | null {
  if (typeof input !== 'string' || !input.startsWith('?') || input.length > 2048) return null;
  const query = new URLSearchParams(input.slice(1));
  const fields = {
    utm_source: X_GROWTH_TRACKING.source,
    utm_medium: X_GROWTH_TRACKING.medium,
    utm_campaign: X_GROWTH_TRACKING.campaignId,
    utm_content: X_GROWTH_TRACKING.contentId,
  };
  for (const [name, expected] of Object.entries(fields)) {
    const values = query.getAll(name);
    if (values.length !== 1 || values[0] !== expected) return null;
  }
  return X_GROWTH_TRACKING;
}
