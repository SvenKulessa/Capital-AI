import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { createGscServiceAccountAssertion, GSC_PROPERTY, GSC_SCOPE, readGscServiceAccount } from './gsc-service-account-readback.mjs';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const serviceAccount = {
  type: 'service_account',
  client_email: 'gsc-readback@example-project.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  project_id: 'example-project',
  token_uri: 'https://oauth2.googleapis.com/token',
};
const env = { GSC_SERVICE_ACCOUNT_JSON: JSON.stringify(serviceAccount) };
const response = (value, status = 200) => ({ ok: status === 200, status, json: async () => value });

function mockFetch({ sites = [{ siteUrl: GSC_PROPERTY, permissionLevel: 'siteOwner' }], sitemaps = [], siteStatus = 200 } = {}) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') return response({ access_token: 'secret-token', token_type: 'Bearer' });
    if (url === 'https://www.googleapis.com/webmasters/v3/sites') return response({ siteEntry: sites }, siteStatus);
    if (url === 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Acapital-ai.online/sitemaps') return response({ sitemap: sitemaps });
    throw new Error('unexpected external endpoint');
  };
  return { fn, calls };
}

test('service-account JWT is RS256 signed and grants only Search Console readonly scope', () => {
  const assertion = createGscServiceAccountAssertion(serviceAccount, 1800000000000);
  const [header, payload, signature] = assertion.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url').toString()).alg, 'RS256');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  assert.equal(claims.scope, GSC_SCOPE);
  assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(claims.exp - claims.iat, 3600);
  assert.equal(verify('RSA-SHA256', Buffer.from(header + '.' + payload), createPublicKey(privateKey), Buffer.from(signature, 'base64url')), true);
});

test('readback uses only OAuth POST and two read-only GSC GETs, no credentials in result', async () => {
  const { fn, calls } = mockFetch({ sitemaps: [{ path: 'https://capital-ai.online/sitemap.xml' }] });
  const result = await readGscServiceAccount({ env, fetchImpl: fn, now: () => 1800000000000 });
  assert.equal(result.status, 'PROVIDER_READ_VERIFIED');
  assert.equal(result.property, GSC_PROPERTY);
  assert.equal(result.permissionLevel, 'siteOwner');
  assert.equal(result.sitemapCount, 1);
  assert.deepEqual(calls.map(x => x.options.method), ['POST', 'GET', 'GET']);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer secret-token');
  assert.deepEqual(calls.map(x => x.url), [
    'https://oauth2.googleapis.com/token',
    'https://www.googleapis.com/webmasters/v3/sites',
    'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Acapital-ai.online/sitemaps',
  ]);
  assert.doesNotMatch(JSON.stringify(result), /secret-token|PRIVATE KEY|client_email|example-project/);
});

test('missing, malformed and incorrect service-account credentials fail before network', async () => {
  let called = false;
  const fetchImpl = () => { called = true; throw Error('never call'); };
  for (const badEnv of [{}, { GSC_SERVICE_ACCOUNT_JSON: '{' }, { GSC_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...serviceAccount, token_uri: 'https://evil.invalid/oauth' }) }]) {
    await assert.rejects(() => readGscServiceAccount({ env: badEnv, fetchImpl }), /GSC_SERVICE_ACCOUNT_/);
  }
  assert.equal(called, false);
});

test('unrelated properties and unverified permissions fail closed', async () => {
  for (const scenarios of [
    { sites: [{ siteUrl: GSC_PROPERTY + '.attacker.tld', permissionLevel: 'siteOwner' }] },
    { sites: [{ siteUrl: GSC_PROPERTY, permissionLevel: 'siteUnverifiedUser' }] },
  ]) {
    const { fn, calls } = mockFetch(scenarios);
    await assert.rejects(() => readGscServiceAccount({ env, fetchImpl: fn }), /GSC_EXPECTED_PROPERTY_NOT_ACCESSIBLE|GSC_PROPERTY_PERMISSION_INSUFFICIENT/);
    assert.equal(calls.length, 2);
  }
});

test('non-success responses never print the raw Google error body', async () => {
  const { fn } = mockFetch({ siteStatus: 403 });
  await assert.rejects(() => readGscServiceAccount({ env, fetchImpl: fn }), e => e.message === 'GSC_SITES_HTTP_403');
});
