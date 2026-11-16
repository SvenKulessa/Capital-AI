import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateManifest, verifyLocalEvidence } from './verify-recovery-provenance.mjs';

const sha = (data) => createHash('sha256').update(data).digest('hex');
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'capital-recovery-evidence-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const storage = join(dir, 'storage');
  mkdirSync(storage);
  const encrypted = join(dir, 'encrypted.age');
  writeFileSync(encrypted, Buffer.from('SYNTHETIC-ENCRYPTED-CIPHERTEXT-ONLY'));
  const blob = Buffer.from('SYNTHETIC-ENCRYPTED-CIPHERTEXT-ONLY');
  const bytes = Buffer.from('SYNTHETIC-STORAGE-CANARY-ONLY');
  writeFileSync(join(storage, 'canary.bin'), bytes);
  const manifest = {
    contract: 'CAPITAL_AI_RECOVERY_PROVENANCE_V1',
    status: 'NOT_PROVEN',
    final_status: 'NOT_PROVEN',
    source_project: 'ryzywoktpmyhwzxmstyu',
    target_project: 'wcvorlvhwvuprqsjcten',
    gcs: {
      generation: '1700000000000000',
      metageneration: '1',
      encrypted_blob_sha256: sha(blob),
      independent_download_sha256: sha(blob),
    },
    storage: {
      binary_object_count: 1,
      objects: [{ path: 'canary.bin', sha256: sha(bytes) }],
    },
  };
  return { dir, storage, encrypted, manifest };
}

test('synthetic local ciphertext and Storage bytes pass without provider claim', async (t) => {
  const f = fixture(t);
  assert.deepEqual(await verifyLocalEvidence(f.manifest, f.encrypted, f.storage),
    { status: 'LOCAL_BYTES_VERIFIED_NOT_PROVIDER', storageObjects: 1 });
});

test('absent generation is rejected', (t) => {
  const f = fixture(t);
  f.manifest.gcs.generation = null;
  assert.throws(() => validateManifest(f.manifest), /generation missing/);
});

test('empty provider checksums reject before reading bytes', (t) => {
  const f = fixture(t);
  f.manifest.gcs.encrypted_blob_sha256 = null;
  assert.throws(() => validateManifest(f.manifest), /SHA-256 evidence required/);
});

test('different provider and downloaded checksums reject', (t) => {
  const f = fixture(t);
  f.manifest.gcs.independent_download_sha256 = sha('other');
  assert.throws(() => validateManifest(f.manifest), /hashes mismatch/);
});

test('tampered ciphertext is rejected', async (t) => {
  const f = fixture(t);
  writeFileSync(f.encrypted, 'TAMPERED');
  await assert.rejects(verifyLocalEvidence(f.manifest, f.encrypted, f.storage),
    /encrypted bytes mismatch/);
});

test('tampered Storage object is rejected', async (t) => {
  const f = fixture(t);
  writeFileSync(join(f.storage, 'canary.bin'), 'CHANGED-STORAGE');
  await assert.rejects(verifyLocalEvidence(f.manifest, f.encrypted, f.storage),
    /Storage byte hash mismatch/);
});

test('missing Storage byte inventory is blocked', (t) => {
  const f = fixture(t);
  f.manifest.storage.objects = [];
  f.manifest.storage.binary_object_count = 0;
  assert.throws(() => validateManifest(f.manifest), /independent Storage/);
});

test('count and duplicate paths cannot pass', (t) => {
  const f = fixture(t);
  f.manifest.storage.binary_object_count = 2;
  assert.throws(() => validateManifest(f.manifest), /count mismatch/);
  f.manifest.storage.objects.push({ ...f.manifest.storage.objects[0] });
  assert.throws(() => validateManifest(f.manifest), /duplicate/);
});

test('path traversal is rejected', (t) => {
  const f = fixture(t);
  f.manifest.storage.objects[0].path = '../elsewhere.bin';
  assert.throws(() => validateManifest(f.manifest), /unsafe Storage/);
});

test('external symlink is rejected', async (t) => {
  const f = fixture(t);
  const outside = join(f.dir, 'outside.bin');
  writeFileSync(outside, 'SYNTHETIC-OUTSIDE');
  symlinkSync(outside, join(f.storage, 'symlink.bin'));
  f.manifest.storage.objects[0].path = 'symlink.bin';
  f.manifest.storage.objects[0].sha256 = sha('SYNTHETIC-OUTSIDE');
  await assert.rejects(verifyLocalEvidence(f.manifest, f.encrypted, f.storage),
    /Storage path resolves outside/);
});

test('pre-asserted provider VERIFIED is rejected', (t) => {
  const f = fixture(t);
  f.manifest.final_status = 'VERIFIED';
  assert.throws(() => validateManifest(f.manifest), /do not pre-assert/);
});

test('different project IDs cannot pass', (t) => {
  const f = fixture(t);
  f.manifest.target_project = 'production-target';
  assert.throws(() => validateManifest(f.manifest), /target identity mismatch/);
});
