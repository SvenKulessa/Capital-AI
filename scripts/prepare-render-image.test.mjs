import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { blueprint } from './prepare-render-image.mjs';
const profile = JSON.parse(await readFile(new URL('../deploy/render-image-profile.json', import.meta.url)));
const digest = 'a'.repeat(64); // Syntax fixture; never a release artifact.
test('mutable tags, foreign registries and malformed digests are rejected', () => {
  for (const image of ['ghcr.io/svenkulessa/capital-ai:latest', `ghcr.io/foreign/app@sha256:${digest}`, 'ghcr.io/svenkulessa/capital-ai@sha256:bad', `ghcr.io/svenkulessa/capital-ai@sha256:${digest}\ninjected: true`]) {
    assert.throws(() => blueprint(profile, image));
  }
});
test('prebuilt config preserves exact digest and isolates new service', () => {
  const image = `ghcr.io/svenkulessa/capital-ai@sha256:${digest}`;
  const result = blueprint(profile, image);
  assert.ok(result.includes(JSON.stringify(image)));
  assert.ok(result.includes('runtime: image'));
  assert.ok(result.includes('name: "Capital-AI"'));
  assert.ok(!result.includes('name: "Finance"'));
  assert.ok(!result.includes('dockerfilePath:'));
  assert.ok(!result.includes('buildCommand:'));
});
test('image promotion retains server-only Supabase auth and Vault configuration', () => {
  const result = blueprint(profile, `ghcr.io/svenkulessa/capital-ai@sha256:${digest}`);
  for (const key of [
    'PUBLIC_APP_ORIGIN',
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'AUTH_COOKIE_SIGNING_SECRET',
  ]) {
    assert.ok(result.includes(`      - key: ${key}\n        sync: false`));
  }
  assert.ok(!result.includes('OIDC_CLIENT_SECRET'));
  assert.ok(!result.includes('VITE_SUPABASE_SECRET_KEY'));
});
