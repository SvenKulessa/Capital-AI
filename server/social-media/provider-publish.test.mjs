import assert from 'node:assert/strict';
import test from 'node:test';
import { createSocialProviderPublishTransport } from './provider-publish.mjs';
import { createSocialProviderExecution } from './provider-execution.mjs';

function response(status, body = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
const bytes = Buffer.from('video-bytes');
const baseEnv = {
  SOCIAL_PROVIDER_PUBLISH_ENABLED: 'true',
  SOCIAL_PROVIDER_MAX_MEDIA_BYTES: String(64 * 1024 * 1024),
};

test('all provider publishing is disabled unless explicit server switches are set', async () => {
  let calls = 0;
  const transport = createSocialProviderPublishTransport({
    env: {},
    fetchImpl: async () => { calls++; return response(200); },
  });
  await assert.rejects(() => transport.submit({
    channel: 'YOUTUBE', accessToken: 'token-123456', mediaBytes: bytes,
    metadata: { title: 'Title' },
  }), /SOCIAL_PROVIDER_PUBLISH_DISABLED/);
  assert.equal(calls, 0);
});

test('youtube upload is private by default and returns an unverified receipt', async () => {
  const calls = [];
  const transport = createSocialProviderPublishTransport({
    env: { ...baseEnv, SOCIAL_YOUTUBE_PUBLISH_ENABLED: 'true' },
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return response(200, { id: 'video-123' });
    },
  });
  const receipt = await transport.submit({
    channel: 'YOUTUBE', accessToken: 'token-123456', mediaBytes: bytes,
    metadata: { title: 'Capital AI' },
  });
  assert.equal(receipt.providerDeliveryId, 'video-123');
  assert.match(calls[0].url, /youtube\/v3\/videos/);
  assert.match(String(calls[0].init.body), /"privacyStatus":"private"/);
});

test('tiktok requires creator consent, current privacy options and a complete upload', async () => {
  const calls = [];
  const transport = createSocialProviderPublishTransport({
    env: { ...baseEnv, SOCIAL_TIKTOK_PUBLISH_ENABLED: 'true' },
    fetchImpl: async (url, init) => {
      calls.push(String(url));
      if (calls.length === 1) return response(200, {
        data: { privacy_level_options: ['SELF_ONLY'] }, error: { code: 'ok' },
      });
      if (calls.length === 2) return response(200, {
        data: { publish_id: 'pub-1', upload_url: 'https://open-upload.tiktokapis.com/video/?id=1' },
        error: { code: 'ok' },
      });
      return new Response('', { status: 201 });
    },
  });
  const receipt = await transport.submit({
    channel: 'TIKTOK', accessToken: 'token-123456', mediaBytes: bytes,
    metadata: { creatorConsent: true, privacyLevel: 'SELF_ONLY', caption: 'Capital AI', aiGenerated: true },
  });
  assert.equal(receipt.providerDeliveryId, 'pub-1');
  assert.equal(calls.length, 3);
});

test('x refuses execution until paid write use is explicitly approved', async () => {
  let calls = 0;
  const transport = createSocialProviderPublishTransport({
    env: { ...baseEnv, SOCIAL_X_PUBLISH_ENABLED: 'true' },
    fetchImpl: async () => { calls++; return response(200, { data: { id: '1' } }); },
  });
  await assert.rejects(() => transport.submit({
    channel: 'X', accessToken: 'token-123456', metadata: { caption: 'Capital AI' },
  }), /SOCIAL_X_PAID_WRITE_NOT_APPROVED/);
  assert.equal(calls, 0);
});

test('meta media urls are restricted to an operator allowlist', async () => {
  const transport = createSocialProviderPublishTransport({
    env: {
      ...baseEnv,
      SOCIAL_INSTAGRAM_PUBLISH_ENABLED: 'true',
      SOCIAL_META_GRAPH_API_VERSION: 'v26.0',
      SOCIAL_MEDIA_ASSET_HOST_ALLOWLIST: 'assets.capital-ai.online',
    },
    fetchImpl: async () => response(200, { id: 'container-1' }),
  });
  await assert.rejects(() => transport.submit({
    channel: 'INSTAGRAM', accessToken: 'token-123456',
    account: { externalAccountId: 'ig-1' },
    providerMediaUrl: 'https://evil.example/video.mp4',
    metadata: { caption: 'Capital AI' },
  }), /SOCIAL_PROVIDER_MEDIA_URL_HOST_DENIED/);
});

test('execution stores every provider receipt as UNKNOWN until trusted readback completes it', async () => {
  const notes = [];
  const execution = createSocialProviderExecution({
    store: {
      async noteUnknownDelivery(input) {
        notes.push(input);
        return { jobId: input.plan.jobId, deliveryState: 'UNKNOWN',
          providerDeliveryId: input.providerDeliveryId };
      },
    },
    transport: {
      async submit() {
        return { providerDeliveryId: 'video-123',
          evidenceRef: 'provider-submit://youtube/video-123' };
      },
    },
    tokenResolver: async () => ({ accessToken: 'server-only-token' }),
  });
  const result = await execution.submit({
    plan: {
      contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PROVIDER_BRIDGE@1',
      jobId: 'job-1', userId: 'user-1', accountId: 'account-1',
      channel: 'YOUTUBE', platform: 'youtube',
    },
  });
  assert.equal(result.deliveryState, 'UNKNOWN');
  assert.equal(notes[0].providerDeliveryId, 'video-123');
});

test('ambiguous provider failure is persisted as UNKNOWN without blind retry', async () => {
  const notes = [];
  const execution = createSocialProviderExecution({
    store: {
      async noteUnknownDelivery(input) {
        notes.push(input);
        return { jobId: input.plan.jobId, deliveryState: 'UNKNOWN', providerDeliveryId: null };
      },
    },
    transport: {
      async submit() {
        const error = new Error('network');
        error.providerAttempted = true;
        throw error;
      },
    },
    tokenResolver: async () => ({ accessToken: 'server-only-token' }),
  });
  const result = await execution.submit({
    plan: {
      contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PROVIDER_BRIDGE@1',
      jobId: 'job-2', userId: 'user-1', accountId: 'account-1',
      channel: 'FACEBOOK', platform: 'facebook',
    },
  });
  assert.equal(result.deliveryState, 'UNKNOWN');
  assert.equal(result.ambiguous, true);
  assert.equal(notes.length, 1);
});
