// Video SEO uses only approved public/free videos. Empty until a real licensed
// video is present; it must never make private or draft lessons indexable.
export const PUBLIC_LEARNING_VIDEO_INVENTORY = Object.freeze([]);
export const PUBLIC_LEARNING_VIDEO_CATEGORIES = Object.freeze(['Architektur', 'Fintech Deepdive', 'Social']);
export const EXPECTED_YOUTUBE_CHANNEL_ID = 'UCqaBNJwcfu2cZL3GgG9TLgA';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const SHA256 = /^[a-f0-9]{64}$/;
function safeHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      url.hostname !== 'localhost' && url.hostname.includes('.');
  } catch { return false; }
}
export function publicVideoSchema(video) {
  if (!video || video.publicationState !== 'PUBLISHED' || video.visibility !== 'PUBLIC' ||
    video.licenseState !== 'VERIFIED' || video.editorialApproval !== 'APPROVED' ||
    video.searchEligible !== true || video.isFreePreview !== true ||
    !VIDEO_ID.test(video.youtubeId ?? '') || video.externalYouTubeId !== video.youtubeId ||
    video.providerChannelId !== EXPECTED_YOUTUBE_CHANNEL_ID ||
    video.providerReadbackVerified !== true || video.processingStatus !== 'SUCCEEDED' ||
    video.embeddable !== true || !SHA256.test(video.assetSha256 ?? '') ||
    typeof video.providerEvidenceRef !== 'string' || !video.providerEvidenceRef.trim() ||
    typeof video.title !== 'string' || video.title.trim().length < 8 ||
    typeof video.description !== 'string' || video.description.trim().length < 30 ||
    !safeHttps(video.thumbnailUrl) ||
    typeof video.uploadDate !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(video.uploadDate) ||
    !Number.isFinite(Date.parse(video.uploadDate)) ||
    typeof video.rightsEvidenceRef !== 'string' || !video.rightsEvidenceRef.trim()) return null;
  return Object.freeze({
    '@type': 'VideoObject',
    '@id': 'https://capital-ai.online/learning#video-' + video.youtubeId,
    name: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    embedUrl: 'https://www.youtube-nocookie.com/embed/' + video.youtubeId,
    url: 'https://capital-ai.online/learning',
    isAccessibleForFree: true,
    publisher: { '@id': 'https://capital-ai.online/#project' },
  });
}
// Use one fail-closed admission set for browser embeds and SEO VideoObject.
// Only one free PUBLIC preview per category; public YouTube cannot paywall lessons.
/** @param {readonly any[]} [videos] */
export function admittedPublicLearningVideos(videos = PUBLIC_LEARNING_VIDEO_INVENTORY) {
  if (!Array.isArray(videos)) return [];
  const seenIds = new Set();
  const seenCategories = new Set();
  return videos.filter(video => {
    if (!video || typeof video.id !== 'string' || !video.id.trim() ||
      !PUBLIC_LEARNING_VIDEO_CATEGORIES.includes(video.category) ||
      !publicVideoSchema(video) || seenIds.has(video.youtubeId) ||
      seenCategories.has(video.category)) return false;
    seenIds.add(video.youtubeId);
    seenCategories.add(video.category);
    return true;
  });
}
export function publicLearningVideoSchemas(videos = PUBLIC_LEARNING_VIDEO_INVENTORY) {
  return admittedPublicLearningVideos(videos).map(video => publicVideoSchema(video));
}
