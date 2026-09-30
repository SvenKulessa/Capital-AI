import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { summary } from './summarize-trivy.mjs';

const directory = process.argv[2] || 'security-reports';
const rows = [];
let invalid = false;
let blocked = false;
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
  } else invalid = true;
  const artifact = { schemaVersion: 1, sourceSha: process.env.GITHUB_SHA || null, scope: name, ...result };
  writeFileSync(path.join(directory, `${name}.public.json`), JSON.stringify(artifact, null, 2) + '\n');
  console.log(JSON.stringify(artifact));
  rows.push(`| ${name} | ${result.status} | ${result.vulnerabilities?.length ?? '-'} | ${result.misconfigurations?.length ?? '-'} | ${result.secrets ?? '-'} |`);
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '## Sicherheitsnachweise\n\nAlle Schweregrade inventarisiert; HIGH/CRITICAL und Secret-Funde blockieren. Fehlende Berichte sind kein PASS. Secret-Inhalte bleiben unveröffentlicht.\n\n' +
  '| Bereich | Ergebnis | CVEs | Konfiguration | Secrets |\n|---|---|---:|---:|---:|\n' + rows.join('\n') + '\n');
if (invalid || blocked) process.exitCode = 1;
