import assert from 'node:assert/strict';
import test from 'node:test';
import { scryptSync } from 'node:crypto';
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
  assert.equal(stored.state_token, scryptSync(issued.state, JSON.stringify(['capital-social-oauth-state-v1', USER, 'x', CALLBACK]), 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex'));
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

test('uncertain provider receipt persists UNKNOWN, not a terminal publish log', async () => {
  let posts = 0;
  const store = createSocialProviderStore({ env, fetchImpl: async (url, init) => {
    posts++;
    assert.equal(new URL(url).pathname, '/rest/v1/rpc/capital_social_note_unknown');
    const sent = JSON.parse(init.body);
    assert.equal(sent.p_provider_delivery_id, 'receipt123');
    return response({ id: JOB, user_id: USER,
      status: 'UNKNOWN', provider_delivery_id: 'receipt123', publish_log_id: null });
  } });
  const result = await store.noteUnknownDelivery({
    plan: { jobId: JOB, userId: USER }, providerDeliveryId: 'receipt123',
    evidenceRef: 'trusted://provider/receipt',
  });
  assert.equal(result.deliveryState, 'UNKNOWN');
  assert.equal(result.providerDeliveryId, 'receipt123');
  assert.equal(posts, 1);
  await assert.rejects(store.noteUnknownDelivery({
    plan: { jobId: JOB, userId: USER }, providerDeliveryId: 'receipt123',
    evidenceRef: '',
  }), /SOCIAL_STORE_RECEIPT_REQUIRED/);
  assert.equal(posts, 1);
});


test('carousel group claim binds ordered JPEG hashes, owner, rights and editorial fingerprint', async () => {
  const hashes = ['1','2','3'].map(x => x.repeat(64));
  const ids = ['etf-1','etf-2','etf-3'];
  const fingerprint = 'f'.repeat(64);
  const carouselKey = 'ig-camp:ig-content:INSTAGRAM:CAROUSEL:' + fingerprint;
  const carouselId = 'c405dbb2-c918-4541-a0e1-840f9f5bca8f';
  const base = {
    userId: USER, now,
    accountRow: { id: ACCOUNT, user_id: USER, platform: 'instagram',status:'connected',
      scopes:['pages_show_list','instagram_basic','instagram_content_publish','pages_read_engagement'],
      external_account_id:'17800000000000001',access_token_encrypted:'SYNTHETIC',
      token_expires_at:'2026-10-08T11:00:00Z' },
    capability:{ channel:'INSTAGRAM', status:'VERIFIED', loginMethod:'FACEBOOK_LOGIN',
      apiHost:'graph.facebook.com', publishRightsVerified:true, scopesVerified:true,
      evidenceRef:'synthetic://verified' },
    manifest:{ contractVersion:'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1',
      publicationAuthority:'SOCIAL_MEDIA_ENGINE_ONLY',campaignId:'ig-camp',
      contentId:'ig-content',sourceSha,canonicalUrl:'https://capital-ai.online/learning',
      assets:ids.map((id,i)=>({assetId:id,kind:'IMAGE',mimeType:'image/jpeg',
        contentId:'ig-content',sourceSha,sha256:hashes[i]})),
      approvals:ids.map((id,i)=>({approvalRef:'carousel-a'+(i+1),assetId:id,
        assetSha256:hashes[i],approvedChannels:['INSTAGRAM'],publicPublishAllowed:true})) },
    editorialReview:{ status:'APPROVED',userId:USER,campaignId:'ig-camp',
      contentId:'ig-content',sourceSha,editorialFingerprint:fingerprint,
      evidenceRef:'synthetic://editorial' },
    handoffs:ids.map((id,i)=>({ contractVersion:'CAPITAL_AI_CONTENT_SOCIAL_PUBLISHER_ADAPTER@1',
      campaignId:'ig-camp',contentId:'ig-content',sourceSha,
      canonicalUrl:'https://capital-ai.online/learning',channel:'INSTAGRAM',
      assetId:id,assetSha256:hashes[i],approvalRef:'carousel-a'+(i+1),
      deliveryKey:'ig-camp:ig-content:'+id+':INSTAGRAM' })),
    approvalRows:ids.map((id,i)=>({id:'carousel-a'+(i+1),user_id:USER,
      status:'approved',public_publish_allowed:true,platforms:['instagram'],
      campaign_id:'ig-camp',content_id:'ig-content',source_sha:sourceSha,
      asset_id:id,asset_sha256:hashes[i]})),
    verifiedAssets:ids.map((id,i)=>({assetId:id,contentId:'ig-content',
      sourceSha,retrievedBytesSha256:hashes[i],rightsVerified:true})),
  };
  let dispatches=0;
  const store=createSocialProviderStore({env,fetchImpl:async (url,init)=>{
    dispatches++;
    assert.equal(new URL(url).pathname,'/rest/v1/rpc/capital_social_claim_carousel_group');
    const b=JSON.parse(init.body);
    assert.deepEqual(b.p_asset_ids,ids);assert.deepEqual(b.p_asset_sha256s,hashes);
    assert.deepEqual(b.p_approval_refs,['carousel-a1','carousel-a2','carousel-a3']);
    assert.equal(b.p_editorial_fingerprint,fingerprint);
    return response({id:carouselId,user_id:USER,account_id:ACCOUNT,
      campaign_id:'ig-camp',content_id:'ig-content',source_sha:sourceSha,
      editorial_fingerprint:fingerprint,delivery_key:carouselKey,status:'CLAIMED',
      expires_at:'2026-10-08T10:05:00Z',asset_ids:ids,asset_sha256s:hashes,
      approval_refs:['carousel-a1','carousel-a2','carousel-a3']});
  }});
  const row=await store.claimCarouselGroup(base);
  assert.equal(row.delivery_key,carouselKey);
  assert.equal(dispatches,1);
  for(const invalid of [
    {userId:'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101'},
    {verifiedAssets:[{...base.verifiedAssets[0],rightsVerified:false},...base.verifiedAssets.slice(1)]},
    {approvalRows:[{...base.approvalRows[0],asset_sha256:'9'.repeat(64)},...base.approvalRows.slice(1)]},
    {editorialReview:{...base.editorialReview,status:'DRAFT'}},
    {handoffs:[base.handoffs[1],base.handoffs[0],base.handoffs[2]]},
  ]) {
    await assert.rejects(store.claimCarouselGroup({...base,...invalid}));
  }
  assert.equal(dispatches,1,'no invalid review may reach the RPC');
});

test('carousel CAS and UNKNOWN use tenant-bound RPCs; replay and spoofed readbacks fail closed',async()=>{
  let calls=0;
  const id='c405dbb2-c918-4541-a0e1-840f9f5bca8f';
  const plan={userId:USER,accountId:ACCOUNT,reservationId:id,
    deliveryKey:'ig-camp:ig-content:INSTAGRAM:CAROUSEL:'+'f'.repeat(64)};
  const store=createSocialProviderStore({env,fetchImpl:async (url,init)=>{
    calls++;
    const path=new URL(url).pathname, body=JSON.parse(init.body);
    assert.equal(body.p_user_id,USER);
    assert.equal(body.p_account_id,ACCOUNT);
    assert.equal(body.p_group_id,id);
    if(path.endsWith('capital_social_begin_carousel_attempt')){
      assert.equal(body.p_delivery_key,plan.deliveryKey);
      return response({...body,id,user_id:USER,account_id:ACCOUNT,
        delivery_key:plan.deliveryKey,status:'SUBMITTING'});
    }
    assert.ok(path.endsWith('capital_social_note_carousel_unknown'));
    assert.equal(body.p_stage,'CHILD_NOT_READY');
    assert.equal(body.p_provider_delivery_id,'12345');
    return response({id,user_id:USER,account_id:ACCOUNT,
      delivery_key:plan.deliveryKey,status:'UNKNOWN',provider_delivery_id:'12345'});
  }});
  const started=await store.beginCarouselAttempt(plan);
  assert.equal(started.status,'SUBMITTING');
  const unknown=await store.noteCarouselUnknown({...plan,stage:'CHILD_NOT_READY',
    providerDeliveryId:'12345',status:'UNKNOWN'});
  assert.equal(unknown.status,'UNKNOWN');
  assert.equal(calls,2);
  await assert.rejects(store.beginCarouselAttempt({...plan,userId:'wrong'}),/CAS_PLAN_INVALID/);
  await assert.rejects(store.noteCarouselUnknown({...plan,status:'PUBLISHED',stage:'CHILD_NOT_READY',
    providerDeliveryId:'12345'}),/UNKNOWN_INVALID/);
  assert.equal(calls,2);
  const wrong=createSocialProviderStore({env,fetchImpl:async()=>response({
    id,user_id:USER,account_id:ACCOUNT,delivery_key:plan.deliveryKey,status:'CLAIMED',
  })});
  await assert.rejects(wrong.beginCarouselAttempt(plan),/CAS_READBACK_MISMATCH/);
});
