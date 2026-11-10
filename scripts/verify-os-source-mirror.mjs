import { createHash } from 'node:crypto';
import { createReadStream, existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sha40 = /^[0-9a-f]{40}$/;
const sha256 = /^sha256:[0-9a-f]{64}$/;
const safeName = /^[a-zA-Z0-9][a-zA-Z0-9_.+@~%-]*$/;
const sha512line = /^([a-f0-9]{128})[ \t]+([^\s]+)$/;
const hash = (algo, bytes) => createHash(algo).update(bytes).digest('hex');
const gitBlob = bytes => hash('sha1', Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]));

export function reconcileRecipeLock(lock, inventory) {
  if (lock?.schema !== 'CAPITAL_AI_OS_RECIPE_LOCK@1' ||
      inventory?.schema !== 'OS_SOURCE_NOTICE_INVENTORY@1' ||
      lock.sourceSha !== inventory.sourceSha ||
      lock.testedMergeSha !== inventory.testedSha ||
      lock.localImageConfigDigest !== inventory.imageConfigDigest ||
      lock.installedApkDbSha256 !== inventory.installedApkDbSha256 ||
      !sha256.test(lock.localImageConfigDigest || '') ||
      lock.publishedOCIManifestDigest !== null ||
      lock.status?.redistributionApproved !== false ||
      !Array.isArray(lock.recipes) || !Array.isArray(inventory.sourceRecipeLocators) ||
      lock.recipes.length !== inventory.sourceRecipeLocators.length ||
      lock.sourceRecipeCount !== lock.recipes.length ||
      lock.binaryPackageCount !== inventory.packages?.length) {
    throw new Error('Historic image, recipe lock, or non-authorizing evidence does not match');
  }
  const index = new Map(inventory.sourceRecipeLocators.map(x => [x.package, x]));
  const seen = new Set();
  for (const recipe of lock.recipes) {
    if (!safeName.test(recipe.sourcePackage || '') ||
        !safeName.test(recipe.version || '') ||
        !sha40.test(recipe.aportsCommit || '') ||
        !sha40.test(recipe.apkbuildGitBlob || '') ||
        recipe.path !== 'main/' + recipe.sourcePackage + '/APKBUILD' ||
        seen.has(recipe.sourcePackage)) throw new Error('Invalid/duplicate recipe identity');
    seen.add(recipe.sourcePackage);
    const found = index.get(recipe.sourcePackage);
    if (!found || found.aportsCommit !== recipe.aportsCommit) throw new Error('Aports build commit mismatch');
    const actual = inventory.packages.filter(x => x.sourcePackage === recipe.sourcePackage);
    if (!actual.length || actual.some(x => x.version !== recipe.version)) {
      throw new Error('Installed runtime package version mismatch');
    }
  }
  return { sourceCount: seen.size, binaryCount: inventory.packages.length };
}

export function parseRecipe(apkbuild, recipe) {
  const bytes = Buffer.from(apkbuild);
  if (!bytes.length || bytes.length > 256 * 1024 ||
      gitBlob(bytes) !== recipe.apkbuildGitBlob) throw new Error('APKBUILD Git blob mismatch');
  const content = bytes.toString('utf8');
  const version = /^pkgver=([^\r\n]+)/m.exec(content)?.[1]?.replace(/^["']|["']$/g, '').trim();
  const release = /^pkgrel=([^\r\n]+)/m.exec(content)?.[1]?.replace(/^["']|["']$/g, '').trim();
  if (version + '-r' + release !== recipe.version) throw new Error('APKBUILD package version changed');
  const match = /^sha512sums="([\s\S]*?)"/m.exec(content);
  const values = [];
  const seen = new Set();
  for (const line of (match?.[1] || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    const entry = sha512line.exec(line);
    if (!entry || !safeName.test(entry[2]) || basename(entry[2]) !== entry[2] ||
        seen.has(entry[2])) throw new Error('Invalid or duplicate SHA512 source declaration');
    seen.add(entry[2]);
    values.push({ file: entry[2], sha512: entry[1] });
  }
  return values;
}

function regularFile(path) {
  if (!existsSync(path)) return false;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Non-regular or symlink source file');
  return true;
}

async function streamSha512(path) {
  const h = createHash('sha512');
  for await (const buffer of createReadStream(path)) h.update(buffer);
  return h.digest('hex');
}

// Reads an externally staged source mirror; never evaluates upstream shell scripts,
// fetches network URLs, signs anything, or publishes to a package registry.
export async function verifyStagedSourceMirror(lock, inventory, root) {
  reconcileRecipeLock(lock, inventory);
  const base = resolve(root);
  if (!existsSync(base) || lstatSync(base).isSymbolicLink() || !lstatSync(base).isDirectory()) {
    throw new Error('Missing safe source mirror directory');
  }
  const report = {
    schema: 'CAPITAL_AI_OS_SOURCE_MIRROR_CHECK@1',
    sourceSha: lock.sourceSha, imageConfigDigest: lock.localImageConfigDigest,
    publishedOCIManifestDigest: null,
    checkedRecipes: 0, checkedSha512Files: 0,
    missingFiles: [], mismatchedFiles: [], noSha512Declarations: [],
    sourceDeliveryProven: false, redistributionApproved: false, legalApproval: null,
  };
  for (const recipe of lock.recipes) {
    const dir = join(base, recipe.sourcePackage);
    if (!existsSync(dir) || lstatSync(dir).isSymbolicLink() || !lstatSync(dir).isDirectory()) {
      report.missingFiles.push(recipe.sourcePackage + '/APKBUILD');
      continue;
    }
    const build = join(dir, 'APKBUILD');
    if (!regularFile(build)) { report.missingFiles.push(recipe.sourcePackage + '/APKBUILD'); continue; }
    const checksums = parseRecipe(readFileSync(build), recipe);
    report.checkedRecipes++;
    if (!checksums.length) report.noSha512Declarations.push(recipe.sourcePackage);
    for (const entry of checksums) {
      const local = join(dir, entry.file);
      const distfile = join(dir, 'distfiles', entry.file);
      const candidate = regularFile(local) ? local : regularFile(distfile) ? distfile : null;
      if (!candidate) { report.missingFiles.push(recipe.sourcePackage + '/' + entry.file); continue; }
      const actual = await streamSha512(candidate);
      if (actual !== entry.sha512) report.mismatchedFiles.push(recipe.sourcePackage + '/' + entry.file);
      else report.checkedSha512Files++;
    }
  }
  const verified = report.checkedRecipes === lock.recipes.length &&
    !report.missingFiles.length && !report.mismatchedFiles.length;
  report.status = verified
    ? 'DECLARED_SHA512_FILES_VERIFIED_CORRESPONDING_SOURCE_REVIEW_OPEN'
    : 'SOURCE_FILES_MISSING_OR_CHECKSUM_INVALID';
  report.archiveHashesVerified = verified;
  // A passing hash check is not evidence of full corresponding sources, original
  // copyright notices, or the authority to redistribute an image.
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [lockFile, inventoryFile, mirrorRoot, output] = process.argv.slice(2);
    if (![lockFile, inventoryFile, mirrorRoot, output].every(Boolean)) {
      throw new Error('Usage: node verify-os-source-mirror.mjs lock.json os-inventory.json mirror-dir output.json');
    }
    const result = await verifyStagedSourceMirror(JSON.parse(readFileSync(lockFile)),
      JSON.parse(readFileSync(inventoryFile)), mirrorRoot);
    writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ status: result.status,
      recipes: result.checkedRecipes, verifiedFiles: result.checkedSha512Files,
      missing: result.missingFiles.length, mismatched: result.mismatchedFiles.length,
      sourceDeliveryProven: false, redistributionApproved: false }));
    if (!result.archiveHashesVerified) process.exitCode = 1;
  } catch (error) {
    console.error('OS_SOURCE_MIRROR_NOT_PROVEN: ' + error.message);
    process.exitCode = 1;
  }
}
