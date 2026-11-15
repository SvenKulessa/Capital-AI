import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {
  HOME_CONTENT_ENGINE_VERSION, homeIsoDay, normalizeHomeStory,
  homeRightsAdmitted, homeEditorialScore,
} from '../../src/features/home/homeEditorialAdmission.mjs';

import {HOME_PUBLIC_DISPLAY_REVIEWS, homeReviewContentSnapshot} from '../../src/features/home/homeEditorialRightsLedger.mjs';

const editionPath = new URL('../../src/features/home/homeEditorialEdition.json', import.meta.url);
const day = 86_400_000;
const dateLabel = value => new Intl.DateTimeFormat('de-DE', {dateStyle:'long',timeZone:'UTC'}).format(homeIsoDay(value));
export const editorialScore = homeEditorialScore;
const titleKey = story => story.title.normalize('NFKC').trim().toLowerCase();
const sourceSetSha = stories => createHash('sha256')
  .update(JSON.stringify(stories.map(s=>[s.source.url,s.source.date]).sort((a,b)=>a[0].localeCompare(b[0]))))
  .digest('hex');

/** Select drafts; stdout is NOT a publication, approval or rights grant. */
export function selectHomeEdition(current, candidates, asOf, reviews = HOME_PUBLIC_DISPLAY_REVIEWS) {
  if (homeIsoDay(asOf) < homeIsoDay(current?.date) ||
      !Array.isArray(candidates) || candidates.length > 20 ||
      !Array.isArray(current?.stories) || current.stories.length !== 3 ||
      current.contentEngine?.contractVersion !== HOME_CONTENT_ENGINE_VERSION ||
      current.contentEngine?.publicationAuthority !== 'SOCIAL_MEDIA_ENGINE_ONLY' ||
      current.contentEngine?.publicPublishAllowed !== false ||
      !current.contentEngine?.campaign) throw Error('Invalid editorial edition');
  const stories = current.stories.map(story=>normalizeHomeStory(story,asOf));
  const seenIds = new Set(stories.map(s=>s.id));
  const seenUrls = new Set(stories.map(s=>s.source.url));
  const seenTitles = new Set(stories.map(titleKey));
  if (seenIds.size !== stories.length || seenUrls.size !== stories.length ||
      seenTitles.size !== stories.length) throw Error('Duplicate published story');
  const ranked = candidates.map(story=>normalizeHomeStory(story,asOf))
    .sort((a,b)=>editorialScore(b,asOf)-editorialScore(a,asOf) ||
      b.source.date.localeCompare(a.source.date));
  let changed = false;
  for (const candidate of ranked) {
    const age = (homeIsoDay(asOf)-homeIsoDay(candidate.source.date))/day;
    if (!homeRightsAdmitted(candidate, reviews) || age > candidate.evidence.freshness.maxAgeDays ||
        editorialScore(candidate,asOf) < 65 || seenIds.has(candidate.id) ||
        seenUrls.has(candidate.source.url) || seenTitles.has(titleKey(candidate))) continue;
    const slot = stories.reduce((best,story,i)=>
      candidate.source.date > story.source.date &&
      editorialScore(candidate,asOf) > editorialScore(story,asOf) &&
      (best === -1 || editorialScore(story,asOf) < editorialScore(stories[best],asOf)) ? i : best,-1);
    if (slot < 0) continue;
    stories[slot] = candidate;
    seenIds.add(candidate.id);
    seenUrls.add(candidate.source.url);
    seenTitles.add(titleKey(candidate));
    changed = true;
  }
  if (!changed) return current;
  return {
    date:asOf, label:dateLabel(asOf),
    contentEngine:{...current.contentEngine,campaign:{
      ...current.contentEngine.campaign,
      campaignId:`home-editorial-${asOf.replaceAll('-','')}`,
      sourceSha:sourceSetSha(stories),
      sourceUrls:stories.map(s=>s.source.url),
    }},
    stories,
  };
}

/**
 * Four-hour candidate assessment is deliberately read-only. Scoring is a review
 * hint, never an approval, publication or commercial-license authority.
 * Only the separate first-party HOME_PUBLIC_DISPLAY_REVIEWS ledger can admit.
 */
export function scoreHomeCandidates(current, candidates, asOf) {
  const today = homeIsoDay(asOf);
  if (!Array.isArray(candidates) || candidates.length > 20 ||
      !Array.isArray(current?.stories) || current.stories.length !== 3 ||
      current.contentEngine?.contractVersion !== HOME_CONTENT_ENGINE_VERSION ||
      current.contentEngine?.publicPublishAllowed !== false ||
      today < homeIsoDay(current.date)) throw Error('HOME_SCORING_INPUT_INVALID');
  const existing = current.stories.map(story => normalizeHomeStory(story, asOf));
  const key = value => value.normalize('NFKC').trim().toLowerCase();
  const ids = new Set(existing.map(s => s.id));
  const urls = new Set(existing.map(s => s.source.url));
  const titles = new Set(existing.map(s => key(s.title)));
  if (ids.size !== 3 || urls.size !== 3 || titles.size !== 3) throw Error('HOME_SCORING_DUPLICATE_EDITION');
  const examined = new Set();
  return candidates.map(raw => {
    const story = normalizeHomeStory(raw, asOf);
    const score = homeEditorialScore(story, asOf);
    const ageDays = (today - homeIsoDay(story.source.date)) / day;
    const title = key(story.title);
    const duplicate = ids.has(story.id) || urls.has(story.source.url) || titles.has(title) ||
      examined.has('id:' + story.id) || examined.has('url:' + story.source.url) ||
      examined.has('title:' + title);
    examined.add('id:' + story.id);
    examined.add('url:' + story.source.url);
    examined.add('title:' + title);
    const better = existing.some(item =>
      story.source.date > item.source.date && score > homeEditorialScore(item, asOf));
    const reason = duplicate ? 'DUPLICATE' :
      ageDays > story.evidence.freshness.maxAgeDays ? 'STALE' :
      score < 65 ? 'SCORE_BELOW_65' :
      !better ? 'NOT_NEWER_AND_BETTER' : 'REVIEW_REQUIRED';
    const digest = createHash('sha256').update(JSON.stringify({
      storySnapshot: homeReviewContentSnapshot(story),
      scoreInput: story.editorial,
      rightsClaims: story.evidence.rights,
    })).digest('hex');
    return {id: story.id, score, ageDays, sourceUrl: story.source.url,
      sourceDate: story.source.date, digest, reason,
      eligibleForReview: reason === 'REVIEW_REQUIRED',
      publicationAllowed: false, rightsVerified: false};
  }).sort((a, b) => b.score - a.score ||
    b.sourceDate.localeCompare(a.sourceDate) || a.id.localeCompare(b.id));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [,,modeOrDay,dayOrPath,maybePath] = process.argv;
  const scoreOnly = modeOrDay === '--score';
  const asOf = scoreOnly ? dayOrPath : modeOrDay;
  const candidatesPath = scoreOnly ? maybePath : dayOrPath;
  if (!asOf || !candidatesPath || (!scoreOnly && maybePath)) {
    throw Error('Usage: node scripts/growth/home-editorial-edition.mjs [--score] YYYY-MM-DD candidates.json');
  }
  const current = JSON.parse(await readFile(editionPath, 'utf8'));
  const candidates = JSON.parse(await readFile(candidatesPath, 'utf8'));
  const output = scoreOnly ? {
    schema: 'CAPITAL_AI_HOME_CANDIDATE_SCORING@1', asOf,
    publicationAllowed: false, candidates: scoreHomeCandidates(current, candidates, asOf),
  } : selectHomeEdition(current, candidates, asOf);
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}
