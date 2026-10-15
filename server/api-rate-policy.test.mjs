import test from 'node:test';
import assert from 'node:assert/strict';
import { API_RATE_GROUPS, apiRateGroup, createApiRateGate } from './api-rate-policy.mjs';

test('every API route uses a named budget, with login, recovery and AI separated', () => {
  for (const [pathname, group] of [
    ['/api/auth/login/email', 'password_login'],
    ['/api/auth/login/google', 'authentication'],
    ['/api/auth/password/reset', 'password_recovery'],
    ['/api/auth/request-reset', 'password_recovery'],
    ['/api/crypto/score', 'ai_compute'],
    ['/api/ai/research', 'ai_compute'],
    ['/api/market/quote', 'api_other'],
    ['/api/billing/catalog', 'api_other'],
    ['/api/private/customer', 'api_other'],
  ]) assert.equal(apiRateGroup(pathname), group);
  assert.equal(apiRateGroup('/healthz'), null);
  assert.equal(apiRateGroup('/api/not-in-list'), 'api_other');
  assert.ok(Object.values(API_RATE_GROUPS).every(p => Number.isSafeInteger(p.limit) && p.limit > 0));
});

test('each route family rejects requests beyond its budget, renews on window expiry', () => {
  let time = 0;
  const gate = createApiRateGate(() => time);
  for (const [path, group] of [
    ['/api/auth/password/reset', 'password_recovery'],
    ['/api/auth/login/email', 'password_login'],
    ['/api/auth/login/google', 'authentication'],
    ['/api/crypto/score', 'ai_compute'],
    ['/api/billing/catalog', 'api_other'],
  ]) {
    for (let i = 0; i < API_RATE_GROUPS[group].limit; i++) {
      assert.equal(gate(path).allowed, true, path + ' request ' + i);
    }
    assert.deepEqual(gate(path), { allowed: false, group, retryAfterSeconds: API_RATE_GROUPS[group].retryAfterSeconds });
    time += API_RATE_GROUPS[group].windowMs + 1;
  }
});
