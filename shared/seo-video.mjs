// Video SEO uses only approved public/free videos. Empty until a real licensed
// video is present; it must never make private or draft lessons indexable.
export const PUBLIC_LEARNING_VIDEO_INVENTORY = Object.freeze([]);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
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
    !VIDEO_ID.test(video.youtubeId ?? '') ||
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
export function publicLearningVideoSchemas(videos = PUBLIC_LEARNING_VIDEO_INVENTORY) {
  if (!Array.isArray(videos)) return [];
  const seen = new Set();
  return videos.flatMap(video => {
    const schema = publicVideoSchema(video);
    if (!schema || seen.has(schema['@id'])) return [];
    seen.add(schema['@id']);
    return [schema];
  });
}
