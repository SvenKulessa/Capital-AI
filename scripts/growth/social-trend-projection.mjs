import { createHash } from 'node:crypto';

export const SOCIAL_TREND_VERSION = 'CAPITAL_AI_SOCIAL_TREND_PROJECTION@1';
const DAY = 86400000;
const hosts = { TikTok: ['www.tiktok.com', 'tiktok.com'], Instagram: ['www.instagram.com', 'instagram.com'], X: ['x.com', 'www.x.com'], YouTube: ['www.youtube.com', 'youtube.com'] };
const keys = ['platform', 'postId', 'sourceUrl', 'publishedAt', 'observedAt', 'views', 'metric', 'niche', 'format', 'accountBand'];
const formats = { TikTok: ['short'], Instagram: ['reel', 'carousel'], X: ['post', 'video'], YouTube: ['short', 'long'] };
const slug = v => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(v);
const iso = v => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const exact = (v, names) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const hashPattern = /^[a-f0-9]{64}$/;

export function normalizeSocialTrend(record, asOf) {
  if (!exact(record, keys) || !Object.hasOwn(hosts, record.platform) || !slug(record.niche) || !slug(record.metric)
    || !formats[record.platform].includes(record.format) || !['small', 'medium', 'large'].includes(record.accountBand)
    || typeof record.postId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(record.postId)
    || typeof record.sourceUrl !== 'string' || record.sourceUrl.length > 300
    || !Number.isSafeInteger(record.views) || record.views < 0 || !iso(asOf) || !iso(record.publishedAt) || !iso(record.observedAt)) return null;
  const age = Date.parse(record.observedAt) - Date.parse(record.publishedAt);
  const freshness = Date.parse(asOf) - Date.parse(record.observedAt);
  if (age < DAY || age >= 30 * DAY || freshness < 0 || freshness > DAY) return null;
  let url;
  try { url = new URL(record.sourceUrl); } catch { return null; }
  if (url.protocol !== 'https:' || !hosts[record.platform].includes(url.hostname) || url.username || url.password || url.port || url.hash || url.href !== record.sourceUrl) return null;
  const id = record.postId;
  const path = url.pathname.split('/').filter(Boolean);
  if (record.platform === 'YouTube') {
    if (record.format === 'short' ? !(path.length === 2 && path[0] === 'shorts' && path[1] === id && !url.search) : !(url.pathname === '/watch' && url.search === '?v=' + id)) return null;
  } else {
    if (url.search) return null;
    if (record.platform === 'TikTok' && !(path.length === 3 && /^@[A-Za-z0-9_.]+$/.test(path[0]) && path[1] === 'video' && path[2] === id)) return null;
    if (record.platform === 'Instagram' && !(path.length === 2 && path[0] === (record.format === 'reel' ? 'reel' : 'p') && path[1] === id)) return null;
    if (record.platform === 'X' && !(path.length === 3 && /^[A-Za-z0-9_]+$/.test(path[0]) && path[1] === 'status' && path[2] === id)) return null;
  }
  return Object.fromEntries(keys.map(k => [k, record[k]]));
}

export function socialTrendRecordSha256(record, asOf) {
  const normalized = normalizeSocialTrend(record, asOf);
  return normalized ? digest(normalized) : null;
}

// The caller supplies the independently reviewed ledger outside the untrusted payload.
// A grant allows analysis only; it cannot authenticate metrics or permit publishing.
export function projectSocialTrendCandidates(records, { asOf, trustedAnalyticsGrants = [] } = {}) {
  if (!iso(asOf) || !Array.isArray(records) || records.length > 1000 || !Array.isArray(trustedAnalyticsGrants) || trustedAnalyticsGrants.length > 1000) throw Error('SOCIAL_TREND_BATCH_INVALID');
  const identities = new Map(), grants = new Map(), groups = new Map();
  const result = { contractVersion: SOCIAL_TREND_VERSION, asOf, status: 'NOT_PROVEN', analyzedTrendsCount: 0, invalidCount: 0, duplicateCount: 0, rightsBlockedCount: 0, insufficientCohortCount: 0, candidates: [], providerCalls: 0, publicPublishAllowed: false, providerAuthentication: 'NOT_PROVEN' };
  for (const g of trustedAnalyticsGrants) {
    if (!exact(g, ['recordSha256', 'analyticsAllowed', 'evidenceRef']) || typeof g.recordSha256 !== 'string' || !hashPattern.test(g.recordSha256) || g.analyticsAllowed !== true || typeof g.evidenceRef !== 'string' || !/^[A-Za-z0-9_.:/#-]{6,220}$/.test(g.evidenceRef)) continue;
    grants.set(g.recordSha256, (grants.get(g.recordSha256) ?? 0) + 1);
  }
  // Count identities before validating the complete record: ambiguous duplicates fail closed.
  for (const r of records) {
    if (r && Object.hasOwn(hosts, r.platform) && typeof r.postId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(r.postId)) {
      const id = r.platform + ':' + r.postId;
      identities.set(id, (identities.get(id) ?? 0) + 1);
    }
  }
  for (const raw of records) {
    const r = normalizeSocialTrend(raw, asOf);
    if (!r) { result.invalidCount++; continue; }
    if (identities.get(r.platform + ':' + r.postId) !== 1) { result.duplicateCount++; continue; }
    const sha = digest(r);
    if (grants.get(sha) !== 1) { result.rightsBlockedCount++; continue; }
    const ageDay = Math.floor((Date.parse(r.observedAt) - Date.parse(r.publishedAt)) / DAY);
    const cohort = JSON.stringify([r.platform, r.metric, r.niche, r.format, r.accountBand, ageDay, r.observedAt.slice(0, 10)]);
    if (!groups.has(cohort)) groups.set(cohort, []);
    groups.get(cohort).push({ platform: r.platform, sha, views: r.views });
  }
  for (const [cohort, group] of groups) {
    if (group.length < 31) { result.insufficientCohortCount += group.length; continue; }
    const sorted = group.sort((a, b) => a.views - b.views || a.sha.localeCompare(b.sha));
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i];
      const peers = sorted.filter((_, j) => j !== i).map(v => v.views);
      const middle = Math.floor(peers.length / 2);
      const median = peers.length % 2 ? peers[middle] : peers[middle - 1] / 2 + peers[middle] / 2;
      if (!median) { result.insufficientCohortCount++; continue; }
      result.analyzedTrendsCount++;
      const percentile = 100 * peers.filter(v => v < row.views).length / peers.length;
      const ratio = row.views / median;
      if (percentile >= 95 && ratio >= 2) result.candidates.push({ sourcePlatform: row.platform, recordSha256: row.sha, cohortSha256: digest(JSON.parse(cohort)), peerCount: peers.length, views: row.views, medianPeerViews: median, percentile, medianRatio: ratio, status: 'SOURCE_RECORDED_NOT_AUTHENTICATED' });
    }
  }
  result.candidates.sort((a, b) => a.recordSha256.localeCompare(b.recordSha256));
  if (result.analyzedTrendsCount) result.status = 'ANALYZED_SOURCE_RECORDED_NOT_AUTHENTICATED';
  return result;
}
