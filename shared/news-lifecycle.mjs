// Deterministic editorial lifecycle. No provider queries, publishing, or database writes.
const ISO = /^\d{4}-\d{2}-\d{2}$/;
function day(value) {
  if (!ISO.test(value ?? '') || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Invalid news date');
  return value;
}
function storyId(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error('Invalid news ID');
  return value;
}
export function newsCategory(topic) {
  if (/stablecoin/i.test(topic)) return 'stablecoins';
  if (/zahlung|payment|bank/i.test(topic)) return 'zahlungsverkehr';
  if (/regulier|compliance|gesetz/i.test(topic)) return 'regulierung';
  if (/testnet|devnet|ledger|blockchain|netzwerk/i.test(topic)) return 'blockchain';
  if (/markt|liquidit|orderbuch/i.test(topic)) return 'marktstruktur';
  return 'technologie';
}
export function newsArchivePath(story) {
  const published = day(story.source?.date);
  const id = storyId(story.id);
  const [year, month, date] = published.split('-');
  return `news-archive/${newsCategory(story.topic)}/${year}/${month}/${date}/${id}.json`;
}
export function retireNews(previousEdition, nextEdition, index, retiredAt = nextEdition.date) {
  day(retiredAt);
  if (!index || index.version !== 1 || !Array.isArray(index.overview) || !Array.isArray(index.archive)) throw new Error('Invalid news index');
  if (!Array.isArray(previousEdition?.stories) || previousEdition.stories.length !== 3 ||
      !Array.isArray(nextEdition?.stories) || nextEdition.stories.length !== 3) throw new Error('Invalid homepage capacity');
  const before = new Map(previousEdition.stories.map(s => [storyId(s.id), s]));
  const after = new Map(nextEdition.stories.map(s => [storyId(s.id), s]));
  if (before.size !== 3 || after.size !== 3) throw new Error('Duplicate homepage news ID');
  for (const [id, item] of before) {
    if (after.has(id) && JSON.stringify(item) !== JSON.stringify(after.get(id))) {
      throw new Error('Homepage news snapshot changed without new ID');
    }
  }
  const displaced = previousEdition.stories.filter(item => !after.has(item.id));
  if (!displaced.length) return index;
  const existing = [...index.overview, ...index.archive];
  const ids = new Set(existing.map(item => storyId(item.id)));
  const paths = new Set(existing.map(item => item.archivePath));
  if (ids.size !== existing.length || paths.size !== existing.length) throw new Error('Duplicate archived news');
  const promoted = displaced.map(story => {
    const archivePath = newsArchivePath(story);
    if (ids.has(story.id) || paths.has(archivePath)) throw new Error('Archived item replay');
    ids.add(story.id);
    paths.add(archivePath);
    return {
      ...structuredClone(story),
      publishedAt: day(story.source.date),
      retiredAt,
      category: newsCategory(story.topic),
      archivePath,
      rights: { status: 'REVIEW_REQUIRED', evidenceRef: null },
      marketImpact: { status: 'NOT_PROVEN', assessments: [] },
    };
  });
  const queue = [...promoted, ...index.overview];
  return {
    version: 1,
    overview: queue.slice(0, 3),
    archive: [...queue.slice(3), ...index.archive],
  };
}
export function advanceNewsEdition(currentEdition, index, edition, asOf = edition.date) {
  return { edition, index: retireNews(currentEdition, edition, index, asOf) };
}
// Market change is observation, not proof that an article caused price movement.
// All incoming measurements remain unverified until independently reviewed.
export function proposeMarketImpact(item, input) {
  const required = ['asset', 'benchmark', 'provider', 'licenseEvidenceRef', 'dataEvidenceRef', 'reviewer', 'assessedAt', 'observedAt'];
  if (required.some(key => typeof input?.[key] !== 'string' || !input[key].trim())) throw new Error('Incomplete market impact provenance');
  day(item.publishedAt);
  day(input.assessedAt);
  day(input.observedAt);
  if (input.observedAt < item.publishedAt || input.assessedAt < input.observedAt) throw new Error('Invalid impact observation window');
  for (const key of ['assetBefore', 'assetAfter', 'benchmarkBefore', 'benchmarkAfter']) {
    if (!Number.isFinite(input[key]) || input[key] <= 0) throw new Error('Invalid market data');
  }
  for (const key of ['persistence', 'breadth']) {
    if (!Number.isInteger(input[key]) || input[key] < 0 || input[key] > 5) throw new Error('Invalid impact factor');
  }
  if (![1, 7, 30].includes(input.windowDays)) throw new Error('Invalid assessment horizon');
  const assetChangePct = (input.assetAfter / input.assetBefore - 1) * 100;
  const benchmarkChangePct = (input.benchmarkAfter / input.benchmarkBefore - 1) * 100;
  const relativeChangePp = assetChangePct - benchmarkChangePct;
  const magnitude = Math.min(5, Math.abs(relativeChangePp) / 2);
  const proposedScore = Math.round((0.55 * magnitude + 0.25 * input.persistence + 0.20 * input.breadth) * 20);
  return {
    ...input,
    assetChangePct,
    benchmarkChangePct,
    relativeChangePp,
    proposedScore,
    verifiedScore: null,
    status: 'REVIEW_REQUIRED',
    methodology: 'Relative price movement, not proven news causality; magnitude 55%, persistence 25%, breadth 20%.',
  };
}
export function publishedNews(items) {
  return items.filter(item => item?.rights?.status === 'APPROVED' &&
    typeof item.rights.evidenceRef === 'string' && item.rights.evidenceRef.trim() !== '');
}
export function newsBiRows(items) {
  return items.map(item => ({
    news_id: item.id,
    publication_date: item.publishedAt,
    retired_at: item.retiredAt,
    category: item.category,
    archive_path: item.archivePath,
    source_url: item.source.url,
    editorial_relevance: item.editorial?.relevance ?? null,
    editorial_impact: item.editorial?.impact ?? null,
    measured_impact_score: item.marketImpact?.status === 'VERIFIED' ? item.marketImpact?.verifiedScore ?? null : null,
    impact_status: item.marketImpact?.status ?? 'NOT_PROVEN',
  }));
}
export function newsBiCsv(items) {
  const rows = newsBiRows(items);
  const columns = ['news_id', 'publication_date', 'retired_at', 'category', 'archive_path', 'source_url',
    'editorial_relevance', 'editorial_impact', 'measured_impact_score', 'impact_status'];
  const escape = value => {
    if (value === null || value === undefined) return '';
    const content = String(value);
    const safe = /^[=+@-]/.test(content) ? "'" + content : content; // Spreadsheet formula injection defense
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return [columns.join(','), ...rows.map(row => columns.map(key => escape(row[key])).join(','))].join('\r\n') + '\r\n';
}
