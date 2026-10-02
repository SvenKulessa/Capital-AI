import fs from 'node:fs';
import path from 'node:path';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function equal(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function present(value) {
  return value !== null && value !== undefined && value !== '';
}

export function evaluateDependencyRetry({ evidence, candidate }) {
  if (!evidence || evidence.schema !== 'CAPITAL_AI_SH_SUPPLY_CHAIN_DEPENDENCY_RECOVERY@1') {
    return { decision: 'MANUAL_REVIEW_REQUIRED', reasons: ['EVIDENCE_SCHEMA_MISSING_OR_INVALID'] };
  }
  if (!candidate || candidate.name !== evidence.dependency.name) {
    return { decision: 'MANUAL_REVIEW_REQUIRED', reasons: ['DEPENDENCY_IDENTITY_MISMATCH'] };
  }

  const reasons = [];
  if (candidate.version !== evidence.dependency.candidateVersion) reasons.push('VERSION_CHANGED');

  const ef = evidence.fingerprint;
  const cf = candidate.fingerprint || {};

  if (!present(cf.packageIntegrity)) reasons.push('PACKAGE_INTEGRITY_MISSING');
  else if (cf.packageIntegrity !== ef.package.integrity) reasons.push('PACKAGE_INTEGRITY_CHANGED');

  if (!present(cf.nativeArtifactIntegrity)) reasons.push('NATIVE_ARTIFACT_INTEGRITY_MISSING');
  else if (cf.nativeArtifactIntegrity !== ef.nativeArtifact.integrity) reasons.push('NATIVE_ARTIFACT_INTEGRITY_CHANGED');

  if (present(ef.nativeArtifact.binarySha256)) {
    if (!present(cf.binarySha256)) reasons.push('BINARY_SHA256_MISSING');
    else if (cf.binarySha256 !== ef.nativeArtifact.binarySha256) reasons.push('BINARY_SHA256_CHANGED');
  } else if (present(cf.binarySha256)) {
    reasons.push('BINARY_SHA256_NEW_EVIDENCE');
  }

  if (!equal(cf.embeddedRuntime, ef.nativeArtifact.embeddedRuntime)) {
    reasons.push(present(cf.embeddedRuntime) ? 'EMBEDDED_RUNTIME_CHANGED' : 'EMBEDDED_RUNTIME_MISSING');
  }

  if (!present(cf.securityEvidenceRevision)) reasons.push('SECURITY_EVIDENCE_REVISION_MISSING');
  else if (cf.securityEvidenceRevision !== ef.securityEvidence.evidenceRevision) reasons.push('SECURITY_EVIDENCE_CHANGED');

  if (reasons.some(reason => reason.endsWith('_MISSING'))) {
    return { decision: 'MANUAL_REVIEW_REQUIRED', reasons };
  }
  if (reasons.length) {
    return { decision: 'RETRY_REQUIRED', reasons };
  }

  return {
    decision: 'SUPPRESS_WITH_EVIDENCE',
    reasons: ['VERSION_AND_ARTIFACT_FINGERPRINT_ALREADY_BLOCKED'],
    reviewOnOrAfter: evidence.decision.reviewOnOrAfter,
    classification: evidence.decision.classification,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [evidenceFile, candidateFile] = process.argv.slice(2);
  if (!candidateFile) {
    console.error('Usage: node scripts/evaluate-dependency-retry.mjs <evidence.json> <candidate.json>');
    process.exit(2);
  }
  const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
  const candidate = JSON.parse(fs.readFileSync(candidateFile, 'utf8'));
  const result = evaluateDependencyRetry({ evidence, candidate });
  console.log(JSON.stringify(result, null, 2));
  if (result.decision === 'MANUAL_REVIEW_REQUIRED') process.exitCode = 2;
}
