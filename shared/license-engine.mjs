import parse from 'spdx-expression-parse';

export const MAX_REPORT_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_TEXT = 500;
const text = value => typeof value === 'string' ? value.slice(0, MAX_TEXT) : '';
const objects = value => {
  if (!Array.isArray(value) || value.length > MAX_ROWS) throw new Error('Ungültige oder zu große Eintragsliste.');
  return value;
};
const scanTime = value => {
  const candidate = text(value);
  if (!candidate) return null;
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
};
const firstHash = hashes => {
  if (!Array.isArray(hashes)) return '';
  const preferred = hashes.find(h => /sha-?256/i.test(text(h?.alg || h?.algorithm))) || hashes[0];
  return text(preferred?.content || preferred?.checksumValue || preferred?.value);
};
const scannerRow = ({
  subjectType = 'package',
  name,
  version = '',
  hash = '',
  expression = '',
  source = '',
  usageScope = 'scanner-report',
  scannedAt = null,
}) => {
  const assessment = assessExpression(expression);
  return {
    subjectType,
    name: text(name) || 'Unbenannter Eintrag',
    version: text(version),
    hash: text(hash),
    spdxId: assessment.expression,
    expression: assessment.expression,
    source: text(source),
    usageScope: text(usageScope) || 'scanner-report',
    obligations: assessment.obligations,
    scanTime: scanTime(scannedAt),
    status: assessment.status,
    evidenceStatus: 'UNGEKLÄRT',
    ownerApproved: false,
  };
};

/** Technical obligations only. SPDX recognition never grants redistribution or provider rights. */
export function assessExpression(expression) {
  const value = text(expression);
  if (!value || value.length > 400) {
    return {
      expression: value,
      status: 'MISSING_OR_INVALID',
      obligations: ['Lizenzausdruck und Originaltext nachreichen.'],
    };
  }
  try {
    let depth = 0;
    for (const char of value) {
      if (char === '(' && ++depth > 64) throw new Error('Lizenzausdruck zu tief verschachtelt.');
      if (char === ')') depth--;
    }
    const ast = parse(value);
    const obligations = new Set();
    const walk = node => {
      if (node.conjunction) {
        obligations.add(node.conjunction === 'or'
          ? 'Lizenzalternative ausdrücklich auswählen und dokumentieren.'
          : 'Pflichten aller verbundenen Lizenzen prüfen.');
        walk(node.left);
        walk(node.right);
      } else {
        obligations.add('Original-Lizenztext und erforderliche Urheber-/NOTICE-Hinweise sichern.');
        if (/^(A?GPL|LGPL|MPL|EPL|CDDL)/.test(node.license)) {
          obligations.add('Copyleft-Umfang, passende Quellen und Bereitstellungsweg prüfen.');
        }
        if (/^AGPL/.test(node.license)) obligations.add('Pflichten bei Netzwerknutzung separat prüfen.');
        if (/^CC-BY/.test(node.license)) obligations.add('Attribution, Lizenzlink und Änderungen dokumentieren.');
        if (/LicenseRef|DocumentRef/.test(node.license)) obligations.add('Projektspezifischen Lizenztext manuell zuordnen.');
        if (node.exception) obligations.add('Ausnahme ' + node.exception + ' an der tatsächlich ausgelieferten Komponente prüfen.');
      }
    };
    walk(ast);
    return { expression: value, status: 'REVIEW_REQUIRED', obligations: [...obligations] };
  } catch {
    return {
      expression: value,
      status: 'MISSING_OR_INVALID',
      obligations: ['Kein gültiger SPDX-Ausdruck; Originaltext und Auswahl manuell prüfen.'],
    };
  }
}

/**
 * Bounded, untrusted local imports; only explicitly supported report subsets.
 * The browser parser never uploads a report, executes shell commands or converts a scanner result into approval.
 */
export function importScannerReport(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_REPORT_BYTES) {
    throw new Error('Datei überschreitet 2 MiB.');
  }
  const report = JSON.parse(raw);
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw new Error('JSON-Bericht erwartet.');

  let tool;
  let rows;

  if (report.bomFormat === 'CycloneDX') {
    if (typeof report.specVersion !== 'string') throw new Error('CycloneDX specVersion fehlt.');
    tool = 'CycloneDX';
    const scannedAt = report.metadata?.timestamp;
    rows = objects(report.components).map(component => {
      const expression = Array.isArray(component.licenses)
        ? component.licenses
            .map(entry => entry?.expression || entry?.license?.id || entry?.license?.name || '')
            .filter(Boolean)
            .join(' AND ')
        : '';
      return scannerRow({
        subjectType: component.type === 'file' ? 'asset' : 'package',
        name: component.name,
        version: component.version,
        hash: firstHash(component.hashes),
        expression,
        source: component.purl || component['bom-ref'] || '',
        usageScope: component.scope || 'scanner-report',
        scannedAt,
      });
    });
  } else if (typeof report.spdxVersion === 'string' && report.spdxVersion.startsWith('SPDX-')) {
    tool = 'SPDX';
    const scannedAt = report.creationInfo?.created;
    rows = objects(report.packages).map(pkg => scannerRow({
      subjectType: 'package',
      name: pkg.name,
      version: pkg.versionInfo,
      hash: firstHash(pkg.checksums),
      expression: pkg.licenseConcluded && pkg.licenseConcluded !== 'NOASSERTION'
        ? pkg.licenseConcluded
        : pkg.licenseDeclared,
      source: pkg.downloadLocation && pkg.downloadLocation !== 'NOASSERTION'
        ? pkg.downloadLocation
        : pkg.SPDXID,
      usageScope: pkg.primaryPackagePurpose || 'scanner-report',
      scannedAt,
    }));
  } else if (Array.isArray(report.headers) && report.headers.some(header => header?.tool_name === 'scancode-toolkit')) {
    tool = 'ScanCode';
    const header = report.headers.find(item => item?.tool_name === 'scancode-toolkit') || report.headers[0];
    const scannedAt = header?.end_timestamp || header?.start_timestamp;
    rows = objects(report.files).map(file => scannerRow({
      subjectType: 'asset',
      name: file.path,
      hash: file.sha256 || file.sha1 || file.md5 || '',
      expression: file.detected_license_expression_spdx || file.license_expression_spdx || '',
      source: file.path,
      usageScope: file.type || 'source-file',
      scannedAt,
    }));
  } else if (report.scanner && Array.isArray(report.scanner.scan_results)) {
    tool = 'ORT';
    const scannedAt = report.scanner.end_time || report.scanner.start_time;
    rows = objects(report.scanner.scan_results).flatMap(scanResult => {
      const results = scanResult.summary ? [scanResult] : objects(scanResult.results);
      return results.map(result => {
        const findings = Array.isArray(result.summary?.license_findings)
          ? [...new Set(objects(result.summary.license_findings).map(finding => text(finding.license)).filter(Boolean))]
          : [];
        const provenance = scanResult.provenance || result.provenance || {};
        return scannerRow({
          subjectType: 'package',
          name: scanResult.id || provenance?.vcs_info?.url || provenance?.artifact?.url || 'ORT-Provenienz',
          version: provenance?.resolved_revision || '',
          hash: provenance?.resolved_revision || provenance?.artifact?.hash?.value || '',
          expression: findings.join(' AND '),
          source: provenance?.vcs_info?.url || provenance?.artifact?.url || '',
          usageScope: 'scanner-result',
          scannedAt: result.end_time || result.start_time || scannedAt,
        });
      });
    });
  } else if (Array.isArray(report.Results) && report.SchemaVersion) {
    tool = 'Trivy';
    const scannedAt = report.CreatedAt;
    rows = objects(report.Results).flatMap(result =>
      objects(result.Licenses || []).map(license => scannerRow({
        subjectType: license.FilePath ? 'asset' : 'package',
        name: license.PkgName || license.FilePath || result.Target,
        version: license.PkgVersion || '',
        expression: license.Name,
        source: license.FilePath || result.Target || '',
        usageScope: result.Class || result.Type || 'scanner-report',
        scannedAt,
      }))
    );
  } else {
    throw new Error('Unterstützt: ScanCode JSON, ORT scan_results JSON, Trivy-Lizenz-JSON, SPDX JSON und CycloneDX JSON.');
  }

  if (!rows.length || rows.length > MAX_ROWS) throw new Error('Kein auswertbarer Lizenznachweis oder zu viele Einträge.');
  return {
    schemaVersion: 2,
    tool,
    scope: 'LOCAL_UNTRUSTED_REPORT',
    digestVerified: false,
    ownerApproved: false,
    deployEligible: false,
    rows,
  };
}
