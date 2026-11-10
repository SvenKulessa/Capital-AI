/**
 * First-party, no-identity organic Instagram campaign link for the ETF learning pilot.
 * This module is deliberately side-effect-free: it performs no requests, storage or tracking.
 * Consumer analytics may transmit only these fixed values after an explicit opt-in.
 */
export const INSTAGRAM_LEARNING_TRACKING = Object.freeze({
  campaignId: 'capital-ai-instagram-etf-learning-v1',
  contentId: 'capital-ai-instagram-etf-kosten-20261110',
  canonicalUrl: 'https://capital-ai.online/learning',
  source: 'instagram',
  medium: 'organic_social',
} as const);

export function buildInstagramLearningTrackingUrl(): string {
  const url = new URL(INSTAGRAM_LEARNING_TRACKING.canonicalUrl);
  url.searchParams.set('utm_source', INSTAGRAM_LEARNING_TRACKING.source);
  url.searchParams.set('utm_medium', INSTAGRAM_LEARNING_TRACKING.medium);
  url.searchParams.set('utm_campaign', INSTAGRAM_LEARNING_TRACKING.campaignId);
  url.searchParams.set('utm_content', INSTAGRAM_LEARNING_TRACKING.contentId);
  return url.href;
}

/**
 * Return only a known, versioned campaign. Ignore unrelated parameters such as fbclid,
 * never return or transmit those values. Reject duplicates and altered UTM fields.
 * The link is self-asserted input, not proof of an Instagram provider click.
 */
export function readInstagramLearningTracking(input: unknown): typeof INSTAGRAM_LEARNING_TRACKING | null {
  if (typeof input !== 'string' || !input.startsWith('?') || input.length > 2048) return null;
  const params = new URLSearchParams(input.slice(1));
  const entries = {
    utm_source: INSTAGRAM_LEARNING_TRACKING.source,
    utm_medium: INSTAGRAM_LEARNING_TRACKING.medium,
    utm_campaign: INSTAGRAM_LEARNING_TRACKING.campaignId,
    utm_content: INSTAGRAM_LEARNING_TRACKING.contentId,
  };
  for (const [key, expected] of Object.entries(entries)) {
    const values = params.getAll(key);
    if (values.length !== 1 || values[0] !== expected) return null;
  }
  return INSTAGRAM_LEARNING_TRACKING;
}
