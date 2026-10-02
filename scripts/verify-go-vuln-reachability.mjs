import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TARGET_ADVISORY = 'GO-2026-5932';
const XCRYPTO_MODULE = 'golang.org/x/crypto';
const XCRYPTO_VERSION = 'v0.57.0';
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const XCRYPTO_BUILD_INFO = /(?:^|\s)dep\s+golang\.org\/x\/crypto\s+v0\.57\.0(?:\s|$)/m;
export const AFFECTED_OPENPGP_PACKAGES = [
  'golang.org/x/crypto/openpgp',
  'golang.org/x/crypto/openpgp/packet',
  'golang.org/x/crypto/openpgp/armor',
  'golang.org/x/crypto/openpgp/clearsign',
  'golang.org/x/crypto/openpgp/errors',
  'golang.org/x/crypto/openpgp/elgamal',
  'golang.org/x/crypto/openpgp/s2k',
];

function targetStatement(openvex, advisory = TARGET_ADVISORY) {
  return (openvex?.statements || []).find(statement =>
    statement?.vulnerability?.name === advisory ||
    statement?.vulnerability?.['@id']?.endsWith('/' + advisory));
}

function targetFindings(messages, advisory = TARGET_ADVISORY) {
  return messages
    .filter(message => message?.finding?.osv === advisory)
    .map(message => message.finding);
}

function affectedNmSymbols(nmText) {
  return String(nmText || '').split('\n').filter(line =>
    AFFECTED_OPENPGP_PACKAGES.some(pkg => line.includes(pkg)));
}

export function buildCycloneDxVex(report) {
  const state = report.decision === 'NOT_AFFECTED' ? 'not_affected'
    : report.decision === 'AFFECTED' ? 'exploitable'
    : 'in_triage';
  const analysis = { state, detail: `${report.reason}; trivy finding retained; no suppression applied` };
  if (report.decision === 'NOT_AFFECTED') {
    analysis.justification = report.reason === 'vulnerable_code_not_in_execute_path'
      ? 'code_not_reachable'
      : 'code_not_present';
  }
  const ref = report.natsImageRef || `urn:capital-ai:nats-binary:${report.binarySha256 || 'unknown'}`;
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    version: 1,
    metadata: {
      component: {
        type: 'container',
        name: 'capital-nats',
        'bom-ref': ref,
      },
    },
    vulnerabilities: [{
      id: report.advisory,
      source: { name: 'Go Vulnerability Database', url: `https://pkg.go.dev/vuln/${report.advisory}` },
      analysis,
      affects: [{ ref }],
      properties: [
        { name: 'capital-ai:binary-sha256', value: report.binarySha256 || 'unknown' },
        { name: 'capital-ai:reachability-schema', value: report.schema },
        { name: 'capital-ai:review-required', value: String(report.reviewRequired) },
      ],
    }],
  };
}

export function classifyGoVulnReachability({
  messages,
  openvex,
  buildInfo,
  nmText = '',
  nmExitStatus = 0,
  reproducible = false,
  advisory = TARGET_ADVISORY,
  binarySha256,
  imageRef,
  localImageId,
}) {
  const config = messages.find(message => message?.config)?.config || null;
  const osv = messages.find(message => message?.osv?.id === advisory)?.osv || null;
  const findings = targetFindings(messages, advisory);
  const frames = findings.flatMap(finding => Array.isArray(finding.trace) ? finding.trace : []);
  const symbolFrames = frames.filter(frame => typeof frame?.function === 'string' && frame.function.length > 0);
  const openPgpFrames = frames.filter(frame =>
    typeof frame?.package === 'string' && frame.package.startsWith('golang.org/x/crypto/openpgp'));
  const nmSymbols = affectedNmSymbols(nmText);
  const statement = targetStatement(openvex, advisory) || null;
  const dependencyPresent = XCRYPTO_BUILD_INFO.test(buildInfo);

  const prerequisites = {
    binaryDigestValid: SHA256.test(binarySha256 || ''),
    exactDependencyPresent: dependencyPresent,
    binaryMode: config?.scan_mode === 'binary',
    symbolLevel: config?.scan_level === 'symbol',
    advisoryObservedInDatabase: Boolean(osv),
    upstreamVexConsistent: !statement || statement.status === 'not_affected',
    nmAvailable: Number(nmExitStatus) === 0,
    repeatedRunEquivalent: Boolean(reproducible),
  };

  let decision = 'UNKNOWN';
  let reason = 'REACHABILITY_PREREQUISITES_NOT_PROVEN';

  if (statement?.status === 'affected' || symbolFrames.length > 0 || nmSymbols.length > 0) {
    decision = 'AFFECTED';
    reason = symbolFrames.length > 0 || nmSymbols.length > 0
      ? 'VULNERABLE_OPENPGP_SYMBOL_PRESENT_IN_BINARY'
      : 'GOVULNCHECK_VEX_MARKS_AFFECTED';
  } else if (Object.values(prerequisites).every(Boolean) && findings.length === 0 && openPgpFrames.length === 0 && nmSymbols.length === 0) {
    decision = 'NOT_AFFECTED';
    reason = statement?.justification === 'vulnerable_code_not_present' ? 'vulnerable_code_not_present' : 'vulnerable_code_not_in_execute_path';
  } else if (statement && statement.status !== 'not_affected') {
    reason = 'UPSTREAM_VEX_CONTRADICTS_NOT_AFFECTED';
  }

  return {
    schema: 'GO_VULN_REACHABILITY@2',
    advisory,
    component: 'nats-server',
    natsImageRef: imageRef || null,
    localImageId: localImageId || null,
    binarySha256: binarySha256 || null,
    dependency: {
      module: XCRYPTO_MODULE,
      version: XCRYPTO_VERSION,
      presentInBinaryBuildInfo: dependencyPresent,
    },
    scanner: {
      name: config?.scanner_name || 'govulncheck',
      version: config?.scanner_version || null,
      database: config?.db || null,
      databaseLastModified: config?.db_last_modified || null,
      scanMode: config?.scan_mode || null,
      scanLevel: config?.scan_level || null,
    },
    evidence: {
      advisoryObservedInDatabase: Boolean(osv),
      findingCount: findings.length,
      symbolFindingCount: symbolFrames.length,
      openPgpFrameCount: openPgpFrames.length,
      openPgpFrames: openPgpFrames.map(frame => ({
        module: frame.module || null,
        version: frame.version || null,
        package: frame.package || null,
        function: frame.function || null,
        receiver: frame.receiver || null,
      })),
      nmExitStatus: Number(nmExitStatus),
      nmAffectedSymbolCount: nmSymbols.length,
      nmAffectedSymbols: nmSymbols.slice(0, 100),
      repeatedRunEquivalent: Boolean(reproducible),
      openVexStatus: statement?.status || null,
      openVexJustification: statement?.justification || null,
      openVexImpactStatement: statement?.impact_statement || null,
    },
    prerequisites,
    decision,
    reason,
    blocking: decision === 'AFFECTED',
    reviewRequired: decision !== 'NOT_AFFECTED',
    trivyFindingRetained: true,
    trivySuppressionApplied: false,
  };
}

export function buildOpenVex(report) {
  const status = report.decision === 'NOT_AFFECTED' ? 'not_affected' : report.decision === 'AFFECTED' ? 'affected' : 'under_investigation';
  const statement = {
    vulnerability: { name: report.advisory, '@id': 'https://pkg.go.dev/vuln/' + report.advisory },
    products: [{ '@id': report.natsImageRef || 'urn:capital-ai:nats:unbound' }],
    status,
    status_notes: report.reason,
  };
  if (status === 'not_affected') statement.justification = report.reason === 'vulnerable_code_not_present' ? 'vulnerable_code_not_present' : 'vulnerable_code_not_in_execute_path';
  return {
    '@context': 'https://openvex.dev/ns/v0.2.0',
    '@id': 'https://capital-ai.online/vex/' + report.advisory + '/' + String(report.binarySha256 || 'unknown').replace(':', '-'),
    author: 'CAPITAL-AI TRUST automation',
    role: 'Document Creator',
    timestamp: '1970-01-01T00:00:00.000Z',
    version: 1,
    statements: [statement],
  };
}

export function buildCycloneDxVex(report) {
  const ref = report.natsImageRef || 'urn:capital-ai:nats:unbound';
  const analysis = report.decision === 'NOT_AFFECTED'
    ? { state: 'not_affected', justification: report.reason === 'vulnerable_code_not_present' ? 'code_not_present' : 'code_not_reachable', detail: report.reason }
    : report.decision === 'AFFECTED'
      ? { state: 'exploitable', detail: report.reason }
      : { state: 'in_triage', detail: report.reason };
  return {
    bomFormat: 'CycloneDX', specVersion: '1.6', version: 1,
    metadata: { component: { type: 'container', 'bom-ref': ref, name: 'nats-server' } },
    vulnerabilities: [{
      id: report.advisory,
      source: { name: 'Go Vulnerability Database' },
      affects: [{ ref }],
      analysis,
      properties: [
        { name: 'capital-ai:binary-sha256', value: report.binarySha256 || 'unknown' },
        { name: 'capital-ai:local-image-id', value: report.localImageId || 'unknown' },
        { name: 'capital-ai:trivy-finding-retained', value: String(report.trivyFindingRetained) },
      ],
    }],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [messagesPath, upstreamOpenvexPath, buildInfoPath, nmPath, nmStatusPath, reproducibilityPath, outputPath, openvexOutputPath, cycloneDxOutputPath] = process.argv.slice(2);
  if (!cycloneDxOutputPath) {
    throw new Error('Usage: verify-go-vuln-reachability.mjs <messages.json> <upstream-openvex.json> <go-version-m.txt> <nm.txt> <nm-status.txt> <reproducibility.txt> <output.json> <openvex-output.json> <cyclonedx-vex-output.json>');
  }
  const report = classifyGoVulnReachability({
    messages: JSON.parse(readFileSync(messagesPath, 'utf8')),
    openvex: JSON.parse(readFileSync(upstreamOpenvexPath, 'utf8')),
    buildInfo: readFileSync(buildInfoPath, 'utf8'),
    nmText: readFileSync(nmPath, 'utf8'),
    nmExitStatus: Number.parseInt(readFileSync(nmStatusPath, 'utf8').trim(), 10),
    reproducible: readFileSync(reproducibilityPath, 'utf8').trim() === 'true',
    binarySha256: process.env.NATS_BINARY_SHA256,
    imageRef: process.env.NATS_IMAGE_REF,
    localImageId: process.env.NATS_LOCAL_IMAGE_ID,
  });
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  writeFileSync(openvexOutputPath, JSON.stringify(buildOpenVex(report), null, 2) + '\n');
  writeFileSync(cycloneDxOutputPath, JSON.stringify(buildCycloneDxVex(report), null, 2) + '\n');
  console.log(JSON.stringify({ advisory: report.advisory, decision: report.decision, reason: report.reason, reviewRequired: report.reviewRequired }));
  if (report.blocking) process.exitCode = 1;
}
