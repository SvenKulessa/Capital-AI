import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyGoVulnReachability } from './verify-go-vuln-reachability.mjs';

const advisory = 'GO-2026-5932';
const sha = 'sha256:' + 'a'.repeat(64);
const buildInfo = '/nats-server: go1.26.8\n\tdep\tgolang.org/x/crypto\tv0.57.0\th1:test\n';
const baseMessages = [
  { config: { scanner_name: 'govulncheck', scanner_version: 'v1.8.0', db: 'https://vuln.go.dev', scan_mode: 'binary', scan_level: 'symbol' } },
  { osv: { id: advisory, summary: 'legacy OpenPGP is unsafe' } },
];

function vex(status, justification) {
  return {
    statements: [{
      vulnerability: { name: advisory, '@id': 'https://pkg.go.dev/vuln/' + advisory },
      status,
      ...(justification ? { justification } : {}),
    }],
  };
}

test('not_affected requires exact dependency, binary/symbol scan and target VEX', () => {
  const report = classifyGoVulnReachability({
    messages: baseMessages,
    openvex: vex('not_affected', 'vulnerable_code_not_present'),
    buildInfo,
    binarySha256: sha,
    imageRef: 'nats:2.15.0-alpine@sha256:' + 'b'.repeat(64),
  });
  assert.equal(report.decision, 'NOT_AFFECTED');
  assert.equal(report.blocking, false);
  assert.equal(report.trivyFindingRetained, true);
  assert.equal(report.trivySuppressionApplied, false);
});

test('a vulnerable symbol makes the gate affected even if VEX were inconsistent', () => {
  const messages = [...baseMessages, {
    finding: {
      osv: advisory,
      trace: [{ module: 'golang.org/x/crypto', version: 'v0.57.0', package: 'golang.org/x/crypto/openpgp/packet', function: 'Read' }],
    },
  }];
  const report = classifyGoVulnReachability({
    messages,
    openvex: vex('not_affected', 'vulnerable_code_not_in_execute_path'),
    buildInfo,
    binarySha256: sha,
  });
  assert.equal(report.decision, 'AFFECTED');
  assert.equal(report.blocking, true);
});

test('missing advisory database evidence is inconclusive, never silently not_affected', () => {
  const report = classifyGoVulnReachability({
    messages: [baseMessages[0]],
    openvex: { statements: [] },
    buildInfo,
    binarySha256: sha,
  });
  assert.equal(report.decision, 'INCONCLUSIVE');
  assert.equal(report.blocking, true);
  assert.equal(report.prerequisites.advisoryObservedInDatabase, false);
});

test('wrong x/crypto version is inconclusive for this exact evidence claim', () => {
  const report = classifyGoVulnReachability({
    messages: baseMessages,
    openvex: vex('not_affected', 'vulnerable_code_not_present'),
    buildInfo: buildInfo.replace('v0.57.0', 'v0.58.0'),
    binarySha256: sha,
  });
  assert.equal(report.decision, 'INCONCLUSIVE');
  assert.equal(report.prerequisites.exactDependencyPresent, false);
});
