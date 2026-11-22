import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, openSync, readSync, closeSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const SHA40 = /^[a-f0-9]{40}$/;
const PACKAGE = /^[a-z0-9][a-z0-9+._-]*$/;
const TRACKED_APKS = ['clamav-libs', 'clamav-daemon', 'clamav-clamdscan', 'freshclam', 'libmspack'];
const TRACKED_NPM = ['@img/sharp-libvips-linuxmusl-x64', '@img/sharp-linuxmusl-x64', 'sharp'];
const LIB_NAME = /(?:libclam|clamd|freshclam|clamscan|unrar|libmspack|libvips|sharp).*?(?:\.so(?:\.[a-zA-Z0-9_.-]+)?|\.node)?$/i;
const ELF_SUFFIX = /(?:\.so(?:\.[0-9a-z.-]+)?|\.node|\/clamd|\/clamscan|\/clamdscan|\/freshclam)$/i;
const NOTICE_NAME = /^(?:LICEN[CS]E(?:[.-].*)?|COPYING(?:[.-].*)?|NOTICE(?:[.-].*)?)$/i;
const s256 = b => 'sha256:' + createHash('sha256').update(b).digest('hex');

export function parseApkFileOwnership(input) {
  const db = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (!db.length || db.length > 10 * 1024 * 1024 || db.includes(0)) throw new Error('Invalid installed APK database');
  const map = new Map();
  for (const block of db.toString('utf8').trim().split(/\r?\n\r?\n/)) {
    let pkg = null, version = null, folder = null, files = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('P:')) pkg = line.slice(2);
      if (line.startsWith('V:')) version = line.slice(2);
      if (line.startsWith('F:')) folder = line.slice(2);
      if (line.startsWith('R:')) {
        const part = line.slice(2);
        if (!folder || !part || part === '.' || part === '..' || part.includes('/') || part.includes('\\') || part.includes('\0') ||
            !/^[a-zA-Z0-9@+_.-]+$/.test(part) || !/^[a-zA-Z0-9/_.+-]+$/.test(folder) || folder.split('/').includes('..')) {
          throw new Error('Unsafe APK ownership path');
        }
        files.push('/' + folder.replace(/^\/+/, '') + '/' + part);
      }
    }
    if (!PACKAGE.test(pkg || '') || !/^[a-zA-Z0-9][a-zA-Z0-9+._~-]*$/.test(version || '') ||
        map.has(pkg) || files.length > 40000) throw new Error('Malformed/duplicate APK installed record');
    map.set(pkg, { name: pkg, version, files });
  }
  if (map.size < 8) throw new Error('Incomplete APK database');
  return map;
}

function inside(root, path) { return root === sep ? path.startsWith(sep) : path === root || path.startsWith(root + sep); }
function safeFile(root, path) {
  const full = resolve(root, '.' + path);
  if (!inside(resolve(root), full) || !existsSync(full)) return null;
  const actual = realpathSync(full);
  if (!inside(resolve(root), actual)) throw new Error('Symlink escapes image root');
  const st = statSync(actual);
  if (!st.isFile() || st.size > 250 * 1024 * 1024) return null;
  return { full: actual, bytes: st.size };
}
async function fileHash(path) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path)) h.update(chunk);
  return 'sha256:' + h.digest('hex');
}
function scanNeeded(path) {
  // ELF magic is checked before querying DT_NEEDED. A filename suffix alone is
  // never evidence that the bytes are ELF or that they carry any shared symbols.
  const fd = openSync(path, 'r');
  let magic;
  try {
    magic = Buffer.alloc(4);
    if (readSync(fd, magic, 0, 4, 0) !== 4 || !magic.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
      return { status: 'NOT_ELF_OR_HEADER_UNREADABLE', needed: [] };
    }
  } finally { closeSync(fd); }
  // scanelf documentation: -F '%n' requests NEEDED and is mutually exclusive
  // with -n; -B removes the header. Never use -n -F together.
  const x = spawnSync('scanelf', ['-BF', '%n', path], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 64 * 1024,
  });
  if (x.error || x.status !== 0 || x.signal) return { status: 'NOT_PROVEN', needed: [] };
  const raw = x.stdout.trim();
  if (!raw || raw === '-' || raw.length > 4096 || !/^[a-zA-Z0-9_.+, -]+$/.test(raw)) {
    return { status: 'NOT_PROVEN', needed: [] };
  }
  const needed = raw.split(/[ ,]+/).filter(Boolean);
  if (!needed.every(x => /^[a-zA-Z0-9_.+-]+$/.test(x))) return { status: 'NOT_PROVEN', needed: [] };
  return { status: 'SCANELF_DT_NEEDED', needed: [...new Set(needed)].sort() };
}

function collectPackageFiles(root, dir, max = 350) {
  const full = resolve(root, '.' + dir);
  if (!inside(resolve(root), full) || !existsSync(full)) return [];
  const out = [], queue = [{ dir: full, depth: 0 }];
  let entriesSeen = 0;
  while (queue.length) {
    const { dir: current, depth } = queue.shift();
    if (depth > 7) throw new Error('NPM tree exceeds depth cap');
    const entries = readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      if (++entriesSeen > 3500) throw new Error('NPM package entries exceed bound');
      const file = join(current, e.name);
      if (e.isDirectory()) queue.push({ dir: file, depth: depth + 1 });
      else if (e.isFile() || e.isSymbolicLink()) {
        const rel = '/' + file.slice(resolve(root).length).replace(/^\/+/, '');
        if (ELF_SUFFIX.test(e.name) || NOTICE_NAME.test(e.name)) {
          if (out.length >= max) throw new Error('Too many target NPM files');
          out.push(rel);
        }
      }
    }
  }
  return out.sort();
}

// Collect from already built, scanned image only. No package installs, network, uploads, or config changes.
export async function collectRuntimeNativeLinkage({ root = '/', expectedConfigDigest }) {
  if (!SHA256.test(expectedConfigDigest || '')) throw new Error('Missing externally verified exact image config digest');
  const installed = readFileSync(join(root, 'lib/apk/db/installed'));
  const apk = parseApkFileOwnership(installed);
  const allFiles = [...apk.values()].flatMap(x => x.files);
  const unrarRelated = [...new Set(allFiles.filter(x => /(?:libclamunrar|libunrar|\/unrar(?:\.|$))/i.test(x)))].sort().slice(0, 100);
  const packages = [];
  for (const name of TRACKED_APKS) {
    const record = apk.get(name);
    if (!record) { packages.push({ name, status: 'NOT_INSTALLED_IN_IMAGE', version: null, observedFileCount: 0, binaryFiles: [] }); continue; }
    const binFiles = record.files.filter(x => /^(?:\/usr\/lib\/|\/lib\/|\/usr\/sbin\/|\/usr\/bin\/)/.test(x) &&
      (LIB_NAME.test(basename(x)) || ELF_SUFFIX.test(x))).slice(0, 180);
    packages.push({ name, status: 'IMAGE_APK_RECORD_OBSERVED', version: record.version, observedFileCount: record.files.length,
      binaryFiles: await describeFiles(root, binFiles) });
  }
  const node = [];
  for (const name of TRACKED_NPM) {
    const base = '/app/node_modules/' + name;
    const manifest = safeFile(root, base + '/package.json');
    if (!manifest) { node.push({ name, status: 'NOT_PRESENT_IN_IMAGE', version: null, nativeFiles: [], licenseFiles: [] }); continue; }
    const raw = readFileSync(manifest.full, 'utf8');
    if (raw.length > 1024 * 1024) throw new Error('Oversize NPM package manifest');
    const parsed = JSON.parse(raw);
    if (parsed.name !== name || typeof parsed.version !== 'string' || !/^[0-9a-zA-Z.+-]+$/.test(parsed.version)) {
      throw new Error('NPM package identity mismatch');
    }
    const paths = collectPackageFiles(root, base);
    node.push({ name, version: parsed.version, declaredLicense: typeof parsed.license === 'string' ? parsed.license.slice(0, 100) : null,
      status: 'IMAGE_PACKAGE_MANIFEST_OBSERVED', nativeFiles: await describeFiles(root, paths.filter(x => ELF_SUFFIX.test(x)).slice(0, 90)),
      licenseFiles: await describeFiles(root, paths.filter(x => NOTICE_NAME.test(basename(x))).slice(0, 30), false) });
  }
  const dynamicUnrar = [...packages.flatMap(p => p.binaryFiles), ...node.flatMap(p => p.nativeFiles)].some(f =>
    f.dynamic?.needed?.some(n => /unrar/i.test(n)));
  return {
    schema: 'CAPITAL_AI_RUNTIME_NATIVE_LINKAGE@1', project: 'CAPITAL-AI', mode: 'READ_ONLY_EXACT_CI_IMAGE',
    imageConfigDigest: expectedConfigDigest, imageIdentityAuthority: 'SUPPLIED_FROM_HOST_EXPORTED_CONFIG_VERIFICATION',
    installedApkDbSha256: s256(installed), packageCount: apk.size, packages, node,
    unrar: { installedPackageFilenameCandidates: unrarRelated, directDtNeededObserved: dynamicUnrar,
      staticLinkage: 'NOT_PROVEN', absenceOfUnrarCode: 'NOT_PROVEN' },
    noticeCompleteness: 'NOT_PROVEN', sourceDeliveryProven: false, legalApproval: null,
    redistributionApproved: false, readyForCutover: false,
  };
}
async function describeFiles(root, paths, includeElf = true) {
  const out = [];
  for (const path of paths) {
    const file = safeFile(root, path);
    if (!file) { out.push({ path, status: 'NOT_PROVEN' }); continue; }
    out.push({ path, status: 'IMAGE_FILE_SHA256_VERIFIED', sizeBytes: file.bytes,
      sha256: await fileHash(file.full), ...(includeElf && ELF_SUFFIX.test(path) ? { dynamic: scanNeeded(file.full) } : {}) });
  }
  return out;
}

export function reconcileRuntimeNativeLinkage(report, inventory, runtimeCoverage) {
  if (report?.schema !== 'CAPITAL_AI_RUNTIME_NATIVE_LINKAGE@1' ||
      inventory?.schema !== 'OS_SOURCE_NOTICE_INVENTORY@1' ||
      runtimeCoverage?.schema !== 'CAPITAL_AI_RUNTIME_LICENSE_COVERAGE@1' ||
      !SHA40.test(inventory.sourceSha || '') ||
      report.imageConfigDigest !== inventory.imageConfigDigest ||
      runtimeCoverage.imageConfigDigest !== inventory.imageConfigDigest ||
      report.installedApkDbSha256 !== inventory.installedApkDbSha256 ||
      report.packageCount !== inventory.packages.length ||
      runtimeCoverage.packageCounts?.alpine !== report.packageCount ||
      report.redistributionApproved !== false || report.readyForCutover !== false ||
      report.sourceDeliveryProven !== false || report.legalApproval !== null ||
      runtimeCoverage.redistributionApproved !== false ||
      !Array.isArray(report.packages) || report.packages.length !== TRACKED_APKS.length ||
      !Array.isArray(report.node) || report.node.length !== TRACKED_NPM.length) {
    throw new Error('Unbound or elevated final image linkage evidence');
  }
  for (const pkg of report.packages) {
    const actual = inventory.packages.find(x => x.name === pkg.name);
    if (actual && (pkg.version !== actual.version || pkg.status !== 'IMAGE_APK_RECORD_OBSERVED')) {
      throw new Error('Target APK version inconsistent with bound inventory');
    }
    if (!actual && pkg.status !== 'NOT_INSTALLED_IN_IMAGE') throw new Error('Unobserved APK package promoted');
    if (actual && pkg.binaryFiles.filter(f => f.status === 'IMAGE_FILE_SHA256_VERIFIED').length === 0) {
      throw new Error('Installed native APK has no byte-verifiable files');
    }
  }
  for (const pkg of report.node) {
    const expected = runtimeCoverage.prioritisedRuntimeReview?.sharpLibvips || [];
    if (pkg.status === 'NOT_PRESENT_IN_IMAGE') {
      if (pkg.name === '@img/sharp-libvips-linuxmusl-x64' && expected.length) {
        throw new Error('Runtime SBOM package has no installed native package manifest');
      }
      continue;
    }
    if (pkg.name === '@img/sharp-libvips-linuxmusl-x64' && !expected.some(x => x.name === pkg.name && x.version === pkg.version)) {
      throw new Error('Sharp libvips version mismatch vs CI SBOM');
    }
    if (pkg.name === '@img/sharp-libvips-linuxmusl-x64' &&
        pkg.nativeFiles.filter(x => x.status === 'IMAGE_FILE_SHA256_VERIFIED').length === 0) {
      throw new Error('Installed sharp libvips package lacks hashed native file');
    }
    if (!pkg.nativeFiles.every(x => x.status === 'NOT_PROVEN' || /^sha256:[a-f0-9]{64}$/.test(x.sha256 || ''))) {
      throw new Error('Fabricated native file integrity');
    }
  }
  return {
    schema: 'CAPITAL_AI_RUNTIME_NATIVE_LINKAGE_ADMISSION@1',
    imageConfigDigest: report.imageConfigDigest, packageFilesHashed: report.packages.reduce((n,p) => n+p.binaryFiles.filter(x=>x.status==='IMAGE_FILE_SHA256_VERIFIED').length,0),
    nodeNativeFilesHashed: report.node.reduce((n,p)=>n+p.nativeFiles.filter(x=>x.status==='IMAGE_FILE_SHA256_VERIFIED').length,0),
    unrarStaticInclusion: 'NOT_PROVEN', runtimeNoticeCompleteness: 'NOT_PROVEN',
    sourceDeliveryProven: false, redistributionApproved: false, readyForCutover: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === 'collect') {
      const result = await collectRuntimeNativeLinkage({ expectedConfigDigest: process.argv[3] });
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else if (process.argv[2] === 'verify') {
      if (process.argv.length !== 7) throw new Error('Usage: verify <binary.json> <inventory.json> <coverage.json> <image-id.txt>');
      const [binaryPath, inventoryPath, coveragePath, imageIdPath] = process.argv.slice(3);
      const output = reconcileRuntimeNativeLinkage(JSON.parse(readFileSync(binaryPath)), JSON.parse(readFileSync(inventoryPath)), JSON.parse(readFileSync(coveragePath)));
      if (readFileSync(imageIdPath,'utf8').trim() !== output.imageConfigDigest) throw new Error('Unbound export image ID');
      process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    } else throw new Error('Usage: collect <config-digest> or verify <binary.json> <inventory.json> <coverage.json> <image-id.txt>');
  } catch (error) {
    process.stderr.write('RUNTIME_NATIVE_LINKAGE_NOT_PROVEN: ' + error.message + '\n');
    process.exitCode = 2;
  }
}
