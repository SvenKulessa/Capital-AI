// CAPITAL_AI_GOOGLE_MAINTENANCE@1
// Trusted-worker REST client. No public web route or arbitrary URL execution.
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const GOOGLE_PROJECT_ID = 'aifinancial-500208';
export const GA4_PROPERTY_ID = '548187678';
const PROPERTY = 'properties/' + GA4_PROPERTY_ID;
const ADMIN_ORIGIN = 'https://analyticsadmin.googleapis.com';
const DATA_ORIGIN = 'https://analyticsdata.googleapis.com';
const CLOUD_ORIGIN = 'https://cloudresourcemanager.googleapis.com';
const SERVICE_ORIGIN = 'https://serviceusage.googleapis.com';
const GSC_ORIGIN = 'https://www.googleapis.com';
const GSC_PROPERTY = 'sc-domain:capital-ai.online';
const MAX_RESPONSE_BYTES = 1024 * 1024;
const PLAN_TTL_MS = 5 * 60 * 1000;
const run = promisify(execFile);

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_ARGUMENTS');
}
function exact(value, allowed) {
  object(value);
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('UNSUPPORTED_ARGUMENT');
}
function propertyPatch(input) {
  exact(input, ['displayName', 'timeZone', 'currencyCode']);
  const keys = Object.keys(input).sort();
  if (!keys.length) throw new Error('EMPTY_PATCH');
  if ('displayName' in input && (typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.length > 100 || /[\x00-\x1f]/.test(input.displayName))) throw new Error('INVALID_DISPLAY_NAME');
  if ('timeZone' in input) {
    if (typeof input.timeZone !== 'string' || input.timeZone.length > 80) throw new Error('INVALID_TIME_ZONE');
    try { new Intl.DateTimeFormat('en', { timeZone: input.timeZone }); } catch { throw new Error('INVALID_TIME_ZONE'); }
  }
  if ('currencyCode' in input && !/^[A-Z]{3}$/.test(input.currencyCode)) throw new Error('INVALID_CURRENCY');
  return Object.freeze(Object.fromEntries(keys.map(key => [key, input[key]])));
}

export function createGoogleMaintenance({ env = process.env, fetchImpl = fetch, now = Date.now, tokenProvider } = {}) {
  const plans = new Map();
  const writesEnabled = env.GOOGLE_MAINTENANCE_GA4_WRITES_ENABLED === 'true';
  async function token() {
    if (tokenProvider) return tokenProvider();
    if (env.GOOGLE_MAINTENANCE_ACCESS_TOKEN) return env.GOOGLE_MAINTENANCE_ACCESS_TOKEN;
    if (env.GOOGLE_MAINTENANCE_USE_ADC === 'true') {
      try {
        const result = await run('gcloud', ['auth', 'application-default', 'print-access-token'], { timeout: 10_000, maxBuffer: 16_384 });
        const value = result.stdout.trim();
        if (value && !/[\r\n]/.test(value)) return value;
      } catch { /* Never surface CLI stderr or credential material. */ }
    }
    throw new Error('GOOGLE_IDENTITY_NOT_CONFIGURED');
  }
  async function request(origin, pathname, { method = 'GET', body, query } = {}) {
    if (![ADMIN_ORIGIN, DATA_ORIGIN, CLOUD_ORIGIN, SERVICE_ORIGIN, GSC_ORIGIN].includes(origin)) throw new Error('ORIGIN_NOT_ALLOWED');
    const accessToken = await token();
    if (typeof accessToken !== 'string' || !accessToken || /[\r\n]/.test(accessToken)) throw new Error('INVALID_TOKEN');
    const url = new URL(pathname, origin);
    if (query) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    let response;
    try {
      response = await fetchImpl(url, {
        method, redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new Error('GOOGLE_TRANSPORT_UNAVAILABLE'); }
    if (!response.ok) throw new Error('GOOGLE_HTTP_' + response.status);
    if (Number(response.headers.get('content-length') || 0) > MAX_RESPONSE_BYTES) throw new Error('GOOGLE_RESPONSE_TOO_LARGE');
    const chunks = [];
    let bytes = 0;
    for await (const chunk of response.body || []) {
      bytes += chunk.length;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error('GOOGLE_RESPONSE_TOO_LARGE');
      chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error('GOOGLE_RESPONSE_INVALID'); }
  }
  async function property() {
    const value = await request(ADMIN_ORIGIN, '/v1beta/' + PROPERTY);
    if (value.name !== PROPERTY) throw new Error('GA4_PROPERTY_MISMATCH');
    return {
      name: value.name, displayName: value.displayName ?? null,
      timeZone: value.timeZone ?? null, currencyCode: value.currencyCode ?? null,
    };
  }
  async function project() {
    const value = await request(CLOUD_ORIGIN, '/v3/projects/' + GOOGLE_PROJECT_ID);
    if (value.projectId !== GOOGLE_PROJECT_ID || !/^projects\/\d+$/.test(value.name || '')) throw new Error('CLOUD_PROJECT_MISMATCH');
    return { name: value.name, projectId: value.projectId, displayName: value.displayName ?? null, state: value.state ?? null };
  }
  async function call(name, input = {}) {
    if (name === 'google_maintenance_status') {
      exact(input, []);
      return {
        projectId: GOOGLE_PROJECT_ID, ga4Property: PROPERTY,
        ga4WritesEnabled: writesEnabled,
        identityConfigured: !!env.GOOGLE_MAINTENANCE_ACCESS_TOKEN || env.GOOGLE_MAINTENANCE_USE_ADC === 'true',
        identityVerified: false, transport: 'Google REST from trusted MCP worker',
        cloudWritesEnabled: false, adsEnabled: false, workspaceAdminEnabled: false,
      };
    }
    if (name === 'ga4_get_property') { exact(input, []); return property(); }
    if (name === 'gcp_get_project') { exact(input, []); return project(); }
    if (name === 'gcp_list_enabled_services') {
      exact(input, []);
      const boundProject = await project();
      const result = await request(SERVICE_ORIGIN, '/v1/' + boundProject.name + '/services', { query: { filter: 'state:ENABLED', pageSize: '200' } });
      return {
        projectId: GOOGLE_PROJECT_ID,
        services: (result.services || []).map(item => ({ name: item.config?.name, state: item.state })),
        truncated: !!result.nextPageToken,
      };
    }
    if (name === 'ga4_list_data_streams') {
      exact(input, []);
      const result = await request(ADMIN_ORIGIN, '/v1beta/' + PROPERTY + '/dataStreams', { query: { pageSize: '100' } });
      return {
        property: PROPERTY,
        streams: (result.dataStreams || []).map(item => {
          if (!String(item.name || '').startsWith(PROPERTY + '/dataStreams/')) throw new Error('GA4_STREAM_MISMATCH');
          let associatedDomainVerified = false;
          try {
            const uri = new URL(item.webStreamData?.defaultUri);
            associatedDomainVerified = uri.protocol === 'https:' && uri.hostname === 'capital-ai.online' && !uri.username && !uri.password;
          } catch { /* Missing/non-web URI is not a verified web association. */ }
          return { name: item.name, type: item.type, displayName: item.displayName ?? null, defaultUri: item.webStreamData?.defaultUri ?? null, measurementId: item.webStreamData?.measurementId ?? null, associatedDomainVerified };
        }), truncated: !!result.nextPageToken,
      };
    }
    if (name === 'ga4_country_report') {
      exact(input, ['days']);
      const days = input.days ?? 28;
      if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('INVALID_REPORT_WINDOW');
      return request(DATA_ORIGIN, '/v1beta/' + PROPERTY + ':runReport', {
        method: 'POST',
        body: {
          dateRanges: [{ startDate: days + 'daysAgo', endDate: 'yesterday' }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'activeUsers' }],
          dimensionFilter: { filter: { fieldName: 'country', inListFilter: { values: ['Germany', 'Italy', 'Spain', 'Portugal', 'United Kingdom'], caseSensitive: true } } },
          limit: '5', returnPropertyQuota: true,
        },
      });
    }
    if (name === 'gsc_list_sitemaps') {
      exact(input, []);
      const result = await request(GSC_ORIGIN, '/webmasters/v3/sites/' + encodeURIComponent(GSC_PROPERTY) + '/sitemaps');
      return { property: GSC_PROPERTY, sitemaps: (result.sitemap || []).map(item => ({ path: item.path, isPending: item.isPending, warnings: item.warnings, errors: item.errors, lastDownloaded: item.lastDownloaded ?? null })) };
    }
    if (name === 'gsc_country_report') {
      exact(input, ['days']);
      const days = input.days ?? 28;
      if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('INVALID_REPORT_WINDOW');
      const endDate = new Date(now() - 86400000).toISOString().slice(0, 10);
      const startDate = new Date(now() - days * 86400000).toISOString().slice(0, 10);
      const reports = [];
      for (const country of ['deu', 'ita', 'esp', 'prt', 'gbr']) {
        const result = await request(GSC_ORIGIN, '/webmasters/v3/sites/' + encodeURIComponent(GSC_PROPERTY) + '/searchAnalytics/query', {
          method: 'POST', body: { startDate, endDate, dimensions: ['page'], type: 'web', dataState: 'final', rowLimit: 20, dimensionFilterGroups: [{ filters: [{ dimension: 'country', operator: 'equals', expression: country }] }] },
        });
        reports.push({ country, rows: result.rows || [], note: 'Top 20 pages only; final GSC data may lag recent dates.' });
      }
      return { property: GSC_PROPERTY, startDate, endDate, reports };
    }
    if (name === 'ga4_plan_property_update') {
      exact(input, ['patch']);
      if (!writesEnabled) throw new Error('GA4_WRITES_DISABLED');
      const patch = propertyPatch(input.patch);
      const before = await property();
      for (const [id, plan] of plans) if (now() >= plan.expiresAt) plans.delete(id);
      if (plans.size >= 8) throw new Error('PLAN_LIMIT');
      const plan = { id: randomUUID(), property: PROPERTY, patch, before, expiresAt: now() + PLAN_TTL_MS };
      plans.set(plan.id, plan);
      return {
        ...plan, updateMask: Object.keys(patch).join(','),
        reportingImpact: 'Currency/time-zone changes affect reporting semantics; review before applying.',
        applyTool: 'ga4_apply_property_update',
      };
    }
    if (name === 'ga4_apply_property_update') {
      exact(input, ['planId']);
      if (!writesEnabled) throw new Error('GA4_WRITES_DISABLED');
      const plan = plans.get(input.planId);
      if (!plan || now() >= plan.expiresAt) { plans.delete(input.planId); throw new Error('PLAN_MISSING_OR_EXPIRED'); }
      plans.delete(input.planId); // One attempt: no silent mutation retries.
      const current = await property();
      for (const key of Object.keys(plan.patch)) if (current[key] !== plan.before[key]) throw new Error('PROPERTY_CHANGED_REPLAN');
      const result = await request(ADMIN_ORIGIN, '/v1beta/' + PROPERTY, {
        method: 'PATCH', query: { updateMask: Object.keys(plan.patch).join(',') },
        body: { name: PROPERTY, ...plan.patch },
      });
      if (result.name !== PROPERTY) throw new Error('GA4_PROPERTY_MISMATCH');
      const after = await property();
      for (const [key, value] of Object.entries(plan.patch)) if (after[key] !== value) throw new Error('GA4_UPDATE_NOT_VERIFIED');
      return { status: 'UPDATE_VERIFIED', property: PROPERTY, before: plan.before, after, updateMask: Object.keys(plan.patch).join(',') };
    }
    throw new Error('TOOL_NOT_ALLOWED');
  }
  return Object.freeze({ call });
}
