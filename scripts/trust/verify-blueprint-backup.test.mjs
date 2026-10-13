import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyBlueprintBackup, BLUEPRINT_BACKUPS } from './verify-blueprint-backup.mjs';
const sha256 = input => createHash('sha256').update(input).digest('hex');

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'cap-backup-test-'));
  const cipher = path.join(dir, 'test.aesgcm');
  const plain = path.join(dir, 'test.md');
  const c = Buffer.concat([Buffer.from('CAIBK1\0'), Buffer.alloc(32, 3)]);
  const p = Buffer.from('# Synthetic test plaintext\n');
  await writeFile(cipher, c); await writeFile(plain, p);
  return {dir,cipher,plain,c,p,expected:{version:'1.0.0',cipherBytes:c.length,cipherSha256:sha256(c),originalBytes:p.length,originalSha256:sha256(p)}};
}
test('both actual CAP-BP backups have complete independent pinned metadata',()=>{
  assert.deepEqual(Object.keys(BLUEPRINT_BACKUPS),['CAP-BP-001','CAP-BP-002']);
  for(const a of Object.values(BLUEPRINT_BACKUPS)) {
    assert.match(a.cipherSha256,/^[a-f0-9]{64}$/); assert.match(a.originalSha256,/^[a-f0-9]{64}$/);
    assert.ok(a.cipherBytes>1000 && a.originalBytes>1000);
  }
});
test('cipher-only verifies without reading a key or asserting a restore',async()=>{
  const f=await fixture();try{
    const r=await verifyBlueprintBackup({sku:'CAP-BP-001',cipherPath:f.cipher,expected:f.expected});
    assert.equal(r.ciphertext,'VERIFIED'); assert.equal(r.plaintext,'NOT_PROVEN');
    assert.equal(r.cryptoAuthentication,'NOT_PROVEN_BY_THIS_TOOL');
    assert.equal(r.keyRead,false);
  }finally{await rm(f.dir,{recursive:true,force:true})}
});
test('plaintext is a separately stated identity proof only',async()=>{
  const f=await fixture();try{
    const r=await verifyBlueprintBackup({sku:'CAP-BP-002',cipherPath:f.cipher,restoredPath:f.plain,expected:f.expected});
    assert.equal(r.plaintext,'PLAINTEXT_IDENTITY_VERIFIED__DECRYPTION_NOT_ATTESTED');
  }finally{await rm(f.dir,{recursive:true,force:true})}
});
test('rejects ciphertext tampering and different ciphertext length',async()=>{
  const f=await fixture();try{
    f.c[f.c.length-1]^=1;await writeFile(f.cipher,f.c);
    await assert.rejects(verifyBlueprintBackup({sku:'CAP-BP-001',cipherPath:f.cipher,expected:f.expected}),/cipher_hash_mismatch/);
    await writeFile(f.cipher,f.c.subarray(0,-1));
    await assert.rejects(verifyBlueprintBackup({sku:'CAP-BP-001',cipherPath:f.cipher,expected:f.expected}),/byte_length_mismatch/);
  }finally{await rm(f.dir,{recursive:true,force:true})}
});
test('rejects wrong plaintext and symlink input',async()=>{
  const f=await fixture();try{
    await writeFile(f.plain, Buffer.alloc(f.p.length,0));
    await assert.rejects(verifyBlueprintBackup({sku:'CAP-BP-001',cipherPath:f.cipher,restoredPath:f.plain,expected:f.expected}),/original_hash_mismatch/);
    const link=path.join(f.dir,'alias.aesgcm');await symlink(f.cipher,link);
    await assert.rejects(verifyBlueprintBackup({sku:'CAP-BP-001',cipherPath:link,expected:f.expected}),/not_regular_file/);
  }finally{await rm(f.dir,{recursive:true,force:true})}
});
test('rejects unsupported SKU and missing ciphertext path',async()=>{
  await assert.rejects(verifyBlueprintBackup({sku:'CAP-BP-050',cipherPath:'x'}),/unsupported_sku/);
  await assert.rejects(verifyBlueprintBackup({sku:'CAP-BP-001',cipherPath:''}),/cipher_required/);
});
