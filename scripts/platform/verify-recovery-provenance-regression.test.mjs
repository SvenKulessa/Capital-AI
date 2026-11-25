import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, linkSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateManifest, verifyLocalEvidence } from './verify-recovery-provenance.mjs';
const sha = data => createHash('sha256').update(data).digest('hex');
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'cai664-provenance-'));
  t.after(() => rmSync(dir,{recursive:true,force:true}));
  const storage = join(dir,'storage'), encrypted = join(dir,'dump.age');
  mkdirSync(storage); mkdirSync(join(storage,'nested'));
  writeFileSync(encrypted,'synthetic dump');
  writeFileSync(join(storage,'nested','a'),'synthetic object');
  const manifest = { contract:'CAPITAL_AI_RECOVERY_PROVENANCE_V1', status:'NOT_PROVEN', final_status:'NOT_PROVEN', source_project:'ryzywoktpmyhwzxmstyu', target_project:'wcvorlvhwvuprqsjcten', gcs:{generation:'1',metageneration:'1',encrypted_blob_sha256:sha('synthetic dump'),independent_download_sha256:sha('synthetic dump')}, storage:{binary_object_count:1,objects:[{path:'nested/a',sha256:sha('synthetic object')}]}};
  return {dir,storage,encrypted,manifest};
}
function add(f,path) { f.manifest.storage.objects.push({path,sha256:sha('synthetic object')}); f.manifest.storage.binary_object_count++; }
test('normal independent objects including equal content pass', async t => { const f=fixture(t); writeFileSync(join(f.storage,'b'),'synthetic object'); add(f,'b'); assert.deepEqual(await verifyLocalEvidence(f.manifest,f.encrypted,f.storage),{status:'LOCAL_BYTES_VERIFIED_NOT_PROVIDER',storageObjects:2}); });
test('duplicate alias via repeated separator rejects',t=>{const f=fixture(t);add(f,'nested//a');assert.throws(()=>validateManifest(f.manifest),/unsafe Storage/);});
test('trailing separator rejects',t=>{const f=fixture(t);f.manifest.storage.objects[0].path='nested/a/';assert.throws(()=>validateManifest(f.manifest),/unsafe Storage/);});
test('internal directory symlink alias rejects',async t=>{const f=fixture(t);symlinkSync(join(f.storage,'nested'),join(f.storage,'alias'));add(f,'alias/a');await assert.rejects(verifyLocalEvidence(f.manifest,f.encrypted,f.storage),/Storage path contains symlink/);});
test('external symlink rejects',async t=>{const f=fixture(t);symlinkSync(f.dir,join(f.storage,'external'));f.manifest.storage.objects[0].path='external/dump.age';await assert.rejects(verifyLocalEvidence(f.manifest,f.encrypted,f.storage),/Storage path resolves outside/);});
test('hard-linked object aliases reject',async t=>{const f=fixture(t);linkSync(join(f.storage,'nested/a'),join(f.storage,'b'));add(f,'b');await assert.rejects(verifyLocalEvidence(f.manifest,f.encrypted,f.storage),/hard-linked/);});
test('FIFO fails closed without waiting for writer',t=>{const f=fixture(t);const fifo=join(f.storage,'fifo');assert.equal(spawnSync('mkfifo',[fifo]).status,0);f.manifest.storage.objects[0].path='fifo';const m=join(f.dir,'manifest.json');writeFileSync(m,JSON.stringify(f.manifest));const result=spawnSync(process.execPath,[new URL('./verify-recovery-provenance.mjs',import.meta.url).pathname,m,f.encrypted,f.storage],{encoding:'utf8',timeout:1500});assert.equal(result.error,undefined);assert.equal(result.status,1);assert.match(result.stderr,/regular file/);});
test('tampered object rejects',async t=>{const f=fixture(t);writeFileSync(join(f.storage,'nested/a'),'tampered');await assert.rejects(verifyLocalEvidence(f.manifest,f.encrypted,f.storage),/Storage byte hash mismatch/);});
test('wrong project and fabricated provider VERIFIED reject',t=>{const f=fixture(t);f.manifest.target_project='wrong';assert.throws(()=>validateManifest(f.manifest),/target identity mismatch/);f.manifest.target_project='wcvorlvhwvuprqsjcten';f.manifest.final_status='VERIFIED';assert.throws(()=>validateManifest(f.manifest),/do not pre-assert/);});
