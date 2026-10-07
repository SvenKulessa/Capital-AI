import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertPublicReport } from './reviewdog-public-report.mjs';

const head = 'a'.repeat(40), merge = 'b'.repeat(40);
const report = () => ({ schemaVersion: 2, scope: 'source', sourceSha: merge,
  sourceIdentity: { sourceSha: head, testedSha: merge, pullRequestHeadSha: head },
  status: 'FAIL', vulnerabilities: [], misconfigurations: [], secrets: 0 });
test('withholds secret payloads, scanner messages and paths, and never fabricates lines', () => {
  const input = report();
  input.secrets = 1;
  input.Secrets = [{ Match: 'SENSITIVE_PAYLOAD' }];
  input.misconfigurations = [{ id: 'AVD-001', severity: 'HIGH', status: 'FAIL', Message: 'SENSITIVE_PAYLOAD', path: 'secret.env', line: 9 }];
  const output = convertPublicReport(input, head, merge);
  assert.equal(output.rdjson.diagnostics.length, 2);
  assert.equal(JSON.stringify(output).includes('SENSITIVE_PAYLOAD'), false);
  assert.equal(JSON.stringify(output).includes('secret.env'), false);
  assert.ok(output.rdjson.diagnostics.every(d => !d.location));
});
test('rejects mismatched run, tested merge and malformed reports', () => {
  assert.throws(() => convertPublicReport(report(), 'c'.repeat(40), merge));
  assert.throws(() => convertPublicReport(report(), head, head));
  assert.throws(() => convertPublicReport({ ...report(), vulnerabilities: null }, head, merge));
});
test('missing report is NOT_PROVEN rather than a clean review', () => {
  const output = convertPublicReport({ ...report(), status: 'NOT_RUN_OR_REPORT_MISSING' }, head, merge);
  assert.equal(output.evidence.completeness, 'NOT_PROVEN');
  assert.equal(output.evidence.scannerStatus, 'NOT_RUN_OR_REPORT_MISSING');
});
