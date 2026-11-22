import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assessRuntimeLicenseCoverage } from './runtime-license-coverage.mjs';

const sh = bytes => createHash('sha256').update(bytes).digest('hex');
const reportId = 'sha256:' + 'a'.repeat(64);
const sourceSha = 'b'.repeat(40);
const notices = {
  frontendNotice: Buffer.from('frontend legal notice'),
  nodeNotice: Buffer.from('node legal notice'),
  fontNotice: Buffer.from('font OFL notice'),
};
const groups = [
  { target: '/reports/image.tar (alpine 3.24.4)', class: 'os-pkgs', type: 'alpine', n: 8, prefix: 'os' },
  { target: 'Node.js', class: 'lang-pkgs', type: 'node-pkg', n: 2, prefix: 'node' },
  { target: 'Python', class: 'lang-pkgs', type: 'python-pkg', n: 2, prefix: 'python' },
];
const fixture = () => {
  const osPackages = Array.from({ length: 8 }, (_, i) => ({ name: `os${i}`, version: '1-r0' }));
  const scanner = { Results: groups.map(g => ({ Target: g.target, Class: g.class, Type: g.type,
    Packages: Array.from({ length: g.n }, (_, i) => ({ Name: `${g.prefix}${i}`, Version: '1-r0', Licenses: ['MIT'] })) })) };
  scanner.Results.push(...['OS Packages','Node.js','Python','Loose File License(s)']
    .map(Target => ({ Target, Class: Target === 'Loose File License(s)' ? 'license-file' : 'license',
      Licenses: [{ FilePath: 'app/dist/LICENSE', Name: 'MIT', Text: 'not for export' }] })));
  const sbom = { bomFormat: 'CycloneDX', components: groups.flatMap(g =>
    Array.from({ length: g.n }, (_, i) => ({ name: `${g.prefix}${i}`, version: '1-r0',
      properties: [{ name: 'aquasecurity:trivy:PkgType', value: g.type }] }))) };
  return {
    identity: reportId + '\n',
    osInventory: { schema: 'OS_SOURCE_NOTICE_INVENTORY@1', sourceSha, imageConfigDigest: reportId,
      sourceDeliveryProven: false, redistributionApproved: false, packages: osPackages,
      sourceRecipeLocators: [{ package: 'os', aportsCommit: 'c'.repeat(40) }],
      nodeLicenseSha256: 'sha256:' + sh(notices.nodeNotice), fontOflSha256: 'sha256:' + sh(notices.fontNotice) },
    scanner, sbom,
    frontend: { scope: 'EMITTED_FRONTEND_NPM_MODULES', deployEligible: false,
      packages: [{ name: 'frontend', version: '1.0' }], noticesSha256: sh(notices.frontendNotice) },
    ...notices,
  };
};

test('exact image / SBOM / scanner package multisets correlate without legal admission', () => {
  const result = assessRuntimeLicenseCoverage(fixture());
  assert.deepEqual(result.packageCounts, { alpine: 8, node: 2, python: 2, total: 12 });
  assert.equal(result.noticeByteMatches.frontend, true);
  assert.equal(result.redistributionApproved, false);
  assert.equal(result.sourceDeliveryProven, false);
  assert.equal(result.readyForCutover, false);
  assert.equal(result.legalApproval, null);
});

test('package identity discrepancy and forged legal eligibility cannot pass', () => {
  const a = fixture(); a.sbom.components.find(c => c.name === 'node0').version = '2-r0';
  assert.throws(() => assessRuntimeLicenseCoverage(a), /SBOM and scanner/);
  const b = fixture(); b.osInventory.packages[0].version = 'false-r0';
  assert.throws(() => assessRuntimeLicenseCoverage(b), /Alpine inventory/);
  const c = fixture(); c.osInventory.redistributionApproved = true;
  assert.throws(() => assessRuntimeLicenseCoverage(c), /identity/);
  const d = fixture(); d.frontend.deployEligible = true;
  assert.throws(() => assessRuntimeLicenseCoverage(d), /authorization state/);
});

test('wrong image id or any one of the three notice hashes fails closed', () => {
  const wrong = fixture(); wrong.identity = 'sha256:' + 'd'.repeat(64);
  assert.throws(() => assessRuntimeLicenseCoverage(wrong), /image\/source identity/);
  for (const label of ['frontendNotice', 'nodeNotice', 'fontNotice']) {
    const x = fixture(); x[label] = Buffer.from('tampered');
    assert.throws(() => assessRuntimeLicenseCoverage(x), /runtime notice/);
  }
});

test('scanner result missing, duplicate or extra package cannot be promoted', () => {
  const missing = fixture(); missing.scanner.Results.splice(2, 1);
  assert.throws(() => assessRuntimeLicenseCoverage(missing), /Expected one/);
  const duplicate = fixture(); duplicate.scanner.Results[0].Packages.push({ Name: 'os0', Version: '1-r0' });
  assert.throws(() => assessRuntimeLicenseCoverage(duplicate), /SBOM and scanner/);
});

test('no tokens, secret input, license texts or unapproved flags are echoed in report', () => {
  const input = fixture(); input.secret = 'SENSITIVE_TOKEN_DO_NOT_EXPORT';
  input.scanner.Results.at(-1).Licenses[0].Text = 'SENSITIVE_TOKEN_DO_NOT_EXPORT';
  input.frontend.secret = 'SENSITIVE_TOKEN_DO_NOT_EXPORT';
  const report = JSON.stringify(assessRuntimeLicenseCoverage(input));
  assert.equal(report.includes('SENSITIVE_TOKEN_DO_NOT_EXPORT'), false);
  assert.equal(report.includes('frontend legal notice'), false);
  assert.equal(report.includes('APPROVED'), false);
});
