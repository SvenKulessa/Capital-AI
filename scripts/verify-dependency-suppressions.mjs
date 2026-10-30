import fs from 'node:fs';

const evidencePath = 'docs/security/evidence/dependency-decisions/typescript-7.0.2.json';
const dependabotPath = '.github/dependabot.yml';

export function verifySuppression({ evidence, dependabotText, review, today = new Date() }) {
  const failures = [];
  const version = evidence?.dependency?.candidateVersion;
  const name = evidence?.dependency?.name;
  const reviewOnOrAfter = evidence?.decision?.reviewOnOrAfter;

  if (!name || !version || !reviewOnOrAfter) failures.push('EVIDENCE_FIELDS_MISSING');
  if (!dependabotText.includes('dependency-name: "' + name + '"')) failures.push('DEPENDABOT_DEPENDENCY_MISSING');
  if (!dependabotText.includes('- "' + version + '"')) failures.push('DEPENDABOT_EXACT_VERSION_MISSING');
  if (!dependabotText.includes(evidencePath)) failures.push('DEPENDABOT_EVIDENCE_REF_MISSING');
  if (!dependabotText.includes('Review on/after: ' + reviewOnOrAfter)) failures.push('DEPENDABOT_REVIEW_DATE_MISSING');

  const reviewDate = new Date(reviewOnOrAfter + 'T00:00:00Z');
  if (Number.isNaN(reviewDate.getTime())) failures.push('REVIEW_DATE_INVALID');
  else if (today >= reviewDate) failures.push('SUPPRESSION_REVIEW_DUE');

  // A renewed date must be backed by the same reviewed artifact and actual
  // binary-scan coverage. The known-blocked compiler is never promoted here.
  if (evidence?.decision?.reviewEvidenceRef) {
    if (!review || review.state !== 'BLOCKED') failures.push('REVIEW_EVIDENCE_MISSING');
    else {
      if (review.reviewOnOrAfter !== evidence.decision.reviewOnOrAfter || review.evaluatedAt !== evidence.decision.evaluatedAt) failures.push('REVIEW_EVIDENCE_DATE_MISMATCH');
      const expected = evidence.fingerprint;
      if (review.fingerprint?.packageIntegrity !== expected.package.integrity ||
          review.fingerprint?.nativeArtifactIntegrity !== expected.nativeArtifact.integrity ||
          review.fingerprint?.binarySha256 !== expected.nativeArtifact.binarySha256 ||
          !/^sha256:[0-9a-f]{64}$/.test(review.fingerprint?.binarySha256 || '')) failures.push('REVIEW_ARTIFACT_MISMATCH');
      if (review.scan?.target !== 'package/lib/tsc' || !(review.scan.packageCount > 0) || !(review.scan.highFindings > 0)) failures.push('REVIEW_BINARY_COVERAGE_MISSING');
    }
  }

  const tsBlockStart = dependabotText.indexOf('dependency-name: "typescript"');
  if (tsBlockStart >= 0) {
    const block = dependabotText.slice(tsBlockStart, tsBlockStart + 240);
    if (block.includes('version-update:semver-major')) failures.push('TYPESCRIPT_BLANKET_MAJOR_IGNORE_FORBIDDEN');
  }

  return { passed: failures.length === 0, failures, reviewOnOrAfter };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const dependabotText = fs.readFileSync(dependabotPath, 'utf8');
  const review = evidence.decision.reviewEvidenceRef
    ? JSON.parse(fs.readFileSync(evidence.decision.reviewEvidenceRef, 'utf8')) : undefined;
  const result = verifySuppression({ evidence, dependabotText, review });
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
