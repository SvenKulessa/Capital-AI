import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialXEdgeClient } from './x-edge-client.mjs';

test('Edge mode is opt-in and requires an authenticated request', () => {
  assert.throws(() => createSocialXEdgeClient({ env: {} }), /SOCIAL_X_EDGE_DISABLED/);
  assert.throws(() => createSocialXEdgeClient({ env: {
    SOCIAL_X_EDGE_STORE_ENABLED: 'true',
    PUBLIC_APP_ORIGIN: 'https://capital-ai.online/',
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key-for-testing',
  } }), /SOCIAL_X_EDGE_AUTH_UNAVAILABLE/);
});

test('Edge begin sends only a hashed state and the user session token', async () => {
  const observed = [];
  const env = {
    SOCIAL_X_EDGE_STORE_ENABLED: 'true',
    PUBLIC_APP_ORIGIN: 'https://capital-ai.online/',
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key-for-testing',
  };
  const token = 'synthetic-session-' + 't'.repeat(75);
  const client = createSocialXEdgeClient({ env, userAccessToken: token,
    fetchImpl: async (target, options) => {
      observed.push({ target: String(target), options });
      return { ok: true, text: async () => JSON.stringify({ prepared: true }) };
    },
  });
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const redirectUri = 'https://capital-ai.online/api/social-media/auth/callback';
  const started = await client.beginOAuth({ userId, channel: 'X',
    redirectUri, allowedRedirectUris: [redirectUri], codeVerifier: 'v'.repeat(43) });
  assert.match(started.state, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(observed.length, 1);
  assert.equal(observed[0].options.headers.Authorization, 'Bearer ' + token);
  assert.equal(observed[0].options.headers.apikey, env.SUPABASE_PUBLISHABLE_KEY);
  const body = JSON.parse(observed[0].options.body);
  assert.equal(body.operation, 'begin');
  assert.match(body.stateHash, /^[a-f0-9]{64}$/);
  assert.notEqual(body.stateHash, started.state);
  assert.ok(!JSON.stringify(body).includes(started.state));
});
