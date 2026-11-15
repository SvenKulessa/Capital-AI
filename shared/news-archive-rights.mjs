/** Independent archive publication ledger; editable content does not grant its own rights.
 * No production item is approved. Feed reviews require a separately verified rights-holder dossier.
 */
export const NEWS_ARCHIVE_REVIEW_VERSION = 'CAPITAL_AI_NEWS_ARCHIVE_PUBLIC_REVIEW@1';
export const NEWS_ARCHIVE_PUBLIC_REVIEWS = Object.freeze([]);
export const NEWS_ARCHIVE_USE_CASE = 'PUBLIC_ANALYTICS_NEWS_ARCHIVE';

export function archiveContentSnapshot(item) {
  return JSON.stringify({
    id: item.id,
    topic: item.topic,
    title: item.title,
    summary: item.summary,
    context: item.context,
    source: item.source,
    graphic: item.graphic,
    publishedAt: item.publishedAt,
    archivePath: item.archivePath,
  });
}
export function archiveRightsAdmitted(item, reviews = NEWS_ARCHIVE_PUBLIC_REVIEWS) {
  if (!item || !Array.isArray(reviews) || item.rights?.status !== 'APPROVED' ||
      typeof item.rights.evidenceRef !== 'string' || !item.rights.evidenceRef.trim()) return false;
  const snapshot = archiveContentSnapshot(item);
  return reviews.some(review =>
    review?.version === NEWS_ARCHIVE_REVIEW_VERSION &&
    review?.decision === 'APPROVED' &&
    review?.allowedUse === NEWS_ARCHIVE_USE_CASE &&
    review?.storyId === item.id &&
    review?.evidenceRef === item.rights.evidenceRef &&
    typeof review.reviewedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt) &&
    review.contentSnapshot === snapshot
  );
}
