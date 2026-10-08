import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { secureUrl, boundedJson, createLimiter } from './http-security.mjs';
import { createAuthSecurity, hasVerifiedTotpFactor } from './auth-security.mjs';
import { normalizeStoredPaidTier } from './subscription-entitlements.mjs';

const SESSION_COUNT_COOKIE = '__Host-capital_session_count';
const SESSION_COOKIE_PREFIX = '__Host-capital_session_';
const PKCE_COOKIE = '__Host-capital_pkce';
const SESSION_CHUNK_SIZE = 2800;
const MAX_SESSION_CHUNKS = 8;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PKCE_MAX_AGE_SECONDS = 60 * 10;
const MAX_BODY_BYTES = 16 * 1024;

const random = () => randomBytes(32).toString('base64url');
const encode = value => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
const decode = value => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

function cookie(name, value, age, sameSite = 'Lax') {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${Math.max(0, Math.floor(age))}`;
}

function cookieValues(req) {
  const result = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    try {
      result[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      result[key] = part.slice(index + 1).trim();
    }
  }
  return result;
}

function appendCookie(res, value) {
  const current = res.getHeader('Set-Cookie');
  const values = Array.isArray(current) ? current : current ? [current] : [];
  res.setHeader('Set-Cookie', [...values, value]);
}

function clearCookie(res, name) {
  appendCookie(res, cookie(name, '', 0));
}

function normalizePath(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('\\') || value.includes('\0')) return fallback;
  return value.slice(0, 256);
}

function normalizeMarketplaceAuthNext(value) {
  const path = normalizePath(value, '/');
  if (path === '/') return '/';
  try {
    const parsed = new URL(path, 'https://capital-ai.invalid');
    if (parsed.origin !== 'https://capital-ai.invalid') return '/';
    if (parsed.pathname !== '/api/cads/marketplace/setup') return '/';
    const installationId = Number(parsed.searchParams.get('installation_id'));
    if (!Number.isSafeInteger(installationId) || installationId <= 0) return '/';
    return '/api/cads/marketplace/setup?installation_id=' + encodeURIComponent(String(installationId));
  } catch {
    return '/';
  }
}

function googleSignupAdminKey(env) {
  const key = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (/^sb_secret_[A-Za-z0-9_-]{24,}$/.test(key)) return key;
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    const jwt = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return jwt.role === 'service_role' ? key : null;
  } catch {
    return null;
  }
}

function configured(env) {
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const origin = secureUrl(env.PUBLIC_APP_ORIGIN);
    const publishableKey =
      env.SUPABASE_PUBLISHABLE_KEY ||
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_ANON_KEY ||
      '';
    const signingSecret = env.AUTH_COOKIE_SIGNING_SECRET || '';
    if (
      url.href !== url.origin + '/' ||
      origin.href !== origin.origin + '/' ||
      !publishableKey ||
      signingSecret.length < 32
    ) return false;
    return {
      url: url.origin,
      origin: origin.origin,
      publishableKey,
      signingSecret,
      issuer: `${url.origin}/auth/v1`,
    };
  } catch {
    return false;
  }
}

function signEnvelope(config, payload) {
  const body = encode(payload);
  const signature = createHmac('sha256', config.signingSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyEnvelope(config, encodedValue) {
  if (typeof encodedValue !== 'string' || encodedValue.length > 32_000) return null;
  const parts = encodedValue.split('.');
  if (parts.length !== 2) return null;
  const expected = createHmac('sha256', config.signingSecret).update(parts[0]).digest();
  let actual;
  try {
    actual = Buffer.from(parts[1], 'base64url');
  } catch {
    return null;
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    return decode(parts[0]);
  } catch {
    return null;
  }
}

function readStoredSession(req, config) {
  const cookies = cookieValues(req);
  const count = Number.parseInt(cookies[SESSION_COUNT_COOKIE] || '0', 10);
  if (!Number.isInteger(count) || count < 1 || count > MAX_SESSION_CHUNKS) return null;
  let encodedValue = '';
  for (let i = 0; i < count; i += 1) {
    const chunk = cookies[`${SESSION_COOKIE_PREFIX}${i}`];
    if (!chunk) return null;
    encodedValue += chunk;
  }
  const value = verifyEnvelope(config, encodedValue);
  if (
    value?.version !== 1 ||
    typeof value.accessToken !== 'string' ||
    typeof value.refreshToken !== 'string' ||
    typeof value.expiresAt !== 'number' ||
    typeof value.user?.id !== 'string'
  ) return null;
  return value;
}

function clearSessionCookies(req, res) {
  const cookies = cookieValues(req);
  const count = Math.min(
    MAX_SESSION_CHUNKS,
    Math.max(0, Number.parseInt(cookies[SESSION_COUNT_COOKIE] || '0', 10) || 0),
  );
  for (let i = 0; i < Math.max(1, count); i += 1) clearCookie(res, `${SESSION_COOKIE_PREFIX}${i}`);
  clearCookie(res, SESSION_COUNT_COOKIE);
}

function writeSessionCookies(req, res, config, token) {
  if (!token?.access_token || !token?.refresh_token) throw new Error('INCOMPLETE_SUPABASE_SESSION');
  const expiresAt =
    Number(token.expires_at) ||
    Math.floor(Date.now() / 1000) + Math.max(60, Number(token.expires_in) || 3600);
  const user = token.user || {};
  const metadata = user.user_metadata || {};
  const payload = {
    version: 1,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
    user: {
      id: String(user.id || ''),
      email: typeof user.email === 'string' ? user.email.slice(0, 320) : '',
      name:
        (typeof metadata.full_name === 'string' && metadata.full_name.slice(0, 120)) ||
        (typeof metadata.name === 'string' && metadata.name.slice(0, 120)) ||
        (typeof user.email === 'string' ? user.email.split('@')[0].slice(0, 120) : 'Benutzer'),
    },
  };
  if (!payload.user.id) throw new Error('SUPABASE_USER_ID_MISSING');

  const encodedValue = signEnvelope(config, payload);
  const chunks = encodedValue.match(new RegExp(`.{1,${SESSION_CHUNK_SIZE}}`, 'g')) || [];
  if (chunks.length < 1 || chunks.length > MAX_SESSION_CHUNKS) throw new Error('SESSION_COOKIE_TOO_LARGE');

  clearSessionCookies(req, res);
  appendCookie(res, cookie(SESSION_COUNT_COOKIE, String(chunks.length), SESSION_MAX_AGE_SECONDS));
  chunks.forEach((chunk, index) => {
    appendCookie(res, cookie(`${SESSION_COOKIE_PREFIX}${index}`, chunk, SESSION_MAX_AGE_SECONDS));
  });
  return payload;
}

async function readRequestForm(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 4096) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

async function readRequestJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
  } catch {
    throw new Error('INVALID_JSON');
  }
}

function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320 ? email : '';
}

function normalizeLoginPassword(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= 256 ? value : '';
}

function normalizeNewPassword(value) {
  return typeof value === 'string' && value.length >= 14 && value.length <= 256 ? value : '';
}

function tokenAal(accessToken) {
  if (typeof accessToken !== 'string') return 'aal1';
  const parts = accessToken.split('.');
  if (parts.length !== 3) return 'aal1';
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload?.aal === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return 'aal1';
  }
}

export function createAuth({ env = process.env, fetchImpl = fetch, now = Date.now, audit = console.info } = {}) {
  const allow = createLimiter(30, 60_000, 1, now);
  const mobileTransfers = new Map();

  const getConfig = () => configured(env);
  const pruneMobileTransfers = () => {
    for (const [key, value] of mobileTransfers) {
      if (!value || value.expires <= now()) mobileTransfers.delete(key);
    }
  };
  const mobileChallenge = value =>
    /^[A-Za-z0-9_-]{43}$/.test(String(value || '')) ? String(value) : '';
  const mobileVerifier = value =>
    /^[A-Za-z0-9._~-]{43,128}$/.test(String(value || '')) ? String(value) : '';

  async function authRequest(config, path, { method = 'GET', body, accessToken, maxResponseBytes = 65_536 } = {}) {
    const headers = { Accept: 'application/json', apikey: config.publishableKey };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetchImpl(new URL(`/auth/v1${path}`, config.url), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(7000),
    });
    let data = null;
    if (response.status !== 204) {
      try {
        if (response.ok) {
          data = await boundedJson(response, maxResponseBytes);
        } else {
          // Keep only a bounded machine code: previously boundedJson discarded
          // every non-2xx body, hiding MFA configuration and enrollment errors.
          const failure = await boundedJson({ ok: true, body: response.body }, 8192);
          const code = failure?.error_code || failure?.code;
          data = typeof code === 'string' && /^[a-z][a-z0-9_]{0,119}$/i.test(code)
            ? { error_code: code } : null;
        }
      } catch {
        data = null;
      }
    }
    return { response, data };
  }

  async function storeGoogleSignupConsent(config, userId, consent) {
    const adminKey = googleSignupAdminKey(env);
    if (!adminKey || !consent?.termsAccepted || !consent?.privacyAcknowledged) return false;
    const version = '2026-10-05';
    const entries = [
      { user_id: userId, consent_type: 'terms', document_version: version, granted: true, evidence_kind: 'contract_acceptance' },
      { user_id: userId, consent_type: 'privacy', document_version: version, granted: true, evidence_kind: 'acknowledgement' },
      { user_id: userId, consent_type: 'marketing', document_version: version, granted: consent.marketingConsent === true, evidence_kind: 'consent' },
    ];
    const target = new URL('/rest/v1/user_consents', config.url);
    target.searchParams.set('on_conflict', 'user_id,consent_type,document_version');
    try {
      const response = await fetchImpl(target, {
        method: 'POST',
        headers: {
          apikey: adminKey,
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify(entries),
        redirect: 'error',
        signal: AbortSignal.timeout(7000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function accountProjection(config, stored) {
    const headers = {
      Accept: 'application/json',
      apikey: config.publishableKey,
      Authorization: `Bearer ${stored.accessToken}`,
    };

    const profileUrl = new URL('/rest/v1/profiles', config.url);
    profileUrl.searchParams.set('select', 'id,iam_role');
    profileUrl.searchParams.set('id', `eq.${stored.user.id}`);
    profileUrl.searchParams.set('limit', '1');

    const subscriptionUrl = new URL('/rest/v1/subscriptions', config.url);
    subscriptionUrl.searchParams.set('select', 'user_id,tier,status,current_period_end');
    subscriptionUrl.searchParams.set('user_id', `eq.${stored.user.id}`);
    subscriptionUrl.searchParams.set('limit', '1');

    const read = target => fetchImpl(target, {
      method: 'GET',
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(7000),
    });

    const [profileResponse, subscriptionResponse] = await Promise.all([
      read(profileUrl),
      read(subscriptionUrl),
    ]);

    if (!profileResponse.ok || !subscriptionResponse.ok) {
      return { available: false, iamRole: null, subscription: null, badges: [] };
    }

    const [profileRows, subscriptionRows] = await Promise.all([
      boundedJson(profileResponse),
      boundedJson(subscriptionResponse),
    ]);
    const profile = Array.isArray(profileRows) ? profileRows[0] : null;
    const subscription = Array.isArray(subscriptionRows) ? subscriptionRows[0] : null;

    const iamRole = ['owner', 'admin', 'supervisor', 'user'].includes(String(profile?.iam_role || ''))
      ? String(profile.iam_role)
      : null;
    const tier = ['Free', 'Starter', 'Pro', 'Enterprise'].includes(String(subscription?.tier || ''))
      ? String(subscription.tier)
      : null;
    const status = typeof subscription?.status === 'string'
      ? subscription.status.slice(0, 64)
      : null;
    const currentPeriodEnd = typeof subscription?.current_period_end === 'string'
      ? subscription.current_period_end.slice(0, 64)
      : null;

    const badges = [];
    const tierAsset = {
      Free: '/branding/badges/free-user.svg',
      Starter: '/branding/badges/starter.svg',
      Pro: '/branding/badges/pro.svg',
      Enterprise: '/branding/badges/enterprise.svg',
    }[tier];
    if (tier && tierAsset) badges.push({ id: tier.toLowerCase(), label: tier.toUpperCase(), asset: tierAsset });
    if (iamRole === 'owner') badges.push({ id: 'owner', label: 'OWNER', asset: '/branding/badges/owner.svg' });

    return {
      available: true,
      iamRole,
      subscription: tier ? { tier, status, currentPeriodEnd } : null,
      badges,
    };
  }

  function session(req) {
    const config = getConfig();
    if (!config) return null;
    const stored = readStoredSession(req, config);
    if (!stored || stored.expiresAt <= Math.floor(now() / 1000)) return null;
    return {
      subject: stored.user.id,
      userId: stored.user.id,
      issuer: config.issuer,
      name: stored.user.name,
      email: stored.user.email,
      expires: stored.expiresAt * 1000,
    };
  }

  function sameOrigin(req) {
    const config = getConfig();
    return Boolean(config && req.headers.origin === config.origin);
  }

  async function resolveSession(req, res) {
    const config = getConfig();
    if (!config) return null;
    let stored = readStoredSession(req, config);
    if (!stored) return null;

    const refreshNeeded = stored.expiresAt <= Math.floor(now() / 1000) + 60;
    if (!refreshNeeded) {
      const verified = await authRequest(config, '/user', { accessToken: stored.accessToken });
      if (verified.response.ok && verified.data?.id === stored.user.id) {
        stored._authUser = verified.data;
        return stored;
      }
    }

    const refreshed = await authRequest(config, '/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: stored.refreshToken },
    });
    if (!refreshed.response.ok || !refreshed.data?.access_token || !refreshed.data?.user?.id) {
      clearSessionCookies(req, res);
      return null;
    }
    stored = writeSessionCookies(req, res, config, refreshed.data);
    stored._authUser = refreshed.data.user || null;
    audit('Supabase authentication verified at session_refresh');
    return stored;
  }

  const security = createAuthSecurity({
    getConfig,
    authRequest,
    resolveSession,
    writeSessionCookies,
    clearSessionCookies,
    readRequestJson,
    sameOrigin,
    audit,
  });

  async function handle(req, res, url, json) {
    if (!url.pathname.startsWith('/api/auth/')) return false;
    if (await security.handle(req, res, url, json)) return true;
    const action = url.pathname.slice('/api/auth/'.length);
    const supported = new Set([
      'login',
      'login/email',
      'login/google',
      'mobile-login',
      'mobile-exchange',
      'register',
      'callback',
      'session',
      'logout',
      'password/forgot',
    ]);
    if (!supported.has(action)) {
      json(res, 404, { error: 'not_found' });
      return true;
    }

    const config = getConfig();
    if (!config) {
      if (action === 'session' && req.method === 'GET') {
        json(res, 200, { configured: false, authenticated: false, user: null });
      } else {
        json(res, 503, { error: 'authentication_not_configured', provider: 'supabase' });
      }
      return true;
    }

    if (action === 'session') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      try {
        const stored = await resolveSession(req, res);
        if (!stored) {
          json(res, 200, { configured: true, authenticated: false, user: null });
          return true;
        }
        const currentLevel = tokenAal(stored.accessToken);
        const mfaRequired = currentLevel !== 'aal2' && hasVerifiedTotpFactor(stored._authUser);
        let account = { available: false, iamRole: null, subscription: null, badges: [] };
        try {
          account = await accountProjection(config, stored);
        } catch {
          // Authentication remains authoritative even if the optional account projection is temporarily unavailable.
        }
        json(res, 200, {
          configured: true,
          authenticated: true,
          currentLevel,
          mfaRequired,
          user: {
            id: stored.user.id,
            subject: stored.user.id,
            email: stored.user.email,
            name: stored.user.name,
          },
          account,
        });
      } catch {
        clearSessionCookies(req, res);
        json(res, 503, { error: 'session_unavailable' });
      }
      return true;
    }

    if (!allow()) {
      res.setHeader('Retry-After', '60');
      json(res, 429, { error: 'rate_limited' });
      return true;
    }

    if (action === 'login') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      res.writeHead(303, {
        Location: '/api/auth/login/google?next=%2F',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      });
      res.end();
      return true;
    }

    if (action === 'mobile-login') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const challenge = mobileChallenge(url.searchParams.get('challenge'));
      if (!challenge) {
        json(res, 400, { error: 'invalid_mobile_challenge' });
        return true;
      }
      const verifier = randomBytes(64).toString('base64url');
      const pkceChallenge = createHash('sha256').update(verifier).digest('base64url');
      const flow = random();
      const callback = new URL('/api/auth/callback', config.origin);
      callback.searchParams.set('flow', flow);
      appendCookie(
        res,
        cookie(
          PKCE_COOKIE,
          signEnvelope(config, {
            version: 1,
            flow,
            verifier,
            next: '/mobile-scorer',
            mobileChallenge: challenge,
            expires: now() + PKCE_MAX_AGE_SECONDS * 1000,
          }),
          PKCE_MAX_AGE_SECONDS,
        ),
      );
      const target = new URL('/auth/v1/authorize', config.url);
      target.searchParams.set('provider', 'google');
      target.searchParams.set('redirect_to', callback.toString());
      target.searchParams.set('code_challenge', pkceChallenge);
      target.searchParams.set('code_challenge_method', 's256');
      res.writeHead(303, {
        Location: target.toString(),
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      });
      res.end();
      return true;
    }

    if (action === 'mobile-exchange') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      pruneMobileTransfers();
      let form;
      try {
        form = await readRequestForm(req);
      } catch {
        json(res, 400, { error: 'invalid_mobile_exchange' });
        return true;
      }
      const code = String(form.get('code') || '');
      const verifier = mobileVerifier(form.get('verifier'));
      const transfer = mobileTransfers.get(code);
      if (
        !transfer ||
        !verifier ||
        createHash('sha256').update(verifier).digest('base64url') !== transfer.challenge
      ) {
        if (transfer) mobileTransfers.delete(code);
        json(res, 400, { error: 'invalid_mobile_exchange' });
        return true;
      }
      mobileTransfers.delete(code);
      writeSessionCookies(req, res, config, transfer.token);
      res.writeHead(303, {
        Location: '/mobile-scorer',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      });
      res.end();
      return true;
    }

    if (action === 'login/google') {
      if (!['GET', 'POST'].includes(req.method)) {
        res.setHeader('Allow', 'GET, POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      let googleRegistrationConsent = null;
      if (req.method === 'POST') {
        if (!sameOrigin(req)) {
          json(res, 403, { error: 'forbidden_origin' });
          return true;
        }
        let form;
        try {
          form = await readRequestForm(req);
        } catch {
          json(res, 400, { error: 'invalid_request' });
          return true;
        }
        if (form.get('registration') !== 'true' ||
            form.get('termsAccepted') !== 'true' ||
            form.get('privacyAcknowledged') !== 'true') {
          json(res, 400, { error: 'registration_consents_required' });
          return true;
        }
        if (!googleSignupAdminKey(env)) {
          json(res, 503, { error: 'registration_consent_store_unavailable' });
          return true;
        }
        googleRegistrationConsent = {
          termsAccepted: true,
          privacyAcknowledged: true,
          marketingConsent: form.get('marketingConsent') === 'true',
        };
      }
      const verifier = randomBytes(64).toString('base64url');
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      const flow = random();
      const next = normalizeMarketplaceAuthNext(url.searchParams.get('next'));
      // A static redirect URI avoids requiring wildcard OAuth redirect allowlists.
      // The signed, HttpOnly PKCE cookie carries flow identity and the safe next path.
      const callback = new URL('/api/auth/callback', config.origin);
      appendCookie(
        res,
        cookie(PKCE_COOKIE, signEnvelope(config, { version: 1, flow, verifier, next, googleRegistrationConsent, expires: now() + PKCE_MAX_AGE_SECONDS * 1000 }), PKCE_MAX_AGE_SECONDS),
      );
      const target = new URL('/auth/v1/authorize', config.url);
      target.searchParams.set('provider', 'google');
      target.searchParams.set('redirect_to', callback.toString());
      target.searchParams.set('code_challenge', challenge);
      target.searchParams.set('code_challenge_method', 's256');
      res.writeHead(303, {
        Location: target.toString(),
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      });
      res.end();
      return true;
    }

    if (action === 'callback') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const cookies = cookieValues(req);
      const flowCookie = verifyEnvelope(config, cookies[PKCE_COOKIE]);
      clearCookie(res, PKCE_COOKIE);
      // OAuth providers can return a callback error instead of a PKCE code.
      // Keep provider details and arbitrary redirect targets out of the URL.
      if (url.searchParams.has('error')) {
        res.writeHead(303, {
          Location: '/login?oauth_error=provider_rejected',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        });
        res.end();
        return true;
      }
      const code = url.searchParams.get('code') || '';
      const flow = url.searchParams.get('flow');
      if (
        flowCookie?.version !== 1 ||
        flowCookie.expires <= now() ||
        !/^[A-Za-z0-9_-]{43}$/.test(String(flowCookie.flow || '')) ||
        (flow !== null && flowCookie.flow !== flow) ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(flowCookie.verifier || '') ||
        !code ||
        code.length > 2048
      ) {
        json(res, 400, { error: 'invalid_authentication_state' });
        return true;
      }
      const exchanged = await authRequest(config, '/token?grant_type=pkce', {
        method: 'POST',
        body: { auth_code: code, code_verifier: flowCookie.verifier },
      });
      if (!exchanged.response.ok || !exchanged.data?.access_token || !exchanged.data?.user?.id) {
        res.writeHead(303, {
          Location: '/login?oauth_error=token_exchange_failed',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        });
        res.end();
        return true;
      }
      audit('Supabase authentication verified at oauth_callback');
      if (flowCookie.mobileChallenge) {
        const mobileUser = await authRequest(config, '/user', { accessToken: exchanged.data.access_token });
        if (!mobileUser.response.ok || mobileUser.data?.id !== exchanged.data.user?.id) {
          json(res, 503, { error: 'authentication_security_state_unavailable' });
          return true;
        }
        exchanged.data.user = mobileUser.data;
        if (hasVerifiedTotpFactor(mobileUser.data)) {
          json(res, 403, { error: 'mfa_required_mobile_not_supported' });
          return true;
        }
        pruneMobileTransfers();
        if (mobileTransfers.size >= 100) {
          json(res, 503, { error: 'mobile_transfer_busy' });
          return true;
        }
        const transferCode = random();
        mobileTransfers.set(transferCode, {
          token: exchanged.data,
          challenge: flowCookie.mobileChallenge,
          expires: now() + 60_000,
        });
        res.writeHead(303, {
          Location: `capitalai-private://auth/callback?code=${encodeURIComponent(transferCode)}`,
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        });
        res.end();
        return true;
      }
      const googleUser = await authRequest(config, '/user', { accessToken: exchanged.data.access_token });
      if (!googleUser.response.ok || googleUser.data?.id !== exchanged.data.user?.id) {
        json(res, 503, { error: 'authentication_security_state_unavailable' });
        return true;
      }
      exchanged.data.user = googleUser.data;
      if (flowCookie.googleRegistrationConsent) {
        const recorded = await storeGoogleSignupConsent(config, googleUser.data.id, flowCookie.googleRegistrationConsent);
        if (!recorded) {
          json(res, 503, { error: 'registration_consent_persistence_failed' });
          return true;
        }
      }
      writeSessionCookies(req, res, config, exchanged.data);
      const googleNext = normalizeMarketplaceAuthNext(flowCookie.next);
      const googleMfaRequired = tokenAal(exchanged.data.access_token) !== 'aal2' && hasVerifiedTotpFactor(googleUser.data);
      res.writeHead(303, {
        Location: googleMfaRequired
          ? `/login?mfa=1&next=${encodeURIComponent(googleNext)}`
          : googleNext,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      });
      res.end();
      return true;
    }

    if (!sameOrigin(req)) {
      json(res, 403, { error: 'forbidden_origin' });
      return true;
    }

    if (action === 'login/email') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      let body;
      try {
        body = await readRequestJson(req);
      } catch (error) {
        json(res, error.message === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: 'invalid_request' });
        return true;
      }
      const email = normalizeEmail(body.email || body.identifier);
      const password = normalizeLoginPassword(body.password);
      if (!email || !password) {
        json(res, 400, { error: 'invalid_credentials_format' });
        return true;
      }
      const signedIn = await authRequest(config, '/token?grant_type=password', {
        method: 'POST',
        body: { email, password },
      });
      if (!signedIn.response.ok || !signedIn.data?.access_token || !signedIn.data?.user?.id) {
        json(res, signedIn.response.status === 429 ? 429 : 401, { error: 'authentication_failed' });
        return true;
      }
      const signedInUser = await authRequest(config, '/user', { accessToken: signedIn.data.access_token });
      if (!signedInUser.response.ok || signedInUser.data?.id !== signedIn.data.user?.id) {
        json(res, 503, { error: 'authentication_security_state_unavailable' });
        return true;
      }
      signedIn.data.user = signedInUser.data;
      const stored = writeSessionCookies(req, res, config, signedIn.data);
      const mfaRequired = tokenAal(signedIn.data.access_token) !== 'aal2' && hasVerifiedTotpFactor(signedInUser.data);
      audit('Supabase authentication verified at password_login');
      json(res, 200, {
        authenticated: true,
        mfaRequired,
        next: mfaRequired ? '/login?mfa=1' : '/',
        user: { id: stored.user.id, name: stored.user.name },
      });
      return true;
    }

    if (action === 'register') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      let body;
      try {
        body = await readRequestJson(req);
      } catch {
        json(res, 400, { error: 'invalid_request' });
        return true;
      }
      const email = normalizeEmail(body.email);
      const password = normalizeNewPassword(body.password);
      const passwordConfirm = typeof body.passwordConfirm === 'string' ? body.passwordConfirm : '';
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
      const termsAccepted = body.termsAccepted === true;
      const privacyAcknowledged = body.privacyAcknowledged === true;
      const marketingConsent = body.marketingConsent === true;
      if (!email || !password || password !== passwordConfirm || !name) {
        json(res, 400, { error: password !== passwordConfirm ? 'passwords_do_not_match' : 'invalid_registration' });
        return true;
      }
      if (!termsAccepted || !privacyAcknowledged) {
        json(res, 400, { error: 'registration_consents_required' });
        return true;
      }
      const confirmation = new URL('/', config.origin).toString();
      const signedUp = await authRequest(config, `/signup?redirect_to=${encodeURIComponent(confirmation)}`, {
        method: 'POST',
        body: {
          email,
          password,
          data: {
            full_name: name,
            terms_accepted: true,
            terms_version: '2026-10-05',
            privacy_acknowledged: true,
            privacy_version: '2026-10-05',
            marketing_consent: marketingConsent,
          },
        },
      });
      if (!signedUp.response.ok || !signedUp.data?.user?.id) {
        const registrationError = signedUp.data?.error_code === 'weak_password'
          ? 'weak_password'
          : 'registration_failed';
        json(res, signedUp.response.status === 429 ? 429 : 422, { error: registrationError });
        return true;
      }
      if (signedUp.data.access_token && signedUp.data.refresh_token) {
        writeSessionCookies(req, res, config, signedUp.data);
        json(res, 200, { authenticated: true, next: '/' });
      } else {
        json(res, 202, { authenticated: false, confirmationRequired: true });
      }
      return true;
    }

    if (action === 'password/forgot') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      let body;
      try {
        body = await readRequestJson(req);
      } catch {
        json(res, 400, { error: 'invalid_request' });
        return true;
      }
      const email = normalizeEmail(body.email);
      if (!email) {
        json(res, 400, { error: 'invalid_email' });
        return true;
      }
      const redirectTo = new URL('/login?mode=reset', config.origin).toString();
      await authRequest(config, `/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST',
        body: { email },
      });
      json(res, 202, { accepted: true });
      return true;
    }

    if (action === 'logout') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = readStoredSession(req, config);
      if (stored?.accessToken) {
        try {
          await fetchImpl(new URL('/auth/v1/logout?scope=global', config.url), {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              apikey: config.publishableKey,
              Authorization: `Bearer ${stored.accessToken}`,
            },
            redirect: 'error',
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          // Local cookie invalidation remains authoritative for the website session.
        }
      }
      clearSessionCookies(req, res);
      clearCookie(res, PKCE_COOKIE);
      json(res, 200, { authenticated: false });
      return true;
    }

    json(res, 404, { error: 'not_found' });
    return true;
  }

  async function authorizeIamRole(req, res, requiredRole = 'owner') {
    const config = getConfig();
    if (!config) return false;
    try {
      const stored = await resolveSession(req, res);
      if (!stored) return false;
      const account = await accountProjection(config, stored);
      return account?.available === true && account.iamRole === requiredRole;
    } catch {
      return false;
    }
  }

  async function verify(req, res) {
    const config = getConfig();
    if (!config) return null;
    try {
      const stored = await resolveSession(req, res);
      if (!stored) return null;
      const currentLevel = tokenAal(stored.accessToken);
      if (currentLevel !== 'aal2' && hasVerifiedTotpFactor(stored._authUser)) return null;
      return {
        subject: stored.user.id,
        userId: stored.user.id,
        issuer: config.issuer,
        name: stored.user.name,
        email: stored.user.email,
        // Never authorize owner-only Render secrets from an unconfirmed or stale email.
        emailVerified: Boolean(stored._authUser?.email_confirmed_at &&
          String(stored._authUser?.email || '').toLowerCase() === String(stored.user.email || '').toLowerCase()),
        expires: stored.expiresAt * 1000,
        aal: currentLevel,
      };
    } catch {
      return null;
    }
  }

  async function resolvePaidTier(req, res) {
    const config = getConfig();
    if (!config) return null;
    try {
      const stored = await resolveSession(req, res);
      if (!stored) return null;
      const account = await accountProjection(config, stored);
      if (account?.available !== true) return null;
      return normalizeStoredPaidTier(account.subscription);
    } catch {
      return null;
    }
  }

  return { handle, session, verify, resolvePaidTier, authorizeIamRole, sameOrigin };
}
