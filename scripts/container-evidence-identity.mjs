import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GIT_SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const BARE_SHA256 = /^[0-9a-f]{64}$/;

export const CONTAINER_IDENTITY_SCHEMA = 'CONTAINER_IDENTITY@1';
export const DIGEST_TYPES = Object.freeze({
  artifactArchiveDigest: 'GITHUB_ACTIONS_ARTIFACT_ARCHIVE_SHA256',
  localImageId: 'DOCKER_IMAGE_CONFIG_SHA256',
  ociIndexDigest: 'OCI_INDEX_SHA256',
  platformManifestDigest: 'OCI_PLATFORM_MANIFEST_SHA256',
  configDigest: 'OCI_IMAGE_CONFIG_SHA256',
  runtimeProviderDigest: 'RUNTIME_PROVIDER_PLATFORM_MANIFEST_SHA256',
});

function normalizeSha(value, required = false) {
  if (value == null || value === '') {
    if (required) throw new Error('Required Git SHA is missing');
    return null;
  }
  if (!GIT_SHA.test(value)) throw new Error('Invalid Git SHA: ' + value);
  return value;
}

export function normalizeSha256(value, required = false) {
  if (value == null || value === '') {
    if (required) throw new Error('Required SHA-256 digest is missing');
    return null;
  }
  const normalized = BARE_SHA256.test(value) ? 'sha256:' + value : value;
  if (!SHA256.test(normalized)) throw new Error('Invalid SHA-256 digest: ' + value);
  return normalized;
}

export function createContainerIdentity(env = process.env) {
  const eventName = env.GITHUB_EVENT_NAME || 'local';
  const testedSha = normalizeSha(env.GITHUB_SHA, true);
  const pullRequestHeadSha = normalizeSha(env.CAPITAL_PR_HEAD_SHA);
  const baseMainSha = normalizeSha(env.CAPITAL_BASE_MAIN_SHA);
  if (eventName === 'pull_request' && (!pullRequestHeadSha || !baseMainSha)) {
    throw new Error('pull_request identity requires CAPITAL_PR_HEAD_SHA and CAPITAL_BASE_MAIN_SHA');
  }
  return validateContainerIdentity({
    schema: CONTAINER_IDENTITY_SCHEMA,
    schemaVersion: 1,
    source: {
      eventName,
      sourceSha: pullRequestHeadSha || testedSha,
      testedSha,
      testedMergeSha: eventName === 'pull_request' ? testedSha : null,
      pullRequestHeadSha,
      baseMainSha,
    },
    digestTypes: { ...DIGEST_TYPES },
    digests: Object.fromEntries(Object.keys(DIGEST_TYPES).map(key => [key, null])),
  });
}

export function validateContainerIdentity(document) {
  if (!document || document.schema !== CONTAINER_IDENTITY_SCHEMA || document.schemaVersion !== 1) {
    throw new Error('Invalid container identity schema');
  }
  const source = document.source || {};
  normalizeSha(source.sourceSha, true);
  normalizeSha(source.testedSha, true);
  normalizeSha(source.testedMergeSha);
  normalizeSha(source.pullRequestHeadSha);
  normalizeSha(source.baseMainSha);
  if (source.eventName === 'pull_request') {
    if (source.testedMergeSha !== source.testedSha) throw new Error('testedMergeSha must equal testedSha for pull_request');
    if (source.sourceSha !== source.pullRequestHeadSha) throw new Error('sourceSha must equal pullRequestHeadSha for pull_request');
    if (!source.baseMainSha) throw new Error('baseMainSha is required for pull_request');
  } else if (source.testedMergeSha !== null) {
    throw new Error('testedMergeSha must be null outside pull_request');
  }
  for (const [key, type] of Object.entries(DIGEST_TYPES)) {
    if (document.digestTypes?.[key] !== type) throw new Error('Digest type mismatch: ' + key);
    normalizeSha256(document.digests?.[key]);
  }
  const { localImageId, configDigest, platformManifestDigest, runtimeProviderDigest } = document.digests;
  if (localImageId && configDigest && localImageId !== configDigest) {
    throw new Error('localImageId must equal configDigest for the promoted image');
  }
  if (platformManifestDigest && runtimeProviderDigest && platformManifestDigest !== runtimeProviderDigest) {
    throw new Error('runtimeProviderDigest must equal platformManifestDigest');
  }
  return document;
}

export function readContainerIdentity(path, required = true) {
  if (!existsSync(path)) {
    if (required) throw new Error('Container identity file missing: ' + path);
    return null;
  }
  return validateContainerIdentity(JSON.parse(readFileSync(path, 'utf8')));
}

export function writeContainerIdentity(path, document) {
  validateContainerIdentity(document);
  writeFileSync(path, JSON.stringify(document, null, 2) + '\n');
  return document;
}

export function setContainerDigests(document, updates) {
  const next = JSON.parse(JSON.stringify(document));
  for (const [key, value] of Object.entries(updates)) {
    if (!(key in DIGEST_TYPES)) throw new Error('Unknown digest field: ' + key);
    next.digests[key] = normalizeSha256(value);
  }
  return validateContainerIdentity(next);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, path, ...args] = process.argv.slice(2);
  if (command === 'init') {
    if (!path) throw new Error('Usage: init <output>');
    writeContainerIdentity(path, createContainerIdentity(process.env));
  } else if (command === 'set') {
    if (!path || args.length < 2 || args.length % 2 !== 0) {
      throw new Error('Usage: set <file> <digestField> <value> [<digestField> <value> ...]');
    }
    const updates = {};
    for (let i = 0; i < args.length; i += 2) updates[args[i]] = args[i + 1];
    writeContainerIdentity(path, setContainerDigests(readContainerIdentity(path), updates));
  } else {
    throw new Error('Usage: container-evidence-identity.mjs <init|set> ...');
  }
}
