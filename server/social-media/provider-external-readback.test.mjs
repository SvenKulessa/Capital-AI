import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeXPostReadback, normalizeInstagramMediaReadback,
  normalizeFacebookPageReadback, createXReadbackTransport,
} from './provider-external-readback.mjs';

const key = 'c:d:a:X';
const base = { deliveryKey: key, postId: '123456789',
  accountUserId: '24680', accountHandle: 'capitalai',
  evidenceRef: 'provider://x/verified' };
test('X readback rejects foreign author and unsupported hosts', () => {
  assert.equal(normalizeXPostReadback({ ...base,
    payload: { data: { id: '123456789', author_id: '24680' } },
  }).status, 'VERIFIED_PUBLISHED');
  assert.equal(normalizeXPostReadback({ ...base,
    payload: { data: { id: '123456789', author_id: 'someone_else' } },
  }).status, 'UNKNOWN');
  assert.equal(normalizeXPostReadback({ ...base,
    payload: { data: { id: 'another_id', author_id: '24680' } },
  }).status, 'UNKNOWN');
});
test('Meta container-ready status never implies publication; verify owner and post URL', () => {
  const inst = { deliveryKey: 'c:d:a:INSTAGRAM', mediaId: '333333', accountId: '444444',
    evidenceRef: 'provider://instagram/post' };
  assert.equal(normalizeInstagramMediaReadback({ ...inst,
    payload: { id: '333333', status_code: 'FINISHED' } }).status, 'UNKNOWN');
  assert.equal(normalizeInstagramMediaReadback({ ...inst,
    payload: { id: '333333', owner: { id: '444444' },
      permalink: 'https://www.instagram.com/reel/abc123/' },
  }).status, 'VERIFIED_PUBLISHED');
  assert.equal(normalizeInstagramMediaReadback({ ...inst,
    payload: { id: '333333', owner: { id: '555555' },
      permalink: 'https://www.instagram.com/reel/abc123/' },
  }).status, 'UNKNOWN');
  assert.equal(normalizeInstagramMediaReadback({ ...inst,
    payload: { id: '333333', owner: { id: '444444' },
      permalink: 'https://www.instagram.com.attacker.example/reel/123/' },
  }).status, 'UNKNOWN');

  const fb = { deliveryKey: 'c:d:a:FACEBOOK', postId: '444444_123', pageId: '444444',
    evidenceRef: 'provider://facebook/post' };
  assert.equal(normalizeFacebookPageReadback({ ...fb,
    payload: { id: '444444_123', from: { id: '444444' },
      is_published: true, permalink_url: 'https://www.facebook.com/444444/posts/123' },
  }).status, 'VERIFIED_PUBLISHED');
  assert.equal(normalizeFacebookPageReadback({ ...fb,
    payload: { id: '444444_123', from: { id: '555555' },
      is_published: true, permalink_url: 'https://www.facebook.com/444444/posts/123' },
  }).status, 'UNKNOWN');
});
test('X billable transport requires independent cost flag, never calls provider by default', async () => {
  let calls = 0;
  const transport = createXReadbackTransport({ env: { SOCIAL_PROVIDER_READBACK_ENABLED: 'true' },
    fetchImpl: async () => { calls++; throw Error('network not allowed'); } });
  await assert.rejects(transport.lookup({ ...base, token: 'MOCK_TOKEN' }),
    /SOCIAL_X_COST_APPROVAL_REQUIRED/);
  assert.equal(calls, 0);
});
test('X mock transport only sends a bounded GET to the official post lookup', async () => {
  const calls = [];
  const transport = createXReadbackTransport({
    env: { SOCIAL_PROVIDER_READBACK_ENABLED: 'true',
      SOCIAL_X_PAID_READBACK_APPROVED: 'true' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return new Response(JSON.stringify({ data: { id: base.postId,
        author_id: base.accountUserId } }), { status: 200 });
    } });
  const r = await transport.lookup({ ...base, token: 'MOCK_TOKEN' });
  assert.equal(r.status, 'VERIFIED_PUBLISHED');
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).hostname, 'api.x.com');
  assert.equal(new URL(calls[0].url).searchParams.get('tweet.fields'), 'author_id');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.redirect, 'error');
});


test('Meta transports use fixed Graph origin, bearer headers and exact owner readback', async () => {
  const { createMetaReadbackTransport } = await import('./provider-external-readback.mjs');
  const calls = [];
  const transport = createMetaReadbackTransport({
    env: { SOCIAL_PROVIDER_READBACK_ENABLED: 'true', SOCIAL_META_GRAPH_API_VERSION: 'v26.0' },
    fetchImpl: async (url, init) => {
      calls.push({ url: new URL(url), init });
      assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'error');
      assert.equal(init.headers.Authorization, 'Bearer fixture-token');
      assert.equal(new URL(url).origin, 'https://graph.facebook.com');
      assert.ok(!String(url).includes('fixture-token'));
      return new Response(JSON.stringify(new URL(url).pathname.endsWith('/111')
        ? { id: '111', owner: { id: '222' }, permalink: 'https://www.instagram.com/p/fixture/' }
        : { id: '222_333', from: { id: '222' }, is_published: true,
          permalink_url: 'https://www.facebook.com/222/posts/333' }));
    },
  });
  assert.equal((await transport.instagram({ mediaId: '111', accountId: '222',
    token: 'fixture-token', deliveryKey: 'ig:fixture', evidenceRef: 'evidence://fixture' })).status,
  'VERIFIED_PUBLISHED');
  assert.equal((await transport.facebook({ postId: '222_333', pageId: '222',
    token: 'fixture-token', deliveryKey: 'fb:fixture', evidenceRef: 'evidence://fixture' })).status,
  'VERIFIED_PUBLISHED');
  await assert.rejects(transport.facebook({ postId: '999_333', pageId: '222',
    token: 'fixture-token' }), /INVALID_READBACK_IDENTITY/);
  await assert.rejects(transport.instagram({ mediaId: '../me', accountId: '222',
    token: 'fixture-token' }), /INVALID_READBACK_IDENTITY/);
  assert.equal(calls.length, 2);
});

test('Meta configuration and unavailable responses fail closed', async () => {
  const { createMetaReadbackTransport } = await import('./provider-external-readback.mjs');
  const args = { mediaId: '111', accountId: '222', token: 'fixture-token' };
  for (const [env, pattern] of [[{}, /DISABLED/],
    [{ SOCIAL_PROVIDER_READBACK_ENABLED: 'true' }, /VERSION_REQUIRED/],
    [{ SOCIAL_PROVIDER_READBACK_ENABLED: 'true', SOCIAL_META_GRAPH_API_VERSION: 'https://evil.invalid' }, /VERSION_REQUIRED/]]) {
    await assert.rejects(createMetaReadbackTransport({ env,
      fetchImpl: () => { throw new Error('must not call'); } }).instagram(args), pattern);
  }
  for (const [body, status, pattern] of [['{}', 403, /UNAVAILABLE/],
    ['x'.repeat(32001), 200, /TOO_LARGE/], ['bad-json', 200, /INVALID_JSON/]]) {
    await assert.rejects(createMetaReadbackTransport({
      env: { SOCIAL_PROVIDER_READBACK_ENABLED: 'true', SOCIAL_META_GRAPH_API_VERSION: 'v26.0' },
      fetchImpl: async () => new Response(body, { status }),
    }).instagram(args), pattern);
  }
});
