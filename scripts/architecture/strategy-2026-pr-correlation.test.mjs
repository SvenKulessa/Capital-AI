import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { correlatePullRequests } from './strategy-2026-pr-correlation.mjs';
const sha = 'a'.repeat(40);
const mk = (number, changedFiles, draft = false) => ({number,title:'PR #'+number,headSha:sha,draft,changedFiles});
const inp = pullRequests => ({ mainSha:'b'.repeat(40), pullRequests });
test('GA4 shared paths are identified without merge authorization', () => {
  const r = correlatePullRequests(inp([mk(842,['server/google-analytics-readback.mjs']),mk(819,['server/google-analytics-readback.mjs']),mk(834,['x.ts'])]));
  assert.deepEqual(r.overlapEdges,[{left:819,right:842,sharedFiles:['server/google-analytics-readback.mjs']}]);
  assert.equal(r.pullRequests[0].mergeEligibility,'NOT_PROVEN');
  assert.equal(r.decision,'READ_ONLY_CORRELATION_NOT_MERGE_AUTHORIZATION');
});
test('deterministic irrespective of ordering or repeated paths', () => {
  const items=[mk(2,['a.ts','a.ts']),mk(1,['a.ts'])];
  assert.deepEqual(correlatePullRequests(inp(items)),correlatePullRequests(inp([...items].reverse())));
});
test('empty inventory is allowed',()=>assert.equal(correlatePullRequests(inp([])).totalOpen,0));
test('duplicate PR numbers are rejected',()=>assert.throws(()=>correlatePullRequests(inp([mk(1,[]),mk(1,[])])),/duplicate/));
test('invalid main/head SHAs are rejected',()=>{
  assert.throws(()=>correlatePullRequests({...inp([]),mainSha:'main'}),/mainSha/);
  assert.throws(()=>correlatePullRequests(inp([{...mk(1,[]),headSha:'bad'}])),/head SHA/);
});
test('path traversal, absolute paths, newline rejected',()=>{
  for(const p of ['../env','/etc/passwd','folder/../.env','x\nsecret']) assert.throws(()=>correlatePullRequests(inp([mk(1,[p])])),/invalid path/);
});
test('malformed/oversized structures rejected',()=>{
  assert.throws(()=>correlatePullRequests(null),/object/);
  assert.throws(()=>correlatePullRequests({...inp([]),pullRequests:'x'}),/array/);
  assert.throws(()=>correlatePullRequests(inp([mk(0,[])])),/number/);
  assert.throws(()=>correlatePullRequests(inp([{...mk(1,[]),changedFiles:'x'}])),/changedFiles/);
  assert.throws(()=>correlatePullRequests(inp([{...mk(1,[]),draft:'false'}])),/draft/);
  assert.throws(()=>correlatePullRequests(inp(Array.from({length:201},(_,i)=>mk(i+1,[])))),/200/);
});
test('observed 12-PR snapshot has six overlapping pairs',async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/open-prs-20261119.json',import.meta.url),'utf8'));
  const r=correlatePullRequests(fixture);
  assert.equal(r.totalOpen,12);assert.equal(r.overlapEdges.length,6);
  assert.deepEqual(r.overlapEdges.find(x=>x.left===819&&x.right===842).sharedFiles,[
    'server/google-analytics-readback.mjs','server/google-analytics-readback.test.mjs','src/components/OwnerAgentOperationsPanel.tsx'
  ]);
});
