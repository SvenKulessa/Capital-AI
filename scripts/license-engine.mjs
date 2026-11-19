import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { lockInventory } from './license-evidence.mjs';
import { assessExpression } from '../shared/license-engine.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');

// A historical rights review must never masquerade as a current runtime/SBOM scan.
// Dockerfile may be intentionally absent in the minimized Vite build context.
export function classifyContainerReviewBaseline(dockerfile, rights) {
  const historicalBaseImage = typeof rights?.baseImage === 'string' ? rights.baseImage : null;
  const sourceSha = rights?.applicationSourceSha || null;
  let currentBaseImage = null;
  if (dockerfile !== null && dockerfile !== undefined) {
    const pins = [...String(dockerfile).matchAll(/^FROM (node:\d+\.\d+\.\d+-alpine@sha256:[a-f0-9]{64}) AS crypto-base$/gm)];
    if (pins.length !== 1) throw new Error('Pinned Node/Alpine image identity missing or ambiguous for license evidence');
    currentBaseImage = pins[0][1];
  }
  return {
    status: currentBaseImage === null ? 'CURRENT_BASE_UNAVAILABLE_NOT_PROVEN'
      : historicalBaseImage === currentBaseImage ? 'ARCHIVED_REVIEW_NOT_CURRENT_RUNTIME_PROOF'
      : 'HISTORICAL_BASE_IMAGE_MISMATCH',
    currentBaseImage,
    historicalBaseImage,
    historicalSourceSha: sourceSha,
    currentRuntimeSbomStatus: 'NOT_INCLUDED_USE_SHA_BOUND_SECURITY_ARTIFACT',
    currentOSPackageInventoryStatus: 'NOT_INCLUDED_HISTORICAL_ONLY',
    redistributionApproved: false,
  };
}
export function buildLicenseReport(root) {
  const evidencePath = 'docs/security/evidence/license-rights-review.json';
  const raw = readFileSync(join(root, evidencePath));
  const rights = JSON.parse(raw);
  const inventory = lockInventory(root);
  const tools = JSON.parse(readFileSync(join(root, 'docs/licenses/license-engine/provenance.json')));
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json')));
  for (const tool of tools.tools.filter(t => t.mode === 'INSTALLED_LOCAL_ENGINE')) {
    const p = lock.packages['node_modules/' + tool.id];
    if (!p || p.version !== tool.version || p.integrity !== tool.integrity || p.resolved !== tool.tarball || !tool.tarball.startsWith('https://registry.npmjs.org/')) {
      throw new Error('Werkzeugherkunft stimmt nicht mit dem Lockfile überein: ' + tool.id);
    }
  }
  for (const file of tools.files) {
    if (hash(readFileSync(join(root, file.path))) !== file.sha256) throw new Error('Lizenztext verändert: ' + file.path);
  }
  const providerNextAction = 'Schriftliche Erlaubnis für Anzeige, Cache, API-Weitergabe, abgeleitete Daten und Export belegen.';
  const providers = (rights.providerRights || rights.providers || []).map(p => {
    const missingFields = Object.entries(p.contractEvidence || {})
      .filter(([, value]) => value === null || value === undefined || value === '')
      .map(([key]) => key);
    return {
      subjectType: 'provider',
      id: p.id,
      name: p.id,
      version: '',
      hash: '',
      spdxId: '',
      source: evidencePath,
      usageScope: 'external-market-data-rights',
      obligations: [providerNextAction, ...missingFields.map(field => 'Fehlender Vertragsnachweis: ' + field)],
      scanTime: rights.reviewDate || null,
      status: p.status,
      evidenceStatus: missingFields.length ? 'GEHALTEN' : 'OFFEN',
      ownerApproved: false,
      missingFields,
      nextAction: providerNextAction,
    };
  });
  const packages = inventory.packages.map(p => {
    const assessment = assessExpression(p.selectedLicense || p.declaredLicense);
    return {
      subjectType: 'package',
      name: p.path.replace(/^.*node_modules\//, ''),
      version: p.version,
      hash: p.integrity || '',
      spdxId: p.selectedLicense || p.declaredLicense || '',
      expression: assessment.expression,
      source: p.resolved || ('package-lock.json#' + p.path),
      usageScope: p.dev ? 'development-lockfile' : 'application-lockfile',
      obligations: assessment.obligations,
      scanTime: null,
      status: assessment.status,
      evidenceStatus: 'OFFEN',
      ownerApproved: false,
    };
  });
  const osPackages = (rights.osPackages || []).map(p => ({
    subjectType: 'package',
    name: p.name,
    version: p.version,
    hash: '',
    spdxId: '',
    source: evidencePath,
    usageScope: 'archived-container-distribution',
    historicalBaseImage: rights.baseImage || null,
    historicalSourceSha: rights.applicationSourceSha || null,
    currentRuntimeVerified: false,
    obligations: ['Historischer Image-Stand: nicht als aktuelles OS-Runtime-Inventar verwenden.', 'Passende vollständige Quellen, Patches, Buildinputs und Verteilungsweg am aktuellen Image-Digest nachweisen.'],
    scanTime: rights.reviewDate || null,
    status: p.status,
    evidenceStatus: 'HISTORICAL_ONLY',
    ownerApproved: false,
    nextAction: 'Aktuelles SHA-gebundenes OS-Inventar im Security-Run prüfen; Quellarchive, Patches und Redistributionsrechte separat belegen.',
  }));
  const dockerfilePath = join(root, 'Dockerfile');
  const containerReviewBaseline = classifyContainerReviewBaseline(
    existsSync(dockerfilePath) ? readFileSync(dockerfilePath, 'utf8') : null, rights);
  return {
    schemaVersion: 2,
    scope: 'REPOSITORY_EVIDENCE_SNAPSHOT_NOT_RUNTIME_APPROVAL',
    containerReviewBaseline,
    deployEligible: false,
    ownerApproved: false,
    evidenceSourceSha: rights.applicationSourceSha,
    evidenceReviewDate: rights.reviewDate,
    evidenceSha256: hash(raw),
    lockfileSha256: inventory.lockfileSha256,
    tools: tools.tools,
    providers,
    packages,
    osPackages,
    remainingGates: rights.remainingGates || [],
    documents: tools.files.map(file => ({
      subjectType: 'asset',
      name: file.path.split('/').at(-1),
      version: '',
      hash: file.sha256,
      sha256: file.sha256,
      spdxId: '',
      source: file.path,
      usageScope: 'archived-license-evidence',
      obligations: ['Technische Hash-Bindung erhalten; Rechtefreigabe separat prüfen.'],
      scanTime: rights.reviewDate || null,
      status: 'HASH_VERIFIED',
      evidenceStatus: 'VERIFIED',
      ownerApproved: false,
    })),
  };
}

export function licenseEnginePlugin() {
  let root;
  const report = () => JSON.stringify(buildLicenseReport(root), null, 2) + '\n';
  return {
    name: 'capital-ai-license-engine',
    configResolved(config) { root = config.root; },
    configureServer(server) {
      server.middlewares.use('/license-engine', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const name = req.url?.split('?')[0]?.replace(/^\//, '');
        const files = readdirSync(join(root, 'docs/licenses/license-engine')).filter(f => f.endsWith('.txt'));
        if (name === 'report.json') { res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(report()); }
        else if (files.includes(name)) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end(readFileSync(join(root, 'docs/licenses/license-engine', name))); }
        else next();
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'license-engine/report.json', source: report() });
      for (const name of readdirSync(join(root, 'docs/licenses/license-engine')).filter(f => f.endsWith('.txt'))) {
        this.emitFile({ type: 'asset', fileName: 'license-engine/' + name, source: readFileSync(join(root, 'docs/licenses/license-engine', name), 'utf8') });
      }
    },
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildLicenseReport(process.cwd());
  mkdirSync('security-reports', { recursive: true });
  writeFileSync('security-reports/license-engine.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.packages.length} npm-Lockfile-Pakete, ${report.providers.length} Provider und ${report.osPackages.length} HISTORISCHE OS-Pakete; aktuelles Runtime-SBOM separat prüfen; Freigabe bleibt offen.`);
}
