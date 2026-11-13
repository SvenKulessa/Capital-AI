import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createContainerIdentity, setContainerDigests } from './container-evidence-identity.mjs';
import { parseApkInstalled, buildOsSourceNotice, noticeIndex } from './os-source-inventory.mjs';

const record = (name, origin=name, commit='c'.repeat(40), license='MIT') =>
  'P:' + name + '\nV:1.2.3-r0\nA:x86_64\nL:' + license +
  (origin ? '\no:' + origin : '') + (commit ? '\nc:' + commit : '') + '\n';
const installed = Buffer.from([
  record('musl'),record('busybox'),record('apk-tools'),record('alpine-keys'),
  record('ca-certificates-bundle'),record('zlib'),record('libssl3','openssl'),
  record('libcrypto3','openssl'),
].join('\n'));
const sha = 'a'.repeat(40);
const identity = setContainerDigests(createContainerIdentity({GITHUB_EVENT_NAME:'push',GITHUB_SHA:sha}),
  {localImageId:'sha256:'+'b'.repeat(64)});
const input = () => ({
  installedDb:installed,release:'3.24.1\n',identity,
  dockerfile:'FROM node:26.13.0-alpine@sha256:'+'d'.repeat(64)+' AS crypto-base\n',
  sourceNodeLicense:Buffer.from('node notice'),runtimeNodeLicense:Buffer.from('node notice'),
  sourceFontOfl:Buffer.from('font OFL'),runtimeFontOfl:Buffer.from('font OFL'),
});

test('inventory ties package versions, origins and actual notices to exact local image digest', () => {
  const report=buildOsSourceNotice(input());
  assert.equal(report.packages.length,8);
  assert.equal(report.sourceRecipeLocators.length,7);
  assert.equal(report.imageConfigDigest,identity.digests.localImageId);
  assert.equal(report.installedApkDbSha256,
    'sha256:'+createHash('sha256').update(installed).digest('hex'));
  assert.equal(report.sourceSha,sha);
  assert.equal(report.redistributionApproved,false);
  assert.equal(report.sourceDeliveryProven,false);
  assert.match(noticeIndex(report),/PUBLIC REDISTRIBUTION NOT APPROVED/);
});
test('missing recipe commit or origin stays explicit; no fabricated provenance', () => {
  const x=input();
  x.installedDb=Buffer.from(installed.toString().replace('c:'+'c'.repeat(40),'c:unknown'));
  const report=buildOsSourceNotice(x);
  assert.ok(report.missingSourceMetadata.includes('musl'));
  assert.equal(report.packages.find(p=>p.name==='musl').aportsCommit,null);
});
test('malformed or duplicate Alpine installed entries fail closed',()=>{
  for(const bad of [Buffer.alloc(0),Buffer.from('\0'),
    Buffer.from('P:../secret\nV:1.0\nA:x86_64\nL:MIT'),
    Buffer.from(installed.toString().replace('L:MIT','L:')),
    Buffer.from(installed.toString()+'\n'+record('musl'))]) {
    assert.throws(()=>parseApkInstalled(bad));
  }
});
test('wrong image identity, missing base pin and stale runtime notices cannot pass',()=>{
  for(const change of [
    {identity:{...identity,digests:{localImageId:null}}},
    {identity:{...identity,source:{testedSha:null}}},
    {dockerfile:'FROM node:26.13.0-alpine AS crypto-base\n'},
    {release:'not-alpine'},
    {runtimeNodeLicense:Buffer.from('different')},
    {runtimeFontOfl:Buffer.from('different')},
  ]) assert.throws(()=>buildOsSourceNotice({...input(),...change}));
});
test('existing Docker gate collects exact runtime metadata and retains artifact',()=>{
  const wf=readFileSync(new URL('../.github/workflows/build-security.yml',import.meta.url),'utf8');
  const scan=wf.indexOf('      - name: Exaktes Image exportieren und scannen');
  const inventory=wf.indexOf('      - name: OS-Quellen-/Notice-Inventar mit Image-ID binden');
  const artifact=wf.indexOf('      - name: Prüfnachweise sichern');
  assert.ok(scan>0&&inventory>scan&&artifact>inventory);
  const step=wf.slice(inventory,artifact);
  for(const path of ['/lib/apk/db/installed','/etc/alpine-release',
    '/app/licenses/Node-LICENSE.txt','/app/dist/fonts/OFL.txt',
    'node scripts/os-source-inventory.mjs']) assert.ok(step.includes(path));
  for(const path of ['security-reports/os-source-inventory.json',
    'security-reports/OS-PACKAGE-NOTICES.txt','security-reports/os-apk-installed.txt']) {
    assert.ok(wf.includes(path));
  }
});
