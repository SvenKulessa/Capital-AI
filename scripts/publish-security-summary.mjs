import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { summary } from './summarize-trivy.mjs';
import { readContainerIdentity } from './container-evidence-identity.mjs';

const directory = process.argv[2] || 'security-reports';
const rows = [];
let invalid = false;
let blocked = false;
const containerIdentity = readContainerIdentity(path.join(directory, 'container-identity.json'), false);
const fallbackSource = process.env.GITHUB_SHA || null;
const sourceIdentity = containerIdentity?.source || {
  eventName: process.env.GITHUB_EVENT_NAME || null,
  sourceSha: fallbackSource,
  testedSha: fallbackSource,
  testedMergeSha: null,
  pullRequestHeadSha: null,
  baseMainSha: null,
};
for (const name of ['source', 'build-image', 'image', 'nats-image']) {
  const file = path.join(directory, `${name}.json`);
  let result = { status: 'NOT_RUN_OR_REPORT_MISSING' };
  if (existsSync(file)) {
    try {
      const report = JSON.parse(readFileSync(file, 'utf8'));
      const findings = summary(report);
      result = { status: findings.blocking ? 'FAIL' : 'PASS', ...findings };
      if (findings.blocking) blocked = true;
    } catch { result = { status: 'INVALID_REPORT' }; invalid = true; }
  } else if (
    name === 'nats-image' &&
    process.env.CAPITAL_NATS_SCOPE === 'false' &&
    sourceIdentity.eventName === 'pull_request' &&
    sourceIdentity.pullRequestHeadSha &&
    sourceIdentity.baseMainSha
  ) {
    // The required workflow checked the actual PR diff, and the independent
    // NATS image is unchanged. This is not a passing scan of an untested image.
    result = { status: 'SKIPPED_UNCHANGED_PR_SCOPE', reason: 'PR_DIFF_HAS_NO_NATS_RELATED_FILES' };
  } else invalid = true;
  const artifact = {
    schemaVersion: 2,
    sourceSha: sourceIdentity.testedSha,
    sourceIdentity,
    digestIdentity: containerIdentity ? {
      digestTypes: containerIdentity.digestTypes,
      digests: containerIdentity.digests,
    } : null,
    scope: name,
    ...result,
  };
  writeFileSync(path.join(directory, `${name}.public.json`), JSON.stringify(artifact, null, 2) + '\n');
  console.log(JSON.stringify(artifact));
  rows.push(`| ${name} | ${result.status} | ${result.vulnerabilities?.length ?? '-'} | ${result.misconfigurations?.length ?? '-'} | ${result.secrets ?? '-'} |`);
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '## Sicherheitsnachweise\n\nAlle Schweregrade inventarisiert; HIGH/CRITICAL und Secret-Funde blockieren. Fehlende Berichte sind kein PASS. NATS wird nur bei PRs ohne relevante NATS-Dateien als SKIPPED_UNCHANGED_PR_SCOPE gemeldet; Main, Schedule und Merge Queue verlangen einen echten Scan. Secret-Inhalte bleiben unveröffentlicht. PR-Läufe unterscheiden getesteten Merge-SHA, PR-Head und Base-Main explizit.\n\n' +
  '| Bereich | Ergebnis | CVEs | Konfiguration | Secrets |\n|---|---|---:|---:|---:|\n' + rows.join('\n') + '\n');
if (invalid || blocked) process.exitCode = 1;
