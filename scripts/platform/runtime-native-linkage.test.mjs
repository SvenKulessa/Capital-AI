import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { collectRuntimeNativeLinkage, parseApkFileOwnership, reconcileRuntimeNativeLinkage } from './runtime-native-linkage.mjs';

const DIGEST = 'sha256:' + 'b'.repeat(64);
const packageEntry = (p,v,f='usr/lib',name='libother.so.1') => `P:${p}\nV:${v}\nA:x86_64\nL:MIT\nF:${f}\nR:${name}\n`;
const installed = [
  packageEntry('clamav-libs','1.4.7-r0','usr/lib','libclamav.so.12'),
  packageEntry('clamav-daemon','1.4.7-r0','usr/sbin','clamd'),
  packageEntry('clamav-clamdscan','1.4.7-r0','usr/bin','clamdscan'),
  packageEntry('freshclam','1.4.7-r0','usr/bin','freshclam'),
  packageEntry('libmspack','0.11_alpha-r1','usr/lib','libmspack.so.0'),
  ...['musl','busybox','alpine-base'].map(x=>packageEntry(x,'1-r0')),
].join('\n');
const digest=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'cap-native-link-'));
  t.after(()=>rmSync(root,{force:true,recursive:true}));
  const put=(path,bytes)=>{const p=join(root,path);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
  put('lib/apk/db/installed',installed);
  for(const x of ['libclamav.so.12','libmspack.so.0'])put('usr/lib/'+x, 'binary:'+x);
  for(const x of ['clamd','freshclam','clamdscan'])put('usr/'+(x==='clamd'?'sbin':'bin')+'/'+x,'bin:'+x);
  const npm='app/node_modules/@img/sharp-libvips-linuxmusl-x64';
  put(npm+'/package.json',JSON.stringify({name:'@img/sharp-libvips-linuxmusl-x64',version:'1.3.4',license:'LGPL-3.0-or-later'}));
  put(npm+'/lib/libvips-cpp.so.8','libvips-image-binary');
  put(npm+'/LICENSE','license-bytes');
  put('app/node_modules/@img/sharp-linuxmusl-x64/package.json',JSON.stringify({name:'@img/sharp-linuxmusl-x64',version:'0.35.5'}));
  put('app/node_modules/@img/sharp-linuxmusl-x64/lib/sharp-linuxmusl-x64.node','sharp-image-addon');
  put('app/node_modules/sharp/package.json',JSON.stringify({name:'sharp',version:'0.35.5',license:'Apache-2.0'}));
  return {root,put};
}
function evidence(report){return {
  inventory:{schema:'OS_SOURCE_NOTICE_INVENTORY@1',sourceSha:'a'.repeat(40),imageConfigDigest:DIGEST,installedApkDbSha256:digest(installed),packages:[...parseApkFileOwnership(installed).values()]},
  coverage:{schema:'CAPITAL_AI_RUNTIME_LICENSE_COVERAGE@1',imageConfigDigest:DIGEST,redistributionApproved:false,packageCounts:{alpine:8},
    prioritisedRuntimeReview:{sharpLibvips:[{name:'@img/sharp-libvips-linuxmusl-x64',version:'1.3.4'}]}},
};}
test('real bytes in staged native files and packages are hashed, without legal promotion',async t=>{
  const f=fixture(t);const report=await collectRuntimeNativeLinkage({root:f.root,expectedConfigDigest:DIGEST});
  assert.equal(report.packageCount,8);
  assert.equal(report.packages.find(x=>x.name==='clamav-libs').version,'1.4.7-r0');
  assert.equal(report.packages.find(x=>x.name==='clamav-libs').binaryFiles[0].sha256,digest('binary:libclamav.so.12'));
  assert.equal(report.node[0].nativeFiles[0].sha256,digest('libvips-image-binary'));
  assert.equal(report.node[0].licenseFiles[0].sha256,digest('license-bytes'));
  assert.equal(report.unrar.absenceOfUnrarCode,'NOT_PROVEN');
  const {inventory,coverage}=evidence(report);
  const checked=reconcileRuntimeNativeLinkage(report,inventory,coverage);
  assert.equal(checked.nodeNativeFilesHashed,2);
  assert.equal(checked.redistributionApproved,false);
  assert.equal(checked.readyForCutover,false);
});
test('incorrect immutable config and APK DB hash fail closed',async t=>{
  const f=fixture(t);const r=await collectRuntimeNativeLinkage({root:f.root,expectedConfigDigest:DIGEST});
  const {inventory,coverage}=evidence(r);
  assert.throws(()=>reconcileRuntimeNativeLinkage({...r,imageConfigDigest:'sha256:'+'c'.repeat(64)},inventory,coverage),/Unbound/);
  assert.throws(()=>reconcileRuntimeNativeLinkage({...r,installedApkDbSha256:'sha256:'+'c'.repeat(64)},inventory,coverage),/Unbound/);
});
test('missing or stale native libvips package version cannot be represented as verified',async t=>{
  const f=fixture(t);const r=await collectRuntimeNativeLinkage({root:f.root,expectedConfigDigest:DIGEST});
  const {inventory,coverage}=evidence(r);
  r.node[0].version='9.9.9';
  assert.throws(()=>reconcileRuntimeNativeLinkage(r,inventory,coverage),/Sharp libvips version mismatch/);
});
test('forged grant and incorrect APK package version fail closed',async t=>{
  const f=fixture(t);const r=await collectRuntimeNativeLinkage({root:f.root,expectedConfigDigest:DIGEST});
  const {inventory,coverage}=evidence(r);
  assert.throws(()=>reconcileRuntimeNativeLinkage({...r,redistributionApproved:true},inventory,coverage),/Unbound/);
  r.packages[0].version='1.4.6-r0';
  assert.throws(()=>reconcileRuntimeNativeLinkage(r,inventory,coverage),/Target APK version/);
});
test('APK paths cannot escape allowed root, duplicate package records fail',()=>{
  assert.throws(()=>parseApkFileOwnership(installed+ '\n'+packageEntry('musl','1-r0')),/duplicate/i);
  assert.throws(()=>parseApkFileOwnership(installed.replace('R:libclamav.so.12','R:../secret')),/Unsafe APK ownership path/);
});

test('runtime SBOM and APK installed count are still bound, not just versions',async t=>{
  const f=fixture(t);const r=await collectRuntimeNativeLinkage({root:f.root,expectedConfigDigest:DIGEST});
  const {inventory,coverage}=evidence(r);coverage.packageCounts.alpine=9;
  assert.throws(()=>reconcileRuntimeNativeLinkage(r,inventory,coverage),/Unbound/);
});
test('expected libvips library cannot disappear while SBOM advertises it',async t=>{
  const f=fixture(t);const r=await collectRuntimeNativeLinkage({root:f.root,expectedConfigDigest:DIGEST});
  const {inventory,coverage}=evidence(r);r.node[0].nativeFiles=[];
  assert.throws(()=>reconcileRuntimeNativeLinkage(r,inventory,coverage),/lacks hashed native file/);
});
test('ELF suffix with non-ELF bytes never produces fabricated DT_NEEDED',async t=>{
  const f=fixture(t);const r=await collectRuntimeNativeLinkage({root:f.root,expectedConfigDigest:DIGEST});
  const entry=r.packages.find(x=>x.name==='clamav-libs').binaryFiles[0];
  assert.deepEqual(entry.dynamic,{status:'NOT_ELF_OR_HEADER_UNREADABLE',needed:[]});
});
