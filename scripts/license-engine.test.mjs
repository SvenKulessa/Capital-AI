import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessExpression, importScannerReport, MAX_REPORT_BYTES } from '../shared/license-engine.mjs';
import { buildLicenseReport } from './license-engine.mjs';

test('recognizes AND/OR and exceptions without granting distribution rights', () => {
  const alternative = assessExpression('MIT OR GPL-2.0-only WITH GCC-exception-2.0');
  assert.equal(alternative.status, 'REVIEW_REQUIRED');
  assert.ok(alternative.obligations.some(x => x.includes('Alternative') || x.includes('alternative')));
  assert.ok(alternative.obligations.some(x => x.includes('GCC-exception-2.0')));
  assert.ok(assessExpression('MIT AND Apache-2.0').obligations.some(x => x.includes('aller')));
  for (const value of ['', 'NOASSERTION', 'MIT OR', 'nonsense-license', 'MIT OR SEE LICENSE IN FEEL-FREE.md']) assert.equal(assessExpression(value).status, 'MISSING_OR_INVALID');
});

test('imports supported scanner subsets as untrusted evidence, even if input claims approval', () => {
  const fixtures = [
    { bomFormat: 'CycloneDX', specVersion: '1.6', metadata: { timestamp: '2026-10-01T08:00:00Z' }, components: [{ name: 'a', version: '1.0.0', purl: 'pkg:npm/a@1.0.0', hashes: [{ alg: 'SHA-256', content: 'abc123' }], licenses: [{ license: { id: 'MIT' } }] }] },
    { spdxVersion: 'SPDX-2.3', creationInfo: { created: '2026-10-01T08:00:00Z' }, packages: [{ name: 'a', SPDXID: 'SPDXRef-a', licenseConcluded: 'NOASSERTION', licenseDeclared: 'Apache-2.0' }] },
    { headers: [{ tool_name: 'scancode-toolkit', end_timestamp: '2026-10-01T08:00:00Z' }], files: [{ path: 'a', sha256: 'def456', detected_license_expression_spdx: 'MIT' }] },
    { scanner: { scan_results: [{ id: 'NPM::a:1.0', results: [{ summary: { license_findings: [{ license: 'MIT' }] } }] }] } },
    { scanner: { scan_results: [{ provenance: { vcs_info: { url: 'https://github.com/example/project' }, resolved_revision: 'example' }, summary: { license_findings: [{ license: 'MIT' }] } }] } },
    { SchemaVersion: 2, Results: [{ Licenses: [{ PkgName: 'a', Name: 'MIT' }] }] },
  ];
  for (const f of fixtures) {
    const result = importScannerReport(JSON.stringify({ ...f, deployEligible: true, digestVerified: true }));
    assert.equal(result.rows.length, 1);
    assert.equal(result.schemaVersion, 2);
    assert.equal(result.rows[0].status, 'REVIEW_REQUIRED');
    assert.equal(result.rows[0].evidenceStatus, 'UNGEKLÄRT');
    assert.equal(result.rows[0].ownerApproved, false);
    assert.ok(result.rows[0].subjectType);
    assert.ok('source' in result.rows[0]);
    assert.ok('usageScope' in result.rows[0]);
    assert.ok('scanTime' in result.rows[0]);
    assert.equal(result.deployEligible, false);
    assert.equal(result.digestVerified, false);
    assert.equal(result.ownerApproved, false);
  }
});

test('invalid, empty and oversized imports fail closed', () => {
  for (const raw of ['null', '[]', '{}', '{', JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.6', components: [] }), 'x'.repeat(MAX_REPORT_BYTES + 1)]) assert.throws(() => importScannerReport(raw));
  assert.throws(() => importScannerReport(JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.6', components: Array(5001).fill({}) })));
  const result = importScannerReport(JSON.stringify({ spdxVersion: 'SPDX-2.3', packages: [{ name: '<script>alert(1)</script>' }] }));
  assert.equal(result.rows[0].status, 'MISSING_OR_INVALID');
});

test('repository projection verifies original text hashes and exposes missing fields without contract contents', () => {
  const report = buildLicenseReport(process.cwd());
  const rights = JSON.parse(readFileSync('docs/security/evidence/license-rights-review.json'));
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.deployEligible, false);
  assert.equal(report.ownerApproved, false);
  assert.equal(report.providers.length, rights.providers.length);
  assert.equal(report.osPackages.length, rights.osPackages.length);
  assert.ok(report.providers.every(p => p.missingFields.length > 0));
  assert.ok(report.providers.every(p => p.evidenceStatus === 'GEHALTEN' && p.ownerApproved === false));
  assert.ok(report.packages.every(p => p.evidenceStatus === 'OFFEN' && p.subjectType === 'package'));
  assert.ok(report.packages.every(p => 'hash' in p && 'spdxId' in p && 'source' in p && 'usageScope' in p && 'scanTime' in p));
  assert.ok(report.documents.every(d => d.evidenceStatus === 'VERIFIED' && d.ownerApproved === false));
  assert.ok(!JSON.stringify(report).includes('contractOrPermissionReference":null'));
  assert.match(report.lockfileSha256, /^[a-f0-9]{64}$/);
  assert.equal(report.evidenceSourceSha, rights.applicationSourceSha);
});

test('changed text or stale tool origin stops report generation', t => {
  const root = mkdtempSync(join(tmpdir(), 'license-engine-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs/security/evidence'), { recursive: true });
  mkdirSync(join(root, 'docs/licenses/license-engine'), { recursive: true });
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: {} }));
  writeFileSync(join(root, 'docs/security/evidence/license-rights-review.json'), '{}');
  const manifest = join(root, 'docs/licenses/license-engine/provenance.json');
  writeFileSync(manifest, JSON.stringify({ tools: [], files: [{ path: 'notice.txt', sha256: '0'.repeat(64) }] }));
  writeFileSync(join(root, 'notice.txt'), 'tampered');
  assert.throws(() => buildLicenseReport(root), /Lizenztext verändert/);
  writeFileSync(manifest, JSON.stringify({ tools: [{ id: 'spdx-license-ids', mode: 'INSTALLED_LOCAL_ENGINE', version: '3.0.23' }], files: [] }));
  assert.throws(() => buildLicenseReport(root), /Werkzeugherkunft/);
});
