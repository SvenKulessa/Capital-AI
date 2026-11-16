import { createHash } from 'node:crypto';
import './instagram-carousel.test.mjs';
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
    tokenResolver: async ({ userId, accountId, channel, platform }) => ({ accessToken: 'server-only-token', userId, accountId, channel, platform }),
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
    tokenResolver: async ({ userId, accountId, channel, platform }) => ({ accessToken: 'server-only-token', userId, accountId, channel, platform }),
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


test('social execution rejects cross-tenant, wrong-account and wrong-channel token resolution before provider dispatch', async () => {
  const plan = { contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PROVIDER_BRIDGE@1',
    jobId: 'job-tenant', userId: 'user-a', accountId: 'account-a',
    channel: 'YOUTUBE', platform: 'youtube' };
  for (const override of [
    { userId: 'user-b' }, { accountId: 'account-b' },
    { channel: 'TIKTOK' }, { platform: 'tiktok' },
    { userId: undefined }, { platform: undefined },
  ]) {
    let dispatches = 0;
    const execution = createSocialProviderExecution({
      store: { async noteUnknownDelivery() { throw new Error('unexpected persistence'); } },
      transport: { async submit() { dispatches++; throw new Error('unexpected provider call'); } },
      tokenResolver: async () => ({ accessToken: 'server-only-token',
        userId: plan.userId, accountId: plan.accountId,
        channel: plan.channel, platform: plan.platform, ...override }),
    });
    await assert.rejects(() => execution.submit({ plan }), /SOCIAL_PROVIDER_TOKEN_TENANT_BINDING_MISMATCH/);
    assert.equal(dispatches, 0);
  }
});

test('social execution rejects a plan with missing platform before token resolution or provider dispatch', async () => {
  const plan = { contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PROVIDER_BRIDGE@1',
    jobId: 'job-without-platform', userId: 'operator-a', accountId: 'owned-account-a',
    channel: 'YOUTUBE' };
  let tokenResolutions = 0;
  let dispatches = 0;
  const execution = createSocialProviderExecution({
    store: { async noteUnknownDelivery() { throw new Error('unexpected persistence'); } },
    transport: { async submit() { dispatches++; throw new Error('unexpected provider call'); } },
    tokenResolver: async () => { tokenResolutions++; return { accessToken: 'server-only-token',
      userId: plan.userId, accountId: plan.accountId, channel: plan.channel, platform: undefined }; },
  });
  await assert.rejects(() => execution.submit({ plan }), /SOCIAL_PROVIDER_EXECUTION_PLAN_REQUIRED/);
  assert.equal(tokenResolutions, 0);
  assert.equal(dispatches, 0);
});


test('x image upload is hash-bound and attaches exactly one provider media ID', async () => {
  const image = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), Buffer.from('synthetic-png')]);
  const sha = createHash('sha256').update(image).digest('hex');
  const seen = [];
  const transport = createSocialProviderPublishTransport({
    env: { ...baseEnv, SOCIAL_X_PUBLISH_ENABLED:'true',
      SOCIAL_X_PAID_WRITE_APPROVED:'true',
      SOCIAL_X_MEDIA_UPLOAD_ENABLED:'true', SOCIAL_X_PAID_MEDIA_APPROVED:'true' },
    fetchImpl: async (url, init) => {
      seen.push({url:String(url),body:JSON.parse(init.body)});
      if (seen.length === 1) return response(200,{data:{id:'123456789012345678'}});
      return response(201,{data:{id:'234567890123456789'}});
    },
  });
  const receipt = await transport.submit({channel:'X',accessToken:'fake-token-only',
    mediaBytes:image,mediaSha256:sha,metadata:{caption:'CAPITAL-AI'}});
  assert.equal(seen.length,2);
  assert.equal(seen[0].url,'https://api.x.com/2/media/upload');
  assert.deepEqual(Buffer.from(seen[0].body.media,'base64'),image);
  // Contract regression: X /2/media/upload requires the tweet_image category.
  assert.equal(seen[0].body.media_category,'tweet_image');
  assert.deepEqual(Object.keys(seen[0].body).sort(),['media','media_category']);
  assert.equal(seen[1].url,'https://api.x.com/2/tweets');
  assert.deepEqual(seen[1].body,{text:'CAPITAL-AI',
    media:{media_ids:['123456789012345678']}});
  assert.equal(receipt.providerDeliveryId,'234567890123456789');
});

test('x image path fails closed before provider calls for every missing media approval or mismatched bytes', async () => {
  const image=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from('png')]);
  const sha=createHash('sha256').update(image).digest('hex');
  for(const override of [
    {SOCIAL_X_MEDIA_UPLOAD_ENABLED:'false'},
    {SOCIAL_X_PAID_MEDIA_APPROVED:'false'},
  ]) {
    let count=0;
    const transport=createSocialProviderPublishTransport({
      env:{...baseEnv,SOCIAL_X_PUBLISH_ENABLED:'true',
        SOCIAL_X_PAID_WRITE_APPROVED:'true',
        SOCIAL_X_MEDIA_UPLOAD_ENABLED:'true',
        SOCIAL_X_PAID_MEDIA_APPROVED:'true',...override},
      fetchImpl:async()=>{count++;throw Error('MUST_NOT_EXECUTE');},
    });
    await assert.rejects(transport.submit({channel:'X',accessToken:'fake-token-only',
      mediaBytes:image,mediaSha256:sha,metadata:{caption:'test'}}),
    /SOCIAL_X_MEDIA_UPLOAD_DISABLED|SOCIAL_X_PAID_MEDIA_NOT_APPROVED/);
    assert.equal(count,0);
  }
  for(const data of [
    {mediaBytes:image,mediaSha256:'0'.repeat(64)},
    {mediaBytes:Buffer.from('not-a-png'),mediaSha256:sha},
    {mediaBytes:'untrusted string',mediaSha256:sha},
  ]) {
    let count=0;
    const transport=createSocialProviderPublishTransport({
      env:{...baseEnv,SOCIAL_X_PUBLISH_ENABLED:'true',SOCIAL_X_PAID_WRITE_APPROVED:'true',
        SOCIAL_X_MEDIA_UPLOAD_ENABLED:'true',SOCIAL_X_PAID_MEDIA_APPROVED:'true'},
      fetchImpl:async()=>{count++;throw Error('MUST_NOT_EXECUTE');},
    });
    await assert.rejects(transport.submit({channel:'X',accessToken:'fake-token-only',
      metadata:{caption:'test'},...data}),/SOCIAL_X_MEDIA_HASH_MISMATCH|SOCIAL_X_MEDIA_INVALID|SOCIAL_X_MEDIA_BYTES_REQUIRED/);
    assert.equal(count,0);
  }
});

test('x media upload failure, ambiguous timeout and malformed media ID never create a post', async () => {
  const image=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from('png')]);
  const sha=createHash('sha256').update(image).digest('hex');
  for(const failKind of ['rejected','timeout','malformed']) {
    let count=0;
    const transport=createSocialProviderPublishTransport({
      env:{...baseEnv,SOCIAL_X_PUBLISH_ENABLED:'true',SOCIAL_X_PAID_WRITE_APPROVED:'true',
        SOCIAL_X_MEDIA_UPLOAD_ENABLED:'true',SOCIAL_X_PAID_MEDIA_APPROVED:'true'},
      fetchImpl:async()=>{
        count++;
        if(failKind==='timeout')throw Error('timeout synthetic');
        if(failKind==='rejected')return response(403,{error:'synthetic'});
        return response(200,{data:{id:'untrusted-id'}});
      },
    });
    await assert.rejects(transport.submit({channel:'X',accessToken:'fake-token-only',
      mediaBytes:image,mediaSha256:sha,metadata:{caption:'test'}}),
      /SOCIAL_PROVIDER_NETWORK_AMBIGUOUS|SOCIAL_X_MEDIA_UPLOAD_REJECTED/);
    assert.equal(count,1);
  }
});
