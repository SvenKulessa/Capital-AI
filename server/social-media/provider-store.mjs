// CAPITAL_AI_SOCIAL_PROVIDER_STORE@1 — server-only, not registered on HTTP routes.
import { createHash } from 'node:crypto';
import {
  assertSocialManifestHandoff, publicSocialAccountProjection,
  prepareSocialProviderDelivery, classifySocialProviderReadback,
  createSocialOAuthState, socialPlatformForChannel,
} from './provider-adapter.mjs';

const SERVICE_ROLE_KEY_PREFIX = 'sb_secret_';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assert(condition, code) { if (!condition) throw new Error(code); }
function isServiceRoleJwt(key) {
  if (!key.startsWith('eyJ')) return false;
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'service_role';
  } catch { return false; }
}
function config(env) {
  const value = env?.SUPABASE_URL;
  const key = env?.SUPABASE_SECRET_KEY || env?.SUPABASE_SERVICE_ROLE_KEY || '';
  let url;
  try { url = new URL(value); } catch { throw new Error('SOCIAL_STORE_UNCONFIGURED'); }
  assert(url.protocol === 'https:' && url.pathname === '/' && !url.search
    && !url.hash && !url.username && !url.password
    && (key.startsWith(SERVICE_ROLE_KEY_PREFIX) || isServiceRoleJwt(key)),
    'SOCIAL_STORE_UNCONFIGURED');
  return Object.freeze({ origin: url.origin, key });
}
async function decodeBoundedJson(response) {
  const body = await response.text();
  assert(body.length <= 65536, 'SOCIAL_STORE_RESPONSE_TOO_LARGE');
  try { return body ? JSON.parse(body) : null; }
  catch { throw new Error('SOCIAL_STORE_INVALID_JSON'); }
}
function safeHeaders(key) {
  const headers = { apikey: key, Accept: 'application/json', 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key;
  return headers;
}
export function createSocialProviderStore({ env = process.env, fetchImpl = fetch } = {}) {
  const cfg = config(env);
  assert(typeof fetchImpl === 'function', 'SOCIAL_STORE_FETCH_REQUIRED');

  async function request(endpoint, body, { prefer = null } = {}) {
    const headers = safeHeaders(cfg.key);
    if (prefer) headers.Prefer = prefer;
    let res;
    try {
      res = await fetchImpl(new URL(endpoint, cfg.origin), {
        method: 'POST', headers, redirect: 'error',
        body: JSON.stringify(body), signal: AbortSignal.timeout(7000),
      });
    } catch { throw new Error('SOCIAL_STORE_UNAVAILABLE'); }
    if (!res.ok) throw new Error('SOCIAL_STORE_RPC_FAILED');
    return decodeBoundedJson(res);
  }

  async function beginOAuth({ userId, channel, redirectUri, allowedRedirectUris,
    codeVerifier = null, now = Date.now() }) {
    const { state, row } = createSocialOAuthState({
      userId, channel, redirectUri, allowedRedirectUris, codeVerifier, now,
    });
    await request('/rest/v1/social_media_oauth_states', row, { prefer: 'return=minimal' });
    // The state is returned once to the OAuth redirect builder. Never log it.
    return Object.freeze({ state, expiresAt: row.expires_at });
  }

  async function consumeOAuthCallback({
    userId, channel, redirectUri, allowedRedirectUris, state, code, exchangeCode,
  }) {
    assert(UUID.test(userId), 'SOCIAL_OAUTH_TRUSTED_USER_REQUIRED');
    socialPlatformForChannel(channel);
    assert(Array.isArray(allowedRedirectUris) && allowedRedirectUris.includes(redirectUri),
      'SOCIAL_OAUTH_REDIRECT_DENIED');
    assert(typeof state === 'string' && state.length >= 40 && state.length <= 100
      && typeof code === 'string' && code.length >= 1 && code.length <= 2048,
      'SOCIAL_OAUTH_CALLBACK_INVALID');
    assert(typeof exchangeCode === 'function', 'SOCIAL_OAUTH_EXCHANGE_REQUIRED');
    const stateHash = createHash('sha256').update(state).digest('hex');
    // The database performs a single atomic UPDATE ... WHERE used_at IS NULL
    // and expires_at > now() and matches user/platform/redirect. Replay fails.
    const consumed = await request('/rest/v1/rpc/capital_social_consume_oauth_state', {
      p_state_hash: stateHash, p_user_id: userId,
      p_platform: socialPlatformForChannel(channel), p_redirect_uri: redirectUri,
    });
    assert(consumed?.user_id === userId
      && consumed?.platform === socialPlatformForChannel(channel)
      && consumed?.redirect_uri === redirectUri
      && consumed?.state_token === stateHash && consumed?.used_at,
      'SOCIAL_OAUTH_CONSUME_NOT_CONFIRMED');
    if (channel === 'X') {
      assert(typeof consumed.code_verifier === 'string'
        && consumed.code_verifier.length >= 43, 'SOCIAL_OAUTH_PKCE_MISSING');
    }
    // A provider-specific exchanger may persist encrypted tokens separately;
    // this bridge itself never handles or returns any token material.
    await exchangeCode({ channel, code, redirectUri,
      codeVerifier: consumed.code_verifier || null, userId });
    return Object.freeze({ consumed: true, platform: consumed.platform });
  }

  async function claimDelivery({
    manifest, handoff, userId, accountRow, approvalRow,
    verifiedAsset, capability, now = Date.now(),
  }) {
    const { channel, platform, asset } = assertSocialManifestHandoff(manifest, handoff);
    const account = publicSocialAccountProjection(accountRow, userId, channel, now);
    assert(approvalRow?.id === handoff.approvalRef
      && approvalRow.user_id === userId
      && approvalRow.status === 'approved'
      && approvalRow.public_publish_allowed === true
      && approvalRow.asset_id === asset.assetId
      && approvalRow.asset_sha256 === asset.sha256
      && approvalRow.campaign_id === manifest.campaignId
      && approvalRow.content_id === manifest.contentId
      && approvalRow.source_sha === manifest.sourceSha
      && approvalRow.platforms?.includes(platform),
      'SOCIAL_STORE_APPROVAL_INVALID');
    assert(verifiedAsset?.retrievedBytesSha256 === asset.sha256
      && verifiedAsset.rightsVerified === true && verifiedAsset.assetId === asset.assetId
      && verifiedAsset.contentId === manifest.contentId
      && verifiedAsset.sourceSha === manifest.sourceSha,
      'SOCIAL_STORE_ASSET_INVALID');
    assert(capability?.channel === channel && capability.status === 'VERIFIED'
      && capability.publishRightsVerified === true && capability.scopesVerified === true
      && capability.evidenceRef, 'SOCIAL_STORE_CAPABILITY_INVALID');

    const job = await request('/rest/v1/rpc/capital_social_claim_delivery', {
      p_user_id: userId,
      p_account_id: account.accountId,
      p_approval_ref: handoff.approvalRef,
      p_campaign_id: manifest.campaignId,
      p_content_id: manifest.contentId,
      p_source_sha: manifest.sourceSha,
      p_asset_id: asset.assetId,
      p_asset_sha256: asset.sha256,
      p_platform: platform,
      p_delivery_key: handoff.deliveryKey,
    });
    const reservation = {
      ...job, status: job?.status, approval_ref: job?.approval_ref,
      delivery_key: job?.delivery_key, asset_sha256: job?.asset_sha256,
    };
    // Only accept the DB readback if it matches the entire immutable plan.
    const plan = prepareSocialProviderDelivery({
      manifest, handoff, userId, accountRow,
      approvalRow, verifiedAsset, reservation, capability, now,
    });
    assert(job.account_id === account.accountId && job.platform === platform,
      'SOCIAL_STORE_JOB_MISMATCH');
    return Object.freeze({ ...plan, jobId: job.id });
  }

  async function completeDelivery({ plan, readback }) {
    assert(UUID.test(plan?.jobId ?? ''), 'SOCIAL_STORE_JOB_REQUIRED');
    const outcome = classifySocialProviderReadback(plan, readback);
    assert(['PUBLISHED', 'FAILED'].includes(outcome.deliveryState),
      'SOCIAL_STORE_TERMINAL_READBACK_REQUIRED');
    const job = await request('/rest/v1/rpc/capital_social_complete_delivery', {
      p_user_id: plan.userId, p_job_id: plan.jobId,
      p_terminal_state: outcome.deliveryState,
      p_provider_delivery_id: outcome.providerDeliveryId,
      p_published_url: outcome.deliveryState === 'PUBLISHED' ? outcome.publishedUrl : null,
      p_evidence_ref: outcome.evidenceRef,
    });
    assert(job?.id === plan.jobId && job?.user_id === plan.userId
      && job?.status === outcome.deliveryState && job?.publish_log_id,
      'SOCIAL_STORE_COMPLETION_NOT_CONFIRMED');
    return Object.freeze({
      deliveryState: job.status, providerDeliveryId: outcome.providerDeliveryId,
      publishLogId: job.publish_log_id,
    });
  }

  return Object.freeze({ beginOAuth, consumeOAuthCallback, claimDelivery, completeDelivery });
}
