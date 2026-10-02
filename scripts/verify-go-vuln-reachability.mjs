import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TARGET_ADVISORY = 'GO-2026-5932';
const XCRYPTO_MODULE = 'golang.org/x/crypto';
const XCRYPTO_VERSION = 'v0.57.0';
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const XCRYPTO_BUILD_INFO = /(?:^|\s)dep\s+golang\.org\/x\/crypto\s+v0\.57\.0(?:\s|$)/m;

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

export function classifyGoVulnReachability({
  messages,
  openvex,
  buildInfo,
  advisory = TARGET_ADVISORY,
  binarySha256,
  imageRef,
}) {
  const config = messages.find(message => message?.config)?.config || null;
  const osv = messages.find(message => message?.osv?.id === advisory)?.osv || null;
  const findings = targetFindings(messages, advisory);
  const frames = findings.flatMap(finding => Array.isArray(finding.trace) ? finding.trace : []);
  const symbolFrames = frames.filter(frame => typeof frame?.function === 'string' && frame.function.length > 0);
  const openPgpFrames = frames.filter(frame =>
    typeof frame?.package === 'string' && frame.package.startsWith('golang.org/x/crypto/openpgp'));
  const statement = targetStatement(openvex, advisory) || null;
  const dependencyPresent = XCRYPTO_BUILD_INFO.test(buildInfo);

  const prerequisites = {
    binaryDigestValid: SHA256.test(binarySha256 || ''),
    exactDependencyPresent: dependencyPresent,
    binaryMode: config?.scan_mode === 'binary',
    symbolLevel: config?.scan_level === 'symbol',
    advisoryObservedInDatabase: Boolean(osv),
    vexStatementPresent: Boolean(statement),
  };

  let decision = 'INCONCLUSIVE';
  let reason = 'REACHABILITY_PREREQUISITES_NOT_PROVEN';

  if (Object.values(prerequisites).every(Boolean)) {
    if (statement.status === 'affected' || symbolFrames.length > 0) {
      decision = 'AFFECTED';
      reason = 'VULNERABLE_SYMBOL_PRESENT_IN_BINARY';
    } else if (
      statement.status === 'not_affected' &&
      ['vulnerable_code_not_in_execute_path', 'vulnerable_code_not_present'].includes(statement.justification) &&
      symbolFrames.length === 0
    ) {
      decision = 'NOT_AFFECTED';
      reason = statement.justification;
    } else {
      reason = 'VEX_AND_SYMBOL_EVIDENCE_INCONSISTENT';
    }
  }

  return {
    schema: 'GO_VULN_REACHABILITY@1',
    advisory,
    component: 'nats-server',
    natsImageRef: imageRef || null,
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
      openVexStatus: statement?.status || null,
      openVexJustification: statement?.justification || null,
      openVexImpactStatement: statement?.impact_statement || null,
    },
    prerequisites,
    decision,
    reason,
    blocking: decision !== 'NOT_AFFECTED',
    trivyFindingRetained: true,
    trivySuppressionApplied: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [messagesPath, openvexPath, buildInfoPath, outputPath] = process.argv.slice(2);
  if (!outputPath) {
    throw new Error('Usage: verify-go-vuln-reachability.mjs <messages.json> <openvex.json> <go-version-m.txt> <output.json>');
  }
  const report = classifyGoVulnReachability({
    messages: JSON.parse(readFileSync(messagesPath, 'utf8')),
    openvex: JSON.parse(readFileSync(openvexPath, 'utf8')),
    buildInfo: readFileSync(buildInfoPath, 'utf8'),
    binarySha256: process.env.NATS_BINARY_SHA256,
    imageRef: process.env.NATS_IMAGE_REF,
  });
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ advisory: report.advisory, decision: report.decision, reason: report.reason }));
  if (report.blocking) process.exitCode = 1;
}
