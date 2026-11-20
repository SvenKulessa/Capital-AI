import test from 'node:test';
import assert from 'node:assert/strict';
import { correlatePullRequests } from './strategy-2026-pr-correlation.mjs';
import { collectLiveInventory } from './strategy-2026-pr-live.mjs';

const a='a'.repeat(40), b='b'.repeat(40), c='c'.repeat(40);
const mk=(number,files,draft=false)=>({number,title:`PR #${number}`,headSha:a,baseSha:b,state:'open',draft,changedFiles:files,changedFilesComplete:true});
const historical=prs=>({snapshotType:'HISTORICAL_REGRESSION_FIXTURE',authority:'NON_CURRENT',mainSha:b,observedAt:'2026-11-19T21:45:00Z',pullRequests:prs});
const live=prs=>({...historical(prs),snapshotType:'LIVE_GITHUB',authority:'LIVE_READ_ONLY',repo:'SvenKulessa/Capital-AI',inventoryComplete:true,observedAt:'2026-11-20T00:00:00Z'});
const report=prs=>correlatePullRequests(live(prs),{currentMainSha:b,now:Date.parse('2026-11-20T00:01:00Z')});
test('historical fixture is not current or merge authority',()=>{
  const r=correlatePullRequests(historical([mk(842,['server/google-analytics-readback.mjs'])]));
  assert.equal(r.authority,'NON_CURRENT');assert.equal(r.current,false);assert.equal(r.totalOpen,null);
  assert.equal(r.observedCount,1);assert.equal(r.pullRequests[0].mergeEligibility,'NOT_PROVEN');
});
test('exact file intersection and ordering are deterministic',()=>{
  const ps=[mk(842,['server/x.mjs','server/x.mjs']),mk(819,['server/x.mjs'])];
  const r=report(ps);assert.deepEqual(r.overlapEdges,[{left:819,right:842,sharedFiles:['server/x.mjs']}]);
  assert.deepEqual(r,report([...ps].reverse()));
  assert.equal(r.decision,'READ_ONLY_CORRELATION_NOT_MERGE_AUTHORIZATION');
});
test('package and lockfile relationship needs review',()=>{
  const r=report([mk(1,['package.json']),mk(2,['package-lock.json'])]);
  assert.equal(r.dependencyEdges[0].reasons[0].relation,'PACKAGE_LOCK_DEPENDENCY');
  assert.deepEqual(r.dependencyEdges[0].reasons[0].evidence,['package.json','package-lock.json']);
});
test('contract to runtime match is evidence backed',()=>{
  const r=report([mk(1,['src/contracts/solanaRiskResearch.ts']),mk(2,['src/services/solanaRiskResearch.ts'])]);
  assert.equal(r.dependencyEdges[0].reasons[0].relation,'CONTRACT_RUNTIME_DEPENDENCY');
});
test('migration to runtime match is evidence backed',()=>{
  const r=report([mk(1,['supabase/migrations/20261120_ledgerSecurity.sql']),mk(2,['server/ledgerSecurity.mjs'])]);
  assert.equal(r.dependencyEdges[0].reasons[0].relation,'MIGRATION_SCHEMA_DEPENDENCY');
});
test('unrelated files do not produce speculative edges',()=>{
  assert.deepEqual(report([mk(1,['src/contracts/certificate.ts']),mk(2,['server/analytics.mjs'])]).dependencyEdges,[]);
});
test('rejects invalid historical authority, live incomplete, closed PR, main mismatch, old snapshot',()=>{
  assert.throws(()=>correlatePullRequests({...historical([]),authority:'LIVE_READ_ONLY'}),/authority/);
  assert.throws(()=>correlatePullRequests({...live([]),inventoryComplete:false},{currentMainSha:b}),/incomplete/);
  assert.throws(()=>report([{...mk(1,[]),state:'closed'}]),/incomplete or closed/);
  assert.throws(()=>correlatePullRequests(live([]),{currentMainSha:c,now:Date.parse('2026-11-20T00:01:00Z')}),/main SHA mismatch/);
  assert.throws(()=>correlatePullRequests(live([]),{currentMainSha:b,now:Date.parse('2026-11-20T01:00:00Z')}),/stale/);
});
test('rejects duplicate numbers, dangerous paths and invalid SHAs',()=>{
  assert.throws(()=>report([mk(1,[]),mk(1,[])]),/duplicate/);
  for(const path of ['../secret','/tmp/s','x/../y','hello\nworld']) assert.throws(()=>report([mk(1,[path])]),/path/);
  assert.throws(()=>report([{...mk(1,[]),headSha:'x'}]),/SHA/);
});
test('empty inventory can be current if verified',()=>assert.equal(report([]).totalOpen,0));
const sourcePR=(number,head=a)=>({number,title:`PR ${number}`,head:{sha:head},base:{sha:b},draft:false});
const sourceFile=name=>({filename:name,status:'modified'});
function fetchMock({drift=false,mainDrift=false,incomplete=false,renamed=false}={}) {
  const requests=[];
  const fetchImpl=async (url,init)=>{
    requests.push({url,init});
    const path=new URL(url).pathname.split('/repos/SvenKulessa/Capital-AI/')[1]+new URL(url).search;
    let data;
    if(path==='git/ref/heads/main') data={object:{sha:mainDrift && requests.filter(x=>x.url.endsWith('git/ref/heads/main')).length>1?c:b,type:'commit'}};
    else if(path.startsWith('pulls?')) data=path.includes('page=1')?[sourcePR(5)]:[];
    else if(path.startsWith('pulls/5/files?')) data=path.includes('page=1')?
      (renamed?[{filename:'server/new.mjs',previous_filename:'server/old.mjs',status:'renamed'}]:[sourceFile('server/foo.mjs')]):[];
    else if(path==='pulls/5') data={...sourcePR(5,drift?c:a),state:'open',changed_files:incomplete?2:1};
    else throw Error('Unexpected GET '+path);
    return {ok:true,status:200,json:async()=>data};
  };
  return {fetchImpl,requests};
}
test('live adapter performs GET only, verifies SHA and complete filenames',async()=>{
  const x=fetchMock();const v=await collectLiveInventory({fetchImpl:x.fetchImpl,now:()=>Date.parse('2026-11-20T00:00:00Z')});
  assert.equal(v.report.current,true);assert.equal(v.report.totalOpen,1);
  assert.equal(v.snapshot.pullRequests[0].headSha,a);
  assert.ok(x.requests.every(r=>r.init.method==='GET'&&r.url.startsWith('https://api.github.com/repos/SvenKulessa/Capital-AI/')));
});
test('live adapter includes previous path on rename',async()=>{
  const x=fetchMock({renamed:true});const {snapshot}=await collectLiveInventory({fetchImpl:x.fetchImpl});
  assert.deepEqual(snapshot.pullRequests[0].changedFiles,['server/new.mjs','server/old.mjs']);
});
test('live adapter fails closed on HEAD race',async()=>{
  const x=fetchMock({drift:true});await assert.rejects(collectLiveInventory({fetchImpl:x.fetchImpl}),/changed during inventory/);
});
test('live adapter fails closed on MAIN race',async()=>{
  const x=fetchMock({mainDrift:true});await assert.rejects(collectLiveInventory({fetchImpl:x.fetchImpl}),/main changed/);
});
test('live adapter fails closed on truncated changed file listing',async()=>{
  const x=fetchMock({incomplete:true});await assert.rejects(collectLiveInventory({fetchImpl:x.fetchImpl}),/file list incomplete/);
});
test('live adapter does not disclose bearer token in errors',async()=>{
  const fetchImpl=async()=>({ok:false,status:403});
  await assert.rejects(collectLiveInventory({token:'DO_NOT_LEAK',fetchImpl}),e=>!e.message.includes('DO_NOT_LEAK')&&/403/.test(e.message));
});
test('captured historical fixture keeps regression semantics, never live semantics',async()=>{
  const {readFile}=await import('node:fs/promises');
  const raw=await readFile(new URL('./fixtures/open-prs-20261119.json',import.meta.url),'utf8');
  const r=correlatePullRequests(JSON.parse(raw));
  assert.equal(r.observedCount,12);assert.equal(r.overlapEdges.length,6);
  assert.equal(r.current,false);assert.equal(r.totalOpen,null);
});