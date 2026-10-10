import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleMaintenance } from './google-maintenance-api.mjs';
import { runLearningSetup } from '../scripts/google-learning-setup.mjs';

function fixture({ writes = true, gscWrites = true, streamCount = 1, readbackFailure = false, omitFalse = false } = {}) {
  const calls = [];
  const property = 'properties/548187678';
  const stream = property + '/dataStreams/12345';
  let events = [];
  let redaction = { name: stream + '/dataRedactionSettings', queryParameterKeys: ['existing_private'], emailRedactionEnabled: false };
  let enhanced = { name: stream + '/enhancedMeasurementSettings', formInteractionsEnabled: true, pageChangesEnabled: true };
  let sitemaps = [];
  const api = createGoogleMaintenance({ env: { GOOGLE_MAINTENANCE_GA4_WRITES_ENABLED: String(writes), GOOGLE_MAINTENANCE_GSC_WRITES_ENABLED: String(gscWrites) },
    tokenProvider: async () => 'sentinel-private-token',
    fetchImpl: async (url, options) => {
      calls.push({ path: url.pathname, query: url.search, method: options.method, body: options.body ? JSON.parse(options.body) : null });
      const path = url.pathname;
      if (path === '/v1beta/' + property) return Response.json({ name: property, displayName: 'Capital-AI' });
      if (path.endsWith('/dataStreams')) return Response.json({ dataStreams: Array.from({ length: streamCount }, (_, i) => ({ name: property + '/dataStreams/' + (12345 + i), type: 'WEB_DATA_STREAM', webStreamData: { defaultUri: 'https://capital-ai.online/' } })) });
      if (path.endsWith('/keyEvents')) {
        if (options.method === 'POST') events.push({ name: property + '/keyEvents/1', ...JSON.parse(options.body) });
        return Response.json(options.method === 'POST' ? events.at(-1) : { keyEvents: events });
      }
      if (path.endsWith('/dataRedactionSettings')) {
        if (options.method === 'PATCH' && !readbackFailure) redaction = { ...redaction, ...JSON.parse(options.body) };
        return Response.json(redaction);
      }
      if (path.endsWith('/enhancedMeasurementSettings')) {
        if (options.method === 'PATCH') enhanced = { ...enhanced, ...JSON.parse(options.body) };
        const response = { ...enhanced };
        if (omitFalse && response.formInteractionsEnabled === false) delete response.formInteractionsEnabled;
        return Response.json(response);
      }
      if (path.endsWith('/sitemaps')) return Response.json({ sitemap: sitemaps });
      if (options.method === 'PUT') {
        sitemaps = [{ path: 'https://capital-ai.online/sitemap.xml' }];
        return new Response(null, { status: 204 });
      }
      if (url.hostname === 'analyticsdata.googleapis.com') return Response.json({ rows: [{ private: 'sentinel-private-report' }] });
      if (path.endsWith('/searchAnalytics/query')) return Response.json({ rows: [{ keys: ['sentinel-private-query'] }] });
      throw new Error('Unexpected fixture path');
    } });
  return { api, calls };
}

test('learning setup is idempotent, exact-bound and preserves existing redaction keys', async () => {
  const f = fixture({ omitFalse: true });
  const result = await runLearningSetup('apply', f.api);
  assert.equal(result.configuration.leadEventConfigured, true);
  assert.equal(result.configuration.emailRedactionEnabled, true);
  assert.equal(result.configuration.formInteractionsEnabled, false);
  assert.equal(result.actualLeadsVerified, false);
  assert.equal(result.browserCollectionVerified, false);
  const redaction = f.calls.find(c => c.method === 'PATCH' && c.path.endsWith('dataRedactionSettings'));
  assert.ok(redaction.body.queryParameterKeys.includes('existing_private'));
  assert.ok(redaction.body.queryParameterKeys.includes('access_token'));
  assert.equal(redaction.query, '?updateMask=email_redaction_enabled%2Cquery_parameter_redaction_enabled%2Cquery_parameter_keys');
  const enhanced = f.calls.find(c => c.method === 'PATCH' && c.path.endsWith('enhancedMeasurementSettings'));
  assert.deepEqual(Object.keys(enhanced.body).sort(), ['formInteractionsEnabled', 'name']);
  const created = f.calls.find(c => c.method === 'POST' && c.path.endsWith('/keyEvents'));
  assert.deepEqual(created.body, { eventName: 'generate_lead', countingMethod: 'ONCE_PER_EVENT' });
  const submit = f.calls.find(c => c.method === 'PUT');
  assert.equal(decodeURIComponent(submit.path), '/webmasters/v3/sites/sc-domain:capital-ai.online/sitemaps/https://capital-ai.online/sitemap.xml');
  const mutations = f.calls.filter(c => ['PUT', 'PATCH'].includes(c.method) || c.path.endsWith('/keyEvents') && c.method === 'POST').length;
  await runLearningSetup('apply', f.api);
  assert.equal(f.calls.filter(c => ['PUT', 'PATCH'].includes(c.method) || c.path.endsWith('/keyEvents') && c.method === 'POST').length, mutations);
  assert.doesNotMatch(JSON.stringify(result), /sentinel-private/);
});

test('audit never changes settings and prints no private reports', async () => {
  const f = fixture({ writes: false, gscWrites: false });
  const result = await runLearningSetup('audit', f.api);
  assert.equal(result.writes, null);
  assert.ok(f.calls.every(c => c.method === 'GET' || c.path.endsWith(':runReport') || c.path.endsWith('/searchAnalytics/query')));
  assert.doesNotMatch(JSON.stringify(result), /sentinel-private/);
  await assert.rejects(runLearningSetup('arbitrary', f.api), /INVALID_MODE/);
});

test('write flags and ambiguous streams stop mutation before unsafe requests', async () => {
  const f = fixture({ writes: false, gscWrites: false });
  await assert.rejects(f.api.call('ga4_configure_learning'), /GA4_WRITES_DISABLED/);
  await assert.rejects(f.api.call('gsc_submit_canonical_sitemap'), /GSC_WRITES_DISABLED/);
  assert.equal(f.calls.length, 0);
  for (const streamCount of [0, 2]) {
    const ambiguous = fixture({ streamCount });
    await assert.rejects(ambiguous.api.call('ga4_configure_learning'), /AMBIGUOUS_OR_MISSING/);
    assert.ok(ambiguous.calls.every(c => c.method === 'GET'));
  }
});

test('failed settings readback never claims successful setup', async () => {
  const f = fixture({ readbackFailure: true });
  await assert.rejects(runLearningSetup('apply', f.api), /GA4_UPDATE_NOT_VERIFIED/);
  assert.ok(!f.calls.some(c => c.method === 'PUT'));
});

test('organic learning report excludes query strings and compares bounded periods', async () => {
  const f = fixture();
  await f.api.call('ga4_learning_report');
  const body = f.calls[0].body;
  assert.equal(body.dateRanges.length, 2);
  assert.deepEqual(body.dimensions, [{ name: 'country' }, { name: 'landingPage' }]);
  assert.equal(body.limit, '100');
  assert.equal(body.dimensionFilter.andGroup.expressions[0].filter.stringFilter.value, 'Organic Search');
});
