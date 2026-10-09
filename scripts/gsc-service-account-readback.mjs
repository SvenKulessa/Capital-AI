// CAPITAL_AI_GSC_SERVICE_ACCOUNT_READBACK@1
// Standalone, read-only Google Search Console service-account proof. No public route.
import { createSign, createPrivateKey } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const GSC_PROPERTY = 'sc-domain:capital-ai.online';
export const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GSC_API = 'https://www.googleapis.com/webmasters/v3/sites';
const TIMEOUT_MS = 8000;

function fail(code) { throw new Error(code); }
function credentials(env) {
  if (!env.GSC_SERVICE_ACCOUNT_JSON) fail('GSC_SERVICE_ACCOUNT_NOT_CONFIGURED');
  let parsed;
  try { parsed = JSON.parse(env.GSC_SERVICE_ACCOUNT_JSON); }
  catch { fail('GSC_SERVICE_ACCOUNT_INVALID_JSON'); }
  if (
    parsed?.type !== 'service_account' ||
    typeof parsed.client_email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(parsed.client_email) ||
    typeof parsed.private_key !== 'string' ||
    typeof parsed.project_id !== 'string' ||
    !parsed.project_id.trim() ||
    parsed.token_uri !== TOKEN_ENDPOINT
  ) fail('GSC_SERVICE_ACCOUNT_INVALID');
  try { createPrivateKey(parsed.private_key); }
  catch { fail('GSC_SERVICE_ACCOUNT_KEY_INVALID'); }
  return parsed;
}

export function createGscServiceAccountAssertion(account, nowMs = Date.now()) {
  const issuedAt = Math.floor(nowMs / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  if (account.private_key_id) header.kid = account.private_key_id;
  const claims = {
    iss: account.client_email,
    scope: GSC_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };
  const encoded = Buffer.from(JSON.stringify(header)).toString('base64url') + '.' +
    Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signer = createSign('RSA-SHA256');
  signer.update(encoded);
  signer.end();
  return encoded + '.' + signer.sign(account.private_key).toString('base64url');
}

async function readJson(fetchImpl, url, options, operation) {
  let response;
  try {
    response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch { fail(operation + '_NETWORK_ERROR'); }
  if (!response?.ok) fail(operation + '_HTTP_' + (Number.isInteger(response?.status) ? response.status : 'UNKNOWN'));
  try { return await response.json(); }
  catch { fail(operation + '_INVALID_JSON'); }
}

export async function readGscServiceAccount({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  const account = credentials(env);
  const assertion = createGscServiceAccountAssertion(account, now());
  const auth = await readJson(fetchImpl, TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  }, 'GSC_TOKEN');
  if (typeof auth?.access_token !== 'string' || !auth.access_token || auth.token_type !== 'Bearer') {
    fail('GSC_TOKEN_INVALID_RESPONSE');
  }
  const get = { method: 'GET', headers: { Authorization: 'Bearer ' + auth.access_token } };
  const sites = await readJson(fetchImpl, GSC_API, get, 'GSC_SITES');
  const site = Array.isArray(sites?.siteEntry)
    ? sites.siteEntry.find(entry => entry?.siteUrl === GSC_PROPERTY)
    : undefined;
  if (!site) fail('GSC_EXPECTED_PROPERTY_NOT_ACCESSIBLE');
  const permissionLevel = site.permissionLevel;
  if (!['siteOwner', 'siteFullUser', 'siteRestrictedUser'].includes(permissionLevel)) {
    fail('GSC_PROPERTY_PERMISSION_INSUFFICIENT');
  }
  const sitemapUrl = GSC_API + '/' + encodeURIComponent(GSC_PROPERTY) + '/sitemaps';
  const sitemaps = await readJson(fetchImpl, sitemapUrl, get, 'GSC_SITEMAPS');
  if (sitemaps?.sitemap !== undefined && !Array.isArray(sitemaps.sitemap)) {
    fail('GSC_SITEMAPS_INVALID_RESPONSE');
  }
  return Object.freeze({
    schema: 'CAPITAL_AI_GSC_SERVICE_ACCOUNT_READBACK@1',
    status: 'PROVIDER_READ_VERIFIED',
    property: GSC_PROPERTY,
    permissionLevel,
    sitemapCount: Array.isArray(sitemaps?.sitemap) ? sitemaps.sitemap.length : 0,
    observedAt: new Date(now()).toISOString(),
    scope: GSC_SCOPE,
    source: 'LIVE_GOOGLE_SEARCH_CONSOLE_API',
    readOnly: true,
  });
}

// Explicit invocation only. Never fetch Google data during app startup or CI tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await readGscServiceAccount();
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (error) {
    // Never print service-account data, JWT, bearer token, Google response body or stack.
    const code = /^[A-Z0-9_]+(?:_HTTP_\d{3})?$/.test(error?.message || '') ? error.message : 'GSC_READBACK_ERROR';
    process.stderr.write(JSON.stringify({ status: 'EVIDENCE_UNAVAILABLE', error: code }) + '\n');
    process.exitCode = 1;
  }
}
