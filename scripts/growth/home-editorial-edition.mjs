import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const editionPath = new URL('../../src/features/home/homeEditorialEdition.json', import.meta.url);
const officialHosts = new Set(['xrpl.org', 'solana.com', 'polygon.technology', 'docs.polygon.technology']);
const day = 86_400_000;

function isoDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid editorial date');
  const date = new Date(value);
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value) throw new Error('Invalid editorial date');
  return +date;
}

const dateLabel = value => new Intl.DateTimeFormat('de-DE', {dateStyle: 'long', timeZone: 'UTC'}).format(isoDay(value));
const text = (value, max = 500) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[<>\u0000-\u001f]/.test(value);

function normalizeStory(story, asOf) {
  const { id, topic, title, summary, context, graphic, source, editorial } = story;
  const sourceUrl = new URL(source?.url);
  if (sourceUrl.protocol !== 'https:' || !officialHosts.has(sourceUrl.hostname) ||
      sourceUrl.username || sourceUrl.password || sourceUrl.port || sourceUrl.search || sourceUrl.hash || sourceUrl.pathname === '/') {
    throw new Error('Source URL outside editorial allowlist');
  }
  if (isoDay(source.date) > isoDay(asOf)) throw new Error('Future source date');
  if (!text(id, 60) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
      !text(topic, 85) || !text(title, 125) || !text(summary) || !text(context, 230) ||
      !text(source.name, 85) || !text(graphic?.caption, 100)) throw new Error('Invalid editorial story');
  for (const value of [editorial?.relevance, editorial?.impact]) {
    if (!Number.isInteger(value) || value < 0 || value > 5) throw new Error('Invalid editorial score input');
  }
  const list = items => Array.isArray(items) && items.length >= 2 && items.length <= 4;
  const labelList = list(graphic.labels) && graphic.labels.every(value => text(value, 56)) &&
    new Set(graphic.labels).size === graphic.labels.length;
  let visual;
  if (graphic.kind === 'network' && labelList && text(graphic.center, 56)) {
    visual = {kind: graphic.kind, caption: graphic.caption, center: graphic.center, labels: graphic.labels};
  } else if (graphic.kind === 'flow' && labelList) {
    visual = {kind: graphic.kind, caption: graphic.caption, labels: graphic.labels};
  } else if (graphic.kind === 'status' && list(graphic.rows) &&
      graphic.rows.every(row => text(row?.label, 56) && text(row?.outcome, 56)) &&
      new Set(graphic.rows.map(row => row.label)).size === graphic.rows.length) {
    visual = {kind: graphic.kind, caption: graphic.caption, rows: graphic.rows.map(({label, outcome}) => ({label, outcome}))};
  } else {
    throw new Error('Missing or invalid infographic');
  }
  return {id, topic, title, summary, context, graphic: visual,
    source: {name: source.name, url: sourceUrl.href, date: source.date, label: dateLabel(source.date)},
    editorial: {relevance: editorial.relevance, impact: editorial.impact}};
}

export function editorialScore(story, asOf) {
  const ageDays = (isoDay(asOf) - isoDay(story.source.date)) / day;
  return Math.max(0, 30 - 2 * ageDays) + 8 * story.editorial.relevance + 6 * story.editorial.impact;
}

export function selectHomeEdition(current, candidates, asOf) {
  if (isoDay(asOf) < isoDay(current.date) || !Array.isArray(candidates) || candidates.length > 20 ||
      !Array.isArray(current.stories) || current.stories.length !== 3) throw new Error('Invalid editorial edition');
  const stories = current.stories.map(story => normalizeStory(story, asOf));
  const seenIds = new Set(stories.map(story => story.id));
  const seenUrls = new Set(stories.map(story => story.source.url));
  const titleKey = story => story.title.normalize('NFKC').trim().toLowerCase();
  const seenTitles = new Set(stories.map(titleKey));
  if (seenTitles.size !== stories.length || seenIds.size !== stories.length || seenUrls.size !== stories.length) throw new Error('Duplicate published story');
  const score = story => editorialScore(story, asOf);
  const ranked = candidates.map(story => normalizeStory(story, asOf))
    .sort((left, right) => score(right) - score(left) || right.source.date.localeCompare(left.source.date));
  let changed = false;
  for (const candidate of ranked) {
    if (score(candidate) < 65 || seenIds.has(candidate.id) || seenUrls.has(candidate.source.url) || seenTitles.has(titleKey(candidate))) continue;
    const slot = stories.reduce((best, story, i) =>
      candidate.source.date > story.source.date && score(candidate) > score(story) &&
      (best === -1 || score(story) < score(stories[best])) ? i : best, -1);
    if (slot < 0) continue;
    stories[slot] = candidate;
    seenIds.add(candidate.id);
    seenUrls.add(candidate.source.url);
    seenTitles.add(titleKey(candidate));
    changed = true;
  }
  return changed ? {date: asOf, label: dateLabel(asOf), stories} : current;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [, , asOf, candidatesPath] = process.argv;
  if (!asOf || !candidatesPath) throw new Error('Usage: node scripts/growth/home-editorial-edition.mjs YYYY-MM-DD candidates.json');
  const current = JSON.parse(await readFile(editionPath, 'utf8'));
  const candidates = JSON.parse(await readFile(candidatesPath, 'utf8'));
  process.stdout.write(JSON.stringify(selectHomeEdition(current, candidates, asOf), null, 2) + '\n');
}
