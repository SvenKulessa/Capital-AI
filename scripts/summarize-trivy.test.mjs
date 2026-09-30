import test from 'node:test';
import assert from 'node:assert/strict';
import { summary } from './summarize-trivy.mjs';

test('failure diagnostics identify vulnerable packages without exposing matched secrets', () => {
  const report = { Results: [{ Vulnerabilities: [{ VulnerabilityID: 'CVE-test', Severity: 'HIGH', PkgName: 'pkg', InstalledVersion: '1', FixedVersion: '2' }], Secrets: [{ Match: 'private-credential', Code: { Lines: ['private-credential'] } }] }] };
  const result = summary(report);
  assert.equal(result.secrets, 1);
  assert.equal(result.vulnerabilities[0].fixed, '2');
  assert.ok(!JSON.stringify(result).includes('private-credential'));
  assert.throws(() => summary({}), /Missing scanner results/);
});

test('all severities remain visible while serious findings and every secret block', () => {
  const result = summary({ Results: [{
    Vulnerabilities: [{ Severity: 'MEDIUM', PkgName: 'pkg' }, { Severity: 'HIGH', PkgName: 'pkg' }],
    Misconfigurations: [{ ID: 'AVD-test', Severity: 'CRITICAL', Status: 'FAIL', CauseMetadata: { Code: 'private-credential' } }],
    Secrets: [{ Severity: 'LOW', Match: 'private-credential' }],
  }] });
  assert.equal(result.vulnerabilities.length, 2);
  assert.equal(result.blocking, 3);
  assert.ok(!JSON.stringify(result).includes('private-credential'));
});

test('scanner-derived values cannot inject Markdown or control characters into logs', () => {
  const result = summary({ Results: [{ Vulnerabilities: [{ PkgName: 'pkg\n```secret```\u001b' }] }] });
  assert.ok(!result.vulnerabilities[0].package.includes('\n'));
  assert.ok(!result.vulnerabilities[0].package.includes('`'));
});
