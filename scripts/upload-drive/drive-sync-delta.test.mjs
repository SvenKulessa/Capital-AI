import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { stableSourceId } from './drive-sync-plan.mjs';
import { collectPages, validateState, buildDeltaPlan, readPrivateState, savePrivateStateAtomic } from './drive-sync-delta.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const template = JSON.parse(fs.readFileSync(path.join(dir, 'mapping.v1.json'), 'utf8'));
const SOURCE = 'a'.repeat(40);
const SOURCE_ID = stableSourceId('docs/platform/demo.md');
const folder = { key: 'PLATFORM', name: 'PLATFORM', id: 'folder-platform', parentId: 'root-test' };
function fixture(t, body = 'new text') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'capital-ai-delta-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const docsRoot = path.join(root, 'docs'); fs.mkdirSync(path.join(docsRoot, 'platform'), { recursive: true });
  fs.writeFileSync(path.join(docsRoot, 'platform/demo.md'), body);
  const mapping = structuredClone(template); mapping.approvedFiles = ['docs/platform/demo.md'];
  return { root, docsRoot, mapping };
}
function remote(hash = '0'.repeat(64), extra = {}) { return { id: 'remote-a', parentId: 'folder-platform', name: 'demo.md', syncKey: SOURCE_ID, sha256: hash, revision: '4', etag: 'etag-4', ...extra }; }
function pages(files = [], folders = [folder]) { return { schemaVersion: 'capital-ai.doc-tree-pages.v1', rootKey: 'CAPITAL-AI', rootId: 'root-test', pages: [{pageToken: null, nextPageToken: null, folders, files}] }; }
function state(entries = []) { return {schemaVersion:'capital-ai.doc-tree-state.v1',sourceRepository:'SvenKulessa/Capital-AI',sourceSha:SOURCE,rootId:'root-test',entries}; }
function record(f) { return {sourceId:f.syncKey,driveId:f.id,parentId:f.parentId,sha256:f.sha256,revision:f.revision,etag:f.etag}; }
function plan(f, paged, previous = null) { return buildDeltaPlan({mapping:f.mapping,docsRoot:f.docsRoot,pages:paged,state:previous,sourceSha:SOURCE}); }

test('zero-write, zero-network create plan with SHA-bound audit', (t) => {
 const f=fixture(t); const p=plan(f,pages());
 assert.equal(p.summary.PLAN_CREATE,1); assert.equal(p.writes,0); assert.equal(p.networkRequests,0);
 assert.equal(p.sourceSha,SOURCE); assert.equal(p.confirmedState.entries.length,0);
 assert.ok(!JSON.stringify(p.audit).includes('new text'));
});
test('complete synthetic pagination concatenates folder and file pages', (t) => {
 const f=fixture(t); const paged=pages(); paged.pages=[{pageToken:null,nextPageToken:'nextA',folders:[folder],files:[]},{pageToken:'nextA',nextPageToken:null,folders:[],files:[]}];
 assert.equal(collectPages(paged,f.mapping).folders.length,1);
 assert.equal(plan(f,paged).inventoryPages,2);
});
test('missing last page and skipped page token fail closed', (t) => {
 const f=fixture(t); const p=pages(); p.pages[0].nextPageToken='page2';
 assert.throws(()=>plan(f,p),/PAGINATION_INCOMPLETE/);
 p.pages.push({pageToken:'wrong',nextPageToken:null,folders:[],files:[]});
 assert.throws(()=>plan(f,p),/PAGINATION_INCOMPLETE/);
});
test('cycles, terminal-before-last, overlarge pages and malformed tokens reject', (t) => {
 const f=fixture(t); const p=pages(); p.pages=[{pageToken:null,nextPageToken:'b',folders:[folder],files:[]},{pageToken:'b',nextPageToken:'b',folders:[],files:[]},{pageToken:'b',nextPageToken:null,folders:[],files:[]}];
 assert.throws(()=>plan(f,p),/PAGINATION_CYCLE/);
 p.pages[0].nextPageToken=null;
 assert.throws(()=>plan(f,p),/PAGINATION_EARLY_TERMINATION/);
 p.pages=pages().pages; p.pages[0].files=new Array(201).fill(remote());
 assert.throws(()=>plan(f,p),/PAGINATION_INCOMPLETE/);
 p.pages=pages().pages; p.pages[0].nextPageToken='../bad';
 assert.throws(()=>plan(f,p),/PAGINATION_CYCLE/);
});
test('revision and etag required before any plan', (t) => {
 const f=fixture(t);
 for (const change of [{revision:undefined},{revision:'0'},{revision:'3.4'},{etag:undefined},{etag:'bad\nvalue'}]) {
   assert.throws(()=>plan(f,pages([remote(undefined,change)])),/UNSAFE_REMOTE_REVISION/);
 }
});
test('tracked remote snapshot parity produces SKIP and confirmed state', (t) => {
 const f=fixture(t); const baseline=plan(f,pages()).audit[0].sha256; const r=remote(baseline);
 const p=plan(f,pages([r]),state([record(r)]));
 assert.equal(p.summary.SKIP,1); assert.deepEqual(p.confirmedState.entries[0],record(r));
});
test('changed local bytes propose conditional update with revision and target digest', (t) => {
 const f=fixture(t); const r=remote('1'.repeat(64)); const p=plan(f,pages([r]),state([record(r)]));
 assert.equal(p.summary.PLAN_UPDATE,1); assert.equal(p.audit[0].expectedRevision,'4');
 assert.equal(p.audit[0].expectedEtag,'etag-4'); assert.match(p.audit[0].targetIdDigest,/^[0-9a-f]{64}$/);
 assert.equal(p.confirmedState.entries.length,0); // proposed updates never become confirmed
});
test('untracked remote update never overwrites existing file', (t) => {
 const f=fixture(t); const p=plan(f,pages([remote()]));
 assert.equal(p.audit[0].reason,'UNTRACKED_REMOTE_OBJECT'); assert.equal(p.summary.CONFLICT,1);
});
test('stale revision, etag or remote body produce conflicts', (t) => {
 const f=fixture(t); const old=remote('1'.repeat(64));
 for (const change of [{revision:'5'},{etag:'etag-5'},{sha256:'2'.repeat(64)}]) {
 const p=plan(f,pages([remote('1'.repeat(64),change)]),state([record(old)]));
 assert.equal(p.audit[0].reason,'STALE_REMOTE_REVISION'); assert.equal(p.summary.PLAN_UPDATE,0);
 }
});
test('missing remote after previously tracking becomes conflict', (t) => {
 const f=fixture(t); const p=plan(f,pages(),state([record(remote())]));
 assert.equal(p.audit[0].reason,'TRACKED_REMOTE_MISSING'); assert.equal(p.summary.PLAN_CREATE,0);
});
test('changed remote Drive ID fails closed', (t) => {
 const f=fixture(t); const r=remote(); const p=plan(f,pages([remote(undefined,{id:'other-id'})]),state([record(r)]));
 assert.equal(p.audit[0].reason,'REMOTE_IDENTITY_CHANGED');
});
test('duplicate across pages and cross-folder targets rejected', (t) => {
 const f=fixture(t); const p=pages([remote()]); p.pages=[{pageToken:null,nextPageToken:'second',folders:[folder],files:[remote()]},{pageToken:'second',nextPageToken:null,folders:[],files:[remote()]}];
 assert.throws(()=>plan(f,p),/DUPLICATE_REMOTE_FILE_ID/);
 const q=pages([remote(undefined,{parentId:'other-folder'})]);
 assert.throws(()=>plan(f,q),/CROSS_FOLDER_FILE/);
});
test('malformed state, duplicate source or cross-root state denied', (t) => {
 const f=fixture(t); const r=record(remote());
 assert.throws(()=>plan(f,pages(),{...state([r]),rootId:'other'}),/INVALID_PRIVATE_STATE/);
 assert.throws(()=>plan(f,pages(),state([r,r])),/DUPLICATE_PRIVATE_STATE/);
 assert.throws(()=>plan(f,pages(),state([{...r,revision:'0'}])),/CORRUPT_PRIVATE_STATE_ENTRY/);
});
test('atomic first save uses private mode, readback digest and valid state', (t) => {
 const f=fixture(t); const p=path.join(f.root,'state.json'); const value=state();
 const sha=savePrivateStateAtomic(p,value); const read=readPrivateState(p,'root-test');
 assert.equal(read.sha256,sha); assert.deepEqual(read.state,value);
 if (process.platform !== 'win32') assert.equal(fs.statSync(p).mode & 0o777,0o600);
 assert.equal(fs.existsSync(`${p}.lock`),false);
});
test('interrupted local write does not replace previous state and cleans temp/lock', (t) => {
 const f=fixture(t),file=path.join(f.root,'state.json'); const before=savePrivateStateAtomic(file,state());
 assert.throws(()=>savePrivateStateAtomic(file,{...state(),sourceSha:'b'.repeat(40)},{expectedPreviousSha256:before,simulateCrash:true}),/SIMULATED_BEFORE_RENAME/);
 assert.equal(readPrivateState(file,'root-test').sha256,before);
 assert.deepEqual(fs.readdirSync(f.root).filter(n=>n.includes('.tmp-')||n.endsWith('.lock')),[]);
});
test('stale local state digest and concurrent lock reject without mutation', (t) => {
 const f=fixture(t),file=path.join(f.root,'state.json'); const old=savePrivateStateAtomic(file,state());
 assert.throws(()=>savePrivateStateAtomic(file,state()),/STALE_LOCAL_STATE/);
 assert.throws(()=>savePrivateStateAtomic(file,state(),{expectedPreviousSha256:'e'.repeat(64)}),/STALE_LOCAL_STATE/);
 fs.writeFileSync(`${file}.lock`,'locked');
 assert.throws(()=>savePrivateStateAtomic(file,state(),{expectedPreviousSha256:old}),/EEXIST/);
 assert.equal(readPrivateState(file,'root-test').sha256,old);
});
test('corrupted JSON and wrong-root state never pass readback', (t) => {
 const f=fixture(t),file=path.join(f.root,'state.json'); fs.writeFileSync(file,'{bad');
 assert.throws(()=>readPrivateState(file,'root-test'),/CORRUPT_PRIVATE_STATE_JSON/);
 fs.writeFileSync(file,JSON.stringify(state()));
 assert.throws(()=>readPrivateState(file,'alien'),/INVALID_PRIVATE_STATE/);
});
test('CLI remains read-only and rejects apply/state mutation flags', (t) => {
 const f=fixture(t); const conf=path.join(f.root,'mapping.json'),inv=path.join(f.root,'pages.json');
 fs.writeFileSync(conf,JSON.stringify(f.mapping));fs.writeFileSync(inv,JSON.stringify(pages()));
 const cli=path.join(dir,'drive-sync-delta.mjs'); const args=['--mapping',conf,'--docs-root',f.docsRoot,'--pages',inv,'--source-sha',SOURCE];
 const good=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'}); assert.equal(good.status,0,good.stderr);
 const parsed=JSON.parse(good.stdout); assert.equal(parsed.writes,0);assert.equal(parsed.networkRequests,0);
 assert.equal(parsed.confirmedState,undefined);
 for (const flag of ['--apply','--write-state','--oauth']) {
 const bad=spawnSync(process.execPath,[cli,...args,flag],{encoding:'utf8'});
 assert.equal(bad.status,1);assert.match(bad.stderr,/UNSUPPORTED_CLI_ARGUMENT/);
 }
});

test('symlinked private state is never followed', (t) => {
 const f=fixture(t), privateFile=path.join(f.root,'real.json'),link=path.join(f.root,'alias.json');
 fs.writeFileSync(privateFile, JSON.stringify(state()));fs.symlinkSync(privateFile,link);
 assert.throws(()=>readPrivateState(link,'root-test'),/INVALID_STATE_FILE/);
 assert.throws(()=>savePrivateStateAtomic(link,state()),/INVALID_STATE_FILE/);
 assert.equal(fs.readFileSync(privateFile,'utf8'),JSON.stringify(state()));
});

test('untracked matching remote content cannot be silently adopted as confirmed state', (t) => {
 const f=fixture(t); const hash=plan(f,pages()).audit[0].sha256;
 const p=plan(f,pages([remote(hash)]));
 assert.equal(p.summary.CONFLICT,1);
 assert.equal(p.audit[0].reason,'UNTRACKED_REMOTE_OBJECT');
 assert.equal(p.confirmedState.entries.length,0);
});
test('previously tracked local file missing reports conflict and preserves zero-write boundary', (t) => {
 const f=fixture(t); const tracked=record(remote());
 fs.rmSync(path.join(f.docsRoot,'platform/demo.md'));
 const p=plan(f,pages([remote()]),state([tracked]));
 assert.equal(p.summary.CONFLICT,1);
 assert.equal(p.audit[0].reason,'TRACKED_LOCAL_MISSING');
 assert.equal(p.writes,0);
 assert.equal(p.confirmedState.entries.length,0);
});
