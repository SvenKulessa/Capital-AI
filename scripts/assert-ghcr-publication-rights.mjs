import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_SHA = /^[a-f0-9]{40}$/;
const PINNED_BASE = /^FROM (node:[0-9]+\.[0-9]+\.[0-9]+-alpine@sha256:[a-f0-9]{64}) AS crypto-base$/gm;
const SOURCE_LABEL = /^LABEL org\.opencontainers\.image\.source=https:\/\/github\.com\/SvenKulessa\/Capital-AI$/gm;

// An immutable candidate is still redistributed when pushed to a public registry.
// Fail closed on the existing rights evidence, before registry login or image push.
export function assertGhcrPublicationRights({ license, sourceSha, dockerfile }) {
  if (!SOURCE_SHA.test(sourceSha || '')) throw new Error('Invalid publication source SHA');
  const pins = [...String(dockerfile || '').matchAll(PINNED_BASE)];
  if (pins.length !== 1) throw new Error('Exactly one pinned crypto-base source is required');
  // GitHub's OCI source label links the package to the repository on first publish.
  if ([...String(dockerfile).matchAll(SOURCE_LABEL)].length !== 1) {
    throw new Error('Missing or ambiguous OCI repository source label for GHCR');
  }
  if (license?.status !== 'APPROVED' || license?.deployEligible !== true ||
      license?.applicationSourceSha !== sourceSha ||
      !Array.isArray(license?.remainingGates) || license.remainingGates.length !== 0 ||
      !license?.legalApproval || typeof license.legalApproval !== 'object' ||
      Array.isArray(license.legalApproval) || Object.keys(license.legalApproval).length === 0 ||
      license?.baseImage !== pins[0][1]) {
    throw new Error('GHCR redistribution rights not evidenced for exact source and pinned base image');
  }
  return { sourceSha, baseImage: pins[0][1], redistributionApproved: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [licensePath, dockerfilePath, sourceSha] = process.argv.slice(2);
  if (!licensePath || !dockerfilePath || !sourceSha) {
    throw new Error('Usage: assert-ghcr-publication-rights.mjs <license.json> <Dockerfile> <source-sha>');
  }
  assertGhcrPublicationRights({
    license: JSON.parse(readFileSync(licensePath, 'utf8')),
    dockerfile: readFileSync(dockerfilePath, 'utf8'),
    sourceSha,
  });
  console.log('GHCR_REDISTRIBUTION_RIGHTS_SOURCE_AND_BASE_VERIFIED');
}
