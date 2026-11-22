import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconcileRecipeLock, parseRecipe, verifyStagedSourceMirror } from './verify-os-source-mirror.mjs';

const checksum = contents => createHash('sha512').update(contents).digest('hex');
const blob = contents => createHash('sha1').update('blob ' + Buffer.byteLength(contents) + '\0').update(contents).digest('hex');
const build = 'pkgname=zlib\npkgver=1.4\npkgrel=0\nsource="zlib-1.4.tar.gz"\nsha512sums="' +
  checksum('original source archive') + ' zlib-1.4.tar.gz\n"\n';
const lock = () => ({
  schema: 'CAPITAL_AI_OS_RECIPE_LOCK@1', sourceSha: 'a'.repeat(40),
  testedMergeSha: 'b'.repeat(40),
  localImageConfigDigest: 'sha256:' + 'c'.repeat(64),
  publishedOCIManifestDigest: null, installedApkDbSha256: 'sha256:' + 'd'.repeat(64),
  sourceRecipeCount: 1, binaryPackageCount: 1, status: { redistributionApproved: false },
  recipes: [{ sourcePackage: 'zlib', version: '1.4-r0',
    aportsCommit: 'e'.repeat(40), apkbuildGitBlob: blob(build), path: 'main/zlib/APKBUILD' }],
});
const inventory = () => ({
  schema: 'OS_SOURCE_NOTICE_INVENTORY@1', sourceSha: 'a'.repeat(40),
  testedSha: 'b'.repeat(40), imageConfigDigest: 'sha256:' + 'c'.repeat(64),
  installedApkDbSha256: 'sha256:' + 'd'.repeat(64),
  packages: [{ name: 'zlib', version: '1.4-r0', sourcePackage: 'zlib' }],
  sourceRecipeLocators: [{ package: 'zlib', aportsCommit: 'e'.repeat(40) }],
});
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'os-aports-mirror-'));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  mkdirSync(join(root, 'zlib'));
  writeFileSync(join(root, 'zlib', 'APKBUILD'), build);
  writeFileSync(join(root, 'zlib', 'zlib-1.4.tar.gz'), 'original source archive');
  return root;
}
test('matching recipes and independently staged archive hash verify, without legal authorization', async t => {
  const root = fixture(t);
  assert.equal(reconcileRecipeLock(lock(), inventory()).binaryCount, 1);
  assert.deepEqual(parseRecipe(Buffer.from(build), lock().recipes[0]).map(x => x.file), ['zlib-1.4.tar.gz']);
  const r = await verifyStagedSourceMirror(lock(), inventory(), root);
  assert.equal(r.checkedSha512Files, 1);
  assert.equal(r.archiveHashesVerified, true);
  assert.equal(r.sourceDeliveryProven, false);
  assert.equal(r.redistributionApproved, false);
  assert.equal(r.publishedOCIManifestDigest, null);
});
test('musl underscore-prefixed sources are valid and path traversal is rejected', () => {
  const recipe = lock().recipes[0];
  const muslName = '__stack_chk_fail_local.c';
  const withSource = name => build.replaceAll('zlib-1.4.tar.gz', name);
  const valid = withSource(muslName);
  assert.deepEqual(parseRecipe(Buffer.from(valid), { ...recipe, apkbuildGitBlob: blob(valid) }).map(x => x.file), [muslName]);
  const traversal = withSource('../' + muslName);
  assert.throws(() => parseRecipe(Buffer.from(traversal), { ...recipe, apkbuildGitBlob: blob(traversal) }), /Invalid or duplicate/);
});
test('modified upstream recipe and nonmatching source tarball are rejected', async t => {
  const root = fixture(t);
  writeFileSync(join(root, 'zlib', 'zlib-1.4.tar.gz'), 'tampered');
  const r = await verifyStagedSourceMirror(lock(), inventory(), root);
  assert.deepEqual(r.mismatchedFiles, ['zlib/zlib-1.4.tar.gz']);
  assert.equal(r.archiveHashesVerified, false);
  writeFileSync(join(root, 'zlib', 'APKBUILD'), build.replace('pkgrel=0','pkgrel=1'));
  await assert.rejects(() => verifyStagedSourceMirror(lock(), inventory(), root), /APKBUILD Git blob mismatch/);
});
test('missing archives, invalid image provenance and synthetic publication permission fail closed', async t => {
  const root = fixture(t);
  const fs = await import('node:fs');
  fs.unlinkSync(join(root, 'zlib', 'zlib-1.4.tar.gz'));
  const r = await verifyStagedSourceMirror(lock(), inventory(), root);
  assert.deepEqual(r.missingFiles, ['zlib/zlib-1.4.tar.gz']);
  assert.equal(r.archiveHashesVerified, false);
  const changed = lock(); changed.localImageConfigDigest = 'sha256:' + 'f'.repeat(64);
  assert.throws(() => reconcileRecipeLock(changed, inventory()), /does not match/);
  const falseLicense = lock(); falseLicense.status.redistributionApproved = true;
  assert.throws(() => reconcileRecipeLock(falseLicense, inventory()), /does not match/);
});


test('current Alpine community recipes are valid while foreign or traversal paths fail closed', () => {
  const packages = [
    { sourcePackage: 'clamav', version: '1.4.7-r0', aportsCommit: 'a'.repeat(40) },
    { sourcePackage: 'libmspack', version: '0.11_alpha-r1', aportsCommit: 'b'.repeat(40) },
  ];
  for (const entry of packages) {
    const subject = lock();
    const target = inventory();
    subject.recipes = [{ ...subject.recipes[0],
      sourcePackage: entry.sourcePackage,
      version: entry.version,
      aportsCommit: entry.aportsCommit,
      path: 'community/' + entry.sourcePackage + '/APKBUILD' }];
    target.packages = [{ name: entry.sourcePackage, version: entry.version, sourcePackage: entry.sourcePackage }];
    target.sourceRecipeLocators = [{ package: entry.sourcePackage, aportsCommit: entry.aportsCommit }];
    assert.deepEqual(reconcileRecipeLock(subject, target), { sourceCount: 1, binaryCount: 1 });
    for (const path of [
      'testing/' + entry.sourcePackage + '/APKBUILD',
      'community/../' + entry.sourcePackage + '/APKBUILD',
      'community/other/APKBUILD',
      '/community/' + entry.sourcePackage + '/APKBUILD',
      'community/' + entry.sourcePackage + '/APKBUILD/extra',
    ]) {
      subject.recipes[0].path = path;
      assert.throws(() => reconcileRecipeLock(subject, target), /Invalid\/duplicate recipe identity|does not match/);
    }
  }
});


test('current 34-recipe aports lock is source-image-bound and never authorizes distribution', async () => {
  const { readFileSync } = await import('node:fs');
  const path = new URL('../docs/security/evidence/os-aports-recipe-lock-03dcdb64-20261119.json', import.meta.url);
  const current = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(current.schema, 'CAPITAL_AI_OS_RECIPE_LOCK@1');
  assert.equal(current.sourceSha, '03dcdb6426f30ca0b2b575060773d7ea84480fd0');
  assert.equal(current.testedMergeSha, current.sourceSha);
  assert.equal(current.binaryPackageCount, 50);
  assert.equal(current.sourceRecipeCount, 34);
  assert.equal(current.recipes.length, 34);
  assert.equal(new Set(current.recipes.map(r => r.sourcePackage)).size, 34);
  assert.equal(current.recipes.reduce((sum, r) => sum + r.declaredSha512Entries, 0), 228);
  assert.deepEqual(current.recipes.filter(r => r.path.startsWith('community/')).map(r => r.sourcePackage).sort(), ['clamav', 'libmspack']);
  assert.deepEqual(current.recipes.filter(r => r.declaredSha512Entries === 0).map(r => r.sourcePackage), ['alpine-base']);
  assert.ok(current.recipes.every(r => /^[0-9a-f]{40}$/.test(r.aportsCommit) &&
    /^[0-9a-f]{40}$/.test(r.apkbuildGitBlob) &&
    ['main/', 'community/'].some(prefix => r.path === prefix + r.sourcePackage + '/APKBUILD') &&
    r.verifiedSourceBytes === false && r.copyrightNoticesReviewed === false));
  assert.equal(current.status.redistributionApproved, false);
  assert.equal(current.publishedOCIManifestDigest, null);
});
