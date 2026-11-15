/**
 * Separate, fail-closed review receipts for public archived news and measured market impact.
 * Records must be independently reviewed against their exact content snapshot.
 * No public rights or impact claims are approved as of 2026-11-15.
 */
export const NEWS_ARCHIVE_REVIEW_VERSION = 'CAPITAL_AI_NEWS_ARCHIVE_PUBLIC_REVIEW@1';
export const NEWS_IMPACT_REVIEW_VERSION = 'CAPITAL_AI_NEWS_IMPACT_REVIEW@1';

export const NEWS_ARCHIVE_USE_CASES = Object.freeze({
  story: 'ORIGINAL_EDITORIAL_SUMMARY',
  source: 'ATTRIBUTION_LINK_ONLY',
  graphic: 'FIRST_PARTY_STRUCTURED_GRAPHIC',
});

export const NEWS_ARCHIVE_PUBLIC_REVIEWS = Object.freeze([]);
export const NEWS_IMPACT_PUBLIC_REVIEWS = Object.freeze([]);

/** Includes all public text, imagery definition, provenance and archive identity. */
export function archivePublicSnapshot(item) {
  return JSON.stringify({
    id: item.id,
    topic: item.topic,
    title: item.title,
    summary: item.summary,
    context: item.context,
    graphic: item.graphic,
    source: item.source,
    publishedAt: item.publishedAt,
    retiredAt: item.retiredAt,
    category: item.category,
    archivePath: item.archivePath,
  });
}

/** A review of a numeric outcome must become invalid when any input/claim changes. */
export function archiveImpactSnapshot(item) {
  return JSON.stringify({
    id: item.id,
    publishedAt: item.publishedAt,
    marketImpact: item.marketImpact,
  });
}
