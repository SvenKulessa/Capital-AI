import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { entitlementForSubscription } from './lib/entitlements.mjs';
import { dependencyDiffToInventory } from './lib/scanner.mjs';
import { verifyWebhookSignature } from './lib/webhook.mjs';

test('webhook signature is verified with constant-time comparison', () => {
  const body = Buffer.from('{"ok":true}');
  const secret = 'secret';
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  assert.equal(verifyWebhookSignature(body, signature, secret), true);
  assert.equal(verifyWebhookSignature(body, `${signature.slice(0,-1)}0`, secret), false);
});

test('team plan enables PR gate and evidence history', () => {
  const entitlement = entitlementForSubscription({marketplace_purchase:{plan:{name:'Team'}}});
  assert.equal(entitlement.plan, 'team');
  assert.equal(entitlement.capabilities.prGate, true);
  assert.equal(entitlement.capabilities.evidenceHistory, true);
});

test('dependency scope mapping is fail-closed for runtime without repository config', () => {
  const inventory = dependencyDiffToInventory({
    dependencies:[{change_type:'added',name:'x',version:'1',license:'MIT',scope:'runtime'}],
    repository:'acme/repo',
    sourceSha:'abc'
  });
  assert.equal(inventory.components[0].usageClass, null);
});

test('repository config can classify runtime deployment', () => {
  const inventory = dependencyDiffToInventory({
    dependencies:[{change_type:'added',name:'x',version:'1',license:'MIT',scope:'runtime'}],
    repository:'acme/repo',
    sourceSha:'abc',
    repositoryConfig:{scopeUsageClasses:{runtime:'HOSTED_NETWORK_SERVICE'}}
  });
  assert.equal(inventory.components[0].usageClass, 'HOSTED_NETWORK_SERVICE');
});

import { createOAuthState, oauthAuthorizeUrl, verifyOAuthState } from './lib/oauth.mjs';

test('OAuth setup state is signed, expires and binds the installation', () => {
  const now = Date.UTC(2026, 9, 1, 15, 0, 0);
  const state = createOAuthState({ installationId: 42, marketplacePlanId: 7, secret: 'state-secret', now });
  const verified = verifyOAuthState(state, 'state-secret', now + 60_000);
  assert.equal(verified.installationId, 42);
  assert.equal(verified.marketplacePlanId, 7);
  assert.equal(verifyOAuthState(state, 'wrong-secret', now + 60_000), null);
  assert.equal(verifyOAuthState(state, 'state-secret', now + 11 * 60_000), null);
});

test('OAuth authorization URL binds callback and state', () => {
  const url = new URL(oauthAuthorizeUrl({ clientId: 'Iv1.example', redirectUri: 'https://legal.example/auth/github/callback', state: 'abc' }));
  assert.equal(url.origin + url.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(url.searchParams.get('client_id'), 'Iv1.example');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://legal.example/auth/github/callback');
  assert.equal(url.searchParams.get('state'), 'abc');
});
