import { writeFile } from 'node:fs/promises';

const EXPECTED_ISSUER = 'https://capital-ai-hhxh4i.us1.zitadel.cloud';
const allowedOrigins = new Set(['https://capital-ai.online', 'https://capital-ai-uvsl.onrender.com']);

function bool(value) { return value === true; }

export function summarizeZitadelReadback({ discovery, loginSettings, app, auth = {} }) {
  const redirectUris = Array.isArray(app?.redirectUris) ? app.redirectUris : [];
  const gates = {
    issuerCanonical: discovery?.issuer === EXPECTED_ISSUER,
    pkceS256: discovery?.code_challenge_methods_supported?.includes('S256') === true,
    webAuthnAdvertised: Array.isArray(discovery?.acr_values_supported)
      ? discovery.acr_values_supported.some(v => /webauthn|passkey/i.test(v))
      : true,
    policyReadable: !!loginSettings,
    passkeysAllowed: !!loginSettings && loginSettings.passkeysType !== 'PASSKEYS_TYPE_NOT_ALLOWED',
    passwordResetVisible: !!loginSettings && loginSettings.hidePasswordReset === false,
    oidcApplicationReadable: !!app,
    redirectUrisBounded: redirectUris.length > 0 && redirectUris.every(uri => {
      try { return allowedOrigins.has(new URL(uri).origin); } catch { return false; }
    }),
    serviceAccountAuthenticated: bool(auth.serviceAccountAuthenticated),
  };
  return {
    schemaVersion: 1,
    state: Object.values(gates).every(Boolean) ? 'VERIFIED' : 'BLOCKED',
    gates,
    policy: loginSettings ? {
      allowUsernamePassword: bool(loginSettings.allowUsernamePassword),
      allowLocalAuthentication: bool(loginSettings.allowLocalAuthentication),
      allowRegister: bool(loginSettings.allowRegister),
      forceMfa: bool(loginSettings.forceMfa),
      forceMfaLocalOnly: bool(loginSettings.forceMfaLocalOnly),
      passkeysType: String(loginSettings.passkeysType || 'UNSPECIFIED'),
      hidePasswordReset: bool(loginSettings.hidePasswordReset),
      disableLoginWithEmail: bool(loginSettings.disableLoginWithEmail),
      disableLoginWithPhone: bool(loginSettings.disableLoginWithPhone),
    } : null,
    oidc: app ? {
      redirectUriCount: redirectUris.length,
      postLogoutRedirectUriCount: Array.isArray(app.postLogoutRedirectUris) ? app.postLogoutRedirectUris.length : 0,
      responseTypes: app.responseTypes || [],
      grantTypes: app.grantTypes || [],
      appType: app.appType || null,
      authMethodType: app.authMethodType || null,
    } : null,
  };
}

async function boundedJson(url, token) {
  const res = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  const raw = await res.text();
  if (raw.length > 1024 * 1024) throw new Error('OVERSIZED');
  return JSON.parse(raw);
}

async function tokenFromClientCredentials() {
  const id = process.env.ZITADEL_SERVICE_CLIENT_ID || '';
  const secret = process.env.ZITADEL_SERVICE_CLIENT_SECRET || '';
  if (!id || !secret) return null;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'urn:zitadel:iam:org:project:id:zitadel:aud',
  });
  const res = await fetch(EXPECTED_ISSUER + '/oauth/v2/token', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
    headers: {
      authorization: 'Basic ' + Buffer.from(`${encodeURIComponent(id)}:${encodeURIComponent(secret)}`).toString('base64'),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) throw new Error('SERVICE_ACCOUNT_AUTH_FAILED');
  const data = await res.json();
  return data.access_token || null;
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  let report = { schemaVersion: 1, state: 'BLOCKED', gates: {}, error: 'READBACK_FAILED' };
  try {
    const discovery = await boundedJson(EXPECTED_ISSUER + '/.well-known/openid-configuration');
    const token = process.env.ZITADEL_SERVICE_PAT || await tokenFromClientCredentials();
    if (!token) throw new Error('SERVICE_ACCOUNT_CREDENTIAL_MISSING');

    const login = await boundedJson(EXPECTED_ISSUER + '/v2/settings/login', token);
    const projectId = process.env.ZITADEL_PROJECT_ID || '';
    const appId = process.env.ZITADEL_APP_ID || '';
    if (!projectId || !appId) throw new Error('PROJECT_OR_APP_ID_MISSING');

    // V2 is preferred for new integrations. Application readback stays on the documented
    // resource API path and fails closed if the installed tenant/API version differs.
    const application = await boundedJson(EXPECTED_ISSUER + `/v2/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(appId)}`, token);
    report = summarizeZitadelReadback({
      discovery,
      loginSettings: login.settings,
      app: application.oidc || application,
      auth: { serviceAccountAuthenticated: true },
    });
  } catch (error) {
    report = { schemaVersion: 1, state: 'BLOCKED', gates: {}, error: String(error?.message || 'READBACK_FAILED').replace(/[^A-Z0-9_]/gi, '_').slice(0, 80) };
  }
  const output = JSON.stringify(report, null, 2) + '\n';
  if (process.env.ZITADEL_READBACK_OUTPUT) await writeFile(process.env.ZITADEL_READBACK_OUTPUT, output, { mode: 0o600 });
  console.log(output);
  if (report.state !== 'VERIFIED') process.exitCode = 1;
}
