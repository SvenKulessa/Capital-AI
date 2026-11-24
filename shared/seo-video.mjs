// Video SEO uses only approved public/free videos; private or draft lessons stay excluded.
// EP01: public channel readback + explicit owner Studio/status and rights confirmation.
export const PUBLIC_LEARNING_VIDEO_INVENTORY = Object.freeze([
  Object.freeze({
    "id": "masterclass-01-chartanalyse",
    "category": "Fintech Deepdive",
    "title": "Masterclass Chartanalyse und Grundlagen",
    "youtubeId": "msfyAwCkzOM",
    "externalYouTubeId": "msfyAwCkzOM",
    "publicationState": "PUBLISHED",
    "visibility": "PUBLIC",
    "licenseState": "VERIFIED",
    "editorialApproval": "APPROVED",
    "searchEligible": true,
    "isFreePreview": true,
    "providerReadbackVerified": true,
    "providerChannelId": "UCqaBNJwcfu2cZL3GgG9TLgA",
    "processingStatus": "SUCCEEDED",
    "embeddable": true,
    "assetSha256": "9824afd29439deb661c0bc502e5d10eaf7d8b6d075a7b768f115ab9dcdb3cff4",
    "providerEvidenceRef": "docs/growth/MASTERCLASS-EP01-PUBLIC-PREVIEW-EVIDENCE-20261124.md#provider-readback",
    "rightsEvidenceRef": "docs/growth/MASTERCLASS-EP01-PUBLIC-PREVIEW-EVIDENCE-20261124.md#owner-confirmation",
    "description": "Folge 01 der CAPITAL-AI Masterclass: Grundlagen der Chartanalyse, Candlesticks, OHLC-Kursdaten und Chartstrukturen. Kostenloses Lernvideo (06:45). Ausschließlich zur Finanzbildung; keine Anlageberatung.",
    "thumbnailUrl": "https://i.ytimg.com/vi_webp/msfyAwCkzOM/maxresdefault.webp",
    "uploadDate": "2026-11-24T00:00:00.000Z"
  }),
]);
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
// Default: one free PUBLIC preview per category. Owner-requested EP01 + EP02
// are the sole two-video exception; every entry still passes publicVideoSchema.
// Public YouTube cannot paywall lessons.
const MASTERCLASS_PUBLIC_PAIR = new Set(['msfyAwCkzOM', 'AMeuY4P11Gw']);
/** @param {readonly any[]} [videos] */
export function admittedPublicLearningVideos(videos = PUBLIC_LEARNING_VIDEO_INVENTORY) {
  if (!Array.isArray(videos)) return [];
  const seenIds = new Set();
  const firstByCategory = new Map();
  return videos.filter(video => {
    if (!video || typeof video.id !== 'string' || !video.id.trim() ||
      !PUBLIC_LEARNING_VIDEO_CATEGORIES.includes(video.category) ||
      !publicVideoSchema(video) || seenIds.has(video.youtubeId)) return false;
    const first = firstByCategory.get(video.category);
    if (first && !(video.category === 'Fintech Deepdive' &&
      MASTERCLASS_PUBLIC_PAIR.has(first) && MASTERCLASS_PUBLIC_PAIR.has(video.youtubeId))) return false;
    seenIds.add(video.youtubeId);
    if (!first) firstByCategory.set(video.category, video.youtubeId);
    return true;
  });
}
export function publicLearningVideoSchemas(videos = PUBLIC_LEARNING_VIDEO_INVENTORY) {
  return admittedPublicLearningVideos(videos).map(video => publicVideoSchema(video));
}
