import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { lockInventory } from './license-evidence.mjs';
import { assessExpression } from '../shared/license-engine.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
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
  const providers = (rights.providerRights || rights.providers || []).map(p => ({
    id: p.id, status: p.status, missingFields: Object.entries(p.contractEvidence || {}).filter(([, v]) => v === null || v === undefined || v === '').map(([k]) => k),
    nextAction: 'Schriftliche Erlaubnis für Anzeige, Cache, API-Weitergabe, abgeleitete Daten und Export belegen.',
  }));
  return {
    schemaVersion: 1, scope: 'REPOSITORY_EVIDENCE_SNAPSHOT_NOT_RUNTIME_APPROVAL', deployEligible: false,
    evidenceSourceSha: rights.applicationSourceSha, evidenceReviewDate: rights.reviewDate,
    evidenceSha256: hash(raw), lockfileSha256: inventory.lockfileSha256,
    tools: tools.tools, providers,
    packages: inventory.packages.map(p => ({ name: p.path.replace(/^.*node_modules\//, ''), version: p.version, scope: p.dev ? 'development' : 'lockfile', ...assessExpression(p.declaredLicense) })),
    osPackages: (rights.osPackages || []).map(p => ({ name: p.name, version: p.version, status: p.status, nextAction: 'Passende vollständige Quellen, Patches, Buildinputs und Verteilungsweg am Image-Digest nachweisen.' })),
    remainingGates: rights.remainingGates || [],
    documents: tools.files.map(f => ({ name: f.path.split('/').at(-1), sha256: f.sha256 })),
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
  console.log(`${report.packages.length} Pakete, ${report.providers.length} Provider und ${report.osPackages.length} OS-Pakete; Freigabe bleibt offen.`);
}
