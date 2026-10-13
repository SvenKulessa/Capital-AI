// @ts-nocheck -- Deno Edge runtime is isolated from the Vite/browser TypeScript project.
// Runtime authorisation is covered by dedicated Edge/owner security tests.
// CAPITAL_AI_X_EDGE_VAULT@1
// Owner-only JWT-authenticated bridge. The service-role credential never leaves
// Supabase; public visitors and unprivileged users cannot execute any operation.
// Deploy with verify_jwt=true. No CORS and no public publishing endpoint.
const CALLBACK = 'https://capital-ai.online/api/social-media/auth/callback';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
const XID = /^[0-9]{1,25}$/;
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const CIPHER = /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{14,11000}$/;
const SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
function reply(status, body) { return new Response(JSON.stringify(body), { status, headers: HEADERS }); }
function abortUnless(test) { if (!test) throw Error('SOCIAL_X_EDGE_DENIED'); }
function secretValue(env, key, legacy, collection) {
  const direct = env.get(key) || env.get(legacy);
  if (direct) return direct;
  try {
    const map = JSON.parse(env.get(collection) || '{}');
    return typeof map.default === 'string' ? map.default : '';
  } catch { return ''; }
}
function serviceKeys(env) {
  const origin = new URL(env.get('SUPABASE_URL') || '');
  abortUnless(origin.protocol === 'https:' && origin.pathname === '/'
    && !origin.search && !origin.hash && !origin.username && !origin.password);
  const pub = secretValue(env, 'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
  const admin = secretValue(env, 'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY', 'SUPABASE_SECRET_KEYS');
  abortUnless(pub.length > 12 && admin.length > 20
    && (admin.startsWith('sb_secret_') || admin.startsWith('eyJ')));
  return { origin: origin.origin, pub, admin };
}
async function jsonFetch(fetchImpl, url, options, limit = 32768) {
  const response = await fetchImpl(url, { ...options, redirect: 'error',
    signal: AbortSignal.timeout(7000) });
  abortUnless(response.ok);
  const body = await response.text();
  abortUnless(body.length <= limit);
  return body ? JSON.parse(body) : null;
}
function adminHeaders(key, options = {}) {
  return { apikey: key, ...(key.startsWith('eyJ')
    ? { Authorization: 'Bearer ' + key } : {}), Accept: 'application/json',
    'Content-Type': 'application/json', ...options };
}
// A stolen owner JWT alone cannot create X accounts or consume OAuth state.
// Require a separately provisioned 256-bit shared workload secret in both
// Render and the Supabase Edge Function; authenticate exact bytes and user JWT.
async function verifyWorkload(env, req, jwt, raw) {
  const key = env.get('SOCIAL_X_EDGE_WORKLOAD_SECRET');
  let bytes = null;
  if (typeof key === 'string' && /^[a-fA-F0-9]{64}$/.test(key)) {
    bytes = new Uint8Array(key.match(/.{2}/g).map(x => parseInt(x, 16)));
  } else if (typeof key === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(key)) {
    const value = atob(key);
    if (value.length === 32 && btoa(value) === key) {
      bytes = Uint8Array.from(value, char => char.charCodeAt(0));
    }
  }
  abortUnless(bytes?.length === 32);
  const timestamp = req.headers.get('x-capital-edge-timestamp') || '';
  const signature = req.headers.get('x-capital-edge-signature') || '';
  abortUnless(/^\d{13}$/.test(timestamp) && /^[a-f0-9]{64}$/.test(signature)
    && Math.abs(Date.now() - Number(timestamp)) <= 60_000);
  const macKey = await crypto.subtle.importKey('raw', bytes,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const mac = new Uint8Array(signature.match(/.{2}/g).map(x => parseInt(x, 16)));
  const signed = new TextEncoder().encode(timestamp + '\n' + jwt + '\n' + raw);
  abortUnless(await crypto.subtle.verify('HMAC', macKey, mac, signed));
}

async function verifyOwner(fetchImpl, keys, jwt) {
  abortUnless(typeof jwt === 'string' && jwt.length > 50 && jwt.length < 8192);
  const headers = { apikey: keys.pub, Authorization: 'Bearer ' + jwt,
    Accept: 'application/json' };
  const user = await jsonFetch(fetchImpl,
    keys.origin + '/auth/v1/user', { method: 'GET', headers }, 8192);
  abortUnless(UUID.test(user?.id || '') && user?.email_confirmed_at);
  const profileUrl = new URL('/rest/v1/profiles', keys.origin);
  profileUrl.searchParams.set('id', 'eq.' + user.id);
  profileUrl.searchParams.set('select', 'id,iam_role');
  profileUrl.searchParams.set('limit', '1');
  const profiles = await jsonFetch(fetchImpl, profileUrl, { method: 'GET', headers }, 2048);
  abortUnless(Array.isArray(profiles) && profiles.length === 1
    && profiles[0]?.id === user.id && profiles[0]?.iam_role === 'owner');
  return user.id;
}
function bodyValidation(operation, value, uid) {
  abortUnless(value && typeof value === 'object' && !Array.isArray(value)
    && value.userId === uid && value.operation === operation);
}
async function execute(fetchImpl, keys, userId, input) {
  const operation = input?.operation;
  bodyValidation(operation, input, userId);
  const channel = input.channel ?? 'X';
  abortUnless(['X', 'YOUTUBE'].includes(channel));
  const platform = channel.toLowerCase();
  const scopes = channel === 'X' ? SCOPES
    : ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'];
  const validId = value => channel === 'X' ? XID.test(value || '') : /^UC[A-Za-z0-9_-]{22}$/.test(value || '');
  const validHandle = value => channel === 'X' ? HANDLE.test(value || '')
    : typeof value === 'string' && value.length > 0 && value.length <= 140;
  if (operation === 'begin') {
    abortUnless(SHA256.test(input.stateHash || '')
      && VERIFIER.test(input.codeVerifier || '') && input.redirectUri === CALLBACK);
    const row = { state_token: input.stateHash, user_id: userId, platform,
      redirect_uri: CALLBACK, code_verifier: input.codeVerifier,
      expires_at: new Date(Date.now() + 600000).toISOString() };
    await jsonFetch(fetchImpl, keys.origin + '/rest/v1/social_media_oauth_states',
      { method: 'POST', headers: adminHeaders(keys.admin, { Prefer: 'return=minimal' }),
        body: JSON.stringify(row) }, 4096);
    return { prepared: true };
  }
  if (operation === 'consume') {
    abortUnless(SHA256.test(input.stateHash || '') && input.redirectUri === CALLBACK);
    const result = await jsonFetch(fetchImpl,
      keys.origin + '/rest/v1/rpc/capital_social_consume_oauth_state',
      { method: 'POST', headers: adminHeaders(keys.admin),
        body: JSON.stringify({ p_state_hash: input.stateHash, p_user_id: userId,
          p_platform: platform, p_redirect_uri: CALLBACK }) });
    abortUnless(result?.user_id === userId && result?.platform === platform
      && result?.state_token === input.stateHash && result?.redirect_uri === CALLBACK
      && result?.used_at && VERIFIER.test(result?.code_verifier || ''));
    // Verifier is returned only to a freshly reauthenticated owner over TLS,
    // after the state was atomically consumed. It is never logged.
    return { consumed: true, codeVerifier: result.code_verifier };
  }
  if (operation === 'persist') {
    const account = input.account;
    abortUnless(account && typeof account === 'object' && !Array.isArray(account)
      && validId(account.external_account_id)
      && validHandle(account.handle)
      && CIPHER.test(account.access_token_encrypted || '')
      && CIPHER.test(account.refresh_token_encrypted || '')
      && typeof account.account_name === 'string'
      && account.account_name.length > 0 && account.account_name.length <= 140
      && typeof account.token_expires_at === 'string'
      && Date.parse(account.token_expires_at) > Date.now() + 60000
      && Date.parse(account.token_expires_at) < Date.now() + 86400000
      && Array.isArray(account.scopes)
      && account.scopes.length === scopes.length
      && scopes.every(x => account.scopes.includes(x)));
    const row = {
      user_id: userId, platform, status: 'connected',
      external_account_id: account.external_account_id, handle: account.handle,
      account_name: account.account_name, scopes,
      access_token_encrypted: account.access_token_encrypted,
      refresh_token_encrypted: account.refresh_token_encrypted,
      token_expires_at: account.token_expires_at, connected_at: new Date().toISOString(),
      refresh_lease_id: null, refresh_lease_until: null,
      refresh_retry_after: null, refresh_reconnect_required: false,
    };
    const target = keys.origin
      + '/rest/v1/social_media_accounts?on_conflict=user_id%2Cplatform';
    const rows = await jsonFetch(fetchImpl, target, {
      method: 'POST',
      headers: adminHeaders(keys.admin,
        { Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(row),
    });
    abortUnless(Array.isArray(rows) && rows.length === 1
      && rows[0]?.user_id === userId && rows[0]?.platform === platform
      && rows[0]?.external_account_id === row.external_account_id
      && rows[0]?.handle === row.handle && rows[0]?.status === 'connected'
      && rows[0]?.access_token_encrypted === row.access_token_encrypted
      && rows[0]?.refresh_token_encrypted === row.refresh_token_encrypted);
    return { connected: true, accountId: row.external_account_id, handle: row.handle };
  }
  if (operation === 'refresh_claim') {
    abortUnless(UUID.test(input.leaseId || ''));
    const row = await jsonFetch(fetchImpl,
      keys.origin + '/rest/v1/rpc/capital_social_claim_token_refresh',
      { method: 'POST', headers: adminHeaders(keys.admin),
        body: JSON.stringify({ p_user_id: userId, p_platform: platform,
          p_lease_id: input.leaseId }) });
    abortUnless(row?.user_id === userId && row?.platform === platform
      && row?.refresh_lease_id === input.leaseId
      && validId(row?.external_account_id) && validHandle(row?.handle)
      && CIPHER.test(row?.refresh_token_encrypted || '')
      && scopes.every(x => Array.isArray(row?.scopes) && row.scopes.includes(x)));
    // Only signed owner workload can receive this sealed refresh credential.
    // This response must never be forwarded by Render to a browser.
    return { claimed: true, leaseId: input.leaseId,
      refreshCipher: row.refresh_token_encrypted,
      accountId: row.external_account_id, handle: row.handle, scopes };
  }
  if (operation === 'refresh_finish') {
    abortUnless(UUID.test(input.leaseId || '')
      && CIPHER.test(input.previousCipher || '')
      && CIPHER.test(input.accessCipher || '')
      && CIPHER.test(input.refreshCipher || '')
      && typeof input.expiresAt === 'string'
      && Date.parse(input.expiresAt) > Date.now() + 60000
      && Date.parse(input.expiresAt) < Date.now() + 86400000);
    const row = await jsonFetch(fetchImpl,
      keys.origin + '/rest/v1/rpc/capital_social_finish_token_refresh',
      { method: 'POST', headers: adminHeaders(keys.admin),
        body: JSON.stringify({ p_user_id: userId, p_platform: platform,
          p_lease_id: input.leaseId, p_previous_cipher: input.previousCipher,
          p_access_cipher: input.accessCipher, p_refresh_cipher: input.refreshCipher,
          p_expires_at: input.expiresAt }) });
    abortUnless(row?.user_id === userId && row?.platform === platform
      && row?.status === 'connected' && row?.refresh_lease_id === null
      && row?.access_token_encrypted === input.accessCipher
      && row?.refresh_token_encrypted === input.refreshCipher);
    return { refreshed: true, channel, expiresAt: row.token_expires_at };
  }
  if (operation === 'refresh_end') {
    abortUnless(UUID.test(input.leaseId || '')
      && ['reconnect','rate_limited'].includes(input.outcome));
    const row = await jsonFetch(fetchImpl,
      keys.origin + '/rest/v1/rpc/capital_social_end_token_refresh',
      { method: 'POST', headers: adminHeaders(keys.admin),
        body: JSON.stringify({ p_user_id: userId, p_platform: platform,
          p_lease_id: input.leaseId, p_outcome: input.outcome }) });
    abortUnless(row?.user_id === userId && row?.platform === platform
      && row?.refresh_lease_id === null
      && (input.outcome === 'reconnect'
        ? row.refresh_reconnect_required === true && row.status === 'token_expired'
        : row.refresh_retry_after != null));
    return { channel, status: input.outcome === 'reconnect'
      ? 'reconnect_required' : 'retry_later' };
  }
  if (operation === 'status') {
    const target = new URL('/rest/v1/social_media_accounts', keys.origin);
    target.searchParams.set('user_id', 'eq.' + userId);
    target.searchParams.set('platform', 'eq.' + platform);
    target.searchParams.set('select',
      'status,platform,external_account_id,handle,scopes,token_expires_at,connected_at,refresh_reconnect_required,refresh_retry_after');
    target.searchParams.set('limit', '1');
    const rows = await jsonFetch(fetchImpl, target,
      { method: 'GET', headers: adminHeaders(keys.admin) }, 4096);
    abortUnless(Array.isArray(rows) && rows.length <= 1);
    const row = rows[0] || null;
    abortUnless(!row || (row.platform === platform
      && validId(row.external_account_id) && validHandle(row.handle)));
    const scopesOk = scopes.every(x => Array.isArray(row?.scopes) && row.scopes.includes(x));
    const valid = Number.isFinite(Date.parse(row?.token_expires_at || ''))
      && Date.parse(row?.token_expires_at || '') > Date.now() + 60000;
    const reconnect = row?.refresh_reconnect_required === true;
    const throttled = Date.parse(row?.refresh_retry_after || '') > Date.now();
    const connected = Boolean(row?.status === 'connected' && scopesOk && valid && !reconnect);
    return { channel, connected,
      status: reconnect ? 'reconnect_required' : connected ? 'connected'
        : throttled ? 'retry_later' : row?.status === 'connected'
          ? (scopesOk ? 'token_expired' : 'permissions_missing')
          : (row?.status || 'not_connected'),
      handle: row ? (channel === 'X' ? '@' + row.handle : row.handle) : null,
      accountId: row?.external_account_id || null,
      scopes: connected ? scopes : [],
      expiresAt: connected ? row.token_expires_at : null };
  }
  throw Error('SOCIAL_X_EDGE_UNSUPPORTED_OPERATION');
}

export function createHandler({ env = typeof Deno === 'undefined' ? null : Deno.env,
  fetchImpl = fetch } = {}) {
  return async function handler(req) {
    if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
    if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
      return reply(415, { error: 'unsupported_media_type' });
    const jwt = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(req.headers.get('authorization') || '')?.[1];
    if (!jwt) return reply(401, { error: 'authentication_required' });
    try {
      abortUnless(env && typeof env.get === 'function');
      // Check the signed workload attestation before contacting Auth or DB.
      const raw = await req.text();
      abortUnless(raw.length > 0 && raw.length <= 32768);
      await verifyWorkload(env, req, jwt, raw);
      const keys = serviceKeys(env);
      const userId = await verifyOwner(fetchImpl, keys, jwt);
      const input = JSON.parse(raw);
      const result = await execute(fetchImpl, keys, userId, input);
      return reply(200, result);
    } catch {
      // Never leak token material, admin keys, verifier, SQL errors or account data.
      return reply(503, { error: 'social_x_edge_operation_unavailable' });
    }
  };
}
if (typeof Deno !== 'undefined') Deno.serve(createHandler());
