import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EXPECTED_FONT_FILES, verifyRuntimeFontProvenance } from './runtime-font-provenance.mjs';

const digest = b => createHash('sha256').update(b).digest('hex');
const id = 'sha256:' + 'a'.repeat(64);
const sha40 = 'b'.repeat(40);
function fixture() {
  const repositoryBytes = {}, imageBytes = {};
  const entries = EXPECTED_FONT_FILES.map((file, i) => {
    const bytes = Buffer.from(i === 2 ? 'Copyright: synthetic OFL test data' : 'synthetic font bytes ' + i);
    repositoryBytes[file.repo] = bytes;
    imageBytes[file.output] = Buffer.from(bytes);
    return { path: file.repo, bytes: bytes.length, sha256: digest(bytes), upstreamGitBlob: 'c'.repeat(40) };
  });
  return {
    manifest: { schemaVersion: 1, family: 'Plus Jakarta Sans', license: 'OFL-1.1',
      upstreamRepository: 'google/fonts', upstreamCommit: 'd'.repeat(40),
      modification: 'NONE_UNMODIFIED_UPSTREAM_BYTES', files: entries },
    imageId: id + '\n',
    inventory: { schema: 'OS_SOURCE_NOTICE_INVENTORY@1', sourceSha: sha40, testedSha: sha40,
      imageConfigDigest: id, sourceDeliveryProven: false, redistributionApproved: false,
      fontOflSha256: 'sha256:' + digest(imageBytes['runtime-font-ofl.txt']) },
    repositoryBytes, imageBytes,
  };
}

test('exact source and final CI-image font/OFL bytes bind without legal promotion', () => {
  const result = verifyRuntimeFontProvenance(fixture());
  assert.equal(result.imageConfigDigest, id);
  assert.equal(result.files.length, 3);
  assert.ok(result.files.every(x => x.sourceByteMatch && x.imageByteMatch));
  assert.equal(result.redistributionApproved, false);
  assert.equal(result.sourceDeliveryProven, false);
  assert.equal(result.registryImageIdentity, 'NOT_PROVEN');
  assert.equal(result.readyForCutover, false);
});

test('runtime font alteration, missing italic file and swapped regular/italic fail closed', () => {
  const modified = fixture(); modified.imageBytes['runtime-font-regular.ttf'] = Buffer.from('tampered');
  assert.throws(() => verifyRuntimeFontProvenance(modified), /Runtime CI image font bytes/);
  const missing = fixture(); delete missing.imageBytes['runtime-font-italic.ttf'];
  assert.throws(() => verifyRuntimeFontProvenance(missing), /Source font bytes/);
  const swapped = fixture();
  [swapped.imageBytes['runtime-font-regular.ttf'], swapped.imageBytes['runtime-font-italic.ttf']] =
    [swapped.imageBytes['runtime-font-italic.ttf'], swapped.imageBytes['runtime-font-regular.ttf']];
  assert.throws(() => verifyRuntimeFontProvenance(swapped), /Runtime CI image font bytes/);
});

test('source tampering and stale or forged upstream checksums fail closed', () => {
  const changed = fixture(); changed.repositoryBytes['public/fonts/PlusJakartaSans-Regular.ttf'] = Buffer.from('changed');
  assert.throws(() => verifyRuntimeFontProvenance(changed), /Source font bytes/);
  const forged = fixture(); forged.manifest.files[0].sha256 = 'f'.repeat(64);
  assert.throws(() => verifyRuntimeFontProvenance(forged), /Source font bytes/);
});

test('source SHA, exact image digest, and OFL inventory are required', () => {
  const wrongImage = fixture(); wrongImage.imageId = 'sha256:' + 'e'.repeat(64);
  assert.throws(() => verifyRuntimeFontProvenance(wrongImage), /Unbound/);
  const wrongOfl = fixture(); wrongOfl.inventory.fontOflSha256 = 'sha256:' + 'e'.repeat(64);
  assert.throws(() => verifyRuntimeFontProvenance(wrongOfl), /OFL/);
  const wrongSha = fixture(); wrongSha.inventory.testedSha = 'not-a-commit';
  assert.throws(() => verifyRuntimeFontProvenance(wrongSha), /Unbound/);
});

test('duplicate, path traversal, missing, extra and invalid license records fail closed', () => {
  const dup = fixture(); dup.manifest.files[1].path = dup.manifest.files[0].path;
  assert.throws(() => verifyRuntimeFontProvenance(dup), /duplicate/);
  const traversal = fixture(); traversal.manifest.files[0].path = '../../secret';
  assert.throws(() => verifyRuntimeFontProvenance(traversal), /Required font/);
  const extra = fixture(); extra.manifest.files.push({ ...extra.manifest.files[0], path: 'public/fonts/extra.ttf' });
  assert.throws(() => verifyRuntimeFontProvenance(extra), /incomplete pinned/);
  const wrongLicense = fixture(); wrongLicense.manifest.license = 'CUSTOM_APPROVED';
  assert.throws(() => verifyRuntimeFontProvenance(wrongLicense), /incomplete pinned/);
});

test('forged redistribution and source-delivery flags must never pass', () => {
  const rights = fixture(); rights.inventory.redistributionApproved = true;
  assert.throws(() => verifyRuntimeFontProvenance(rights), /legally elevated/);
  const delivery = fixture(); delivery.inventory.sourceDeliveryProven = true;
  assert.throws(() => verifyRuntimeFontProvenance(delivery), /legally elevated/);
});
