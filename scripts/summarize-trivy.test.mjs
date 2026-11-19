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

test('diagnostic provenance publishes only known advisory IDs without relaxing HIGH gates', () => {
  const report = { Results: [{ Vulnerabilities: [{
    VulnerabilityID: 'CVE-2026-112366', Severity: 'HIGH', PkgName: 'picomatch',
    InstalledVersion: '4.0.7', FixedVersion: '',
    DataSource: { ID: 'ghsa', Name: 'Do not publish this metadata', URL: 'https://redacted.example/private' },
    SeveritySource: 'ghsa',
  }] }] };
  const result = summary(report);
  assert.equal(result.blocking, 1, 'An advisory withdrawal cannot silently waive a real scanner result');
  assert.equal(result.vulnerabilities[0].dataSourceId, 'ghsa');
  assert.equal(result.vulnerabilities[0].severitySource, 'ghsa');
  assert.equal(result.vulnerabilities[0].fixed, null);
  assert.ok(!JSON.stringify(result).includes('redacted.example'));
  assert.ok(!JSON.stringify(result).includes('Do not publish'));
});

test('unknown or attacker-controlled advisory metadata remains redacted and does not change fail-closed status', () => {
  const report = { Results: [{ Vulnerabilities: [{
    VulnerabilityID: 'CVE-2026-112366', Severity: 'HIGH', PkgName: 'picomatch',
    DataSource: { ID: 'private-credential', URL: 'https://secret' },
    SeveritySource: 'private-credential',
    Description: 'private-credential',
  }] }] };
  const result = summary(report);
  assert.equal(result.blocking, 1);
  assert.equal(result.vulnerabilities[0].dataSourceId, null);
  assert.equal(result.vulnerabilities[0].severitySource, null);
  assert.ok(!JSON.stringify(result).includes('private-credential'));
  assert.ok(!JSON.stringify(result).includes('https://secret'));
});
