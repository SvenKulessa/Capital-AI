import { readFileSync } from 'node:fs';

export function summary(report) {
  if (!Array.isArray(report.Results)) throw new Error('Missing scanner results');
  const vulnerabilities = report.Results.flatMap(result => (result.Vulnerabilities || []).map(v => ({
    id: v.VulnerabilityID, severity: v.Severity, package: v.PkgName,
    installed: v.InstalledVersion, fixed: v.FixedVersion || null,
  })));
  // Secret Match/Code/Line data and source text must never enter public job logs.
  return { vulnerabilities, secrets: report.Results.reduce((n, r) => n + (r.Secrets?.length || 0), 0) };
}
if (process.argv[1]?.endsWith('/summarize-trivy.mjs')) {
  console.log(JSON.stringify(summary(JSON.parse(readFileSync(process.argv[2], 'utf8'))), null, 2));
}
