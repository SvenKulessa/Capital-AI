import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  bindRenderGitIdentity,
  bindRuntimeIdentity,
  runtimeIdentityDocument,
  verifyBakedRuntimeIdentity,
} from './write-runtime-identity.mjs';

const sourceSha = 'a'.repeat(40);
const foreignSha = 'b'.repeat(40);
const builder = 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml';
const template = "const embeddedSourceSha = '__CAPITAL_AI_SOURCE_SHA_UNBOUND__';\n" +
  "const embeddedBuilder = '__CAPITAL_AI_BUILDER_UNBOUND__';\n" +
  "const buildIdentity = embeddedSourceSha && embeddedBuilder;\n";

test('baked runtime identity must exactly match the stamped SHA and workflow', () => {
  const stamped = bindRuntimeIdentity(template, sourceSha);
  assert.deepEqual(verifyBakedRuntimeIdentity(stamped, sourceSha), runtimeIdentityDocument(sourceSha));
  assert.ok(stamped.includes("const embeddedSourceSha = '" + sourceSha + "';"));
  assert.ok(stamped.includes("const embeddedBuilder = '" + builder + "';"));
});

test('foreign source SHA, invalid SHA, changed builder and missing identity fail closed', () => {
  const stamped = bindRuntimeIdentity(template, sourceSha);
  for (const input of [
    [stamped, foreignSha],
    [stamped, 'main'],
    [stamped.replace(builder, 'other-workflow.yml'), sourceSha],
    [stamped.replace("const embeddedSourceSha = '" + sourceSha + "';", ''), sourceSha],
    [stamped.replace("const embeddedBuilder = '" + builder + "';", ''), sourceSha],
    [template, sourceSha],
  ]) {
    assert.throws(() => verifyBakedRuntimeIdentity(input[0], input[1]));
  }
});

test('duplicate declarations, leftover placeholders and checkout spoofing cannot pass', () => {
  const stamped = bindRuntimeIdentity(template, sourceSha);
  for (const source of [
    stamped + "const embeddedSourceSha = '" + sourceSha + "';\n",
    stamped + "const embeddedBuilder = '" + builder + "';\n",
    stamped + "// __CAPITAL_AI_SOURCE_SHA_UNBOUND__\n",
    stamped + "// __CAPITAL_AI_BUILDER_UNBOUND__\n",
    "process.env.RENDER_GIT_COMMIT='" + sourceSha + "';\n",
  ]) {
    assert.throws(() => verifyBakedRuntimeIdentity(source, sourceSha));
  }
  assert.throws(() => bindRuntimeIdentity(stamped, sourceSha), /placeholders missing or already bound/);
});

test('verify mode requires the image-contained source, not a synthetic environment identity', () => {
  assert.throws(() => verifyBakedRuntimeIdentity('', sourceSha));
  assert.throws(() => runtimeIdentityDocument(sourceSha.toUpperCase()));
});

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


test('reverse mixed provenance and ambiguous Render declarations are denied', () => {
  const render = bindRenderGitIdentity(SOURCE, SHA);
  assert.throws(() => bindRuntimeIdentity(render, SHA), /Mixing Render and GitHub/);
  const baked = bindRuntimeIdentity(SOURCE, SHA);
  assert.throws(() => verifyBakedRuntimeIdentity(baked.replace('__CAPITAL_AI_RENDER_GIT_SHA_UNBOUND__', foreignSha), SHA), /Mixing Render and GitHub/);
  assert.throws(() => verifyBakedRuntimeIdentity(baked + "\nconst embeddedRenderGitSha = '" + foreignSha + "';", SHA));
  assert.throws(() => runtimeIdentityDocument([SHA]));
  assert.throws(() => bindRenderGitIdentity(SOURCE, [SHA]));
});
