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
