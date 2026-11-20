import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { factsFromGitBlob, collectGitHubSourceEvidence, buildSourceBoundReviewGraph } from './strategy-2026-source-graph.mjs';

const a='a'.repeat(40), b='b'.repeat(40), c='c'.repeat(40);
const source=(prNumber,headSha,sourcePath,text)=>{
  const bytes=Buffer.from(text,'utf8');
  const blobSha=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  return {prNumber,headSha,sourcePath,blobSha,base64Content:bytes.toString('base64'),size:bytes.length};
};
const pr=(number,headSha,changedFiles)=>({number,headSha,changedFiles});
const snap=prs=>({snapshotType:'LIVE_GITHUB',inventoryComplete:true,observedAt:'2026-11-20T00:00:00Z',repo:'SvenKulessa/Capital-AI',mainSha:a,pullRequests:prs});
const testNow=()=>Date.parse('2026-11-20T00:01:00Z');
const evidence=facts=>({schemaVersion:'CAPITAL_AI_SOURCE_EVIDENCE@1',source:'GITHUB_CONTENTS_GET_BY_HEAD_SHA',observedAt:'2026-11-20T00:00:00Z',coverage:'SELECTED_CHANGED_SOURCE_FILES',facts});

test('validates Git blob SHA-1 and finds explicit relative module import',()=>{
  const x=source(1,a,'src/components/foo.ts',"import { Account } from '../contracts/account';");
  const facts=factsFromGitBlob(x);
  assert.equal(facts.length,1);
  assert.equal(facts[0].kind,'CONTRACT_IMPORT');
  assert.equal(facts[0].target,'src/contracts/account');
  assert.equal(facts[0].blobSha,x.blobSha);
});
test('rejects tampered source bytes, incorrect size and malformed identities',()=>{
  const x=source(1,a,'src/components/foo.ts',"import './safe';");
  assert.throws(()=>factsFromGitBlob({...x,base64Content:Buffer.from("import './evil';").toString('base64')}),/Git blob SHA mismatch/);
  assert.throws(()=>factsFromGitBlob({...x,size:999}),/source size mismatch/);
  assert.throws(()=>factsFromGitBlob({...x,sourcePath:'../escape'}),/invalid source identity/);
});
test('identifies direct explicit contract import with PR/head/blob evidence',()=>{
  const x=source(1,a,'src/components/foo.ts',"import { Account } from '../contracts/account';");
  const s=snap([pr(1,a,['src/components/foo.ts']),pr(2,b,['src/contracts/account.ts'])]);
  const graph=buildSourceBoundReviewGraph(s,evidence(factsFromGitBlob(x)));
  assert.equal(graph.directEdges[0].relation,'EXPLICIT_CONTRACT_IMPORT');
  assert.equal(graph.directEdges[0].sourceEvidence[0].blobSha,x.blobSha);
  assert.equal(graph.directEdges[0].strength,'REVIEW_REQUIRED');
  assert.equal(graph.authority,'READ_ONLY_NOT_MERGE_AUTHORIZATION');
});
test('source-bound database table and package name produce review edges only',()=>{
  const f=[
    ...factsFromGitBlob(source(1,a,'supabase/migrations/20261120_a.sql','CREATE TABLE private.audit (id integer);')),
    ...factsFromGitBlob(source(2,b,'supabase/migrations/20261120_b.sql','ALTER TABLE private.audit ADD COLUMN k integer;')),
    ...factsFromGitBlob(source(3,c,'client/package.json',JSON.stringify({dependencies:{zod:'4.0.0'}}))),
    ...factsFromGitBlob(source(4,a,'server/package.json',JSON.stringify({dependencies:{zod:'4.0.0'}})))
  ];
  const s=snap([pr(1,a,['supabase/migrations/20261120_a.sql']),pr(2,b,['supabase/migrations/20261120_b.sql']),pr(3,c,['client/package.json']),pr(4,a,['server/package.json'])]);
  const graph=buildSourceBoundReviewGraph(s,evidence(f));
  assert.deepEqual(graph.directEdges.map(e=>e.relation).sort(),['EXPLICIT_DATABASE_ENTITY','EXPLICIT_PACKAGE_REFERENCE']);
  assert.ok(graph.directEdges.every(e=>e.strength==='REVIEW_REQUIRED'));
});
test('transitive chain is a review path, never a proven conflict or merge order',()=>{
  const f=[...factsFromGitBlob(source(1,a,'src/a.ts',"import './b';")),...factsFromGitBlob(source(2,b,'src/b.ts',"import './c';"))];
  const s=snap([pr(1,a,['src/a.ts']),pr(2,b,['src/b.ts']),pr(3,c,['src/c.ts'])]);
  const graph=buildSourceBoundReviewGraph(s,evidence(f));
  assert.deepEqual(graph.directEdges.map(x=>[x.left,x.right]),[[1,2],[2,3]]);
  assert.deepEqual(graph.transitivePaths.map(x=>x.path),[[1,2,3]]);
  assert.equal(graph.transitivePaths[0].mergeEligibility,'NOT_PROVEN');
});
test('unrelated imports produce no edges',()=>{
  const f=factsFromGitBlob(source(1,a,'src/a.ts',"import './does-not-exist';"));
  const graph=buildSourceBoundReviewGraph(snap([pr(1,a,['src/a.ts']),pr(2,b,['src/b.ts'])]),evidence(f));
  assert.deepEqual(graph.directEdges,[]);assert.deepEqual(graph.transitivePaths,[]);
});
test('rejects forged PR head SHA and source filename provenance',()=>{
  const f=factsFromGitBlob(source(1,a,'src/a.ts',"import './b';"));
  assert.throws(()=>buildSourceBoundReviewGraph(snap([pr(1,b,['src/a.ts'])]),evidence(f)),/source evidence not bound/);
  assert.throws(()=>buildSourceBoundReviewGraph(snap([pr(1,a,['src/other.ts'])]),evidence(f)),/source evidence not bound/);
});
test('GET-only source adapter fetches immutable ref, verifies blob, no raw content in output',async()=>{
  const x=source(1,a,'src/a.ts',"import './b';"); const requests=[];
  const fetchImpl=async(url,init)=>{requests.push({url,init});return {ok:true,status:200,json:async()=>({type:'file',sha:x.blobSha,size:x.size,encoding:'base64',content:x.base64Content})}};
  const result=await collectGitHubSourceEvidence({snapshot:snap([pr(1,a,['src/a.ts'])]),fetchImpl,token:'DO_NOT_SHOW',now:testNow});
  assert.equal(result.coverage,'SELECTED_CHANGED_SOURCE_FILES');
  assert.equal(result.facts[0].target,'src/b');
  assert.ok(requests[0].url.endsWith(`?ref=${a}`));
  assert.equal(requests[0].init.method,'GET');
  assert.ok(!JSON.stringify(result).includes('DO_NOT_SHOW'));
  assert.ok(!JSON.stringify(result).includes('import '));
});
test('caps source fetch budget and marks evidence incomplete without claiming full coverage',async()=>{
  const files=['src/a.ts','src/b.ts'];
  const fetchImpl=async(url)=>{const file=url.includes('a.ts')?'src/a.ts':'src/b.ts';const x=source(1,a,file,'export const x=1;');return {ok:true,status:200,json:async()=>({type:'file',sha:x.blobSha,size:x.size,encoding:'base64',content:x.base64Content})}};
  const result=await collectGitHubSourceEvidence({snapshot:snap([pr(1,a,files)]),fetchImpl,maxFiles:1,now:testNow});
  assert.equal(result.candidateFiles,2);assert.equal(result.examinedFiles,1);assert.equal(result.coverage,'PARTIAL_LIMIT');
});
test('HTTP error fails closed without leaking token',async()=>{
  const fetchImpl=async()=>({ok:false,status:403});
  await assert.rejects(collectGitHubSourceEvidence({snapshot:snap([pr(1,a,['src/a.ts'])]),fetchImpl,token:'SUPERSECRET',now:testNow}),e=>/403/.test(e.message)&&!e.message.includes('SUPERSECRET'));
});

test('source collector rejects stale snapshots before requesting code bytes',async()=>{
  const requests=[];
  const fetchImpl=async url=>{requests.push(url);throw Error('must not fetch stale source')};
  await assert.rejects(collectGitHubSourceEvidence({snapshot:snap([pr(1,a,['src/a.ts'])]),fetchImpl,now:()=>Date.parse('2026-11-20T02:00:00Z')}),/stale/);
  assert.equal(requests.length,0);
});
test('source graph refuses evidence captured for a different inventory',()=>{
  const s=snap([pr(1,a,['src/a.ts'])]);
  assert.throws(()=>buildSourceBoundReviewGraph(s,{...evidence([]),observedAt:'2026-11-19T20:00:00Z'}),/snapshot mismatch/);
});


test('round-robin source selection includes smaller PRs under a fixed 24-file equivalent budget',async()=>{
  const prs=[pr(1,a,['src/a1.ts','src/a2.ts','src/a3.ts','src/a4.ts']),pr(2,b,['src/b1.ts']),pr(3,c,['src/c1.ts'])];
  const seen=[];
  const fetchImpl=async url=>{
    const filename=new URL(url).pathname.split('/contents/')[1];seen.push(filename);
    const pn=filename.includes('a')?1:filename.includes('b')?2:3;
    const x=source(pn,pn===1?a:pn===2?b:c,filename,`export const x = ${pn};`);
    return {ok:true,status:200,json:async()=>({type:'file',sha:x.blobSha,size:x.size,encoding:'base64',content:x.base64Content})};
  };
  const r=await collectGitHubSourceEvidence({snapshot:snap(prs),fetchImpl,maxFiles:3,now:testNow});
  assert.deepEqual(seen,['src/a1.ts','src/b1.ts','src/c1.ts']);
  assert.deepEqual(r.eligiblePullRequests,[1,2,3]);
  assert.deepEqual(r.representedPullRequests,[1,2,3]);
  assert.deepEqual(r.omittedPullRequests,[]);
  assert.equal(r.selectionStrategy,'ROUND_ROBIN_BY_PR');
  assert.equal(r.coverage,'PARTIAL_LIMIT');
  assert.equal(r.candidateFiles,6);
});
test('when PR count exceeds budget, excluded PRs are explicitly reported',async()=>{
  const prs=[pr(1,a,['src/a.ts']),pr(2,b,['src/b.ts']),pr(3,c,['src/c.ts'])];
  const fetchImpl=async url=>{
    const filename=new URL(url).pathname.split('/contents/')[1], pn=filename.includes('a')?1:2;
    const x=source(pn,pn===1?a:b,filename,'export const x=1;');
    return {ok:true,status:200,json:async()=>({type:'file',sha:x.blobSha,size:x.size,encoding:'base64',content:x.base64Content})};
  };
  const r=await collectGitHubSourceEvidence({snapshot:snap(prs),fetchImpl,maxFiles:2,now:testNow});
  assert.deepEqual(r.representedPullRequests,[1,2]);
  assert.deepEqual(r.omittedPullRequests,[3]);
  assert.equal(r.coverage,'PARTIAL_LIMIT');
  assert.equal(r.examinedFiles,2);
});
test('round-robin ordering is repeatable for a fixed snapshot',async()=>{
  const prs=[pr(4,a,['src/z.ts','src/a.ts']),pr(1,b,['src/y.ts','src/x.ts'])];
  const seen=[];
  const fetchImpl=async url=>{
    const filename=new URL(url).pathname.split('/contents/')[1];seen.push(filename);
    const pn=filename.includes('src/a')||filename.includes('src/z')?4:1;
    const x=source(pn,pn===4?a:b,filename,'export const x=1;');
    return {ok:true,status:200,json:async()=>({type:'file',sha:x.blobSha,size:x.size,encoding:'base64',content:x.base64Content})};
  };
  await collectGitHubSourceEvidence({snapshot:snap(prs),fetchImpl,maxFiles:4,now:testNow});
  assert.deepEqual(seen,['src/a.ts','src/x.ts','src/z.ts','src/y.ts']);
});
