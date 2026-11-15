/**
 * Editorial review ledger, separate from candidate news data.
 * A checked-in review is an engineering reference, never a legal grant by itself.
 * New public-display entries need matching independently documented commercial rights.
 *
 * There are deliberately no admitted production reviews as of 2026-11-15.
 * This prevents news JSON or automated candidate scoring from self-approving.
 */
export const HOME_EDITORIAL_REVIEW_VERSION = 'CAPITAL_AI_HOME_EDITORIAL_REVIEW@1';
export const HOME_PUBLIC_DISPLAY_REVIEWS = Object.freeze([]);

export const HOME_RIGHTS_USE_CASES = Object.freeze({
  story: 'ORIGINAL_EDITORIAL_SUMMARY',
  source: 'ATTRIBUTION_LINK_ONLY',
  graphic: 'FIRST_PARTY_STRUCTURED_GRAPHIC',
});

/** Bind each license review to the exact publicly displayed text, source and graphic. */
export function homeReviewContentSnapshot(story) {
  return JSON.stringify({
    id: story.id,
    topic: story.topic,
    title: story.title,
    summary: story.summary,
    context: story.context,
    graphic: story.graphic,
    source: story.source,
  });
}
