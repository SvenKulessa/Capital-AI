import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSupabaseAuth } from './diagnose-supabase-auth.mjs';

const env = {
  PUBLIC_APP_ORIGIN: 'https://capital-ai.online',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  AUTH_COOKIE_SIGNING_SECRET: 'a'.repeat(32),
};
const settings = { external: { google: true } };

test('Supabase configuration alone remains fail-closed without credential and login evidence', () => {
  const report = evaluateSupabaseAuth(env, settings);
  assert.equal(report.configurationPass, true);
  assert.equal(report.credentialAuthenticationVerified, false);
  assert.equal(report.loginVerified, false);
  assert.equal(report.state, 'PROVIDER_CONFIGURATION_VERIFIED');
  assert.equal(report.pass, false);
  assert.doesNotMatch(JSON.stringify(report), /sb_publishable|sb_secret|project\.supabase/);
});

test('full verification passes only with explicit credential and real-login evidence', () => {
  const report = evaluateSupabaseAuth(env, settings, {
    credentialAuthenticationVerified: true,
    loginVerified: true,
  });
  assert.equal(report.configurationPass, true);
  assert.equal(report.state, 'LOGIN_VERIFIED');
  assert.equal(report.pass, true);
});

test('missing server secret, signing secret, Google provider or approved origin fails closed', () => {
  assert.equal(evaluateSupabaseAuth({ ...env, SUPABASE_SECRET_KEY: '' }, settings).pass, false);
  assert.equal(evaluateSupabaseAuth({ ...env, AUTH_COOKIE_SIGNING_SECRET: 'short' }, settings).pass, false);
  assert.equal(evaluateSupabaseAuth(env, { external: { google: false } }).pass, false);
  assert.equal(evaluateSupabaseAuth({ ...env, PUBLIC_APP_ORIGIN: 'https://other.example' }, settings).pass, false);
});

test('non-HTTPS or path-bearing project URLs fail closed', () => {
  assert.equal(evaluateSupabaseAuth({ ...env, SUPABASE_URL: 'http://project.supabase.co' }, settings).pass, false);
  assert.equal(evaluateSupabaseAuth({ ...env, SUPABASE_URL: 'https://project.supabase.co/path' }, settings).pass, false);
});
