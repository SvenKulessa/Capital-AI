import { readFileSync } from 'node:fs';

const safe = value => String(value ?? '').slice(0, 240).replace(/[^a-zA-Z0-9_.:/@+ ,<>=()-]/g, '_');
export function summary(report) {
  if (!Array.isArray(report.Results)) throw new Error('Missing scanner results');
  const vulnerabilities = report.Results.flatMap(result => (result.Vulnerabilities || []).map(v => ({
    id: safe(v.VulnerabilityID), severity: safe(v.Severity), package: safe(v.PkgName),
    installed: safe(v.InstalledVersion), fixed: v.FixedVersion ? safe(v.FixedVersion) : null,
  })));
  const misconfigurations = report.Results.flatMap(result => (result.Misconfigurations || []).map(v => ({
    id: safe(v.ID), severity: safe(v.Severity), status: safe(v.Status),
  })));
  // No secret matches, code, source paths, lines or scanner messages may be published.
  const secrets = report.Results.reduce((n, r) => n + (r.Secrets?.length || 0), 0);
  const blocking = vulnerabilities.filter(v => ['HIGH', 'CRITICAL'].includes(v.severity)).length +
    misconfigurations.filter(v => v.status !== 'PASS' && ['HIGH', 'CRITICAL'].includes(v.severity)).length + secrets;
  return { vulnerabilities, misconfigurations, secrets, blocking };
}
if (process.argv[1]?.endsWith('/summarize-trivy.mjs')) {
  const result = summary(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  console.log(JSON.stringify(result, null, 2));
  if (process.argv.includes('--gate') && result.blocking > 0) process.exitCode = 1;
}
