import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  analyzeDocumentationDrift,
  extractCurrentMainClaims,
  findRoadmapDuplicateIds,
  isHistoricalPath,
  isLivingDocument,
} from './documentation-drift.mjs';

const MAIN = 'c1a720a32a054c16944e6c582086a509be137fc4';
const OLD = 'de4c268311c42877f8a7e1361e7de986ffb096cb';

const profile = {
  schema: 'CAPITAL_AI_SH_SUPPLY_CHAIN_DOCUMENTATION_DRIFT@1',
  version: '1.0.0',
  authorities: ['DOCUMENTARY_EVIDENCE@1', 'CHANGE_PROPAGATION@1', 'GROWTH_PROJECTION@1', 'POST_MERGE_CORRELATION@2'],
  livingDocuments: { exact: ['README.md', 'src/data/roadmapData.ts', 'docs/growth/DOCUMENTATION-DRIFT-SELF-HEALING.md'], prefixes: ['docs/governance/'] },
  historical: {
    prefixes: ['docs/security/evidence/', 'documentary/evidence/', 'generated/'],
    datedFilenameRegex: '(?:^|/)[^/]*20[0-9]{6}[^/]*\\.(?:md|json|ya?ml)$',
  },
  selfHealing: {
    repairFingerprint: 'STALE_CURRENT_MAIN_METADATA@1',
    validationSteps: ['DETECT', 'CORRELATE', 'CLASSIFY', 'REMEDIATE', 'VERIFY'],
    minimumIndependentPositiveValidationCycles: 3,
    repairMode: 'REPORT_OR_PR_ONLY',
  },
};

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'capital-ai-doc-drift-'));
  for (const [file, content] of Object.entries(files)) {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }
  return root;
}

test('recognizes living and historical documents without rewriting snapshots', () => {
  assert.equal(isLivingDocument('README.md', profile), true);
  assert.equal(isLivingDocument('docs/governance/POLICY.md', profile), true);
  assert.equal(isHistoricalPath('docs/security/evidence/run.json', profile), true);
  assert.equal(isLivingDocument('docs/security/REPORT-20261001.md', profile), false);
});

test('extracts only explicit current-main claims', () => {
  const claims = extractCurrentMainClaims(`current main: ${OLD}\nRuntime sourceSha: ${OLD}\nmain@${MAIN}`);
  assert.deepEqual(claims.map((claim) => claim.sha), [OLD, MAIN]);
});

test('recognizes the real DOC-SH current-main baseline wording', () => {
  const claims = extractCurrentMainClaims(`Current-main baseline for this slice: \`${OLD}\`.`);
  assert.deepEqual(claims.map((claim) => claim.sha), [OLD]);
});

test('flags stale current-main claims in living documents but ignores dated snapshots', () => {
  const root = fixture({
    'README.md': `Repository current main: ${OLD}\n`,
    'src/data/roadmapData.ts': `export const items = [{ id: 'A' }];\n`,
    'docs/growth/DOCUMENTATION-DRIFT-SELF-HEALING.md': `Current-main baseline for this slice: \`${OLD}\`.\n`,
    'docs/security/REPORT-20261001.md': `Main-Snapshot ${OLD}\n`,
  });
  const report = analyzeDocumentationDrift({
    root,
    mainSha: MAIN,
    files: ['README.md', 'src/data/roadmapData.ts', 'docs/growth/DOCUMENTATION-DRIFT-SELF-HEALING.md', 'docs/security/REPORT-20261001.md'],
    profile,
  });
  assert.equal(report.summary.findingCount, 2);
  assert.ok(report.findings.every((finding) => finding.class === 'SOURCE_DRIFT'));
  assert.ok(report.findings.every((finding) => finding.repairFingerprint === 'STALE_CURRENT_MAIN_METADATA@1'));
  assert.equal(report.selfHealing.autoRepairEnabled, false);
  assert.equal(report.selfHealing.minimumIndependentPositiveValidationCycles, 3);
});

test('accepts current main identity in living documents', () => {
  const root = fixture({
    'README.md': `main@${MAIN}\n`,
    'src/data/roadmapData.ts': `export const items = [{ id: 'A' }];\n`,
    'docs/growth/DOCUMENTATION-DRIFT-SELF-HEALING.md': `Current-main baseline for this slice: \`${MAIN}\`.\n`,
  });
  const report = analyzeDocumentationDrift({ root, mainSha: MAIN, files: ['README.md', 'src/data/roadmapData.ts', 'docs/growth/DOCUMENTATION-DRIFT-SELF-HEALING.md'], profile });
  assert.equal(report.summary.driftDetected, false);
});

test('detects duplicate roadmap IDs without inferring completion state', () => {
  const source = `const a = { id: 'AP-1' }; const b = { "id": "AP-1" }; const c = { id: 'AP-2' };`;
  assert.deepEqual(findRoadmapDuplicateIds(source), [{ id: 'AP-1', count: 2 }]);
});

test('reports missing configured living documents fail closed', () => {
  const root = fixture({ 'README.md': 'No SHA claim.\n' });
  const report = analyzeDocumentationDrift({ root, mainSha: MAIN, files: ['README.md'], profile });
  assert.equal(report.findings.some((finding) => finding.class === 'MISSING_LIVING_DOCUMENT'), true);
});
