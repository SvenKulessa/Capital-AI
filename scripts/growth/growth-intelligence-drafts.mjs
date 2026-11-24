import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildGrowthIntelligenceContentDrafts } from '../../src/contracts/growthIntelligenceContent.ts';

export const GROWTH_INTELLIGENCE_PLAN_PATH =
  'CAPITAL-AI-GROWTH/growth-intelligence/content-plan-v1.json';
const sourceUrl = new URL('../../' + GROWTH_INTELLIGENCE_PLAN_PATH, import.meta.url);

/**
 * Deterministic, provider-free Content/Social package handoff.
 * Build-time draft projection only: no scheduler, provider request or publication.
 */

export const GROWTH_DATA_LAYER_VERSION = 'CAPITAL_AI_GROWTH_DATA_LAYER@1';
const SOURCE_METRICS = Object.freeze({
  GA4: ['sessions', 'engagedSessions'],
  GSC: ['clicks', 'impressions', 'ctr', 'position'],
  INSTAGRAM: ['reach', 'accounts_engaged'],
  YOUTUBE: ['views', 'estimatedMinutesWatched'],
});
const SOURCE_IDS = Object.keys(SOURCE_METRICS);
const identityPatterns = {
  GA4: /^properties\/[1-9][0-9]{0,19}$/,
  GSC: /^sc-domain:capital-ai\.online$/,
  INSTAGRAM: /^[0-9]{1,32}$/,
  YOUTUBE: /^UC[A-Za-z0-9_-]{22}$/,
};
const exact = (o, keys) => !!o && typeof o === 'object' && !Array.isArray(o)
  && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
const iso = v => typeof v === 'string' && Number.isFinite(Date.parse(v))
  && new Date(v).toISOString() === v;
const count = v => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const failure = (source, status) => ({ source, status, metrics: null, evidenceSha256: null });
function metricProjection(source, payload) {
  const keys = SOURCE_METRICS[source];
  if (source === 'GA4') {
    if (!exact(payload, keys)) return null;
    return Object.fromEntries(keys.map(k => [k,payload[k]]));
  }
  if (source === 'GSC') {
    if (!exact(payload, ['rows']) || !Array.isArray(payload.rows) || payload.rows.length !== 1
      || !exact(payload.rows[0],keys)) return null;
    return Object.fromEntries(keys.map(k => [k,payload.rows[0][k]]));
  }
  if (source === 'INSTAGRAM') {
    // Explicit, period-level aggregate projection from the approved read adapter.
    // Never add unique-account reach or engagement across daily rows.
    if (!exact(payload, keys)) return null;
    return Object.fromEntries(keys.map(k => [k,payload[k]]));
  }
  if (source === 'YOUTUBE') {
    if (!exact(payload,['columnHeaders','rows']) || !Array.isArray(payload.columnHeaders)
      || payload.columnHeaders.length !== keys.length
      || !payload.columnHeaders.every((h,i) => h?.name === keys[i])
      || !Array.isArray(payload.rows) || payload.rows.length !== 1
      || !Array.isArray(payload.rows[0]) || payload.rows[0].length !== keys.length) return null;
    return Object.fromEntries(keys.map((k,i) => [k,payload.rows[0][i]]));
  }
  return null;
}

/** Operator-bound data projection, not provider authentication or consent authority.
 * Each source is independent. Imported data can never self-attest or become an
 * attribution event; property-level aggregates have no campaign/content identity.
 * A trusted caller supplies expected account identities out of band.
 */
export function projectGrowthDataLayer({ records, expectedIdentities, asOf } = {}) {
  if (!Array.isArray(records) || records.length > 4 || !iso(asOf)
    || !expectedIdentities || typeof expectedIdentities !== 'object'
    || Array.isArray(expectedIdentities)
    || Object.keys(expectedIdentities).some(k => !SOURCE_IDS.includes(k))
    || records.some(r => !SOURCE_IDS.includes(r?.source))) throw Error('GROWTH_DATA_INPUT_INVALID');
  const sources = SOURCE_IDS.map(source => {
    const matches = records.filter(r => r.source === source);
    if (matches.length > 1) return failure(source,'BLOCKED_DUPLICATE_SOURCE');
    if (!matches.length) return failure(source,'NOT_PROVEN_NO_READBACK');
    const record = matches[0];
    const expected = expectedIdentities[source];
    if (typeof expected !== 'string' || !identityPatterns[source].test(expected))
      return failure(source,'BLOCKED_IDENTITY_NOT_CONFIGURED');
    if (!exact(record,['source','identity','startDate','endDate','observedAt','payload'])
      || record.identity !== expected) return failure(source,'BLOCKED_IDENTITY_OR_ENVELOPE');
    const { startDate, endDate, observedAt } = record;
    if (!date(startDate) || !date(endDate) || startDate > endDate || !iso(observedAt)
      || Date.parse(endDate) - Date.parse(startDate) > 30 * 86400000
      || observedAt > asOf || endDate >= observedAt.slice(0,10))
      return failure(source,'BLOCKED_INVALID_PERIOD');
    if (Date.parse(asOf) - Date.parse(observedAt) > 86400000
      || Date.parse(asOf.slice(0,10)) - Date.parse(endDate) > 7 * 86400000)
      return failure(source,'NOT_PROVEN_STALE');
    const metrics = metricProjection(source,record.payload);
    if (!metrics) return failure(source,'NOT_PROVEN_INVALID_OR_EMPTY_REPORT');
    const valid = Object.entries(metrics).every(([k,v]) =>
      k === 'ctr' ? typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
      : k === 'position' ? typeof v === 'number' && Number.isFinite(v) && v >= 0
      : count(v));
    if (!valid || (source === 'GA4' && metrics.engagedSessions > metrics.sessions)
      || (source === 'GSC' && metrics.clicks > metrics.impressions))
      return failure(source,'NOT_PROVEN_INVALID_METRICS');
    const projection = { source, identity: expected, startDate, endDate, observedAt, metrics };
    return { ...projection, status:'SOURCE_RECORDED_NOT_AUTHENTICATED',
      evidenceSha256:sha(projection) };
  });
  return { contractVersion:GROWTH_DATA_LAYER_VERSION, asOf, sources,
    attributionEvents: [], graphExecution:'NOT_PROVEN', providerCalls:0,
    publicPublishAllowed:false, automaticRecommendationPromotion:false };
}

export function buildGrowthIntelligenceDraftBundle(dataInput) {
  const sourceBytes = readFileSync(fileURLToPath(sourceUrl));
  const rawPlan = JSON.parse(sourceBytes.toString('utf8'));
  const drafts = buildGrowthIntelligenceContentDrafts(rawPlan);
  return {
    contractVersion: 'CAPITAL_AI_GROWTH_INTELLIGENCE_DRAFT_BUNDLE@1',
    sourcePath: GROWTH_INTELLIGENCE_PLAN_PATH,
    sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    sourceGeneratedDate: rawPlan.generated_date,
    publicationState: 'DRAFT_ONLY',
    publicPublishAllowed: false,
    providerCalls: 0,
    campaignSpend: 0,
    mediaAssetsProduced: 0,
    providerCandidates: [{
      id: 'legal-data-hunter',
      intendedUse: 'CUSTOMER_FACING_LEGAL_SOURCE_RESEARCH',
      commercialState: 'BLOCKED_ORDER_FORM_REQUIRED',
      termsUrl: 'https://legaldatahunter.com/api-mcp-terms',
      termsEffectiveDate: '2026-08-11',
      reviewedAt: '2026-11-21',
      providerEnabled: false,
    }],
    drafts,
    ...(dataInput === undefined ? {} : { growthDataLayer: projectGrowthDataLayer(dataInput) }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(buildGrowthIntelligenceDraftBundle(), null, 2) + '\n');
}
