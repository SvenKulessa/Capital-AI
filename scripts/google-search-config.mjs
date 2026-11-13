#!/usr/bin/env node
// Search-only configuration as code. No property creation, IAM or OAuth changes.
import { pathToFileURL } from 'node:url';
import { createGoogleMaintenance, GSC_SEARCH_CONFIGURATION_PATHS } from '../server/google-maintenance-api.mjs';
import { SEO_PUBLIC_IMAGE_PATHS } from '../shared/seo-indexing-policy.mjs';
import { SEO_CONTENT_MANIFEST } from '../shared/seo-content-manifest.mjs';

const ORIGIN = 'https://capital-ai.online';
export const SEARCH_CONFIGURATION = Object.freeze({
  schema: 'CAPITAL_AI_GOOGLE_SEARCH_CONFIG@1',
  property: 'sc-domain:capital-ai.online',
  sitemap: ORIGIN + '/sitemap.xml',
  inspectionPaths: GSC_SEARCH_CONFIGURATION_PATHS,
  logo: ORIGIN + '/branding/asset-pack/avatars/capital-ai-avatar-512x512.png',
  favicon: ORIGIN + '/branding/asset-pack/favicon/favicon-96x96.png',
  scopes: Object.freeze({ audit: 'https://www.googleapis.com/auth/webmasters.readonly', apply: 'https://www.googleapis.com/auth/webmasters', resubmit: 'https://www.googleapis.com/auth/webmasters' }),
});

async function publicResponse(fetchImpl, path) {
  const response = await fetchImpl(ORIGIN + path, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (response.status !== 200) throw new Error('PUBLIC_HTTP_UNEXPECTED');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body || []) {
    size += chunk.length;
    if (size > 1024 * 1024) { throw new Error('PUBLIC_RESPONSE_TOO_LARGE'); }
    chunks.push(chunk);
  }
  return { response, body: Buffer.concat(chunks) };
}

export async function auditSearchSurface(fetchImpl = fetch) {
  const checks = [];
  const add = (path, check, pass) => checks.push({ path, check, status: pass ? 'PASS' : 'FAIL' });
  for (const path of ['/', '/robots.txt', '/sitemap.xml', ...SEO_PUBLIC_IMAGE_PATHS]) {
    try {
      const { response, body } = await publicResponse(fetchImpl, path);
      const text = body.toString();
      const type = response.headers.get('content-type') || '';
      if (path === '/') {
        const scripts = [...text.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
        const nodes = scripts.flatMap(([, json]) => { const value = JSON.parse(json); return value['@graph'] || [value]; });
        const publisher = nodes.find(node => [node['@type']].flat().includes('Organization') && node.url === ORIGIN + '/');
        add(path, 'LOGO_SCHEMA', publisher?.logo?.url === SEARCH_CONFIGURATION.logo && publisher.logo.width >= 112 && publisher.logo.height >= 112);
        add(path, 'PNG_FAVICON', /<link\b[^>]*rel="icon"[^>]*href="\/branding\/asset-pack\/favicon\/favicon-96x96.png"/.test(text));
        const meta = [...text.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]).filter(tag => /name=["'](?:robots|googlebot)["']/i.test(tag));
        add(path, 'HOME_INDEXABLE', /text\/html/i.test(type) && !/noindex|\bnone\b/i.test(response.headers.get('x-robots-tag') || '') && !meta.some(tag => /content=["'][^"']*\b(?:noindex|none)\b/i.test(tag)));
      } else if (path === '/robots.txt') {
        // Match the site's deliberately simple crawl-all policy; do not guess at complex rules.
        const lines = text.split(/\r?\n/).map(line => line.split('#')[0].trim()).filter(Boolean);
        add(path, 'CRAWL_POLICY', lines.length === 3 && lines.includes('User-agent: *') && lines.includes('Allow: /'));
        add(path, 'SITEMAP_REFERENCE', lines.includes('Sitemap: ' + SEARCH_CONFIGURATION.sitemap));
      } else if (path === '/sitemap.xml') {
        const urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
        const expected = new Set(SEO_CONTENT_MANIFEST.map(entry => entry.canonical));
        add(path, 'PUBLIC_PAGE_SITEMAP', /(?:application|text)\/xml/i.test(type) && urls.length === expected.size && new Set(urls).size === expected.size && urls.every(url => expected.has(url)));
      } else {
        add(path, 'IMAGE_INDEXABLE', !/noindex|\bnone\b/i.test(response.headers.get('x-robots-tag') || '') && (/image\//i.test(type) || path.endsWith('.ico')));
        if (path === new URL(SEARCH_CONFIGURATION.logo).pathname) add(path, 'LOGO_DIMENSIONS', body.length >= 24 && body.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && body.readUInt32BE(16) === 512 && body.readUInt32BE(20) === 512);
      }
    } catch { add(path, 'RESPONSE_AVAILABLE_AND_VALID', false); }
  }
  return { status: checks.every(check => check.status === 'PASS') ? 'PASS' : 'FAIL', checks };
}

export async function runSearchConfiguration(mode = 'audit', { env = process.env, fetchImpl = fetch, maintenance } = {}) {
  if (!['plan', 'audit', 'apply', 'resubmit'].includes(mode)) throw new Error('INVALID_MODE');
  const writing = mode === 'apply' || mode === 'resubmit';
  const result = { configuration: SEARCH_CONFIGURATION, mode, readOnly: !writing,
    crawlRequested: false, googleLogoDisplayed: 'NOT_PROVEN', connectorConnected: 'NOT_PROVEN' };
  if (mode === 'plan') return { ...result, status: 'PLAN_ONLY',
    ownerSteps: ['Grant an existing Google identity access to the exact Search Console property if missing.',
      'Connect HYPD separately if desired; API credentials do not connect the chat connector.',
      'Request homepage indexing manually in Search Console if needed; URL Inspection API reads snapshots only.'] };
  result.publicSurface = await auditSearchSurface(fetchImpl);
  const api = maintenance || createGoogleMaintenance({ fetchImpl, env: { ...env,
    GOOGLE_MAINTENANCE_GA4_WRITES_ENABLED: 'false', GOOGLE_MAINTENANCE_GSC_WRITES_ENABLED: String(writing) } });
  try {
    result.property = await api.call('gsc_get_expected_site');
    if (writing) {
      if (result.publicSurface.status !== 'PASS') throw new Error('PUBLIC_CONFIGURATION_INVALID');
      if (!['siteOwner', 'siteFullUser'].includes(result.property.permissionLevel)) throw new Error('GSC_WRITE_PERMISSION_INSUFFICIENT');
      result.submission = await api.call(mode === 'resubmit' ? 'gsc_resubmit_canonical_sitemap' : 'gsc_submit_canonical_sitemap');
    }
    const report = await api.call('gsc_list_sitemaps');
    const canonical = report.sitemaps.filter(item => item.path === SEARCH_CONFIGURATION.sitemap);
    if (report.property !== SEARCH_CONFIGURATION.property || canonical.length > 1) throw new Error('GSC_SITEMAP_RESPONSE_INVALID');
    result.sitemap = canonical.length ? { status: 'REGISTERED', ...canonical[0] } : { status: 'NOT_REGISTERED' };
    result.inspection = await api.call('gsc_inspect_search_configuration');
    result.providerStatus = 'PROVIDER_READ_VERIFIED';
  } catch (error) {
    result.providerStatus = 'NOT_PROVEN';
    result.error = /^(?:GOOGLE_HTTP_[45]\d{2}|GSC_[A-Z_]+|PUBLIC_CONFIGURATION_INVALID|GOOGLE_IDENTITY_NOT_CONFIGURED|GOOGLE_TRANSPORT_UNAVAILABLE|INVALID_TOKEN)$/.test(error?.message || '') ? error.message : 'GOOGLE_SEARCH_CONFIG_UNAVAILABLE';
  }
  result.status = result.publicSurface.status === 'PASS' && result.providerStatus === 'PROVIDER_READ_VERIFIED' ? 'AUDIT_COMPLETE' : 'INCOMPLETE';
  // API access/sitemap registration never establishes indexing, recrawling or SERP display.
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length > 3) throw new Error('INVALID_ARGUMENTS');
    const result = await runSearchConfiguration(process.argv[2] || 'audit');
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.status === 'INCOMPLETE') process.exitCode = 2;
  } catch {
    process.stderr.write('GOOGLE_SEARCH_CONFIG_INVALID_INVOCATION\n');
    process.exitCode = 1;
  }
}
