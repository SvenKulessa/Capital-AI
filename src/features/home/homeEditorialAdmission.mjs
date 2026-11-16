import {
  HOME_EDITORIAL_REVIEW_VERSION, HOME_PUBLIC_DISPLAY_REVIEWS,
  HOME_RIGHTS_USE_CASES, homeReviewContentSnapshot,
} from './homeEditorialRightsLedger.mjs';

// Shared, side-effect-free admission for Homepage news and the editorial CLI.
// A CADS/Content Engine plan proves structure, not reuse rights or publication authority.
export const HOME_SCORE_VERSION = 'CAPITAL_AI_HOME_EDITORIAL_SCORE@1';
export const HOME_CONTENT_ENGINE_VERSION = 'CAPITAL_AI_CONTENT_ENGINE@1';
const allowedHosts = new Set(['xrpl.org', 'solana.com', 'polygon.technology', 'docs.polygon.technology']);
const day = 86_400_000;
const allowed = (value, max = 500) => typeof value === 'string' && value.trim().length > 0 &&
  value.length <= max && !/[<>\u0000-\u001f\u007f]/.test(value);
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value, key));

export function homeIsoDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('HOME_DATE_INVALID');
  const parsed = new Date(value);
  if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== value) throw Error('HOME_DATE_INVALID');
  return +parsed;
}
const labelDay = value => new Intl.DateTimeFormat('de-DE', {dateStyle:'long',timeZone:'UTC'}).format(homeIsoDay(value));
const verifiedSourceUrl = raw => {
  if (typeof raw !== 'string' || raw.length > 600 || /[\\\u0000-\u0020]/.test(raw)) throw Error('HOME_SOURCE_INVALID');
  let url;
  try { url = new URL(raw); } catch { throw Error('HOME_SOURCE_INVALID'); }
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || url.username ||
      url.password || url.port || url.search || url.hash || url.pathname === '/' ||
      /%(?:2f|5c|00)/i.test(url.pathname)) throw Error('HOME_SOURCE_ALLOWLIST');
  return url.href;
};
function validList(list) {
  return Array.isArray(list) && list.length >= 2 && list.length <= 4 &&
    list.every(item => allowed(item, 56)) && new Set(list).size === list.length;
}
function validateRights(rights, asOf) {
  if (!exact(rights, ['decision', 'websiteAllowed', 'evidenceRef', 'reviewedAt']) ||
      !['APPROVED', 'REVIEW_REQUIRED', 'BLOCK'].includes(rights.decision) ||
      typeof rights.websiteAllowed !== 'boolean') throw Error('HOME_RIGHTS_INVALID');
  if (rights.decision === 'APPROVED') {
    if (rights.websiteAllowed !== true || !allowed(rights.evidenceRef, 300) ||
        homeIsoDay(rights.reviewedAt) > homeIsoDay(asOf)) throw Error('HOME_RIGHTS_EVIDENCE_REQUIRED');
  } else if (rights.websiteAllowed !== false ||
             (rights.evidenceRef !== null && !allowed(rights.evidenceRef, 300)) ||
             (rights.reviewedAt !== null && homeIsoDay(rights.reviewedAt) > homeIsoDay(asOf))) {
    throw Error('HOME_RIGHTS_FAIL_CLOSED');
  }
  return rights;
}
export function homeRightsAdmitted(story, reviews = HOME_PUBLIC_DISPLAY_REVIEWS) {
  if (!Array.isArray(reviews)) return false;
  const snapshot = homeReviewContentSnapshot(story);
  return ['story','source','graphic'].every(key => {
    const rights = story.evidence.rights[key];
    if (rights.decision !== 'APPROVED' || rights.websiteAllowed !== true ||
        typeof rights.evidenceRef !== 'string' || !rights.evidenceRef ||
        typeof rights.reviewedAt !== 'string') return false;
    // Candidate metadata must never grant itself permission. The independent
    // reviewed snapshot must match exactly, including source and rendered graphic.
    return reviews.some(review =>
      review?.reviewVersion === HOME_EDITORIAL_REVIEW_VERSION &&
      review?.decision === 'APPROVED' &&
      review.storyId === story.id &&
      review.kind === key &&
      review.allowedUse === HOME_RIGHTS_USE_CASES[key] &&
      review.evidenceRef === rights.evidenceRef &&
      review.reviewedAt === rights.reviewedAt &&
      review.contentSnapshot === snapshot
    );
  });
}
export function normalizeHomeStory(story, asOf) {
  if (!exact(story, ['id','topic','title','summary','context','graphic','source','editorial','evidence'])) throw Error('HOME_STORY_MISSING_DATA');
  const {id,topic,title,summary,context,graphic,source,editorial,evidence} = story;
  if (!allowed(id,60) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
      !allowed(topic,85) || !allowed(title,125) || !allowed(summary) || !allowed(context,230) ||
      !exact(source,['name','url','date','label']) || !allowed(source.name,85) ||
      !exact(editorial,['relevance','impact']) ||
      ![editorial.relevance,editorial.impact].every(v => Number.isInteger(v) && v >= 0 && v <= 5)) {
    throw Error('HOME_STORY_INVALID');
  }
  if (homeIsoDay(source.date) > homeIsoDay(asOf)) throw Error('HOME_SOURCE_FUTURE');
  const url = verifiedSourceUrl(source.url);
  if (source.label !== labelDay(source.date) ||
      !exact(graphic,['kind','caption',...(graphic?.kind === 'network' ? ['center','labels'] :
        graphic?.kind === 'flow' ? ['labels'] : graphic?.kind === 'status' ? ['rows'] : [])]) ||
      !allowed(graphic.caption,100)) throw Error('HOME_GRAPHIC_INVALID');
  if (graphic.kind === 'network') {
    if (!allowed(graphic.center,56) || !validList(graphic.labels)) throw Error('HOME_GRAPHIC_INVALID');
  } else if (graphic.kind === 'flow') {
    if (!validList(graphic.labels)) throw Error('HOME_GRAPHIC_INVALID');
  } else if (graphic.kind === 'status') {
    if (!Array.isArray(graphic.rows) || graphic.rows.length < 2 || graphic.rows.length > 4 ||
        !graphic.rows.every(row => exact(row,['label','outcome']) && allowed(row.label,56) && allowed(row.outcome,56)) ||
        new Set(graphic.rows.map(row=>row.label)).size !== graphic.rows.length) throw Error('HOME_GRAPHIC_INVALID');
  } else throw Error('HOME_GRAPHIC_INVALID');
  if (!exact(evidence,['news','graphic','rights','freshness','priceData']) ||
      !exact(evidence.news,['sourceKind','observedAt','eventAt']) ||
      evidence.news.sourceKind !== 'OFFICIAL_LINK_METADATA' ||
      homeIsoDay(evidence.news.observedAt) > homeIsoDay(asOf) ||
      evidence.news.eventAt !== null ||
      !exact(evidence.graphic,['assetId','mediaType']) ||
      evidence.graphic.assetId !== `home-${id}-vector-v1` ||
      evidence.graphic.mediaType !== 'STRUCTURED_VECTOR' ||
      !exact(evidence.rights,['story','source','graphic']) ||
      !exact(evidence.freshness,['maxAgeDays']) ||
      !Number.isInteger(evidence.freshness.maxAgeDays) ||
      evidence.freshness.maxAgeDays < 1 || evidence.freshness.maxAgeDays > 45 ||
      evidence.priceData !== null) throw Error('HOME_EVIDENCE_MISSING_DATA');
  for (const entry of Object.values(evidence.rights)) validateRights(entry,asOf);
  return {...story,source:{...source,url},graphic:{...graphic},evidence:{...evidence}};
}
export function homeEditorialScore(story, asOf) {
  const age = (homeIsoDay(asOf)-homeIsoDay(story.source.date))/day;
  return Math.max(0,30-2*age)+8*story.editorial.relevance+6*story.editorial.impact;
}
const fallback = status => ({status,stories:[],date:null,label:null,contractVersion:HOME_CONTENT_ENGINE_VERSION});
export function projectHomeEditorial(rawEdition, asOf, planCampaign, reviews = HOME_PUBLIC_DISPLAY_REVIEWS) {
  try {
    homeIsoDay(asOf);
    if (!exact(rawEdition,['date','label','contentEngine','stories']) ||
        homeIsoDay(rawEdition.date) > homeIsoDay(asOf) ||
        rawEdition.label !== labelDay(rawEdition.date) ||
        !Array.isArray(rawEdition.stories) || rawEdition.stories.length !== 3 ||
        !exact(rawEdition.contentEngine,['contractVersion','publicationAuthority','publicPublishAllowed','campaign']) ||
        rawEdition.contentEngine.contractVersion !== HOME_CONTENT_ENGINE_VERSION ||
        rawEdition.contentEngine.publicationAuthority !== 'SOCIAL_MEDIA_ENGINE_ONLY' ||
        rawEdition.contentEngine.publicPublishAllowed !== false ||
        typeof planCampaign !== 'function') throw Error('HOME_CONTRACT_MISSING');
    const stories = rawEdition.stories.map(story=>normalizeHomeStory(story,asOf));
    if (new Set(stories.map(s=>s.id)).size !== stories.length ||
        new Set(stories.map(s=>s.title.toLowerCase())).size !== stories.length ||
        new Set(stories.map(s=>s.source.url)).size !== stories.length) throw Error('HOME_DUPLICATE');
    const campaign = rawEdition.contentEngine.campaign;
    const plan = planCampaign(campaign);
    if (plan?.contractVersion !== HOME_CONTENT_ENGINE_VERSION ||
        plan?.cadsQuality?.technicalStatus !== 'PASS' ||
        plan.publication?.publicPublishAllowed !== false ||
        campaign.canonicalUrl !== 'https://capital-ai.online/' ||
        campaign.locale !== 'de-DE' || !campaign.channels.includes('WEBSITE') ||
        !campaign.outputs.includes('TEXT') || !campaign.outputs.includes('IMAGE') ||
        JSON.stringify([...campaign.sourceUrls].sort()) !== JSON.stringify(stories.map(s=>s.source.url).sort())) {
      throw Error('HOME_ENGINE_CONTRACT_INVALID');
    }
    const admitted = stories.filter(story => homeRightsAdmitted(story, reviews));
    const fresh = admitted.filter(story =>
      (homeIsoDay(asOf)-homeIsoDay(story.source.date))/day <= story.evidence.freshness.maxAgeDays);
    if (fresh.length === 0) return fallback(admitted.length ? 'STALE_FALLBACK' : 'RIGHTS_BLOCKED');
    return {status:'READY',date:rawEdition.date,label:rawEdition.label,contractVersion:plan.contractVersion,
      stories:fresh.map(story=>({...story,score:{version:HOME_SCORE_VERSION,
        value:homeEditorialScore(story,asOf),ageDays:(homeIsoDay(asOf)-homeIsoDay(story.source.date))/day}}))};
  } catch {
    return fallback('MISSING_DATA');
  }
}
