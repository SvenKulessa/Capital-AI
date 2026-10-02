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

const base = {
  messages: baseMessages,
  openvex: vex('not_affected', 'vulnerable_code_not_present'),
  buildInfo,
  nmText: '001000 T github.com/nats-io/nats-server/v2/server.Run',
  nmExitStatus: 0,
  reproducible: true,
  binarySha256: sha,
  imageRef: 'nats:2.15.0-alpine@sha256:' + 'b'.repeat(64),
};

test('not_affected requires exact dependency, symbol-level scan, nm and reproducibility', () => {
  const report = classifyGoVulnReachability(base);
  assert.equal(report.decision, 'NOT_AFFECTED');
  assert.equal(report.blocking, false);
  assert.equal(report.reviewRequired, false);
  assert.equal(report.trivyFindingRetained, true);
  assert.equal(report.trivySuppressionApplied, false);
});

test('a govulncheck vulnerable symbol makes the gate affected', () => {
  const messages = [...baseMessages, {
    finding: {
      osv: advisory,
      trace: [{ module: 'golang.org/x/crypto', version: 'v0.57.0', package: 'golang.org/x/crypto/openpgp/packet', function: 'Read' }],
    },
  }];
  const report = classifyGoVulnReachability({ ...base, messages });
  assert.equal(report.decision, 'AFFECTED');
  assert.equal(report.blocking, true);
});

test('an independent nm openpgp symbol makes the gate affected', () => {
  const report = classifyGoVulnReachability({
    ...base,
    nmText: '001000 T golang.org/x/crypto/openpgp/packet.Read',
  });
  assert.equal(report.decision, 'AFFECTED');
  assert.equal(report.reason, 'VULNERABLE_OPENPGP_SYMBOL_PRESENT_IN_BINARY');
});

test('missing advisory database evidence is inconclusive and remains visible but non-blocking', () => {
  const report = classifyGoVulnReachability({
    ...base,
    messages: [baseMessages[0]],
    openvex: { statements: [] },
  });
  assert.equal(report.decision, 'INCONCLUSIVE');
  assert.equal(report.blocking, false);
  assert.equal(report.reviewRequired, true);
  assert.equal(report.prerequisites.advisoryObservedInDatabase, false);
});

test('wrong x/crypto version is inconclusive for this exact evidence claim', () => {
  const report = classifyGoVulnReachability({
    ...base,
    buildInfo: buildInfo.replace('v0.57.0', 'v0.58.0'),
  });
  assert.equal(report.decision, 'INCONCLUSIVE');
  assert.equal(report.prerequisites.exactDependencyPresent, false);
});

test('failed nm analysis cannot produce NOT_AFFECTED', () => {
  const report = classifyGoVulnReachability({ ...base, nmExitStatus: 1, nmText: '' });
  assert.equal(report.decision, 'INCONCLUSIVE');
  assert.equal(report.prerequisites.nmAvailable, false);
});

test('non-reproducible repeated scan cannot produce NOT_AFFECTED', () => {
  const report = classifyGoVulnReachability({ ...base, reproducible: false });
  assert.equal(report.decision, 'INCONCLUSIVE');
  assert.equal(report.prerequisites.repeatedRunEquivalent, false);
});
