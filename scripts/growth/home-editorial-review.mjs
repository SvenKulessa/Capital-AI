import {createHash} from 'node:crypto';

const DAY = 86_400_000;
const APPROVAL_SCHEMA = 'CAPITAL_AI_HOME_EDITORIAL_APPROVALS@1';

/** Bind approvals to the exact displayed facts, caption, score and source. */
export function homeStoryDigest(story) {
  const {id, topic, title, summary, context, graphic, source, editorial} = story;
  const canonical = {id, topic, title, summary, context, graphic,
    source: {name: source.name, url: source.url, date: source.date},
    editorial: {relevance: editorial.relevance, impact: editorial.impact}};
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/**
 * The approval manifest must be provided separately from untrusted candidates.
 * A URL allowlist or a technical score is not an editorial/license approval.
 * Without a matching review record, return null (fail closed).
 */
export function homepageApproval(story, manifest, asOf) {
  if (manifest?.schema !== APPROVAL_SCHEMA || !Array.isArray(manifest.entries) ||
      manifest.entries.length > 20) return null;
  const matching = manifest.entries.filter(entry => entry?.id === story.id);
  if (matching.length !== 1) return null;
  const review = matching[0];
  if (review.status !== 'APPROVED' || review.reviewer !== 'OWNER' ||
      review.scope !== 'HOMEPAGE' || review.facts !== 'VERIFIED' ||
      review.sourceRights !== 'LINK_ONLY' || review.graphicRights !== 'ORIGINAL' ||
      review.sourceUrl !== story.source.url || review.sourceDate !== story.source.date ||
      review.digest !== homeStoryDigest(story) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(review.reviewedAt ?? '')) return null;
  const dateStart = Date.parse(asOf + 'T00:00:00.000Z');
  const reviewedAt = Date.parse(review.reviewedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt >= dateStart + DAY ||
      reviewedAt < dateStart - 7 * DAY) return null;
  return {sourceKind: 'OFFICIAL_PRIMARY', sourceRights: 'LINK_ONLY',
    graphicRights: 'ORIGINAL', reviewedAt: review.reviewedAt,
    approvalSha256: review.digest};
}

export const HOMEPAGE_APPROVAL_SCHEMA = APPROVAL_SCHEMA;
