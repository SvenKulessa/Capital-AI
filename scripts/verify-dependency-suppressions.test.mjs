import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifySuppression } from './verify-dependency-suppressions.mjs';

const evidence = JSON.parse(fs.readFileSync('docs/security/evidence/dependency-decisions/typescript-7.0.2.json','utf8'));
const dependabotText = fs.readFileSync('.github/dependabot.yml','utf8');

test('exact TypeScript suppression is evidence-bound before review date', () => {
  const r = verifySuppression({ evidence, dependabotText, today: new Date('2026-10-02T08:00:00Z') });
  assert.equal(r.passed, true, r.failures.join(','));
});

test('review date fails closed', () => {
  const r = verifySuppression({ evidence, dependabotText, today: new Date('2026-10-09T00:00:00Z') });
  assert.equal(r.passed, false);
  assert.ok(r.failures.includes('SUPPRESSION_REVIEW_DUE'));
});

test('missing exact version is rejected', () => {
  const r = verifySuppression({ evidence, dependabotText: dependabotText.replace('- "7.0.2"','- "7.0.3"'), today: new Date('2026-10-02T08:00:00Z') });
  assert.equal(r.passed, false);
  assert.ok(r.failures.includes('DEPENDABOT_EXACT_VERSION_MISSING'));
});
