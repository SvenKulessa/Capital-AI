import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
