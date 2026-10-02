import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyGoVulnReachability, buildOpenVex, buildCycloneDxVex } from './verify-go-vuln-reachability.mjs';

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
  localImageId: 'sha256:' + 'c'.repeat(64),
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
  assert.equal(report.decision, 'UNKNOWN');
  assert.equal(report.blocking, false);
  assert.equal(report.reviewRequired, true);
  assert.equal(report.prerequisites.advisoryObservedInDatabase, false);
});

test('wrong x/crypto version is inconclusive for this exact evidence claim', () => {
  const report = classifyGoVulnReachability({
    ...base,
    buildInfo: buildInfo.replace('v0.57.0', 'v0.58.0'),
  });
  assert.equal(report.decision, 'UNKNOWN');
  assert.equal(report.prerequisites.exactDependencyPresent, false);
});

test('failed nm analysis cannot produce NOT_AFFECTED', () => {
  const report = classifyGoVulnReachability({ ...base, nmExitStatus: 1, nmText: '' });
  assert.equal(report.decision, 'UNKNOWN');
  assert.equal(report.prerequisites.nmAvailable, false);
});

test('non-reproducible repeated scan cannot produce NOT_AFFECTED', () => {
  const report = classifyGoVulnReachability({ ...base, reproducible: false });
  assert.equal(report.decision, 'UNKNOWN');
  assert.equal(report.prerequisites.repeatedRunEquivalent, false);
});


test('generated VEX keeps UNKNOWN as under investigation and NOT_AFFECTED explicit', () => {
  const unknown = classifyGoVulnReachability({ ...base, openvex: { statements: [] } });
  assert.equal(buildOpenVex(unknown).statements[0].status, 'under_investigation');
  assert.equal(buildCycloneDxVex(unknown).vulnerabilities[0].analysis.state, 'in_triage');
  const proven = classifyGoVulnReachability(base);
  assert.equal(buildOpenVex(proven).statements[0].status, 'not_affected');
  assert.equal(buildCycloneDxVex(proven).vulnerabilities[0].analysis.state, 'not_affected');
});

test('CycloneDX VEX mirrors the reachability decision and immutable product reference', () => {
  const report = classifyGoVulnReachability(base);
  const vex = buildCycloneDxVex(report);
  assert.equal(vex.bomFormat, 'CycloneDX');
  assert.equal(vex.specVersion, '1.6');
  assert.equal(vex.vulnerabilities[0].id, advisory);
  assert.equal(vex.vulnerabilities[0].analysis.state, 'not_affected');
  assert.equal(vex.vulnerabilities[0].analysis.justification, 'code_not_present');
  assert.equal(vex.vulnerabilities[0].affects[0].ref, base.imageRef);
});


test('module advisory without reachable symbol can be NOT_AFFECTED when all binary gates pass', () => {
  const messages = [...baseMessages, {
    finding: {
      osv: advisory,
      trace: [{ module: 'golang.org/x/crypto', version: 'v0.57.0' }],
    },
  }];
  const report = classifyGoVulnReachability({ ...base, messages });
  assert.equal(report.evidence.findingCount, 1);
  assert.equal(report.evidence.symbolFindingCount, 0);
  assert.equal(report.evidence.openPgpFrameCount, 0);
  assert.equal(report.decision, 'NOT_AFFECTED');
  assert.equal(report.reason, 'vulnerable_code_not_present');
});
