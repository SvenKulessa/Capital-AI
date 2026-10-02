import fs from 'node:fs';

const evidencePath = 'docs/security/evidence/dependency-decisions/typescript-7.0.2.json';
const dependabotPath = '.github/dependabot.yml';

export function verifySuppression({ evidence, dependabotText, today = new Date() }) {
  const failures = [];
  const version = evidence?.dependency?.candidateVersion;
  const name = evidence?.dependency?.name;
  const review = evidence?.decision?.reviewOnOrAfter;

  if (!name || !version || !review) failures.push('EVIDENCE_FIELDS_MISSING');
  if (!dependabotText.includes('dependency-name: "' + name + '"')) failures.push('DEPENDABOT_DEPENDENCY_MISSING');
  if (!dependabotText.includes('- "' + version + '"')) failures.push('DEPENDABOT_EXACT_VERSION_MISSING');
  if (!dependabotText.includes(evidencePath)) failures.push('DEPENDABOT_EVIDENCE_REF_MISSING');
  if (!dependabotText.includes('Review on/after: ' + review)) failures.push('DEPENDABOT_REVIEW_DATE_MISSING');

  const reviewDate = new Date(review + 'T00:00:00Z');
  if (Number.isNaN(reviewDate.getTime())) failures.push('REVIEW_DATE_INVALID');
  else if (today >= reviewDate) failures.push('SUPPRESSION_REVIEW_DUE');

  const tsBlockStart = dependabotText.indexOf('dependency-name: "typescript"');
  if (tsBlockStart >= 0) {
    const block = dependabotText.slice(tsBlockStart, tsBlockStart + 240);
    if (block.includes('version-update:semver-major')) failures.push('TYPESCRIPT_BLANKET_MAJOR_IGNORE_FORBIDDEN');
  }

  return { passed: failures.length === 0, failures, reviewOnOrAfter: review };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const dependabotText = fs.readFileSync(dependabotPath, 'utf8');
  const result = verifySuppression({ evidence, dependabotText });
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
