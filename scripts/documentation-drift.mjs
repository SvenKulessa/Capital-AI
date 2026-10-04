import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');
const PROFILE_PATH = 'documentary/documentation-drift-profile.json';
const FULL_SHA = '[0-9a-f]{40}';

const CURRENT_MAIN_PATTERNS = [
  new RegExp(`\\bcurrent[-\\s]+main(?:\\s+(?:baseline|snapshot|source(?:\\s+sha)?|sha)(?:\\s+for\\s+this\\s+slice)?)?\\s*(?:[:=@]|is\\s+|=\\s*)?\\s*\\x60?(${FULL_SHA})`, 'gi'),
  new RegExp(`\\bcurrentmain\\s*(?:[:=@]|=\\s*)\\s*\\x60?(${FULL_SHA})`, 'gi'),
  new RegExp(`\\bmain@(${FULL_SHA})`, 'gi'),
  new RegExp(`\\bMain-Snapshot\\s*\\x60?(${FULL_SHA})`, 'gi'),
  new RegExp(`\\bverifiedSourceSha\\s*:\\s*\\x60?(${FULL_SHA})`, 'gi'),
  new RegExp(`\\bBasis:\\s*\\x60?[^\\x60\\n@]+@(${FULL_SHA})`, 'gi'),
];

function normalizeRepoPath(value) {
  return value.replaceAll('\\\\', '/').replace(/^\.\//, '');
}

function loadProfile(root = DEFAULT_ROOT) {
  const absolute = path.join(root, PROFILE_PATH);
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

function trackedFiles(root = DEFAULT_ROOT) {
  return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/)
    .map(normalizeRepoPath)
    .filter(Boolean);
}

function currentMainSha(root = DEFAULT_ROOT) {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

export function isHistoricalPath(filePath, profile) {
  const normalized = normalizeRepoPath(filePath);
  if (profile.historical.prefixes.some((prefix) => normalized.startsWith(prefix))) return true;
  return new RegExp(profile.historical.datedFilenameRegex, 'i').test(normalized);
}

export function isLivingDocument(filePath, profile) {
  const normalized = normalizeRepoPath(filePath);
  if (isHistoricalPath(normalized, profile)) return false;
  if (profile.livingDocuments.exact.includes(normalized)) return true;
  return profile.livingDocuments.prefixes.some((prefix) => normalized.startsWith(prefix));
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

export function extractCurrentMainClaims(content) {
  const claims = [];
  for (const pattern of CURRENT_MAIN_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      claims.push({ sha: match[1].toLowerCase(), index: match.index, text: match[0] });
      if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
    }
  }
  return claims.sort((a, b) => a.index - b.index);
}

export function findRoadmapDuplicateIds(content) {
  const ids = [];
  const pattern = /(?:\bid\s*:\s*['\"]|\"id\"\s*:\s*\")([^'\"]+)(?:['\"])/g;
  let match;
  while ((match = pattern.exec(content)) !== null) ids.push(match[1]);
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id, count]) => ({ id, count }));
}

export function analyzeDocumentationDrift({ root = DEFAULT_ROOT, mainSha, files, profile } = {}) {
  const resolvedProfile = profile ?? loadProfile(root);
  const resolvedMainSha = (mainSha ?? currentMainSha(root)).toLowerCase();
  const resolvedFiles = files ?? trackedFiles(root);
  const findings = [];
  const living = resolvedFiles.filter((file) => isLivingDocument(file, resolvedProfile));

  for (const expected of resolvedProfile.livingDocuments.exact) {
    if (!resolvedFiles.includes(expected)) {
      findings.push({
        class: 'MISSING_LIVING_DOCUMENT',
        severity: 'ERROR',
        path: expected,
        message: 'Configured living document is not tracked in the repository.',
        autoRepairEligible: false,
      });
    }
  }

  for (const file of living) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    const content = fs.readFileSync(absolute, 'utf8');
    for (const claim of extractCurrentMainClaims(content)) {
      const stale = claim.sha !== resolvedMainSha;
      findings.push({
        class: stale ? 'SOURCE_DRIFT' : 'VOLATILE_MAIN_IDENTITY_CLAIM',
        severity: stale ? 'ERROR' : 'WARN',
        path: file,
        line: lineNumberAt(content, claim.index),
        referencedSha: claim.sha,
        currentMainSha: resolvedMainSha,
        marker: claim.text,
        repairClass: 'STALE_DOCUMENTARY_PROJECTION',
        repairFingerprint: resolvedProfile.selfHealing.repairFingerprint,
        autoRepairEligible: false,
        suggestedRemediation: resolvedProfile.selfHealing.remediationStrategy,
        message: stale
          ? 'Living document claims a current-main identity that differs from repository HEAD.'
          : 'Living document embeds the exact current-main SHA and will become stale on the next merge.',
      });
    }

    if (file === 'src/data/roadmapData.ts') {
      for (const duplicate of findRoadmapDuplicateIds(content)) {
        findings.push({
          class: 'ROADMAP_DUPLICATE_ID',
          severity: 'ERROR',
          path: file,
          workPackageId: duplicate.id,
          occurrences: duplicate.count,
          autoRepairEligible: false,
          message: 'Roadmap work-package IDs must remain globally unique.',
        });
      }
    }
  }

  return {
    schema: resolvedProfile.schema,
    version: resolvedProfile.version,
    generatedAt: new Date().toISOString(),
    mainSha: resolvedMainSha,
    authorities: resolvedProfile.authorities,
    inventory: {
      trackedFiles: resolvedFiles.length,
      livingDocuments: living.length,
      historicalDocuments: resolvedFiles.filter((file) => isHistoricalPath(file, resolvedProfile)).length,
    },
    findings,
    summary: {
      driftDetected: findings.length > 0,
      findingCount: findings.length,
      byClass: Object.fromEntries(
        [...new Set(findings.map((finding) => finding.class))]
          .sort()
          .map((key) => [key, findings.filter((finding) => finding.class === key).length]),
      ),
    },
    selfHealing: {
      repairFingerprint: resolvedProfile.selfHealing.repairFingerprint,
      validationSteps: resolvedProfile.selfHealing.validationSteps,
      minimumIndependentPositiveValidationCycles: resolvedProfile.selfHealing.minimumIndependentPositiveValidationCycles,
      validationCyclesObserved: 0,
      autoRepairEnabled: false,
      eligibleForAutomation: false,
      repairMode: resolvedProfile.selfHealing.repairMode,
    },
  };
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, reportOnly: false, pretty: true };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') options.root = path.resolve(argv[++index]);
    else if (arg === '--report-only') options.reportOnly = true;
    else if (arg === '--compact') options.pretty = false;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const report = analyzeDocumentationDrift({ root: options.root });
  process.stdout.write(`${JSON.stringify(report, null, options.pretty ? 2 : 0)}\n`);
  if (report.summary.driftDetected && !options.reportOnly) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) runCli();
