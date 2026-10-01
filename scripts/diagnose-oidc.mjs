import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boundedJson } from '../server/http-security.mjs';

export const EXPECTED_ISSUER = 'https://capital-ai-hhxh4i.us1.zitadel.cloud';
const origins = new Set(['https://capital-ai.online', 'https://capital-ai-uvsl.onrender.com']);

export function evaluateOidc(env, metadata, verification = {}) {
  // Output contains booleans only: never credentials, subjects or authorization URLs.
  const gates = {
    issuerCanonical: env.OIDC_ISSUER === EXPECTED_ISSUER,
    originAllowed: origins.has(env.PUBLIC_APP_ORIGIN),
    credentialsPresent: !!env.OIDC_CLIENT_ID && !!env.OIDC_CLIENT_SECRET,
    discoveryCompatible: metadata?.issuer === env.OIDC_ISSUER &&
      metadata?.code_challenge_methods_supported?.includes('S256') === true &&
      (!metadata?.token_endpoint_auth_methods_supported ||
        metadata.token_endpoint_auth_methods_supported.includes('client_secret_basic')) &&
      ['authorization_endpoint', 'token_endpoint', 'jwks_uri'].every(key => {
        try {
          const url = new URL(metadata[key]);
          return url.origin === EXPECTED_ISSUER && !url.username && !url.password && !url.hash;
        } catch { return false; }
      }),
  };
  const configurationPass = Object.values(gates).every(Boolean);
  const credentialAuthenticationVerified = verification.credentialAuthenticationVerified === true;
  const loginVerified = verification.loginVerified === true;
  const pass = configurationPass && credentialAuthenticationVerified && loginVerified;
  const state = !configurationPass
    ? 'BLOCKED'
    : !credentialAuthenticationVerified
      ? 'DISCOVERY_VERIFIED'
      : !loginVerified
        ? 'CREDENTIAL_AUTHENTICATION_VERIFIED'
        : 'LOGIN_VERIFIED';
  return {
    gates,
    configurationPass,
    credentialAuthenticationVerified,
    loginVerified,
    state,
    pass,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = {};
  try {
    const raw = readFileSync(process.argv[2]);
    if (raw.length > 1024 * 1024) throw new Error('oversized');
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error('schema');
    for (const item of items) {
      const entry = item.envVar || item;
      if (['OIDC_ISSUER', 'PUBLIC_APP_ORIGIN', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET'].includes(entry.key)) {
        env[entry.key] = entry.value;
      }
    }
    let metadata;
    if (env.OIDC_ISSUER === EXPECTED_ISSUER) {
      metadata = await boundedJson(await fetch(EXPECTED_ISSUER + '/.well-known/openid-configuration', {
        redirect: 'error', signal: AbortSignal.timeout(5000),
      }));
    }
    const report = evaluateOidc(env, metadata);
    console.log(JSON.stringify(report));
    if (!report.pass) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({ pass: false, error: 'OIDC_DIAGNOSTIC_INPUT_OR_DISCOVERY_FAILED', loginVerified: false }));
    process.exitCode = 1;
  }
}
