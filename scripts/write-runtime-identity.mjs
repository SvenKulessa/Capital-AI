import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;
const BUILDER = 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml';
const SOURCE_PLACEHOLDER = '__CAPITAL_AI_SOURCE_SHA_UNBOUND__';
const BUILDER_PLACEHOLDER = '__CAPITAL_AI_BUILDER_UNBOUND__';
const RENDER_PLACEHOLDER = '__CAPITAL_AI_RENDER_GIT_SHA_UNBOUND__';

export function runtimeIdentityDocument(sourceSha) {
  if (typeof sourceSha !== 'string' || !SHA.test(sourceSha)) throw new Error('Expected lowercase 40-character Git SHA');
  return { schemaVersion: 1, bound: true, sourceSha, builder: BUILDER };
}

// Optional for historical minimal templates; a declared Render identity must be unbound.
function assertRenderIdentityUnbound(source) {
  const lines = source.split(/\r?\n/).filter(line => /^\s*const\s+embeddedRenderGitSha\b/.test(line));
  if (lines.length > 0 && (lines.length !== 1 || lines[0] !== "const embeddedRenderGitSha = '" + RENDER_PLACEHOLDER + "';")) {
    throw new Error('Mixing Render and GitHub build identities denied');
  }
}

export function bindRuntimeIdentity(source, sourceSha) {
  assertRenderIdentityUnbound(source);
  const identity = runtimeIdentityDocument(sourceSha);
  if (!source.includes(SOURCE_PLACEHOLDER) || !source.includes(BUILDER_PLACEHOLDER)) {
    throw new Error('Runtime identity placeholders missing or already bound');
  }
  const bound = source
    .replace(SOURCE_PLACEHOLDER, identity.sourceSha)
    .replace(BUILDER_PLACEHOLDER, identity.builder);
  if (bound.includes(SOURCE_PLACEHOLDER) || bound.includes(BUILDER_PLACEHOLDER)) {
    throw new Error('Runtime identity binding incomplete');
  }
  return bound;
}

// Render Git Docker may bake its nonsecret source SHA; never impersonate
// GitHub Actions builder identity or an immutable OCI attestation.
export function bindRenderGitIdentity(source, renderGitSha) {
  if (!renderGitSha) return source;
  if (typeof renderGitSha !== 'string' || !SHA.test(renderGitSha)) throw new Error('Invalid Render Git build SHA');
  if (!source.includes(SOURCE_PLACEHOLDER) || !source.includes(BUILDER_PLACEHOLDER)) {
    throw new Error('Mixing GitHub and Render Git build identities denied');
  }
  if (source.split(RENDER_PLACEHOLDER).length !== 2) {
    throw new Error('Render Git source placeholder missing or ambiguous');
  }
  return source.replace(RENDER_PLACEHOLDER, renderGitSha);
}

// Verify the source actually shipped in the built runtime image, not the checkout copy.
// In particular, an environment-supplied SHA or a second/ambiguous declaration is insufficient.
export function verifyBakedRuntimeIdentity(source, sourceSha) {
  assertRenderIdentityUnbound(source);
  const identity = runtimeIdentityDocument(sourceSha);
  const lines = String(source).split(/\r?\n/);
  for (const [name, value] of [
    ['embeddedSourceSha', identity.sourceSha],
    ['embeddedBuilder', identity.builder],
  ]) {
    const declarations = lines.filter(line => line.startsWith('const ' + name + ' = '));
    if (declarations.length !== 1 || declarations[0] !== `const ${name} = '${value}';`) {
      throw new Error('Baked runtime identity missing, ambiguous or mismatched: ' + name);
    }
  }
  if (source.includes(SOURCE_PLACEHOLDER) || source.includes(BUILDER_PLACEHOLDER)) {
    throw new Error('Unbound placeholder remains in runtime image');
  }
  return identity;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'verify') {
    if (!process.argv[3]) throw new Error('Expected baked runtime source path');
    verifyBakedRuntimeIdentity(readFileSync(resolve(process.argv[3]), 'utf8'), process.argv[4]);
    console.log('BUILD_IDENTITY_IMAGE_MATCH');
  } else {
    const target = resolve('server/index.mjs');
    const source = readFileSync(target, 'utf8');
    const bound = process.argv[2] === 'render-git'
      ? bindRenderGitIdentity(source, process.argv[3])
      : bindRuntimeIdentity(source, process.argv[2]);
    if (bound !== source) writeFileSync(target, bound);
  }
}
