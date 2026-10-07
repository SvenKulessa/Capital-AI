import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA = /^[a-f0-9]{40}$/;
const safe = value => String(value ?? '').slice(0, 240).replace(/[^a-zA-Z0-9_.:/@+ ,<>=()-]/g, '_');
const severity = value => ['HIGH', 'CRITICAL'].includes(value) ? 'WARNING' : 'INFO';

export function convertPublicReport(report, expectedHead, artifactSha) {
  if (!SHA.test(expectedHead) || !SHA.test(artifactSha)) throw new Error('Invalid source identity');
  const identity = report?.sourceIdentity;
  if (report?.schemaVersion !== 2 || report.scope !== 'source' ||
      !SHA.test(identity?.sourceSha ?? '') || !SHA.test(identity?.testedSha ?? '') ||
      ['pullRequestHeadSha', 'baseMainSha'].some(key => identity[key] != null && !SHA.test(identity[key])) ||
      identity.testedSha !== artifactSha || report.sourceSha !== artifactSha ||
      ![identity.sourceSha, identity.testedSha].includes(expectedHead)) {
    throw new Error('Report does not match the selected workflow run and artifact');
  }
  const validStatus = ['PASS', 'FAIL', 'NOT_RUN_OR_REPORT_MISSING', 'INVALID_REPORT'];
  if (!validStatus.includes(report.status)) throw new Error('Unknown scanner status');
  const diagnostics = [];
  if (['PASS', 'FAIL'].includes(report.status)) {
    if (!Array.isArray(report.vulnerabilities) || !Array.isArray(report.misconfigurations) ||
        !Number.isSafeInteger(report.secrets) || report.secrets < 0) throw new Error('Invalid public findings');
    for (const v of report.vulnerabilities) diagnostics.push({
      message: `${safe(v.id)}: ${safe(v.package)} ${safe(v.installed)}; fixed=${safe(v.fixed) || 'not reported'}`,
      severity: severity(v.severity), code: { value: safe(v.id) },
    });
    for (const v of report.misconfigurations.filter(v => v.status !== 'PASS')) diagnostics.push({
      message: `${safe(v.id)}: configuration finding (${safe(v.severity)})`,
      severity: severity(v.severity), code: { value: safe(v.id) },
    });
    if (report.secrets) diagnostics.push({ message: `Secret findings: ${report.secrets}; contents withheld`, severity: 'WARNING' });
  }
  // Public reports deliberately contain no paths/lines. Never invent locations.
  return {
    rdjson: { source: { name: 'CAPITAL-AI Trivy public report' }, diagnostics },
    evidence: { schemaVersion: 1, sourceIdentity: {
      sourceSha: identity.sourceSha, testedSha: identity.testedSha,
      pullRequestHeadSha: identity.pullRequestHeadSha ?? null, baseMainSha: identity.baseMainSha ?? null,
    }, scannerStatus: report.status, diagnosticCount: diagnostics.length,
    reviewStatus: 'ADVISORY', inlineLocationsAvailable: false,
    completeness: ['PASS', 'FAIL'].includes(report.status) ? 'PUBLIC_SUMMARY_ONLY' : 'NOT_PROVEN' },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output, evidence, head, artifactSha] = process.argv.slice(2);
  const converted = convertPublicReport(JSON.parse(readFileSync(input, 'utf8')), head, artifactSha);
  writeFileSync(output, JSON.stringify(converted.rdjson, null, 2) + '\n');
  writeFileSync(evidence, JSON.stringify(converted.evidence, null, 2) + '\n');
  console.log(JSON.stringify(converted.evidence));
}
