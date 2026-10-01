import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPECTED_ISSUER, evaluateOidc } from './diagnose-oidc.mjs';
const env = { OIDC_ISSUER: EXPECTED_ISSUER, PUBLIC_APP_ORIGIN: 'https://capital-ai.online', OIDC_CLIENT_ID: 'private-id', OIDC_CLIENT_SECRET: 'private-secret' };
const meta = { issuer: EXPECTED_ISSUER, code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['client_secret_basic'], authorization_endpoint: EXPECTED_ISSUER + '/oauth/v2/authorize', token_endpoint: EXPECTED_ISSUER + '/oauth/v2/token', jwks_uri: EXPECTED_ISSUER + '/oauth/v2/keys' };
test('compatible configuration remains fail-closed without credential and login evidence', () => {
  const report = evaluateOidc(env, meta);
  assert.equal(report.configurationPass, true);
  assert.equal(report.credentialAuthenticationVerified, false);
  assert.equal(report.loginVerified, false);
  assert.equal(report.state, 'DISCOVERY_VERIFIED');
  assert.equal(report.pass, false);
  assert.ok(!JSON.stringify(report).includes('private-'));
});
test('full verification passes only with explicit credential and login evidence', () => {
  const report = evaluateOidc(env, meta, { credentialAuthenticationVerified: true, loginVerified: true });
  assert.equal(report.configurationPass, true);
  assert.equal(report.state, 'LOGIN_VERIFIED');
  assert.equal(report.pass, true);
});
test('console URLs, trailing issuer slash and unapproved origins fail closed', () => {
  for (const issuer of [EXPECTED_ISSUER + '/', EXPECTED_ISSUER + '/ui/console']) assert.equal(evaluateOidc({ ...env, OIDC_ISSUER: issuer }, meta).pass, false);
  assert.equal(evaluateOidc({ ...env, PUBLIC_APP_ORIGIN: 'https://other.example' }, meta).pass, false);
});
test('missing credentials and unsupported PKCE or client auth fail', () => {
  assert.equal(evaluateOidc({ ...env, OIDC_CLIENT_SECRET: '' }, meta).pass, false);
  assert.equal(evaluateOidc(env, { ...meta, code_challenge_methods_supported: ['plain'] }).pass, false);
  assert.equal(evaluateOidc(env, { ...meta, token_endpoint_auth_methods_supported: ['none'] }).pass, false);
});
test('discovery endpoints cannot cross the confirmed ZITADEL tenant boundary', () => {
  assert.equal(evaluateOidc(env, { ...meta, token_endpoint: 'https://other.example/token' }).pass, false);
});
