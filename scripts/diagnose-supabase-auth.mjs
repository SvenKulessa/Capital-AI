import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boundedJson, secureUrl } from '../server/http-security.mjs';

const origins = new Set(['https://capital-ai.online', 'https://capital-ai-uvsl.onrender.com']);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function evaluateSupabaseAuth(env, settings, verification = {}) {
  let projectUrlSecure = false;
  try {
    const project = secureUrl(env.SUPABASE_URL);
    projectUrlSecure = project.href === project.origin + '/';
  } catch {
    projectUrlSecure = false;
  }

  const gates = {
    originAllowed: origins.has(env.PUBLIC_APP_ORIGIN),
    projectUrlSecure,
    publishableKeyPresent: nonEmpty(env.SUPABASE_PUBLISHABLE_KEY),
    serverSecretPresent: nonEmpty(env.SUPABASE_SECRET_KEY),
    cookieSigningSecretPresent:
      typeof env.AUTH_COOKIE_SIGNING_SECRET === 'string' &&
      env.AUTH_COOKIE_SIGNING_SECRET.length >= 32,
    providerSettingsReadable: settings && typeof settings === 'object',
    googleProviderConfigured: settings?.external?.google === true,
  };

  const configurationPass = Object.values(gates).every(Boolean);
  const credentialAuthenticationVerified =
    verification.credentialAuthenticationVerified === true;
  const loginVerified = verification.loginVerified === true;
  const pass =
    configurationPass &&
    credentialAuthenticationVerified &&
    loginVerified;

  const state = !configurationPass
    ? 'BLOCKED'
    : !credentialAuthenticationVerified
      ? 'PROVIDER_CONFIGURATION_VERIFIED'
      : !loginVerified
        ? 'CREDENTIAL_AUTHENTICATION_VERIFIED'
        : 'LOGIN_VERIFIED';

  return {
    provider: 'supabase',
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
      if (
        [
          'PUBLIC_APP_ORIGIN',
          'SUPABASE_URL',
          'SUPABASE_PUBLISHABLE_KEY',
          'SUPABASE_SECRET_KEY',
          'AUTH_COOKIE_SIGNING_SECRET',
        ].includes(entry.key)
      ) {
        env[entry.key] = entry.value;
      }
    }

    let settings = null;
    if (nonEmpty(env.SUPABASE_URL) && nonEmpty(env.SUPABASE_PUBLISHABLE_KEY)) {
      const project = secureUrl(env.SUPABASE_URL);
      settings = await boundedJson(
        await fetch(new URL('/auth/v1/settings', project), {
          headers: {
            Accept: 'application/json',
            apikey: env.SUPABASE_PUBLISHABLE_KEY,
          },
          redirect: 'error',
          signal: AbortSignal.timeout(5000),
        }),
      );
    }

    const report = evaluateSupabaseAuth(env, settings);
    console.log(JSON.stringify(report));
    if (!report.pass) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({
      provider: 'supabase',
      pass: false,
      error: 'SUPABASE_AUTH_DIAGNOSTIC_INPUT_OR_SETTINGS_FAILED',
      loginVerified: false,
    }));
    process.exitCode = 1;
  }
}
