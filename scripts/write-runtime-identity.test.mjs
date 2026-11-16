import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bindRenderGitIdentity, bindRuntimeIdentity, verifyBakedRuntimeIdentity } from './write-runtime-identity.mjs';

const SHA = 'a'.repeat(40);
const BUILDER = 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml';
const SOURCE = [
  "const embeddedSourceSha = '__CAPITAL_AI_SOURCE_SHA_UNBOUND__';",
  "const embeddedBuilder = '__CAPITAL_AI_BUILDER_UNBOUND__';",
  "const embeddedRenderGitSha = '__CAPITAL_AI_RENDER_GIT_SHA_UNBOUND__';",
].join('\n');

test('Render Git SHA never creates GitHub builder identity', () => {
  const stamped = bindRenderGitIdentity(SOURCE, SHA);
  assert.ok(stamped.includes("const embeddedRenderGitSha = '" + SHA + "';"));
  assert.ok(stamped.includes('__CAPITAL_AI_SOURCE_SHA_UNBOUND__'));
  assert.ok(stamped.includes('__CAPITAL_AI_BUILDER_UNBOUND__'));
  assert.equal(bindRenderGitIdentity(SOURCE, ''), SOURCE);
  assert.throws(() => verifyBakedRuntimeIdentity(stamped, SHA));
});

test('GitHub image binds exact builder without Render SHA', () => {
  const baked = bindRuntimeIdentity(SOURCE, SHA);
  assert.deepEqual(verifyBakedRuntimeIdentity(baked, SHA), {
    schemaVersion: 1, bound: true, sourceSha: SHA, builder: BUILDER
  });
  assert.ok(baked.includes('__CAPITAL_AI_RENDER_GIT_SHA_UNBOUND__'));
});

test('malformed, duplicate and mixed Render/GitHub provenance is denied', () => {
  assert.throws(() => bindRenderGitIdentity(SOURCE, 'invalid'));
  assert.throws(() => bindRenderGitIdentity(SOURCE.replace('__CAPITAL_AI_RENDER_GIT_SHA_UNBOUND__', ''), SHA));
  assert.throws(() => bindRenderGitIdentity(SOURCE + '__CAPITAL_AI_RENDER_GIT_SHA_UNBOUND__', SHA));
  assert.throws(() => bindRenderGitIdentity(bindRuntimeIdentity(SOURCE, SHA), SHA));
  assert.throws(() => bindRenderGitIdentity(bindRenderGitIdentity(SOURCE, SHA), SHA));
});

test('Render Dockerfile consumes only its own nonsecret build SHA arg', () => {
  const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.ok(dockerfile.includes('ARG RENDER_GIT_COMMIT'));
  assert.ok(dockerfile.includes('render-git "${RENDER_GIT_COMMIT:-}"'));
  assert.ok(!dockerfile.includes('ARG GITHUB_SHA'));
});
