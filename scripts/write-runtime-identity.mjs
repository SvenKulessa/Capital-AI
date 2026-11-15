import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;
const BUILDER = 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml';
const SOURCE_PLACEHOLDER = '__CAPITAL_AI_SOURCE_SHA_UNBOUND__';
const BUILDER_PLACEHOLDER = '__CAPITAL_AI_BUILDER_UNBOUND__';

export function runtimeIdentityDocument(sourceSha) {
  if (!SHA.test(sourceSha || '')) throw new Error('Expected lowercase 40-character Git SHA');
  return { schemaVersion: 1, bound: true, sourceSha, builder: BUILDER };
}

export function bindRuntimeIdentity(source, sourceSha) {
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

// Verify the source actually shipped in the built runtime image, not the checkout copy.
// In particular, an environment-supplied SHA or a second/ambiguous declaration is insufficient.
export function verifyBakedRuntimeIdentity(source, sourceSha) {
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
    writeFileSync(target, bindRuntimeIdentity(readFileSync(target, 'utf8'), process.argv[2]));
  }
}
