import parse from 'spdx-expression-parse';

export const MAX_REPORT_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;
const text = value => typeof value === 'string' ? value.slice(0, 500) : '';
const objects = value => {
  if (!Array.isArray(value) || value.length > MAX_ROWS) throw new Error('Ungültige oder zu große Eintragsliste.');
  return value;
};

/** Technical obligations only. SPDX recognition never grants redistribution rights. */
export function assessExpression(expression) {
  const value = text(expression);
  if (!value || value.length > 400) return { expression: value, status: 'MISSING_OR_INVALID', obligations: ['Lizenzausdruck und Originaltext nachreichen.'] };
  try {
    const ast = parse(value);
    const obligations = new Set();
    const walk = node => {
      if (node.conjunction) {
        obligations.add(node.conjunction === 'or' ? 'Lizenzalternative ausdrücklich auswählen und dokumentieren.' : 'Pflichten aller verbundenen Lizenzen prüfen.');
        walk(node.left); walk(node.right);
      } else {
        obligations.add('Original-Lizenztext und erforderliche Urheber-/NOTICE-Hinweise sichern.');
        if (/^(A?GPL|LGPL|MPL|EPL|CDDL)/.test(node.license)) obligations.add('Copyleft-Umfang, passende Quellen und Bereitstellungsweg prüfen.');
        if (/^AGPL/.test(node.license)) obligations.add('Pflichten bei Netzwerknutzung separat prüfen.');
        if (/^CC-BY/.test(node.license)) obligations.add('Attribution, Lizenzlink und Änderungen dokumentieren.');
        if (/LicenseRef|DocumentRef/.test(node.license)) obligations.add('Projektspezifischen Lizenztext manuell zuordnen.');
        if (node.exception) obligations.add('Ausnahme ' + node.exception + ' an der tatsächlich ausgelieferten Komponente prüfen.');
      }
    };
    walk(ast);
    return { expression: value, status: 'REVIEW_REQUIRED', obligations: [...obligations] };
  } catch {
    return { expression: value, status: 'MISSING_OR_INVALID', obligations: ['Kein gültiger SPDX-Ausdruck; Originaltext und Auswahl manuell prüfen.'] };
  }
}

/** Bounded, untrusted local imports; only explicitly supported report subsets. */
export function importScannerReport(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_REPORT_BYTES) throw new Error('Datei überschreitet 2 MiB.');
  const report = JSON.parse(raw);
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw new Error('JSON-Bericht erwartet.');
  let tool; let rows;
  const row = (name, version, expression) => ({ name: text(name) || 'Unbenannter Eintrag', version: text(version), ...assessExpression(expression) });
  if (report.bomFormat === 'CycloneDX') {
    tool = 'CycloneDX';
    rows = objects(report.components).map(c => row(c.name, c.version, Array.isArray(c.licenses) ? c.licenses.map(l => l.expression || l.license?.id || l.license?.name || '').filter(Boolean).join(' AND ') : ''));
  } else if (typeof report.spdxVersion === 'string' && report.spdxVersion.startsWith('SPDX-')) {
    tool = 'SPDX';
    rows = objects(report.packages).map(p => row(p.name, p.versionInfo, p.licenseConcluded && p.licenseConcluded !== 'NOASSERTION' ? p.licenseConcluded : p.licenseDeclared));
  } else if (Array.isArray(report.headers) && report.headers.some(h => h.tool_name === 'scancode-toolkit')) {
    tool = 'ScanCode';
    rows = objects(report.files).map(f => row(f.path, '', f.detected_license_expression_spdx || f.license_expression_spdx || ''));
  } else if (report.scanner && Array.isArray(report.scanner.scan_results)) {
    tool = 'ORT';
    rows = objects(report.scanner.scan_results).flatMap(s => {
      const results = s.summary ? [s] : objects(s.results);
      return results.map(r => row(s.id || s.provenance?.vcs_info?.url || s.provenance?.artifact?.url || 'ORT-Provenienz',
        s.provenance?.resolved_revision || '', Array.isArray(r.summary?.license_findings) ? [...new Set(objects(r.summary.license_findings).map(f => text(f.license)))].join(' AND ') : ''));
    });
  } else if (Array.isArray(report.Results) && report.SchemaVersion) {
    tool = 'Trivy';
    rows = objects(report.Results).flatMap(r => objects(r.Licenses || []).map(l => row(l.PkgName || l.FilePath, '', l.Name)));
  } else throw new Error('Unterstützt: ScanCode JSON, ORT scan_results JSON, Trivy-Lizenz-JSON, SPDX JSON und CycloneDX JSON.');
  if (!rows.length || rows.length > MAX_ROWS) throw new Error('Kein auswertbarer Lizenznachweis oder zu viele Einträge.');
  return { schemaVersion: 1, tool, scope: 'LOCAL_UNTRUSTED_REPORT', digestVerified: false, deployEligible: false, rows };
}
