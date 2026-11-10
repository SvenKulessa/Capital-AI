import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_SHA = /^[a-f0-9]{40}$/;
const PINNED_BASE = /^FROM (node:[0-9]+\.[0-9]+\.[0-9]+-alpine@sha256:[a-f0-9]{64}) AS crypto-base$/gm;
const SOURCE_LABEL = /^LABEL org\.opencontainers\.image\.source=https:\/\/github\.com\/SvenKulessa\/Capital-AI$/gm;

// An immutable candidate is still redistributed when pushed to a public registry.
// Report specific evidence gaps, but never treat this read-only assessment as permission.
export function assessGhcrPublicationRights({ license, sourceSha, dockerfile }) {
  const blockers = [];
  const sourceValid = SOURCE_SHA.test(sourceSha || '');
  const pins = [...String(dockerfile || '').matchAll(PINNED_BASE)];
  const labels = [...String(dockerfile || '').matchAll(SOURCE_LABEL)];
  const pin = pins.length === 1 ? pins[0][1] : null;
  if (!sourceValid) blockers.push('INVALID_SOURCE_SHA');
  if (!pin) blockers.push('MISSING_OR_AMBIGUOUS_PINNED_BASE');
  if (labels.length !== 1) blockers.push('MISSING_OR_AMBIGUOUS_OCI_SOURCE_LABEL');

  if (license?.status !== 'APPROVED') blockers.push('REDISTRIBUTION_REVIEW_OPEN');
  if (license?.deployEligible !== true) blockers.push('DEPLOY_ELIGIBILITY_NOT_GRANTED');
  if (!sourceValid || license?.applicationSourceSha !== sourceSha) blockers.push('SOURCE_EVIDENCE_SHA_MISMATCH');
  if (!pin || license?.baseImage !== pin) blockers.push('BASE_IMAGE_EVIDENCE_MISMATCH');
  if (!Array.isArray(license?.remainingGates) ||
      license.remainingGates.some(gate => typeof gate !== 'string' || !gate.trim())) {
    blockers.push('REMAINING_GATES_NOT_VERIFIABLE');
  } else if (license.remainingGates.length !== 0) {
    blockers.push('REMAINING_GATES_OPEN');
  }

  const approval = license?.legalApproval;
  // An arbitrary nonempty object cannot stand in for a documented rights decision.
  if (!approval || typeof approval !== 'object' || Array.isArray(approval) ||
      typeof approval.reference !== 'string' || approval.reference.trim().length < 8 ||
      approval.reference.length > 512) {
    blockers.push('LEGAL_APPROVAL_REFERENCE_MISSING');
  }
  return {
    schema: 'CAPITAL_AI_GHCR_RIGHTS_PRECHECK@1',
    status: blockers.length ? 'BLOCKED' : 'EVIDENCE_CONTRACT_MATCHED',
    blockers,
    sourceSha: sourceValid ? sourceSha : null,
    pinnedBaseImage: pin,
  };
}

export function assertGhcrPublicationRights(input) {
  const assessment = assessGhcrPublicationRights(input);
  if (assessment.blockers.length) {
    throw new Error('GHCR redistribution rights not evidenced: ' + assessment.blockers.join(','));
  }
  return {
    sourceSha: assessment.sourceSha,
    baseImage: assessment.pinnedBaseImage,
    redistributionApproved: true,
  };
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
