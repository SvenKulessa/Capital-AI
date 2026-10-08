const PASSKEY_ID_RE = /^[0-9a-fA-F-]{36}$/;
const FACTOR_ID_RE = /^[0-9a-fA-F-]{36}$/;
const TOKEN_HASH_RE = /^[A-Za-z0-9._~-]{16,1024}$/;
const TOTP_CODE_RE = /^\d{6,8}$/;
const MAX_PASSKEYS_PER_USER = 2;
const MAX_TOTP_FACTORS_PER_USER = 2;
const EMAIL_VERIFY_TYPES = new Set(['signup', 'invite', 'magiclink', 'email_change', 'recovery']);

function upstreamCode(data, fallback) {
  const code = typeof data?.error_code === 'string'
    ? data.error_code
    : typeof data?.code === 'string'
      ? data.code
      : '';
  return code.slice(0, 120) || fallback;
}

function friendlyName(value, fallback) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) return fallback;
  return name.length <= 120 && !/[\u0000-\u001f\u007f]/.test(name) ? name : '';
}

function totpEnrollmentProjection(totp) {
  if (!totp || typeof totp !== 'object') return null;
  const uri = typeof totp.uri === 'string' && totp.uri.length <= 2048 ? totp.uri : '';
  let secret = typeof totp.secret === 'string' ? totp.secret.trim().toUpperCase() : '';
  // GoTrue versions can omit the separate secret while still returning the
  // otpauth URI. Extract it only server-side; never expose it in diagnostics.
  if (!secret && uri) {
    try {
      const parsed = new URL(uri);
      if (parsed.protocol === 'otpauth:' && parsed.hostname === 'totp') {
        secret = String(parsed.searchParams.get('secret') || '').toUpperCase();
      }
    } catch {
      return null;
    }
  }
  if (!/^[A-Z2-7]{16,128}$/.test(secret)) return null;
  const qrCode = typeof totp.qr_code === 'string' && totp.qr_code.length <= 220000 ? totp.qr_code : '';
  return { secret, qrCode, uri };
}

function verifiedFactors(user) {
  return Array.isArray(user?.factors)
    ? user.factors.filter(factor => factor && factor.status === 'verified')
    : [];
}

export function hasVerifiedTotpFactor(user) {
  return verifiedFactors(user).some(factor => factor.factor_type === 'totp');
}

function totpFactors(user) {
  return Array.isArray(user?.factors)
    ? user.factors.filter(factor => factor && factor.factor_type === 'totp')
    : [];
}

function factorProjection(user) {
  return totpFactors(user)
    .map(factor => ({
      id: String(factor.id || ''),
      type: 'totp',
      status: factor.status === 'verified' ? 'verified' : 'unverified',
      friendlyName: typeof factor.friendly_name === 'string' ? factor.friendly_name.slice(0, 120) : '',
      createdAt: factor.created_at || null,
      updatedAt: factor.updated_at || null,
    }))
    .filter(factor => FACTOR_ID_RE.test(factor.id));
}

function passkeyProjection(items) {
  return (Array.isArray(items) ? items : [])
    .map(item => ({
      id: String(item?.id || ''),
      friendlyName: typeof item?.friendly_name === 'string' ? item.friendly_name.slice(0, 120) : '',
      createdAt: item?.created_at || null,
      lastUsedAt: item?.last_used_at || null,
    }))
    .filter(item => PASSKEY_ID_RE.test(item.id));
}

export function createAuthSecurity({
  getConfig,
  authRequest,
  resolveSession,
  writeSessionCookies,
  clearSessionCookies,
  readRequestJson,
  sameOrigin,
  audit = console.info,
} = {}) {
  async function requireSession(req, res, json) {
    const stored = await resolveSession(req, res);
    if (!stored?.accessToken || !stored?.user?.id) {
      json(res, 401, { error: 'authentication_required' });
      return null;
    }
    return stored;
  }

  function safeSameSiteRead(req) {
    const origin = String(req.headers?.origin || '');
    if (origin && !sameOrigin(req)) return false;
    const fetchSite = String(req.headers?.['sec-fetch-site'] || '').toLowerCase();
    return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none';
  }

  async function handle(req, res, url, json) {
    if (!url.pathname.startsWith('/api/auth/')) return false;
    const action = url.pathname.slice('/api/auth/'.length);
    const handled =
      action === 'email/verify' ||
      action === 'password/reset' ||
      action === 'passkey/options' ||
      action === 'passkey/verify' ||
      action === 'passkeys' ||
      action === 'passkeys/register/options' ||
      action === 'passkeys/register/verify' ||
      action === 'passkeys/remove' ||
      action === 'mfa/factors' ||
      action === 'mfa/totp/enroll' ||
      action === 'mfa/totp/verify' ||
      action === 'mfa/totp/remove';
    if (!handled) return false;

    const config = getConfig();
    if (!config) {
      json(res, 503, { error: 'authentication_not_configured', provider: 'supabase' });
      return true;
    }

    if (action === 'email/verify') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const tokenHash = String(url.searchParams.get('token_hash') || '');
      const type = String(url.searchParams.get('type') || '');
      if (!TOKEN_HASH_RE.test(tokenHash) || !EMAIL_VERIFY_TYPES.has(type)) {
        if (type === 'recovery') {
          res.writeHead(303, {
            Location: '/login?mode=forgot&recovery_error=invalid_link',
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          });
          res.end();
          return true;
        }
        json(res, 400, { error: 'invalid_email_verification' });
        return true;
      }
      const verified = await authRequest(config, '/verify', {
        method: 'POST',
        body: { token_hash: tokenHash, type },
      });
      if (!verified.response.ok) {
        if (type === 'recovery') {
          res.writeHead(303, {
            Location: '/login?mode=forgot&recovery_error=verification_failed',
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          });
          res.end();
          return true;
        }
        json(res, 400, { error: 'email_verification_failed', code: upstreamCode(verified.data, 'verification_failed') });
        return true;
      }
      let target = type === 'recovery' ? '/login?mode=reset' : '/';
      if (verified.data?.access_token && verified.data?.refresh_token && verified.data?.user?.id) {
        const verifiedUser = await authRequest(config, '/user', {
          accessToken: verified.data.access_token,
        });
        if (!verifiedUser.response.ok || verifiedUser.data?.id !== verified.data.user.id) {
          json(res, 503, { error: 'authentication_security_state_unavailable' });
          return true;
        }
        verified.data.user = verifiedUser.data;
        writeSessionCookies(req, res, config, verified.data);
        if (type !== 'recovery' && hasVerifiedTotpFactor(verifiedUser.data)) {
          target = '/login?mfa=1';
        }
      }
      audit(`Supabase email verification completed for ${type}`);
      res.writeHead(303, {
        Location: target,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      });
      res.end();
      return true;
    }

    const safeRead =
      req.method === 'GET' &&
      (action === 'passkeys' || action === 'mfa/factors');

    if (safeRead ? !safeSameSiteRead(req) : !sameOrigin(req)) {
      json(res, 403, { error: 'forbidden_origin' });
      return true;
    }

    if (action === 'password/reset') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = await requireSession(req, res, json);
      if (!stored) return true;
      let body;
      try {
        body = await readRequestJson(req);
      } catch {
        json(res, 400, { error: 'invalid_request' });
        return true;
      }
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < 14 || password.length > 256) {
        json(res, 400, { error: 'invalid_new_password' });
        return true;
      }
      const updated = await authRequest(config, '/user', {
        method: 'PUT',
        accessToken: stored.accessToken,
        body: { password },
      });
      if (!updated.response.ok) {
        json(res, updated.response.status === 429 ? 429 : 422, {
          error: 'password_reset_failed',
          code: upstreamCode(updated.data, 'password_update_failed'),
        });
        return true;
      }
      await authRequest(config, '/logout?scope=global', {
        method: 'POST',
        accessToken: stored.accessToken,
      }).catch(() => {});
      clearSessionCookies(req, res);
      audit('Supabase password reset completed and sessions revoked');
      json(res, 200, { reset: true, authenticated: false });
      return true;
    }

    if (action === 'passkey/options') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const options = await authRequest(config, '/passkeys/authentication/options', {
        method: 'POST',
        body: {},
      });
      if (!options.response.ok || !options.data?.challenge_id || !options.data?.options) {
        json(res, options.response.status === 429 ? 429 : 503, {
          error: 'passkey_unavailable',
          code: upstreamCode(options.data, 'passkey_options_failed'),
        });
        return true;
      }
      json(res, 200, {
        challengeId: options.data.challenge_id,
        options: options.data.options,
        expiresAt: options.data.expires_at || null,
      });
      return true;
    }

    if (action === 'passkey/verify') {
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
      const challengeId = String(body.challengeId || '');
      if (!PASSKEY_ID_RE.test(challengeId) || !body.credential || typeof body.credential !== 'object') {
        json(res, 400, { error: 'invalid_passkey_response' });
        return true;
      }
      const verified = await authRequest(config, '/passkeys/authentication/verify', {
        method: 'POST',
        body: { challenge_id: challengeId, credential: body.credential },
      });
      if (!verified.response.ok || !verified.data?.access_token || !verified.data?.refresh_token || !verified.data?.user?.id) {
        json(res, verified.response.status === 429 ? 429 : 401, {
          error: 'passkey_authentication_failed',
          code: upstreamCode(verified.data, 'passkey_verification_failed'),
        });
        return true;
      }
      const passkeyUser = await authRequest(config, '/user', {
        accessToken: verified.data.access_token,
      });
      if (!passkeyUser.response.ok || passkeyUser.data?.id !== verified.data.user.id) {
        json(res, 503, { error: 'authentication_security_state_unavailable' });
        return true;
      }
      verified.data.user = passkeyUser.data;
      const stored = writeSessionCookies(req, res, config, verified.data);
      const mfaRequired = hasVerifiedTotpFactor(passkeyUser.data);
      audit('Supabase authentication verified at passkey_login');
      json(res, 200, {
        authenticated: true,
        mfaRequired,
        next: mfaRequired ? '/login?mfa=1' : '/',
        user: { id: stored.user.id, name: stored.user.name },
      });
      return true;
    }

    if (action === 'passkeys') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = await requireSession(req, res, json);
      if (!stored) return true;
      const listed = await authRequest(config, '/passkeys', { accessToken: stored.accessToken });
      if (!listed.response.ok) {
        json(res, 503, { error: 'passkey_list_unavailable', code: upstreamCode(listed.data, 'passkey_list_failed') });
        return true;
      }
      json(res, 200, { passkeys: passkeyProjection(listed.data) });
      return true;
    }

    if (action === 'passkeys/register/options') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = await requireSession(req, res, json);
      if (!stored) return true;

      const currentPasskeys = await authRequest(config, '/passkeys', {
        accessToken: stored.accessToken,
      });
      if (!currentPasskeys.response.ok) {
        json(res, 503, {
          error: 'passkey_list_unavailable',
          code: upstreamCode(currentPasskeys.data, 'passkey_list_failed'),
        });
        return true;
      }
      if (passkeyProjection(currentPasskeys.data).length >= MAX_PASSKEYS_PER_USER) {
        json(res, 409, {
          error: 'passkey_limit_reached',
          limit: MAX_PASSKEYS_PER_USER,
        });
        return true;
      }

      const options = await authRequest(config, '/passkeys/registration/options', {
        method: 'POST',
        accessToken: stored.accessToken,
        body: {},
      });
      if (!options.response.ok || !options.data?.challenge_id || !options.data?.options) {
        json(res, options.response.status === 429 ? 429 : 422, {
          error: 'passkey_registration_unavailable',
          code: upstreamCode(options.data, 'passkey_registration_options_failed'),
        });
        return true;
      }
      json(res, 200, {
        challengeId: options.data.challenge_id,
        options: options.data.options,
        expiresAt: options.data.expires_at || null,
      });
      return true;
    }

    if (action === 'passkeys/register/verify') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = await requireSession(req, res, json);
      if (!stored) return true;
      let body;
      try {
        body = await readRequestJson(req);
      } catch {
        json(res, 400, { error: 'invalid_request' });
        return true;
      }
      const challengeId = String(body.challengeId || '');
      if (!PASSKEY_ID_RE.test(challengeId) || !body.credential || typeof body.credential !== 'object') {
        json(res, 400, { error: 'invalid_passkey_response' });
        return true;
      }
      const verified = await authRequest(config, '/passkeys/registration/verify', {
        method: 'POST',
        accessToken: stored.accessToken,
        body: { challenge_id: challengeId, credential: body.credential },
      });
      if (!verified.response.ok || !PASSKEY_ID_RE.test(String(verified.data?.id || ''))) {
        json(res, verified.response.status === 429 ? 429 : 422, {
          error: 'passkey_registration_failed',
          code: upstreamCode(verified.data, 'passkey_registration_failed'),
        });
        return true;
      }
      audit('Supabase passkey registered');
      json(res, 200, {
        registered: true,
        passkey: {
          id: verified.data.id,
          friendlyName: verified.data.friendly_name || '',
          createdAt: verified.data.created_at || null,
        },
      });
      return true;
    }

    if (action === 'passkeys/remove') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = await requireSession(req, res, json);
      if (!stored) return true;
      let body;
      try {
        body = await readRequestJson(req);
      } catch {
        json(res, 400, { error: 'invalid_request' });
        return true;
      }
      const passkeyId = String(body.passkeyId || '');
      if (!PASSKEY_ID_RE.test(passkeyId)) {
        json(res, 400, { error: 'invalid_passkey_id' });
        return true;
      }
      const removed = await authRequest(config, `/passkeys/${encodeURIComponent(passkeyId)}`, {
        method: 'DELETE',
        accessToken: stored.accessToken,
      });
      if (!removed.response.ok) {
        json(res, removed.response.status === 429 ? 429 : 422, {
          error: 'passkey_remove_failed',
          code: upstreamCode(removed.data, 'passkey_remove_failed'),
        });
        return true;
      }
      audit('Supabase passkey removed');
      json(res, 200, { removed: true });
      return true;
    }

    if (action === 'mfa/factors') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = await requireSession(req, res, json);
      if (!stored) return true;
      const user = await authRequest(config, '/user', { accessToken: stored.accessToken });
      if (!user.response.ok || !user.data?.id) {
        json(res, 503, { error: 'mfa_factors_unavailable' });
        return true;
      }
      json(res, 200, { factors: factorProjection(user.data) });
      return true;
    }

    if (action === 'mfa/totp/enroll') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = await requireSession(req, res, json);
      if (!stored) return true;
      let body = {};
      try {
        body = await readRequestJson(req);
      } catch {
        json(res, 400, { error: 'invalid_request' });
        return true;
      }
      const name = friendlyName(body.friendlyName, 'CAPITAL-AI Authenticator');
      if (!name) {
        json(res, 400, { error: 'invalid_factor_name' });
        return true;
      }

      const currentUser = await authRequest(config, '/user', { accessToken: stored.accessToken });
      if (!currentUser.response.ok || currentUser.data?.id !== stored.user.id) {
        json(res, 503, { error: 'mfa_security_state_unavailable' });
        return true;
      }

      const existingTotp = totpFactors(currentUser.data);
      const verifiedTotp = existingTotp.filter(factor => factor.status === 'verified');

      if (verifiedTotp.length >= MAX_TOTP_FACTORS_PER_USER) {
        json(res, 409, {
          error: 'totp_limit_reached',
          limit: MAX_TOTP_FACTORS_PER_USER,
        });
        return true;
      }

      if (verifiedTotp.some(factor => String(factor.friendly_name || '') === name)) {
        json(res, 409, { error: 'mfa_factor_name_conflict' });
        return true;
      }

      const stalePending = existingTotp.filter(factor =>
        factor.status !== 'verified' &&
        FACTOR_ID_RE.test(String(factor.id || ''))
      );
      for (const factor of stalePending) {
        const removed = await authRequest(config, `/factors/${encodeURIComponent(String(factor.id))}`, {
          method: 'DELETE',
          accessToken: stored.accessToken,
        });
        if (!removed.response.ok) {
          json(res, 422, {
            error: 'totp_pending_cleanup_failed',
            code: upstreamCode(removed.data, 'totp_pending_cleanup_failed'),
          });
          return true;
        }
      }

      const enrolled = await authRequest(config, '/factors', {
        method: 'POST',
        accessToken: stored.accessToken,
        body: { factor_type: 'totp', friendly_name: name, issuer: 'CAPITAL-AI' },
        maxResponseBytes: 262_144,
      });
      if (!enrolled.response.ok || !FACTOR_ID_RE.test(String(enrolled.data?.id || '')) || !enrolled.data?.totp) {
        json(res, enrolled.response.status === 429 ? 429 : 422, {
          error: 'totp_enrollment_failed',
          code: upstreamCode(enrolled.data, 'totp_enrollment_failed'),
        });
        return true;
      }
      const setup = totpEnrollmentProjection(enrolled.data.totp);
      if (!setup) {
        // Do not claim enrollment success if there is no usable OTP secret.
        // Pending factors remain identifiable through the existing factor-list
        // endpoint so the user can retry without disclosing a secret.
        json(res, 502, { error: 'totp_setup_material_unavailable' });
        return true;
      }
      json(res, 200, {
        factorId: enrolled.data.id,
        friendlyName: enrolled.data.friendly_name || name,
        qrCode: setup.qrCode,
        secret: setup.secret,
        uri: setup.uri,
      });
      return true;
    }

    if (action === 'mfa/totp/verify') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = await requireSession(req, res, json);
      if (!stored) return true;
      let body;
      try {
        body = await readRequestJson(req);
      } catch {
        json(res, 400, { error: 'invalid_request' });
        return true;
      }
      const factorId = String(body.factorId || '');
      const code = String(body.code || '').trim();
      if (!FACTOR_ID_RE.test(factorId) || !TOTP_CODE_RE.test(code)) {
        json(res, 400, { error: 'invalid_totp_verification' });
        return true;
      }
      const challenge = await authRequest(config, `/factors/${encodeURIComponent(factorId)}/challenge`, {
        method: 'POST',
        accessToken: stored.accessToken,
        body: {},
      });
      if (!challenge.response.ok || !challenge.data?.id) {
        json(res, challenge.response.status === 429 ? 429 : 422, {
          error: 'totp_challenge_failed',
          code: upstreamCode(challenge.data, 'totp_challenge_failed'),
        });
        return true;
      }
      const verified = await authRequest(config, `/factors/${encodeURIComponent(factorId)}/verify`, {
        method: 'POST',
        accessToken: stored.accessToken,
        body: { challenge_id: challenge.data.id, code },
      });
      if (!verified.response.ok || !verified.data?.access_token || !verified.data?.refresh_token || !verified.data?.user?.id) {
        json(res, verified.response.status === 429 ? 429 : 422, {
          error: 'totp_verification_failed',
          code: upstreamCode(verified.data, 'totp_verification_failed'),
        });
        return true;
      }
      writeSessionCookies(req, res, config, verified.data);
      audit('Supabase MFA verified at AAL2');
      json(res, 200, { verified: true, authenticated: true, next: '/' });
      return true;
    }

    if (action === 'mfa/totp/remove') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const stored = await requireSession(req, res, json);
      if (!stored) return true;
      let body;
      try {
        body = await readRequestJson(req);
      } catch {
        json(res, 400, { error: 'invalid_request' });
        return true;
      }
      const factorId = String(body.factorId || '');
      if (!FACTOR_ID_RE.test(factorId)) {
        json(res, 400, { error: 'invalid_factor_id' });
        return true;
      }
      const removed = await authRequest(config, `/factors/${encodeURIComponent(factorId)}`, {
        method: 'DELETE',
        accessToken: stored.accessToken,
      });
      if (!removed.response.ok) {
        json(res, removed.response.status === 429 ? 429 : 422, {
          error: 'totp_remove_failed',
          code: upstreamCode(removed.data, 'totp_remove_failed'),
        });
        return true;
      }
      audit('Supabase TOTP factor removed');
      json(res, 200, { removed: true });
      return true;
    }

    return false;
  }

  return { handle };
}
