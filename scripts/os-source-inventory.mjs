import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readContainerIdentity } from './container-evidence-identity.mjs';

const gitSha = /^[a-f0-9]{40}$/;
const sha256 = /^sha256:[a-f0-9]{64}$/;
const name = /^[a-zA-Z0-9][a-zA-Z0-9+._-]*$/;
const version = /^[a-zA-Z0-9][a-zA-Z0-9+._~-]*$/;
const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');

export function parseApkInstalled(raw) {
  const buffer = Buffer.from(raw || '');
  if (!buffer.length || buffer.length > 10 * 1024 * 1024 || buffer.includes(0)) {
    throw new Error('Missing, oversized or binary installed APK database');
  }
  const records = [];
  const seen = new Set();
  for (const block of buffer.toString('utf8').trim().split(/\r?\n\r?\n/)) {
    const fields = Object.create(null);
    for (const line of block.split(/\r?\n/)) {
      const match = /^([A-Za-z]):(.*)$/.exec(line);
      if (!match) throw new Error('Malformed installed APK database record');
      if (['P','V','A','L','o','c'].includes(match[1])) {
        if (Object.hasOwn(fields, match[1])) throw new Error('Duplicate APK field');
        fields[match[1]] = match[2];
      }
    }
    if (!name.test(fields.P || '') || !version.test(fields.V || '') ||
        !name.test(fields.A || '') || typeof fields.L !== 'string' ||
        !fields.L.trim() || fields.L.length > 256 || /[^\x20-\x7e]/.test(fields.L)) {
      throw new Error('Unverifiable APK package, version, architecture or license');
    }
    if (seen.has(fields.P)) throw new Error('Duplicate installed APK package');
    seen.add(fields.P);
    records.push({
      name: fields.P, version: fields.V, architecture: fields.A,
      declaredLicense: fields.L,
      sourcePackage: name.test(fields.o || '') ? fields.o : null,
      aportsCommit: gitSha.test(fields.c || '') ? fields.c : null,
    });
    if (records.length > 5000) throw new Error('Unbounded package inventory');
  }
  if (records.length < 8) throw new Error('Incomplete runtime package inventory');
  return records.sort((a,b) => a.name.localeCompare(b.name));
}

export function buildOsSourceNotice({
  installedDb, release, identity, dockerfile, sourceNodeLicense,
  runtimeNodeLicense, sourceFontOfl, runtimeFontOfl,
}) {
  if (identity?.schema !== 'CONTAINER_IDENTITY@1' ||
      !gitSha.test(identity.source?.testedSha || '') ||
      !sha256.test(identity.digests?.localImageId || '')) {
    throw new Error('Missing tested SHA or immutable image config digest');
  }
  const base = [...String(dockerfile).matchAll(/^FROM node:(\d+\.\d+\.\d+)-alpine@sha256:([a-f0-9]{64}) AS crypto-base$/gm)];
  if (base.length !== 1 || !/^\d+\.\d+\.\d+\s*$/.test(String(release))) {
    throw new Error('Pinned Node/Alpine image identity missing');
  }
  const srcNode = Buffer.from(sourceNodeLicense || '');
  const imgNode = Buffer.from(runtimeNodeLicense || '');
  const srcFont = Buffer.from(sourceFontOfl || '');
  const imgFont = Buffer.from(runtimeFontOfl || '');
  if (!srcNode.length || !srcNode.equals(imgNode) || !srcFont.length || !srcFont.equals(imgFont)) {
    throw new Error('Actual runtime Node/OFL notice differs from pinned repository bytes');
  }
  const packages = parseApkInstalled(installedDb);
  const locator = new Map();
  const missingSourceMetadata = [];
  for (const pkg of packages) {
    if (!pkg.sourcePackage || !pkg.aportsCommit) {
      missingSourceMetadata.push(pkg.name);
      continue;
    }
    const key = pkg.sourcePackage + '@' + pkg.aportsCommit;
    if (!locator.has(key)) locator.set(key, {
      package: pkg.sourcePackage, aportsCommit: pkg.aportsCommit, binaries: [],
      sourceArchiveStatus: 'NOT_DOWNLOADED_OR_CHECKSUM_VERIFIED',
    });
    locator.get(key).binaries.push(pkg.name + '@' + pkg.version);
  }
  return {
    schema: 'OS_SOURCE_NOTICE_INVENTORY@1',
    status: 'IMAGE_INVENTORY_BOUND_SOURCE_DELIVERY_NOT_PROVEN',
    sourceSha: identity.source.sourceSha,
    testedSha: identity.source.testedSha,
    imageConfigDigest: identity.digests.localImageId,
    baseImage: 'node:' + base[0][1] + '-alpine@sha256:' + base[0][2],
    alpineRelease: String(release).trim(),
    installedApkDbSha256: hash(installedDb),
    nodeLicenseSha256: hash(imgNode),
    fontOflSha256: hash(imgFont),
    packages,
    sourceRecipeLocators: [...locator.values()].sort((a,b) => a.package.localeCompare(b.package)),
    missingSourceMetadata,
    sourceDeliveryProven: false,
    redistributionApproved: false,
    remainingSourceObligations: [
      'Download and independently hash source archives, matching aports patches and exact build inputs for each package',
      'Verify applicable complete corresponding-source and original notice obligations per binary version',
      'Bundle and retain the actual source and notices for the immutable published image, separately from this inventory',
      'Review independent asset, brand and provider redistribution permissions',
    ],
  };
}

export function noticeIndex(report) {
  if (report?.schema !== 'OS_SOURCE_NOTICE_INVENTORY@1' ||
      report.redistributionApproved !== false) throw new Error('Invalid non-authorizing notice report');
  return [
    'CAPITAL-AI OS NOTICE INDEX - NOT COMPLETE LEGAL NOTICES',
    'Exact image config digest: ' + report.imageConfigDigest,
    'Tested SHA: ' + report.testedSha,
    'Installed APK DB: ' + report.installedApkDbSha256,
    'PUBLIC REDISTRIBUTION NOT APPROVED; CORRESPONDING SOURCES NOT PROVEN.',
    '',
    ...report.packages.map(p => p.name + '@' + p.version + ' ' + p.architecture +
      ' license=' + p.declaredLicense + ' source=' + (p.sourcePackage || 'NOT_PROVEN') +
      ' aports=' + (p.aportsCommit || 'NOT_PROVEN')),
    '', 'APK license fields are metadata, not complete copyright notices or source bundles.', '',
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [db, alpine, container, dockerfile, nodeNotice, fontNotice, out, outNotice] = process.argv.slice(2);
    if (![db, alpine, container, dockerfile, nodeNotice, fontNotice, out, outNotice].every(Boolean)) {
      throw new Error('Eight evidence file paths required');
    }
    const docker = readFileSync(dockerfile, 'utf8');
    const pin = docker.match(/^FROM node:(\d+\.\d+\.\d+)-alpine@sha256:[a-f0-9]{64} AS crypto-base$/m);
    if (!pin) throw new Error('Pinned Node image missing');
    const report = buildOsSourceNotice({
      installedDb: readFileSync(db), release: readFileSync(alpine, 'utf8'),
      identity: readContainerIdentity(container), dockerfile: docker,
      sourceNodeLicense: readFileSync('docs/licenses/node-v' + pin[1] + '-LICENSE.txt'),
      runtimeNodeLicense: readFileSync(nodeNotice),
      sourceFontOfl: readFileSync('public/fonts/OFL.txt'),
      runtimeFontOfl: readFileSync(fontNotice),
    });
    writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
    writeFileSync(outNotice, noticeIndex(report));
    console.log(JSON.stringify({ status: report.status, image: report.imageConfigDigest,
      packages: report.packages.length, missingSourceMetadata: report.missingSourceMetadata.length }));
  } catch (error) {
    console.error('OS_SOURCE_EVIDENCE_NOT_PROVEN: ' + error.message);
    process.exitCode = 1;
  }
}
