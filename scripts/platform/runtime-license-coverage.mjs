import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hex = bytes => createHash('sha256').update(bytes).digest('hex');
const sha256 = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
const gitSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const key = item => `${item.Name}\u0000${item.Version}`;
const componentType = c => c.properties?.find(p => p.name === 'aquasecurity:trivy:PkgType')?.value;
const componentKey = c => `${c.group ? c.group + '/' : ''}${c.name}\u0000${c.version}`;
const sorted = values => [...values].sort((a, b) => a.localeCompare(b));

function compareMultiset(actual, expected, label) {
  const count = values => {
    const m = new Map();
    for (const value of values) m.set(value, (m.get(value) || 0) + 1);
    return m;
  };
  const a = count(actual), b = count(expected);
  if (a.size !== b.size || [...a].some(([k, v]) => b.get(k) !== v)) {
    throw new Error(`${label} SBOM and scanner package identities differ`);
  }
  return actual.length;
}

function readRecords(scan, classification, type) {
  const matching = scan.Results?.filter(r => r.Class === classification && r.Type === type && Array.isArray(r.Packages));
  if (matching?.length !== 1) throw new Error(`Expected one ${classification}/${type} package record`);
  const packages = matching[0].Packages;
  if (packages.some(p => typeof p.Name !== 'string' || !p.Name || typeof p.Version !== 'string' || !p.Version)) {
    throw new Error('Package name/version missing');
  }
  return packages;
}

function licenseResults(scan, label) {
  const entries = scan.Results?.filter(r => r.Target === label && Array.isArray(r.Licenses));
  if (entries?.length !== 1) throw new Error(`Expected one ${label} license finding group`);
  return entries[0].Licenses;
}

export function assessRuntimeLicenseCoverage({
  identity, osInventory, scanner, sbom, frontend, frontendNotice,
  nodeNotice, fontNotice,
}) {
  if (osInventory?.schema !== 'OS_SOURCE_NOTICE_INVENTORY@1' ||
      !gitSha(osInventory.sourceSha) || !sha256(osInventory.imageConfigDigest) ||
      osInventory.sourceDeliveryProven !== false || osInventory.redistributionApproved !== false ||
      typeof identity !== 'string' || identity.trim() !== osInventory.imageConfigDigest) {
    throw new Error('Unbound or incorrectly promoted CI image/source identity');
  }
  if (sbom?.bomFormat !== 'CycloneDX' || !Array.isArray(sbom.components) ||
      !Array.isArray(scanner?.Results) || frontend?.scope !== 'EMITTED_FRONTEND_NPM_MODULES' ||
      frontend?.deployEligible !== false || !Array.isArray(frontend.packages)) {
    throw new Error('Scanner/SBOM/frontend evidence missing or authorization state invalid');
  }
  for (const [label, bytes, expected] of [
    ['frontend', frontendNotice, frontend.noticesSha256],
    ['Node', nodeNotice, osInventory.nodeLicenseSha256?.replace(/^sha256:/, '')],
    ['OFL', fontNotice, osInventory.fontOflSha256?.replace(/^sha256:/, '')],
  ]) {
    if (!Buffer.isBuffer(bytes) || !bytes.length || !/^[a-f0-9]{64}$/.test(expected || '') || hex(bytes) !== expected) {
      throw new Error(`Invalid or mismatched ${label} runtime notice`);
    }
  }
  const kinds = [
    { key: 'alpine', classification: 'os-pkgs', trivyType: 'alpine' },
    { key: 'node', classification: 'lang-pkgs', trivyType: 'node-pkg' },
    { key: 'python', classification: 'lang-pkgs', trivyType: 'python-pkg' },
  ];
  const byKind = {};
  const itemsByKind = {};
  for (const kind of kinds) {
    const packages = readRecords(scanner, kind.classification, kind.trivyType);
    const bom = sbom.components.filter(c => componentType(c) === kind.trivyType);
    const observed = compareMultiset(packages.map(key), bom.map(componentKey), kind.key);
    byKind[kind.key] = observed;
    itemsByKind[kind.key] = packages;
  }
  if (byKind.alpine !== osInventory.packages?.length ||
      [...osInventory.packages].some(p => !itemsByKind.alpine.some(q => q.Name === p.name && q.Version === p.version)) ||
      byKind.alpine < 8 || byKind.node < 1 || byKind.python < 1) {
    throw new Error('Alpine inventory incomplete or unexpected runtime dependency inventory');
  }
  const findings = {};
  for (const label of ['OS Packages', 'Node.js', 'Python', 'Loose File License(s)']) {
    findings[label] = licenseResults(scanner, label).length;
  }
  const findPackage = (which, name) => itemsByKind[which].filter(p => p.Name === name)
    .map(p => ({ name: p.Name, version: p.Version, declaredLicense: sorted(p.Licenses || []) }));
  const loose = licenseResults(scanner, 'Loose File License(s)');
  const roots = ['opt/ga4-mcp/', 'app/dist/', 'app/licenses/', 'usr/local/'];
  const groupedLoose = Object.fromEntries(roots.map(root => [root, loose.filter(x => typeof x.FilePath === 'string' && x.FilePath.startsWith(root)).length]));
  const frontendCount = frontend.packages.length;
  return {
    schema: 'CAPITAL_AI_RUNTIME_LICENSE_COVERAGE@1',
    project: 'CAPITAL-AI',
    mode: 'OFFLINE_SCANNED_IMAGE_CORRELATION',
    authority: 'CI_IMAGE_METADATA_NOT_INDEPENDENT_RUNTIME_OR_LEGAL_APPROVAL',
    sourceSha: osInventory.sourceSha,
    imageConfigDigest: osInventory.imageConfigDigest,
    packageCounts: { ...byKind, total: byKind.alpine + byKind.node + byKind.python },
    osSourceRecipeCount: osInventory.sourceRecipeLocators?.length ?? null,
    frontendEmittedPackageCount: frontendCount,
    scannerLicenseFindings: findings,
    looseFileFindingLocations: groupedLoose,
    noticeByteMatches: { frontend: true, node: true, ofl: true },
    prioritisedRuntimeReview: {
      sharpLibvips: findPackage('node', '@img/sharp-libvips-linuxmusl-x64'),
      certifi: findPackage('python', 'certifi'),
      clamav: itemsByKind.alpine.filter(p => /^(clamav-|freshclam)/.test(p.Name))
        .map(p => ({ name: p.Name, version: p.Version, declaredLicense: sorted(p.Licenses || []) })),
    },
    scanScope: 'PACKAGE_IDENTITIES_AND_DETECTED_LICENSE_CANDIDATES_ONLY',
    unproven: [
      'File-level binary composition and linkage, including possible UnRAR inclusion',
      'Corresponding-source completeness and actual delivery to each recipient',
      'Final image contains all license/copyright/NOTICE texts required by selected licenses',
      'Rights for Node native libraries, Python packages, media, fonts, trademarks and provider contracts',
      'Any published OCI manifest digest or running Render image identity',
    ],
    legalApproval: null,
    sourceDeliveryProven: false,
    redistributionApproved: false,
    readyForCutover: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const dir = process.argv[2];
    if (!dir) throw new Error('Usage: node scripts/platform/runtime-license-coverage.mjs <security-reports-directory>');
    const read = name => readFileSync(join(dir, name));
    const json = name => JSON.parse(read(name).toString('utf8'));
    const report = assessRuntimeLicenseCoverage({
      identity: read('image-id.txt').toString('utf8'),
      osInventory: json('os-source-inventory.json'),
      scanner: json('image-licenses.json'),
      sbom: json('capital-ai.sbom.cdx.json'),
      frontend: json('frontend-license-inventory.json'),
      frontendNotice: read('THIRD_PARTY_NOTICES.txt'),
      nodeNotice: read('runtime-node-license.txt'),
      fontNotice: read('runtime-font-ofl.txt'),
    });
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } catch (err) {
    process.stderr.write('RUNTIME_LICENSE_COVERAGE_NOT_PROVEN: ' + err.message + '\n');
    process.exitCode = 2;
  }
}
