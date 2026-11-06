import { createLimiter } from '../http-security.mjs';
import { youtubeOAuthConfig } from './youtube-oauth-exchange.mjs';
import { YOUTUBE_POLICY, youtubePolicyHtml } from '../../shared/youtube-privacy.mjs';
import { createYouTubeVaultAccess, unsealYouTubeToken, createYouTubeTokenResolver } from './youtube-token-resolver.mjs';
import { createSocialXEdgeClient, socialXEdgeMode } from './x-edge-client.mjs';
// CAPITAL_AI_SOCIAL_YOUTUBE_ACCOUNT_STATUS@1 — read-only owner-bound connection status.
// Never select or return encrypted access/refresh tokens.
import { socialYouTubeOAuthConfigured } from './youtube-oauth-exchange.mjs';
const DISCONNECT = '/api/social-media/youtube/account/disconnect';
const PATH = '/api/social-media/youtube/account/status';
const CONNECT = '/api/social-media/youtube/account/connect';
const DIAGNOSTICS = '/api/social-media/youtube/account/diagnostics';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS = 'status,platform,external_account_id,handle,scopes,token_expires_at,connected_at';
function jsonError(json, res, code, message) {
  json(res, code, { error: message });
}
function serviceRoleJwt(s) {
  if (!s.startsWith('eyJ') || s.split('.').length !== 3) return false;
  try { return JSON.parse(Buffer.from(s.split('.')[1], 'base64url')).role === 'service_role'; }
  catch { return false; }
}
function config(env) {
  const key = env?.SUPABASE_SECRET_KEY || env?.SUPABASE_SERVICE_ROLE_KEY || '';
  const origin = new URL(env?.SUPABASE_URL);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search
    || origin.hash || origin.username || origin.password
    || !(key.startsWith('sb_secret_') || serviceRoleJwt(key))) throw Error();
  return { origin: origin.origin, key };
}
// No secret, key length, value, or token is ever returned. These checks reflect
// the exact fail-closed prerequisites of X OAuth's providerConfig and Edge transport.
function isHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname === '/' && !url.search
      && !url.hash && !url.username && !url.password;
  } catch { return false; }
}
function isRandom256Bit(value) {
  if (typeof value !== 'string') return false;
  if (/^[a-fA-F0-9]{64}$/.test(value)) return true;
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.length === 32 && bytes.toString('base64') === value;
}
function isAdminServiceKey(value) {
  if (typeof value !== 'string') return false;
  return value.startsWith('sb_secret_') || serviceRoleJwt(value);
}
function ownerOnlyDiagnostics(env) {
  const edgeMode = socialXEdgeMode(env);
  const pub = env?.SUPABASE_PUBLISHABLE_KEY || env?.VITE_SUPABASE_PUBLISHABLE_KEY
    || env?.SUPABASE_ANON_KEY;
  const clientId = env?.SOCIAL_YOUTUBE_OAUTH_CLIENT_ID || env?.YOUTUBE_CLIENT_ID;
  const clientSecret = env?.SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET || env?.YOUTUBE_CLIENT_SECRET;
  const checks = Object.freeze({
    oauthConnectEnabled: env?.SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED === 'true',
    oauthCallbackEnabled: env?.SOCIAL_OAUTH_CALLBACK_ENABLED === 'true',
    appOrigin: isHttpsOrigin(env?.PUBLIC_APP_ORIGIN),
    youtubeClientId: typeof clientId === 'string' && clientId.length <= 256
      && /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId),
    youtubeClientSecret: typeof clientSecret === 'string' && clientSecret.length >= 8
      && clientSecret.length <= 2048,
    tokenEncryptionKey: isRandom256Bit(env?.SOCIAL_YOUTUBE_TOKEN_ENCRYPTION_KEY),
    supabaseUrl: isHttpsOrigin(env?.SUPABASE_URL),
    supabaseCredential: edgeMode
      ? typeof pub === 'string' && pub.length > 12
      : isAdminServiceKey(env?.SUPABASE_SECRET_KEY || env?.SUPABASE_SERVICE_ROLE_KEY),
    edgeWorkloadKey: !edgeMode || isRandom256Bit(env?.SOCIAL_X_EDGE_WORKLOAD_SECRET),
  });
  // The actual OAuth validator remains authoritative; the workload check
  // covers the subsequent Edge client prerequisite before any network call.
  return Object.freeze({
    schema: 'CAPITAL_SOCIAL_YOUTUBE_OWNER_DIAGNOSTICS@1',
    mode: edgeMode ? 'EDGE' : 'LEGACY',
    ready: socialYouTubeOAuthConfigured(env) && Object.values(checks).every(Boolean),
    checks,
  });
}

export function createSocialYouTubeAccountStatus({ env = process.env, auth, fetchImpl = fetch, vaultFactory = createYouTubeVaultAccess } = {}) {
  const revokeLimit = createLimiter(10, 3600000);
  async function handle(req, res, url, json) {
    if (![PATH, DIAGNOSTICS, CONNECT, DISCONNECT].includes(url.pathname)) return false;
    const diagnostics = url.pathname === DIAGNOSTICS;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const disconnect = url.pathname === DISCONNECT;
    const englishConnect = url.pathname === CONNECT && url.searchParams.get('hl') === 'en'
      && url.searchParams.getAll('hl').length === 1 && [...url.searchParams.keys()].every(key => key === 'hl');
    if ((url.search && !englishConnect) || req.method !== (disconnect ? 'POST' : 'GET')) {
      res.setHeader('Allow', disconnect ? 'POST' : 'GET');
      jsonError(json, res, 405, 'method_not_allowed');
      return true;
    }
    if (!diagnostics && !disconnect && env.SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED !== 'true') {
      jsonError(json, res, 503, 'social_youtube_account_unavailable');
      return true;
    }
    const identity = await auth?.verify?.(req, res);
    if (!ID.test(identity?.userId || '') || identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      jsonError(json, res, diagnostics ? 404 : 403,
        diagnostics ? 'not_found' : 'owner_authorization_required');
      return true;
    }
    if (disconnect) {
      if (auth?.sameOrigin?.(req) !== true || req.headers?.['sec-fetch-site'] !== 'same-origin'
        || req.headers?.['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') {
        jsonError(json, res, 403, 'same_origin_required'); return true;
      }
      if (!revokeLimit(identity.userId)) { jsonError(json, res, 429, 'rate_limited'); return true; }
      let input = '';
      try {
        for await (const chunk of req) { input += chunk; if (input.length > 256) throw Error(); }
        if (input !== 'confirm=delete-youtube-data') throw Error();
      } catch { jsonError(json, res, 400, 'explicit_confirmation_required'); return true; }
      try {
        // Revocation stays available when new connections/callbacks are disabled.
        const cleanupEnv = { ...env, SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED: 'true', SOCIAL_OAUTH_CALLBACK_ENABLED: 'true' };
        const cfg = youtubeOAuthConfig(cleanupEnv);
        const vault = vaultFactory({ env: cleanupEnv, fetchImpl,
          userAccessToken: await auth?.internalAccessToken?.(req, res) });
        const grant = await vault.invoke('privacy_begin', { userId: identity.userId });
        if (grant?.userId !== identity.userId) throw Error();
        if (grant.refreshCipher || grant.accessCipher) {
          const kind = grant.refreshCipher ? 'refresh' : 'access';
          const token = unsealYouTubeToken(grant.refreshCipher || grant.accessCipher, cfg.key, identity.userId, kind);
          const revoked = await fetchImpl('https://oauth2.googleapis.com/revoke', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token }).toString(), redirect: 'error', signal: AbortSignal.timeout(15000),
          });
          // Google reports an already invalid/revoked token as invalid_token (400).
          if (!revoked.ok) {
            const text = await revoked.text();
            if (text.length > 4096 || revoked.status !== 400 || JSON.parse(text)?.error !== 'invalid_token') throw Error();
          }
        }
        const done = await vault.invoke('privacy_finish', { userId: identity.userId });
        if (done?.deleted !== true || done.userId !== identity.userId) throw Error();
        json(res, 200, { status: 'DISCONNECTED_AND_DELETED', googleAccessRevoked: Boolean(grant.refreshCipher || grant.accessCipher),
          applicationYouTubeDataDeleted: true, youtubeVideosDeleted: false });
      } catch {
        json(res, 503, { error: 'youtube_revocation_or_cleanup_pending', completed: false,
          message: 'Widerruf oder Löschung noch nicht bestätigt. Vorgang erneut ausführen oder Datenschutzkontakt nutzen.' });
      }
      return true;
    }
    if (url.pathname === CONNECT) {
      const englishConsent = url.searchParams.get('hl') === 'en';
      const copy = englishConsent ? {
        title: 'Connect YouTube to CAPITAL AI',
        intro: 'Select the Google account and YouTube channel you want to use with CAPITAL AI. Connecting does not publish a video.',
        recording: 'For your Google verification recording: ', noUpload: ' No video is uploaded by this step.',
        acceptance: 'I accept the privacy information and YouTube Terms of Service for this feature.',
        connect: 'Open Google consent in English', status: 'Check connection', privacy: 'Privacy policy (German)', terms: 'Terms (German)',
        deletion: 'This revokes the Google authorization and deletes YouTube data stored by CAPITAL-AI. Your videos remain on YouTube.',
        confirmDelete: 'Delete connection and stored YouTube data', delete: 'Delete connection',
      } : {
        title: 'YouTube mit CAPITAL AI verbinden',
        intro: 'Wähle bei Google das Konto und den Kanal, die du für CAPITAL AI verwenden möchtest. Diese Verbindung veröffentlicht noch kein Video.',
        recording: 'Für die ergänzende Google-Prüfaufnahme: ', noUpload: ' Es wird kein Video hochgeladen.',
        acceptance: 'Ich akzeptiere die Datenschutzhinweise und die YouTube-Nutzungsbedingungen für diese Funktion.',
        connect: 'Mit Google verbinden', status: 'Verbindung prüfen', privacy: 'Datenschutz', terms: 'AGB',
        deletion: 'Widerruft die Google-Berechtigung und löscht gespeicherte YouTube-Daten bei CAPITAL-AI. Deine Videos bleiben auf YouTube erhalten.',
        confirmDelete: 'Verbindung und gespeicherte YouTube-Daten löschen', delete: 'Löschung ausführen',
      };
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Content-Language': englishConsent ? 'en' : 'de' });
      res.end(`<!doctype html><html lang="${englishConsent ? 'en' : 'de'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${copy.title} | CAPITAL AI</title><style>body{margin:0;background:#080e20;color:#f3f4f8;font:1rem/1.6 system-ui,sans-serif}main{max-width:52rem;margin:auto;padding:1.25rem;overflow-wrap:anywhere}a{color:#ffdc73}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #ffdc73;outline-offset:4px}button{min-height:44px;max-width:100%;font:inherit;padding:.65rem 1rem;margin:.8rem 0;white-space:normal;cursor:pointer}label{display:block;padding:.6rem 0}input[type=checkbox]{width:1.25rem;height:1.25rem;vertical-align:middle}form{border-top:1px solid #7d879a;padding-top:1rem;margin-top:1.5rem}h1{line-height:1.2}</style><body><main><h1>${copy.title}</h1><p>${copy.intro}</p>${youtubePolicyHtml(englishConsent ? 'en' : 'de')}<p>${copy.recording}<a href="/api/social-media/youtube/account/connect?hl=en" lang="en">Record Google consent in English</a>.${copy.noUpload}</p><form action="/api/social-media/youtube/auth/start" method="get">${englishConsent ? '<input type="hidden" name="hl" value="en">' : ''}<label><input type="checkbox" name="privacy" value="${YOUTUBE_POLICY.version}" required> ${copy.acceptance}</label><button type="submit">${copy.connect}</button></form><p><a href="/api/social-media/youtube/account/status">${copy.status}</a></p><p><a href="/datenschutz/">${copy.privacy}</a> · <a href="/agb/">${copy.terms}</a></p><form action="/api/social-media/youtube/account/disconnect" method="post"><p>${copy.deletion}</p><label><input type="checkbox" name="confirm" value="delete-youtube-data" required> ${copy.confirmDelete}</label><button type="submit">${copy.delete}</button></form></main></body></html>`);
      return true;
    }
    if (diagnostics) {
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('Vary', 'Cookie');
      json(res, 200, ownerOnlyDiagnostics(env));
      return true;
    }
    try {
      await createYouTubeTokenResolver({ env, fetchImpl })({ userId: identity.userId,
        userAccessToken: await auth?.internalAccessToken?.(req, res) });
      if (socialXEdgeMode(env)) {
        const edge = createSocialXEdgeClient({ env, fetchImpl, channel: 'YOUTUBE',
          userAccessToken: await auth?.internalAccessToken?.(req, res) });
        json(res, 200, await edge.status(identity.userId));
        return true;
      }
      const cfg = config(env);
      const target = new URL('/rest/v1/social_media_accounts', cfg.origin);
      target.searchParams.set('user_id', 'eq.' + identity.userId);
      target.searchParams.set('platform', 'eq.youtube');
      target.searchParams.set('select', FIELDS);
      target.searchParams.set('limit', '1');
      const headers = { apikey: cfg.key, Accept: 'application/json' };
      if (cfg.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + cfg.key;
      const response = await fetchImpl(target, {
        method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw Error();
      const body = await response.text();
      if (body.length > 8192) throw Error();
      const data = JSON.parse(body);
      if (!Array.isArray(data) || data.length > 1) throw Error();
      const row = data[0];
      if (row && (row.platform !== 'youtube'
        || typeof row.external_account_id !== 'string'
        || !/^UC[A-Za-z0-9_-]{22}$/.test(row.external_account_id)
        || (typeof row.handle !== 'string' || row.handle.length > 140))) throw Error();
      const expiresAt = Date.parse(row?.token_expires_at || '');
      const requiredScopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'];
      const permissionsComplete = Array.isArray(row?.scopes)
        && requiredScopes.every(scope => row.scopes.includes(scope));
      const tokenValid = Number.isFinite(expiresAt) && expiresAt > Date.now() + 60000;
      const connected = row?.status === 'connected' && permissionsComplete && tokenValid;
      json(res, 200, {
        channel: 'YOUTUBE', connected,
        status: connected ? 'connected'
          : (row?.status === 'connected'
            ? (permissionsComplete ? 'token_expired' : 'permissions_missing')
            : (row?.status || 'not_connected')),
        handle: row ? row.handle : null,
        accountId: row?.external_account_id || null,
        scopes: connected && Array.isArray(row.scopes)
          ? row.scopes.filter(x => ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'].includes(x))
          : [],
        expiresAt: connected ? row.token_expires_at : null,
      });
    } catch {
      jsonError(json, res, 503, 'social_youtube_account_unavailable');
    }
    return true;
  }
  return Object.freeze({ handle });
}
