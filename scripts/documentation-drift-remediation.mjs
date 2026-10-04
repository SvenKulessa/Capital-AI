import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');
const SHA_RE = /^[0-9a-f]{40}$/i;
const SUPPORTED_FINDING_CLASSES = new Set(['SOURCE_DRIFT', 'VOLATILE_MAIN_IDENTITY_CLAIM']);

function digest(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function assertSha(value, label) {
  if (!SHA_RE.test(String(value || ''))) throw new Error(`${label} must be a 40-character Git SHA`);
  return String(value).toLowerCase();
}

function unique(values) {
  return [...new Set(values)];
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isPathAllowed(file, proposal) {
  if ((proposal.forbiddenExactPaths || []).includes(file)) return false;
  if ((proposal.forbiddenPrefixes || []).some((prefix) => file.startsWith(prefix))) return false;
  if ((proposal.allowedExactPaths || []).includes(file)) return true;
  return (proposal.allowedPrefixes || []).some((prefix) => file.startsWith(prefix));
}

export function transformMarker(marker) {
  if (/^current[-\s]+main/i.test(marker)) {
    return {
      transformId: 'CURRENT_MAIN_TO_IMPLEMENTATION_BASELINE',
      replacement: marker.replace(/^current[-\s]+main/i, 'Implementation'),
    };
  }
  if (/^Main-Snapshot\b/i.test(marker)) {
    return {
      transformId: 'MAIN_SNAPSHOT_TO_HISTORICAL_SOURCE',
      replacement: marker.replace(/^Main-Snapshot/i, 'Historical-Source-Snapshot'),
    };
  }
  const mainRef = marker.match(/^main@([0-9a-f]{40})$/i);
  if (mainRef) {
    return {
      transformId: 'MAIN_REF_TO_IMPLEMENTATION_BASELINE',
      replacement: `implementation-baseline@${mainRef[1].toLowerCase()}`,
    };
  }
  return null;
}

function promotionStatus(profile, validation) {
  const proposal = profile.selfHealing?.prProposal || {};
  const fingerprint = proposal.approvedRepairFingerprint;
  const positive = Number(validation.validation?.positiveIndependentCycles || 0);
  const required = Number(validation.validation?.requiredIndependentPositiveCycles || 0);
  const sameFingerprint = validation.repairFingerprint === fingerprint
    && validation.promotion?.sameRepairFingerprint === true;
  const safe = validation.promotion?.deterministicLowRiskClass === true
    && validation.promotion?.eligibleForDocSh02 === true
    && validation.promotion?.autoRepairEnabled === false
    && validation.promotion?.autoMergeAllowed === false
    && validation.promotion?.productionAuthority === false;
  return {
    fingerprint,
    positive,
    required,
    sameFingerprint,
    safe,
    promoted: Boolean(proposal.enabled)
      && positive >= 3
      && required >= 3
      && positive >= required
      && sameFingerprint
      && safe,
  };
}

export function buildDocumentationRepairPlan({
  root = DEFAULT_ROOT,
  report,
  profile,
  validation,
  expectedMainSha,
}) {
  const expected = assertSha(expectedMainSha, 'expectedMainSha');
  const proposal = profile.selfHealing?.prProposal || {};
  const promotion = promotionStatus(profile, validation);
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  const blockers = [];
  const operations = [];

  if (assertSha(report?.mainSha, 'report.mainSha') !== expected) blockers.push('REPORT_MAIN_SHA_MISMATCH');
  if (!promotion.promoted) blockers.push('PROMOTION_EVIDENCE_NOT_SATISFIED');
  if (proposal.mode !== 'PR_ONLY') blockers.push('PROPOSAL_MODE_MUST_BE_PR_ONLY');
  if (proposal.autoMerge !== false) blockers.push('AUTO_MERGE_MUST_BE_FALSE');
  if (proposal.productionAuthority !== false) blockers.push('PRODUCTION_AUTHORITY_MUST_BE_FALSE');
  if (proposal.expectedMainShaRequired !== true) blockers.push('EXPECTED_MAIN_SHA_GUARD_REQUIRED');
  if (findings.length === 0) blockers.push('NO_DOCUMENTATION_DRIFT');

  for (const finding of findings) {
    const file = String(finding.path || '');
    if (!SUPPORTED_FINDING_CLASSES.has(finding.class)) {
      blockers.push(`UNSUPPORTED_FINDING_CLASS:${finding.class || 'UNKNOWN'}`);
      continue;
    }
    if (finding.repairClass !== 'STALE_DOCUMENTARY_PROJECTION') {
      blockers.push(`UNSUPPORTED_REPAIR_CLASS:${finding.repairClass || 'UNKNOWN'}`);
      continue;
    }
    if (finding.repairFingerprint !== promotion.fingerprint) {
      blockers.push(`REPAIR_FINGERPRINT_MISMATCH:${file}`);
      continue;
    }
    if (!isPathAllowed(file, proposal)) {
      blockers.push(`PATH_NOT_ALLOWED:${file}`);
      continue;
    }
    const transformed = transformMarker(String(finding.marker || ''));
    if (!transformed || !(proposal.allowedTransformIds || []).includes(transformed.transformId)) {
      blockers.push(`UNSUPPORTED_TRANSFORM:${file}`);
      continue;
    }
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      blockers.push(`FILE_NOT_FOUND:${file}`);
      continue;
    }
    const content = fs.readFileSync(absolute, 'utf8');
    const marker = String(finding.marker || '');
    const occurrences = marker ? content.split(marker).length - 1 : 0;
    if (occurrences !== 1) {
      blockers.push(`MARKER_OCCURRENCE_${occurrences}:${file}`);
      continue;
    }
    operations.push({
      path: file,
      line: Number(finding.line || 0),
      marker,
      replacement: transformed.replacement,
      transformId: transformed.transformId,
      sourceDigest: digest(content),
    });
  }

  const dedupedBlockers = unique(blockers).sort();
  const eligible = findings.length > 0
    && operations.length === findings.length
    && dedupedBlockers.length === 0
    && promotion.promoted;

  return {
    schema: 'DOCUMENTATION_DRIFT_REPAIR_PLAN@1',
    version: '1.0.0',
    expectedMainSha: expected,
    repairFingerprint: promotion.fingerprint,
    findingsCount: findings.length,
    operations,
    blockers: dedupedBlockers,
    eligible,
    promotion,
    policy: {
      mode: proposal.mode || null,
      autoMerge: false,
      productionAuthority: false,
      expectedMainShaRequired: true,
      directMainMutation: false,
    },
  };
}

function repositoryHeadSha(root) {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().toLowerCase();
}

export function applyDocumentationRepairPlan({
  root = DEFAULT_ROOT,
  plan,
  expectedMainSha,
  actualHeadSha,
}) {
  const expected = assertSha(expectedMainSha, 'expectedMainSha');
  if (plan?.eligible !== true) throw new Error('repair plan is not eligible');
  if (assertSha(plan.expectedMainSha, 'plan.expectedMainSha') !== expected) {
    throw new Error('plan expectedMainSha mismatch');
  }
  const actual = assertSha(actualHeadSha || repositoryHeadSha(root), 'actualHeadSha');
  if (actual !== expected) throw new Error(`expected main ${expected} but repository HEAD is ${actual}`);
  if (plan.policy?.autoMerge !== false || plan.policy?.productionAuthority !== false || plan.policy?.directMainMutation !== false) {
    throw new Error('unsafe repair policy');
  }

  const changed = [];
  for (const operation of plan.operations || []) {
    const absolute = path.join(root, operation.path);
    const content = fs.readFileSync(absolute, 'utf8');
    if (digest(content) !== operation.sourceDigest) throw new Error(`source digest changed: ${operation.path}`);
    const occurrences = content.split(operation.marker).length - 1;
    if (occurrences !== 1) throw new Error(`marker occurrence changed: ${operation.path}`);
    const next = content.replace(operation.marker, operation.replacement);
    if (next === content) throw new Error(`repair produced no change: ${operation.path}`);
    fs.writeFileSync(absolute, next);
    changed.push(operation.path);
  }
  return { changedFiles: unique(changed).sort(), expectedMainSha: expected };
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { command, root: DEFAULT_ROOT };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '--root') options.root = path.resolve(rest[++index]);
    else if (arg === '--report') options.report = rest[++index];
    else if (arg === '--profile') options.profile = rest[++index];
    else if (arg === '--validation') options.validation = rest[++index];
    else if (arg === '--plan') options.plan = rest[++index];
    else if (arg === '--expected-main') options.expectedMainSha = rest[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function runCli() {
  const options = parseArgs(process.argv.slice(2));
  if (options.command === 'plan') {
    const plan = buildDocumentationRepairPlan({
      root: options.root,
      report: loadJson(required(options.report, '--report')),
      profile: loadJson(required(options.profile, '--profile')),
      validation: loadJson(required(options.validation, '--validation')),
      expectedMainSha: required(options.expectedMainSha, '--expected-main'),
    });
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }
  if (options.command === 'apply') {
    const result = applyDocumentationRepairPlan({
      root: options.root,
      plan: loadJson(required(options.plan, '--plan')),
      expectedMainSha: required(options.expectedMainSha, '--expected-main'),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  throw new Error('Usage: documentation-drift-remediation.mjs <plan|apply> ...');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) runCli();
