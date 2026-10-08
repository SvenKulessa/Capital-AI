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
