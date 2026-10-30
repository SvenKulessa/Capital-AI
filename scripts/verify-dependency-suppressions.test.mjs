import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifySuppression } from './verify-dependency-suppressions.mjs';

const evidence = JSON.parse(fs.readFileSync('docs/security/evidence/dependency-decisions/typescript-7.0.2.json','utf8'));
const dependabotText = fs.readFileSync('.github/dependabot.yml','utf8');
const review = JSON.parse(fs.readFileSync(evidence.decision.reviewEvidenceRef,'utf8'));
const beforeReview = new Date('2026-10-29T12:00:00Z');

test('exact TypeScript suppression is evidence-bound before review date', () => {
  const r = verifySuppression({ evidence, dependabotText, review, today:beforeReview });
  assert.equal(r.passed, true, r.failures.join(','));
});

test('review date fails closed', () => {
  const r = verifySuppression({ evidence, dependabotText, review, today: new Date(evidence.decision.reviewOnOrAfter+'T00:00:00Z') });
  assert.equal(r.passed, false);
  assert.ok(r.failures.includes('SUPPRESSION_REVIEW_DUE'));
});

test('missing exact version is rejected', () => {
  const r = verifySuppression({ evidence, dependabotText: dependabotText.replace('- "7.0.2"','- "7.0.3"'), review, today:beforeReview });
  assert.equal(r.passed, false);
  assert.ok(r.failures.includes('DEPENDABOT_EXACT_VERSION_MISSING'));
});

test('renewed artifact review keeps the known-vulnerable compiler blocked', () => {
  const r = verifySuppression({
    evidence, dependabotText, review, today:beforeReview,
  });
  assert.equal(r.passed, true);
  assert.equal(evidence.decision.state, 'BLOCKED');
  assert.equal(evidence.decision.classification, 'BINARY_AFFECTED');
  assert.match(evidence.fingerprint.nativeArtifact.binarySha256, /^sha256:[0-9a-f]{64}$/);
  assert.ok(review.scan.highFindings>0);
});

test('moving only the deadline does not renew the artifact review', () => {
  const changed=structuredClone(evidence);
  changed.decision.reviewOnOrAfter='2026-11-01';
  const text=dependabotText.replace('Review on/after: '+evidence.decision.reviewOnOrAfter,'Review on/after: 2026-11-01');
  const r=verifySuppression({evidence:changed,dependabotText:text,review,today:beforeReview});
  assert.equal(r.passed,false);
  assert.ok(r.failures.includes('REVIEW_EVIDENCE_DATE_MISMATCH'));
});

test('a missing review, a different binary and an empty scan fail closed', () => {
  for (const input of [undefined,{...review,fingerprint:{...review.fingerprint,binarySha256:'sha256:'+'a'.repeat(64)}},{...review,scan:{...review.scan,packageCount:0}}]) {
    assert.equal(verifySuppression({evidence,dependabotText,review:input,today:beforeReview}).passed,false);
  }
});
