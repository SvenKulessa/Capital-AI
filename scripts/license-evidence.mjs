import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const permissive = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'Apache-2.0', '(MIT AND Zlib)', 'MIT AND ISC']);
const alternatives = new Map([
  ['(MPL-2.0 OR Apache-2.0)', 'Apache-2.0'],
  ['MIT OR SEE LICENSE IN FEEL-FREE.md', 'MIT'],
]);

// Package-bounded review: do not treat arbitrary MIT-0 metadata as reviewed.
function reviewedNodemailer(root, path, p) {
  const licensePath = join(root, 'docs/licenses/nodemailer-10.0.13-MIT-0.txt');
  return path === 'node_modules/nodemailer' && p.version === '10.0.13' && p.license === 'MIT-0'
    && p.resolved === 'https://registry.npmjs.org/nodemailer/-/nodemailer-10.0.13.tgz'
    && p.integrity === 'sha512-SzG86OlvcW/NNhUFC6uROMwRTL4n7MswfQqC/T8mhkmnY1YVa23zUEMYi4ijSeXSl9GLz9ZeTJDUatEDuY5FeQ=='
    && existsSync(licensePath)
    && sha256(readFileSync(licensePath)) === '4f814dcacd2da618d62829ea1f6238701cf421f18a6b36c91c5d8212245e2c78';
}

export function lockInventory(root) {
  const raw = readFileSync(join(root, 'package-lock.json'));
  const lock = JSON.parse(raw);
  if (lock.lockfileVersion !== 3 || !lock.packages) throw new Error('Expected npm lockfile v3');
  const packages = Object.entries(lock.packages).filter(([path]) => path).sort(([a], [b]) => a.localeCompare(b)).map(([path, p]) => {
    const selectedLicense = alternatives.get(p.license) || p.license || null;
    const buildReview = selectedLicense === 'MPL-2.0' && /(^|\/)node_modules\/lightningcss(?:-[^/]+)?$/.test(path);
    const dependencyDistributionReview = (path === 'node_modules/tweetnacl' && p.version === '1.0.3' && selectedLicense === 'Unlicense')
      || reviewedNodemailer(root, path, p);
    const attributionReview = path === 'node_modules/caniuse-lite' && selectedLicense === 'CC-BY-4.0';
    return {
      path, version: p.version, declaredLicense: p.license || null, selectedLicense,
      dev: p.dev === true, optional: p.optional === true, integrity: p.integrity || null,
      metadataStatus: permissive.has(selectedLicense) ? 'NOTICE_REQUIRED' : buildReview ? 'BUILD_TOOL_REVIEW' : attributionReview ? 'DATA_ATTRIBUTION_REVIEW' : dependencyDistributionReview ? 'DEPENDENCY_DISTRIBUTION_REVIEW' : 'UNREVIEWED',
    };
  });
  return { schemaVersion: 1, scope: 'ALL_LOCKFILE_ENTRIES_NOT_RUNTIME_SBOM', lockfileSha256: sha256(raw), packages, deployEligible: false };
}

function noticeFiles(directory, subpath = '') {
  const result = [];
  for (const entry of readdirSync(join(directory, subpath), { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(entry.name) || entry.isSymbolicLink()) continue;
    const p = join(subpath, entry.name);
    if (entry.isDirectory()) result.push(...noticeFiles(directory, p));
    else if (entry.isFile() && /^(licen[sc]e|copying|copyright|notice)([._-].*)?$/i.test(entry.name)) result.push(p);
  }
  return result.sort();
}

export function bundleLicenseEvidence(root, moduleIds) {
  const inventory = lockInventory(root);
  const installed = inventory.packages.filter(p => existsSync(join(root, p.path, 'package.json'))).map(p => ({
    ...p, directory: realpathSync(join(root, p.path)),
  })).sort((a, b) => b.directory.length - a.directory.length);
  const selected = new Map();
  for (const id of moduleIds) {
    const cleanId = id.split('?')[0];
    if (!cleanId.includes('/node_modules/')) continue;
    const p = installed.find(p => cleanId.startsWith(p.directory + sep));
    if (!p) throw new Error('Bundled dependency is absent from lockfile: ' + cleanId);
    selected.set(p.path, p);
  }
  if (!selected.size) throw new Error('No npm modules found in emitted bundle; license evidence cannot be empty');
  const notices = ['CAPITAL-AI — Third-party notices', 'Scope: npm packages referenced by emitted frontend chunks.', 'Generated from installed packages and package-lock.json; container OS/Node, assets, fonts and data rights require separate review.', ''];
  const packages = [];
  for (const p of [...selected.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    if (!permissive.has(p.selectedLicense)) throw new Error('Bundled license requires an explicit distribution review: ' + p.path + ' ' + p.selectedLicense);
    const manifest = JSON.parse(readFileSync(join(p.directory, 'package.json'), 'utf8'));
    if (manifest.version !== p.version || manifest.license !== p.declaredLicense) throw new Error('Installed license/version differs from lockfile: ' + p.path);
    const texts = noticeFiles(p.directory).map(path => ({ path, text: readFileSync(join(p.directory, path), 'utf8') }));
    // These two published versions put the complete MIT text in README.
    if (!texts.length && ((manifest.name === 'cookie-signature' && p.version === '1.0.7') || (manifest.name === 'data-uri-to-buffer' && p.version === '4.0.1'))) {
      const readme = readdirSync(p.directory).find(name => /^readme\.md$/i.test(name));
      if (readme) {
        const text = readFileSync(join(p.directory, readme), 'utf8');
        if (/Permission is hereby granted/.test(text) && /THE SOFTWARE IS PROVIDED/.test(text)) texts.push({ path: readme, text });
      }
    }
    if (manifest.name === 'pako' && p.version === '2.2.0') {
      const source = readFileSync(join(p.directory, 'lib/zlib/deflate.js'), 'utf8');
      const header = source.slice(0, source.indexOf('const {'));
      if (!header.includes('Jean-loup Gailly and Mark Adler') || !header.includes('This notice may not be removed')) throw new Error('Missing pako Zlib notice');
      texts.push({ path: 'lib/zlib/deflate.js (license header)', text: header });
    }
    if (manifest.name === 'victory-vendor' && p.version === '37.3.6') {
      texts.push({ path: 'supplemental/upstream-LICENSE.txt', text: readFileSync(join(root, 'docs/licenses/victory-vendor-37.3.6-MIT.txt'), 'utf8') });
    }
    if (!texts.length || texts.some(t => !t.text.trim())) throw new Error('Missing license text: ' + p.path);
    notices.push('='.repeat(72), manifest.name + '@' + p.version, 'Declared: ' + p.declaredLicense, 'Selected: ' + p.selectedLicense);
    for (const t of texts) notices.push('--- ' + t.path + ' ---', t.text);
    packages.push({
      name: manifest.name, version: p.version, path: p.path, declaredLicense: p.declaredLicense, selectedLicense: p.selectedLicense,
      licenseFiles: texts.map(t => ({ path: t.path, sha256: sha256(t.text) })),
    });
  }
  const text = notices.join('\n') + '\n';
  return { text, inventory: { schemaVersion: 1, scope: 'EMITTED_FRONTEND_NPM_MODULES', lockfileSha256: inventory.lockfileSha256, noticesSha256: sha256(text), packages, deployEligible: false } };
}

export function thirdPartyNoticesPlugin() {
  let root;
  return {
    name: 'capital-ai-third-party-notices',
    configResolved(config) { root = config.root; },
    generateBundle(_options, bundle) {
      const moduleIds = Object.values(bundle).filter(item => item.type === 'chunk').flatMap(chunk => Object.keys(chunk.modules));
      const evidence = bundleLicenseEvidence(root, moduleIds);
      this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_NOTICES.txt', source: evidence.text });
      this.emitFile({ type: 'asset', fileName: 'frontend-license-inventory.json', source: JSON.stringify(evidence.inventory, null, 2) + '\n' });
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const report = lockInventory(root);
  const output = process.argv[2] || 'security-reports/npm-license-inventory.json';
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  const unknown = report.packages.filter(p => p.metadataStatus === 'UNREVIEWED');
  if (unknown.length) {
    console.error('Unreviewed license metadata:', unknown.map(p => p.path + ': ' + p.declaredLicense).join(', '));
    process.exitCode = 1;
  } else console.log(report.packages.length + ' npm lockfile entries inventoried; distribution review remains open.');
}
