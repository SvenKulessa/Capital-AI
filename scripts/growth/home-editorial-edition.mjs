import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {
  HOME_CONTENT_ENGINE_VERSION, homeIsoDay, normalizeHomeStory,
  homeRightsAdmitted, homeEditorialScore,
} from '../../src/features/home/homeEditorialAdmission.mjs';

import {HOME_PUBLIC_DISPLAY_REVIEWS} from '../../src/features/home/homeEditorialRightsLedger.mjs';

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
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [,,asOf,candidatesPath] = process.argv;
  if (!asOf || !candidatesPath) throw Error('Usage: node scripts/growth/home-editorial-edition.mjs YYYY-MM-DD candidates.json');
  const current = JSON.parse(await readFile(editionPath,'utf8'));
  const candidates = JSON.parse(await readFile(candidatesPath,'utf8'));
  process.stdout.write(JSON.stringify(selectHomeEdition(current,candidates,asOf),null,2)+'\n');
}
