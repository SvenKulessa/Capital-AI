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
