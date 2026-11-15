import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { stableSourceId } from './drive-sync-plan.mjs';
import { buildDeltaPlan } from './drive-sync-delta.mjs';
import { FIXTURE_SCHEMA, replayReadOnlyProviderFixture } from './drive-sync-provider-fixtures.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const template = JSON.parse(fs.readFileSync(path.join(here, 'mapping.v1.json'), 'utf8'));
const SOURCE_SHA = 'b'.repeat(40);
const FILE_KEY = stableSourceId('docs/platform/demo.md');
const folder = () => ({ key: 'PLATFORM', name: 'PLATFORM', id: 'folder-platform', parentId: 'root-test' });
const remoteFile = (extra = {}) => ({
  id: 'file-demo', parentId: 'folder-platform', name: 'demo.md', syncKey: FILE_KEY,
  sha256: '0'.repeat(64), revision: '7', etag: 'rev-7', ...extra,
});
const page = (nextPageToken = null, files = [], folders = [folder()]) => ({ nextPageToken, folders, files });
const success = (body = page()) => ({ status: 200, body });
function fixture(requests = [{ pageToken: null, attempts: [success()] }]) {
  return { schemaVersion: FIXTURE_SCHEMA, rootKey: 'CAPITAL-AI', rootId: 'root-test',
    operation: 'LIST_ONLY', permission: { kind: 'SYNTHETIC_READ_ONLY', rootId: 'root-test',
      canList: true, visibleFolderIds: ['folder-platform'] }, requests };
}
const clone = structuredClone;
function replay(input, mapping = template) { return replayReadOnlyProviderFixture({ mapping, fixture: input }); }
function tempDocs(t, content = 'demo') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'capital-ai-provider-fixtures-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const docs = path.join(root, 'docs');
  fs.mkdirSync(path.join(docs, 'platform'), { recursive: true });
  fs.writeFileSync(path.join(docs, 'platform/demo.md'), content);
  const mapping = clone(template); mapping.approvedFiles = ['docs/platform/demo.md'];
  return { docs, mapping };
}
function tracked(file) { return { schemaVersion:'capital-ai.doc-tree-state.v1', sourceRepository:'SvenKulessa/Capital-AI',
  sourceSha:SOURCE_SHA, rootId:'root-test',entries:[{sourceId:file.syncKey,driveId:file.id,
    parentId:file.parentId,sha256:file.sha256,revision:file.revision,etag:file.etag}] }; }
function build(t, remote = remoteFile(), previous = tracked(remote), content = 'changed demo') {
  const ctx = tempDocs(t,content);
  const input = fixture([{pageToken:null,attempts:[success(page(null,[remote]))]}]);
  const {pageFixture,evidence} = replay(input,ctx.mapping);
  return {plan:buildDeltaPlan({mapping:ctx.mapping,docsRoot:ctx.docs,pages:pageFixture,state:previous,sourceSha:SOURCE_SHA}),evidence};
}

test('offline fixture produces complete LIST_ONLY inventory and no side effects', () => {
 const output=replay(fixture());
 assert.equal(output.pageFixture.pages.length,1);
 assert.deepEqual(output.pageFixture.pages[0].folders,[folder()]);
 assert.equal(output.evidence.providerWrites,0);
 assert.equal(output.evidence.networkRequests,0);
 assert.equal(output.evidence.credentialReads,0);
 assert.equal(output.evidence.retries,0);
 assert.ok(!('credentials' in output));
});
test('429 is retried only after a deterministic bounded schedule', () => {
 const receipt=fixture([{pageToken:null,attempts:[{status:429,retryAfterSeconds:2},success()]}]);
 const output=replay(receipt);
 assert.deepEqual(output.evidence.retrySchedule,[{pageIndex:0,attempt:1,status:429,simulatedBackoffMs:2000}]);
});
test('synthetic 500 502 503 504 each retry a read-only page once', () => {
 for(const status of [500,502,503,504]){
  const output=replay(fixture([{pageToken:null,attempts:[{status},success()]}]));
  assert.equal(output.evidence.retries,1);
  assert.equal(output.evidence.retrySchedule[0].status,status);
  assert.equal(output.evidence.retrySchedule[0].simulatedBackoffMs,250);
 }
});
test('two transient errors use capped exponential backoff and successful third attempt', () => {
 const out=replay(fixture([{pageToken:null,attempts:[{status:503},{status:429,retryAfterSeconds:1},success()]}]));
 assert.deepEqual(out.evidence.retrySchedule.map(r=>r.simulatedBackoffMs),[250,1000]);
});
test('429 and 5xx exhaustion never yields partial inventory', () => {
 for(const code of [429,500,503]) assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status:code},{status:code},{status:code}]}])),/PROVIDER_RETRY_EXHAUSTED/);
});
test('unexpected fourth attempt cannot weaken retry cap', () => {
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status:503},{status:503},{status:503},success()]}])),/PROVIDER_PAGINATION_OR_RETRY_BOUNDS/);
});
test('unbounded, fractional, negative or nonnumeric retry after are denied', () => {
 for(const delay of [31,-1,0.2,'15',null]) {
  assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status:429,retryAfterSeconds:delay},success()]}])),/PROVIDER_UNSAFE_RETRY_AFTER/);
 }
});
test('401 is blocked and never treated as a retryable network failure', () => {
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status:401}]}])),/PROVIDER_AUTH_REQUIRED/);
});
test('403 permission loss during pagination aborts all pages', () => {
 const steps=[{pageToken:null,attempts:[success(page('cursor2',[],[folder()]))]},
  {pageToken:'cursor2',attempts:[{status:403}]}];
 assert.throws(()=>replay(fixture(steps)),/PROVIDER_PERMISSION_DENIED/);
});
test('404 missing or inaccessible root is blocked', () => {
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status:404}]}])),/PROVIDER_ROOT_NOT_FOUND/);
});
test('412 stale ETag precondition is not retried as a read success', () => {
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status:412}]}])),/PROVIDER_PRECONDITION_FAILED/);
});
test('unsupported 4xx and malformed status are refused', () => {
 for(const status of [400,405,409,418,501,599]) assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status}]}])),/PROVIDER_NONRETRYABLE_STATUS/);
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status:'200'}]}])),/INVALID_PROVIDER_STATUS/);
});
test('error bodies and credentials are rejected rather than logged', () => {
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status:503,body:{access_token:'private'}}]}])),/PROVIDER_ERROR_BODY_FORBIDDEN/);
 const fake=fixture(); fake.access_token='synthetic-bad';
 assert.throws(()=>replay(fake),/INVALID_PROVIDER_FIXTURE/);
 const bad=fixture();bad.requests[0].attempts[0].authorization='Bearer synthetic';
 assert.throws(()=>replay(bad),/INVALID_PROVIDER_RESPONSE/);
});
test('mutation operation, root-wide grant and missing list permission fail closed', () => {
 const mut=fixture();mut.operation='CREATE_FILE';
 assert.throws(()=>replay(mut),/INVALID_PROVIDER_FIXTURE/);
 for(const grant of [{kind:'SYNTHETIC_READ_ONLY',canList:false},{kind:'SYNTHETIC_WRITE',canList:true}]){
   const f=fixture();Object.assign(f.permission,grant);
   assert.throws(()=>replay(f),/PROVIDER_PERMISSION_DENIED/);
 }
});
test('grant root must match exact listed root, no wildcard root or grant', () => {
 for(const rootId of ['other-root','*']){
  const bad=fixture();bad.permission.rootId=rootId;
  assert.throws(()=>replay(bad),/PROVIDER_PERMISSION_DENIED/);
 }
});
test('visible folder grants are unique and bounded', () => {
 const dup=fixture();dup.permission.visibleFolderIds=['folder-platform','folder-platform'];
 assert.throws(()=>replay(dup),/PROVIDER_PERMISSION_DENIED/);
 const huge=fixture();huge.permission.visibleFolderIds=Array.from({length:21},(_,i)=>`f${i}`);
 assert.throws(()=>replay(huge),/PROVIDER_PERMISSION_DENIED/);
});
test('folder moving outside root or grant is blocked', () => {
 const other=folder();other.parentId='outside-root';
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[success(page(null,[],[other]))]}])),/PROVIDER_CROSS_FOLDER_DENIED/);
 const noGrant=fixture();noGrant.permission.visibleFolderIds=[];
 assert.throws(()=>replay(noGrant),/PROVIDER_CROSS_FOLDER_DENIED/);
});
test('file in unauthorized or unlisted target folder is blocked', () => {
 for(const parentId of ['outside-folder','other-root']){
  assert.throws(()=>replay(fixture([{pageToken:null,attempts:[success(page(null,[remoteFile({parentId})]))]}])),/PROVIDER_CROSS_FOLDER_DENIED/);
 }
 const f=fixture([{pageToken:null,attempts:[success(page(null,[remoteFile()],[]))]}]);
 assert.throws(()=>replay(f),/PROVIDER_CROSS_FOLDER_DENIED/);
});
test('complete two-page listing preserves page token and frozen result', () => {
 const f=fixture([{pageToken:null,attempts:[success(page('cursor2',[],[folder()]))]},
  {pageToken:'cursor2',attempts:[success(page(null,[remoteFile()],[]))]}]);
 const out=replay(f);assert.equal(out.evidence.pages,2);
 assert.equal(out.pageFixture.pages[1].pageToken,'cursor2');
 assert.equal(out.pageFixture.pages[1].files.length,1);
});
test('missing second page is incomplete, never silently successful', () => {
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[success(page('cursor2'))]}])),/PROVIDER_INCOMPLETE_PAGINATION/);
});
test('out-of-order next page token rejects incomplete responses', () => {
 const f=fixture([{pageToken:null,attempts:[success(page('cursor2'))]},
 {pageToken:'wrong',attempts:[success(page())]}]);
 assert.throws(()=>replay(f),/PROVIDER_PAGINATION_OR_RETRY_BOUNDS/);
});
test('page token cycles are rejected', () => {
 const f=fixture([{pageToken:null,attempts:[success(page('cursor2'))]},
 {pageToken:'cursor2',attempts:[success(page('cursor2',[],[]))]},
 {pageToken:'cursor2',attempts:[success(page())]}]);
 assert.throws(()=>replay(f),/PROVIDER_PAGINATION_CYCLE/);
});
test('malformed page token and premature terminal page reject', () => {
 const invalid=fixture([{pageToken:null,attempts:[success(page('../invalid'))]}]);
 assert.throws(()=>replay(invalid),/INVALID_PROVIDER_BODY/);
 const terminal=fixture([{pageToken:null,attempts:[success(page())]},{pageToken:'second',attempts:[success(page())]}]);
 assert.throws(()=>replay(terminal),/PROVIDER_EARLY_TERMINATION/);
});
test('duplicate remote file across pages is refused', () => {
 const f=fixture([{pageToken:null,attempts:[success(page('cursor2',[],[folder()]))]},
 {pageToken:'cursor2',attempts:[success(page(null,[remoteFile(),remoteFile()],[]))]}]);
 assert.throws(()=>replay(f),/PROVIDER_DUPLICATE_FILE/);
});
test('duplicate folders across pages are refused', () => {
 const f=fixture([{pageToken:null,attempts:[success(page('cursor2',[],[folder()]))]},
 {pageToken:'cursor2',attempts:[success(page(null,[],[folder()]))]}]);
 assert.throws(()=>replay(f),/PROVIDER_DUPLICATE_FOLDER/);
});
test('case-folded same-parent duplicate names reject', () => {
 const second=remoteFile({id:'file-other',syncKey:stableSourceId('docs/platform/other.md'),name:'DEMO.MD'});
 const f=fixture([{pageToken:null,attempts:[success(page(null,[remoteFile(),second]))]}]);
 assert.throws(()=>replay(f),/PROVIDER_DUPLICATE_FILE/);
});
test('oversized provider pages are blocked before planning', () => {
 const files=new Array(201).fill(remoteFile());
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[success(page(null,files))]}])),/INVALID_PROVIDER_BODY/);
});
test('200 responses cannot be followed by unexplained fixture attempts', () => {
 const f=fixture([{pageToken:null,attempts:[success(),{status:503}]}]);
 assert.throws(()=>replay(f),/PROVIDER_UNEXPECTED_SUCCESS_SEQUENCE/);
});
test('synthetic remote ETag/revision mismatch blocks update after provider replay', (t) => {
 const f=tempDocs(t);
 const baseline=remoteFile();
 for(const changed of [{revision:'8'},{etag:'rev-8'},{sha256:'2'.repeat(64)}]){
  const input=fixture([{pageToken:null,attempts:[success(page(null,[remoteFile(changed)]))]}]);
  const {pageFixture}=replay(input,f.mapping);
  const plan=buildDeltaPlan({mapping:f.mapping,docsRoot:f.docs,pages:pageFixture,state:tracked(baseline),sourceSha:SOURCE_SHA});
  assert.equal(plan.summary.CONFLICT,1);
  assert.equal(plan.summary.PLAN_UPDATE,0);
  assert.equal(plan.audit[0].reason,'STALE_REMOTE_REVISION');
 }
});
test('synthetic missing or malformed file ETag is blocked', () => {
 for(const etag of [undefined,'rev\n7','']) {
  const f=fixture([{pageToken:null,attempts:[success(page(null,[remoteFile({etag})]))]}]);
  assert.throws(()=>replay(f),/UNSAFE_REMOTE_REVISION_OR_FILE/);
 }
});
test('matching ETag and revision propose only conditional update, with zero writes', (t) => {
 const {plan,evidence}=build(t);
 assert.equal(plan.summary.PLAN_UPDATE,1);
 assert.equal(plan.audit[0].expectedEtag,'rev-7');
 assert.equal(plan.audit[0].expectedRevision,'7');
 assert.equal(plan.writes,0);
 assert.equal(plan.networkRequests,0);
 assert.equal(evidence.providerWrites,0);
});
test('matched SHA and tracked revision yield SKIP without promoting stale state', (t) => {
 const content='unchanged'; const hash=createHash('sha256').update(content).digest('hex');
 const {plan}=build(t,remoteFile({sha256:hash}),tracked(remoteFile({sha256:hash})),content);
 assert.equal(plan.summary.SKIP,1);
 assert.equal(plan.confirmedState.entries.length,1);
});
test('untracked identical remote contents never become claimed state', (t) => {
 const content='unchanged';const hash=createHash('sha256').update(content).digest('hex');
 const {plan}=build(t,remoteFile({sha256:hash}),null,content);
 assert.equal(plan.summary.CONFLICT,1);
 assert.equal(plan.confirmedState.entries.length,0);
});
test('bounded fixture has no real network or write primitives and no CLI activation', () => {
 const ownSource=fs.readFileSync(path.join(here,'drive-sync-provider-fixtures.mjs'),'utf8');
 assert.doesNotMatch(ownSource, /\b(?:fetch\s*\(|https?\.request\s*\(|googleapis|google\.auth|google_drive_api|MediaFileUpload)\b/);
 const bad=fixture();bad.requests=[{pageToken:null,attempts:[]}];
 assert.throws(()=>replay(bad),/PROVIDER_PAGINATION_OR_RETRY_BOUNDS/);
});
test('unexpected provider file metadata cannot smuggle links or credentials into inventory', () => {
 const file = remoteFile({webViewLink:'https://example.invalid/secret',access_token:'synthetic'});
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[success(page(null,[file]))]}])),/INVALID_PROVIDER_FILE_METADATA/);
 const badFolder={...folder(),capabilities:{canEdit:true}};
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[success(page(null,[],[badFolder]))]}])),/INVALID_PROVIDER_FOLDER_METADATA/);
});
test('malformed 200 without a complete body is rejected rather than yielding an empty inventory', () => {
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[{status:200}]}])),/INVALID_PROVIDER_BODY/);
 assert.throws(()=>replay(fixture([{pageToken:null,attempts:[success({folders:[],files:[]})]}])),/INVALID_PROVIDER_BODY/);
});
