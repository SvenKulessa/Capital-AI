import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeYoutubeReadback, normalizeTiktokReadback,
  createSocialProviderReadbackTransport,
} from './provider-readback.mjs';

const key = 'campaign:content:asset:YOUTUBE';
const accountChannelId = 'UCowner1234567890123456';
const token = 'FAKE_MOCK_BEARER_NOT_VALID';
const evidenceRef = 'evidence://verified/provider/readback';
test('YouTube only marks publicly processed exact-ID video as complete', () => {
  const args = { deliveryKey: key, providerId: 'video123', accountChannelId, evidenceRef };
  const good = normalizeYoutubeReadback({ ...args, payload: {
    items: [{ id: 'video123', snippet: { channelId: accountChannelId }, status: { privacyStatus: 'public', uploadStatus: 'processed' } }],
  } });
  assert.equal(good.status, 'VERIFIED_PUBLISHED');
  assert.equal(normalizeYoutubeReadback({ ...args, payload: {
    items: [{ id: 'video123', snippet: { channelId: 'UCforeign12345678901234' },
      status: { privacyStatus: 'public', uploadStatus: 'processed' } }],
  } }).status, 'UNKNOWN');
  assert.equal(good.publishedUrl, 'https://www.youtube.com/watch?v=video123');
  for (const status of [
    { privacyStatus: 'private', uploadStatus: 'processed' },
    { privacyStatus: 'public', uploadStatus: 'uploaded' },
  ]) {
    assert.equal(normalizeYoutubeReadback({ ...args,
      payload: { items: [{ id: 'video123', status }] } }).status, 'UNKNOWN');
  }
  assert.equal(normalizeYoutubeReadback({ ...args,
    payload: { items: [{ id: 'other', snippet: { channelId: accountChannelId }, status: {
      privacyStatus: 'public', uploadStatus: 'processed',
    } }] } }).status, 'UNKNOWN');
  assert.equal(normalizeYoutubeReadback({ ...args,
    payload: { items: [{ id: 'video123', snippet: { channelId: accountChannelId }, status: { uploadStatus: 'rejected' } }] },
  }).status, 'VERIFIED_FAILED');
});

test('TikTok needs final status and a single real post ID; processing remains unknown', () => {
  const args = { deliveryKey: 'campaign:content:asset:TIKTOK', publishId: 'v_pub_url~123',
    accountHandle: '@capitalai', evidenceRef };
  const posted = normalizeTiktokReadback({ ...args, payload: {
    error: { code: 'ok' }, data: { status: 'PUBLISH_COMPLETE',
      publicaly_available_post_id: ['123456789'] },
  } });
  assert.equal(posted.status, 'VERIFIED_PUBLISHED');
  assert.equal(posted.providerDeliveryId, '123456789');
  assert.equal(posted.publishedUrl, 'https://www.tiktok.com/@capitalai/video/123456789');
  assert.equal(normalizeTiktokReadback({ ...args, payload: {
    error: { code: 'ok' }, data: { status: 'PROCESSING_UPLOAD' },
  } }).status, 'UNKNOWN');
  assert.equal(normalizeTiktokReadback({ ...args, payload: {
    error: { code: 'ok' }, data: { status: 'PUBLISH_COMPLETE',
      publicaly_available_post_id: [] },
  } }).status, 'UNKNOWN');
  assert.throws(() => normalizeTiktokReadback({ ...args, payload: {
    error: { code: 'not_authorized' },
  } }), /SOCIAL_READBACK_PROVIDER_ERROR/);
});

test('readback transport is disabled by default and never sends anything', async () => {
  let calls = 0;
  const transport = createSocialProviderReadbackTransport({
    env: {}, fetchImpl: async () => { calls++; throw Error('should not fetch'); },
  });
  await assert.rejects(transport.youtube({
    deliveryKey: key, providerId: 'video123', accountChannelId, token, evidenceRef,
  }), /SOCIAL_READBACK_DISABLED/);
  assert.equal(calls, 0);
});

test('mock YouTube readback uses only official static URL with no redirects', async () => {
  const calls = [];
  const transport = createSocialProviderReadbackTransport({
    env: { SOCIAL_PROVIDER_READBACK_ENABLED: 'true' },
    fetchImpl: async (url, req) => {
      calls.push({ url: String(url), req });
      return new Response(JSON.stringify({ items: [{
        id: 'video123', snippet: { channelId: accountChannelId }, status: { uploadStatus: 'processed', privacyStatus: 'public' },
      }] }), { status: 200 });
    },
  });
  const result = await transport.youtube({ deliveryKey: key, providerId: 'video123',
    accountChannelId, token, evidenceRef });
  assert.equal(result.status, 'VERIFIED_PUBLISHED');
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).hostname, 'www.googleapis.com');
  assert.equal(calls[0].req.method, 'GET');
  assert.equal(calls[0].req.redirect, 'error');
});

test('mock TikTok status lookup sends publish_id, never initiates publication', async () => {
  const calls = [];
  const transport = createSocialProviderReadbackTransport({
    env: { SOCIAL_PROVIDER_READBACK_ENABLED: 'true' },
    fetchImpl: async (url, req) => {
      calls.push({ url: String(url), req });
      return new Response(JSON.stringify({
        error: { code: 'ok' }, data: { status: 'PROCESSING_DOWNLOAD' },
      }), { status: 200 });
    },
  });
  const outcome = await transport.tiktok({ deliveryKey: 'campaign:content:asset:TIKTOK',
    publishId: 'v_pub_url~123', accountHandle: '@capitalai', token, evidenceRef });
  assert.equal(outcome.status, 'UNKNOWN');
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).hostname, 'open.tiktokapis.com');
  assert.equal(new URL(calls[0].url).pathname, '/v2/post/publish/status/fetch/');
  assert.equal(JSON.parse(calls[0].req.body).publish_id, 'v_pub_url~123');
  assert.equal(calls[0].req.redirect, 'error');
});
