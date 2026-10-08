import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createSocialProviderStore } from './provider-store.mjs';

const USER = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const ACCOUNT = 'f683ecba-1fab-45f7-8c6a-a35418750771';
const JOB = 'b405dbb2-c918-4541-a0e1-840f9f5bca8f';
const LOG = 'a905dbb2-c918-4541-a0e1-840f9f5bca8f';
const CALLBACK = 'https://capital-ai.online/api/social-media/auth/callback';
const now = Date.parse('2026-10-08T10:00:00Z');
const assetSha = 'a'.repeat(64), sourceSha = 'b'.repeat(40);
const deliveryKey = 'campaign:content:asset:YOUTUBE';
const fakeJwt = [
  Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
  Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'),
  'not-a-signature',
].join('.');
const env = { SUPABASE_URL: 'https://supabase.example.net/', SUPABASE_SERVICE_ROLE_KEY: fakeJwt };
const response = (payload, status = 200) => new Response(
  payload == null ? '' : JSON.stringify(payload), { status },
);
function fixture() {
  return {
    now, userId: USER,
    manifest: { contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1',
      publicationAuthority: 'SOCIAL_MEDIA_ENGINE_ONLY', campaignId: 'campaign',
      contentId: 'content', canonicalUrl: 'https://capital-ai.online/', sourceSha,
      assets: [{ assetId: 'asset', contentId: 'content', sourceSha, sha256: assetSha }],
      approvals: [{ approvalRef: 'approval-1', assetId: 'asset', assetSha256: assetSha,
        publicPublishAllowed: true, approvedChannels: ['YOUTUBE'] }] },
    handoff: { contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PUBLISHER_ADAPTER@1',
      campaignId: 'campaign', contentId: 'content', canonicalUrl: 'https://capital-ai.online/',
      sourceSha, assetId: 'asset', assetSha256: assetSha, approvalRef: 'approval-1',
      channel: 'YOUTUBE', deliveryKey },
    accountRow: { id: ACCOUNT, user_id: USER, platform: 'youtube',
      token_expires_at: '2026-10-08T11:00:00Z', status: 'connected',
      scopes: ['youtube.upload'], access_token_encrypted: 'REDACTED_CIPHER' },
    approvalRow: { id: 'approval-1', user_id: USER, status: 'approved',
      platforms: ['youtube'], campaign_id: 'campaign', content_id: 'content',
      source_sha: sourceSha, asset_id: 'asset', asset_sha256: assetSha,
      public_publish_allowed: true, decided_by: 'owner' },
    verifiedAsset: { assetId: 'asset', contentId: 'content', sourceSha,
      sha256: assetSha, retrievedBytesSha256: assetSha, rightsVerified: true },
    capability: { channel: 'YOUTUBE', status: 'VERIFIED', scopesVerified: true,
      publishRightsVerified: true, evidenceRef: 'evidence://provider' },
  };
}
test('store rejects browser or absent service-role credentials before I/O', () => {
  assert.throws(() => createSocialProviderStore({ env: { SUPABASE_URL: env.SUPABASE_URL } }),
    /SOCIAL_STORE_UNCONFIGURED/);
  assert.throws(() => createSocialProviderStore({ env: { ...env, SUPABASE_URL: 'http://localhost/' } }),
    /SOCIAL_STORE_UNCONFIGURED/);
});

test('OAuth state stored hashed and atomically consumed before exchange', async () => {
  let stored; const calls = [];
  const store = createSocialProviderStore({ env, fetchImpl: async (url, init) => {
    const endpoint = new URL(url).pathname, body = JSON.parse(init.body);
    calls.push({ endpoint, body });
    if (endpoint.endsWith('oauth_states')) {
      stored = body;
      return response(null, 201);
    }
    assert.equal(body.p_state_hash, stored.state_token);
    return response({ ...stored, used_at: '2026-10-08T10:00:01Z' });
  } });
  const issued = await store.beginOAuth({ userId: USER, channel: 'X', redirectUri: CALLBACK,
    allowedRedirectUris: [CALLBACK], codeVerifier: 'v'.repeat(43), now });
  assert.equal(stored.state_token, createHash('sha256').update(issued.state).digest('hex'));
  assert.ok(!JSON.stringify(calls).includes(issued.state));
  let exchanges = 0;
  const result = await store.consumeOAuthCallback({ userId: USER, channel: 'X',
    redirectUri: CALLBACK, allowedRedirectUris: [CALLBACK], state: issued.state,
    code: 'code', exchangeCode: async ({ codeVerifier }) => {
      assert.equal(codeVerifier, 'v'.repeat(43)); exchanges++;
    } });
  assert.equal(result.consumed, true);
  assert.equal(exchanges, 1);
  assert.equal(calls[1].endpoint, '/rest/v1/rpc/capital_social_consume_oauth_state');
});

test('replayed OAuth RPC failure never reaches code exchange', async () => {
  let exchanges = 0;
  const store = createSocialProviderStore({ env, fetchImpl: async () => response({ error: 'replayed' }, 409) });
  await assert.rejects(store.consumeOAuthCallback({ userId: USER,
    channel: 'YOUTUBE', redirectUri: CALLBACK, allowedRedirectUris: [CALLBACK],
    state: 'a'.repeat(43), code: 'code', exchangeCode: async () => { exchanges++; },
  }), /SOCIAL_STORE_RPC_FAILED/);
  assert.equal(exchanges, 0);
});

test('database reservation exact-match and invalid hash never call RPC', async () => {
  const input = fixture(); let calls = 0;
  const store = createSocialProviderStore({ env, fetchImpl: async (url, init) => {
    calls++;
    assert.match(String(url), /capital_social_claim_delivery$/);
    assert.equal(JSON.parse(init.body).p_asset_sha256, assetSha);
    return response({ id: JOB, user_id: USER, account_id: ACCOUNT, platform: 'youtube',
      delivery_key: deliveryKey, approval_ref: 'approval-1', asset_sha256: assetSha,
      status: 'CLAIMED', expires_at: '2026-10-08T10:05:00Z' });
  } });
  const plan = await store.claimDelivery(input);
  assert.equal(plan.jobId, JOB);
  assert.ok(!JSON.stringify(plan).includes('REDACTED_CIPHER'));
  await assert.rejects(store.claimDelivery({
    ...input, approvalRow: { ...input.approvalRow, asset_sha256: 'f'.repeat(64) },
  }), /SOCIAL_STORE_APPROVAL_INVALID/);
  assert.equal(calls, 1);
});

test('unknown provider state is not logged; verified published is completed once', async () => {
  const input = fixture(), calls = [];
  const store = createSocialProviderStore({ env, fetchImpl: async (url, init) => {
    const endpoint = new URL(url).pathname, body = JSON.parse(init.body);
    calls.push({ endpoint, body });
    if (endpoint.endsWith('claim_delivery')) return response({ id: JOB,
      user_id: USER, account_id: ACCOUNT, platform: 'youtube',
      delivery_key: deliveryKey, approval_ref: 'approval-1', asset_sha256: assetSha,
      status: 'CLAIMED', expires_at: '2026-10-08T10:05:00Z' });
    return response({ id: JOB, user_id: USER, status: 'PUBLISHED', publish_log_id: LOG });
  } });
  const plan = await store.claimDelivery(input);
  await assert.rejects(store.completeDelivery({ plan, readback: {
    channel: 'YOUTUBE', deliveryKey, status: 'PROCESSING',
  } }), /SOCIAL_STORE_TERMINAL_READBACK_REQUIRED/);
  assert.equal(calls.length, 1);
  const finished = await store.completeDelivery({ plan, readback: {
    channel: 'YOUTUBE', deliveryKey, status: 'VERIFIED_PUBLISHED',
    providerDeliveryId: 'video-123',
    publishedUrl: 'https://www.youtube.com/watch?v=video-123',
    verifiedBy: 'PROVIDER_READBACK', evidenceRef: 'evidence://youtube/video-123',
  } });
  assert.equal(finished.publishLogId, LOG);
  assert.equal(calls[1].body.p_terminal_state, 'PUBLISHED');
});
