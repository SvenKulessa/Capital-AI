// CAPITAL_AI_GOOGLE_ANALYTICS_RENDER_READBACK@1
// Owner-only, read-only, cached GA4 evidence projected through the official Analytics MCP.
import { createGoogleAnalyticsMcpClient, GA4_MCP_ALLOWED_TOOLS } from './google-analytics-mcp.mjs';

const PATH = '/api/profile/google-analytics-readback';
const CACHE_MS = 5 * 60 * 1000;
const READBACK_TIMEOUT_MS = 8_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROPERTY_NUMBER = /^[1-9][0-9]{0,19}$/;

function configuredOwner(env) {
  const userId = String(env.CAPITAL_AI_RENDER_OWNER_USER_ID || '').trim();
  const email = String(env.CAPITAL_AI_RENDER_OWNER_EMAIL || '').trim().toLowerCase();
  return UUID.test(userId) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? Object.freeze({ userId, email })
    : null;
}

function requiredPropertyNumber(env) {
  const value = String(env.GOOGLE_ANALYTICS_PROPERTY_NUMBER || '').trim();
  if (!PROPERTY_NUMBER.test(value)) throw new Error('GA4_PROPERTY_NUMBER_NOT_CONFIGURED');
  return value;
}

function containsProperty(value, propertyNumber) {
  const expected = `properties/${propertyNumber}`;
  const pending = [value];
  const seen = new WeakSet();

  while (pending.length > 0) {
    const item = pending.pop();
    if (typeof item === 'string') {
      if (item === expected) return true;
      continue;
    }
    if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item);
    pending.push(...Object.values(item));
  }
  return false;
}

function findRows(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 4) return [];
  if (Array.isArray(value.rows)) return value.rows;
  for (const key of ['result', 'report', 'data', 'response']) {
    if (value[key] && typeof value[key] === 'object') {
      const rows = findRows(value[key], depth + 1);
      if (rows.length) return rows;
    }
  }
  return [];
}

function readCell(container, camel, snake) {
  const values = container?.[camel] || container?.[snake];
  return Array.isArray(values) ? values[0]?.value : undefined;
}

function eventCounts(payload) {
  return findRows(payload).slice(0, 25).map(row => {
    const eventName = String(readCell(row, 'dimensionValues', 'dimension_values') || '').slice(0, 120);
    const rawCount = String(readCell(row, 'metricValues', 'metric_values') || '0');
    const parsed = Number.parseInt(rawCount, 10);
    return Object.freeze({
      eventName,
      eventCount: Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0,
    });
  }).filter(row => row.eventName);
}

function propertyProjection(payload, propertyNumber) {
  const candidate = payload?.result && typeof payload.result === 'object' ? payload.result : payload;
  const name = String(candidate?.name || '');
  if (name && name !== `properties/${propertyNumber}`) throw new Error('GA4_PROPERTY_DETAIL_MISMATCH');
  return Object.freeze({
    resourceName: `properties/${propertyNumber}`,
    displayName: typeof candidate?.display_name === 'string'
      ? candidate.display_name.slice(0, 160)
      : typeof candidate?.displayName === 'string'
        ? candidate.displayName.slice(0, 160)
        : null,
    timeZone: typeof candidate?.time_zone === 'string'
      ? candidate.time_zone.slice(0, 80)
      : typeof candidate?.timeZone === 'string'
        ? candidate.timeZone.slice(0, 80)
        : null,
    currencyCode: typeof candidate?.currency_code === 'string'
      ? candidate.currency_code.slice(0, 16)
      : typeof candidate?.currencyCode === 'string'
        ? candidate.currencyCode.slice(0, 16)
        : null,
  });
}

export async function buildGoogleAnalyticsReadback({
  client,
  propertyNumber,
  now = Date.now,
} = {}) {
  if (!client) throw new Error('GA4_CLIENT_REQUIRED');
  if (!PROPERTY_NUMBER.test(String(propertyNumber || ''))) throw new Error('GA4_PROPERTY_NUMBER_INVALID');

  const tools = await client.listTools();
  for (const tool of GA4_MCP_ALLOWED_TOOLS) {
    if (!tools.includes(tool)) throw new Error(`GA4_REQUIRED_TOOL_MISSING_${tool}`);
  }

  const accountSummaries = await client.callTool('get_account_summaries', {});
  if (!containsProperty(accountSummaries, propertyNumber)) throw new Error('GA4_PROPERTY_NOT_ACCESSIBLE');

  const detailsRaw = await client.callTool('get_property_details', { property_id: propertyNumber });
  if (!containsProperty(detailsRaw, propertyNumber)) throw new Error('GA4_PROPERTY_DETAILS_NOT_BOUND');

  const realtimeRaw = await client.callTool('run_realtime_report', {
    property_id: propertyNumber,
    dimensions: ['eventName'],
    metrics: ['eventCount'],
    limit: 25,
    return_property_quota: true,
  });
  const sevenDayRaw = await client.callTool('run_report', {
    property_id: propertyNumber,
    date_ranges: [{ start_date: '7daysAgo', end_date: 'today' }],
    dimensions: ['eventName'],
    metrics: ['eventCount'],
    limit: 25,
    return_property_quota: true,
  });

  const realtimeEvents = eventCounts(realtimeRaw);
  const sevenDayEvents = eventCounts(sevenDayRaw);
  const realtimePageView = realtimeEvents.some(row => row.eventName === 'page_view' && row.eventCount > 0);
  const sevenDayPageView = sevenDayEvents.some(row => row.eventName === 'page_view' && row.eventCount > 0);

  return Object.freeze({
    schema: 'CAPITAL_AI_GOOGLE_ANALYTICS_RENDER_READBACK@1',
    private: true,
    readOnly: true,
    status: 'PROVIDER_READ_VERIFIED',
    observedAt: new Date(now()).toISOString(),
    property: propertyProjection(detailsRaw, propertyNumber),
    realtime: Object.freeze({ events: realtimeEvents }),
    sevenDay: Object.freeze({ events: sevenDayEvents }),
    eventEvidence: Object.freeze({
      status: realtimePageView || sevenDayPageView ? 'PAGE_VIEW_OBSERVED' : 'NO_PAGE_VIEW_OBSERVED',
      realtimePageView,
      sevenDayPageView,
    }),
    boundary: Object.freeze({
      executionHost: 'RENDER_CAPITAL_AI_WEB',
      cacheTtlSeconds: CACHE_MS / 1000,
      browserMeasurementAuthority: 'SEPARATE',
      credentialsExposed: false,
      rawAccountInventoryExposed: false,
      provider: client.boundary(),
    }),
  });
}

export function createGoogleAnalyticsReadback({
  env = process.env,
  auth,
  client = createGoogleAnalyticsMcpClient({ env }),
  now = Date.now,
} = {}) {
  const owner = configuredOwner(env);
  let cache = null;
  let inflight = null;

  async function authorized(req, res) {
    if (!owner) return false;
    const user = await auth?.verify?.(req, res);
    if (
      !user?.userId ||
      user.userId !== owner.userId ||
      user.emailVerified !== true ||
      String(user.email || '').trim().toLowerCase() !== owner.email
    ) return false;
    return await auth?.authorizeIamRole?.(req, res, 'owner') === true;
  }

  async function load() {
    const timestamp = now();
    if (cache && timestamp - cache.at < CACHE_MS) return cache.value;
    if (inflight) return inflight;

    let timeout;
    const providerRead = buildGoogleAnalyticsReadback({
      client,
      propertyNumber: requiredPropertyNumber(env),
      now: () => timestamp,
    });
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('GA4_READBACK_TIMEOUT')), READBACK_TIMEOUT_MS);
      timeout.unref?.();
    });

    inflight = Promise.race([providerRead, deadline]).then(value => {
      cache = { at: timestamp, value };
      return value;
    }).finally(() => {
      clearTimeout(timeout);
      client.close?.();
      inflight = null;
    });
    return inflight;
  }

  async function handle(req, res, url, json) {
    if (url.pathname !== PATH) return false;
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Vary', 'Cookie');

    if (!await authorized(req, res)) {
      json(res, 404, { error: 'not_found' });
      return true;
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }
    if (url.search) {
      json(res, 400, { error: 'unexpected_query' });
      return true;
    }

    try {
      json(res, 200, await load());
    } catch {
      json(res, 503, {
        schema: 'CAPITAL_AI_GOOGLE_ANALYTICS_RENDER_READBACK@1',
        status: 'EVIDENCE_UNAVAILABLE',
        error: 'google_analytics_readback_unavailable',
      });
    }
    return true;
  }

  return Object.freeze({ authorized, handle, load });
}
