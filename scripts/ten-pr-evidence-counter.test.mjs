import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMilestone, verifyMilestoneMerge, collectTenPrEvidence } from './ten-pr-evidence-counter.mjs';

const mainSha = 'f'.repeat(40);
const domainNames = ['PRODUCT','MARKET','PLATFORM','TRUST','GROWTH'];
const links = Object.fromEntries(domainNames.map(d=>[d,'CAPITAL-AI-'+d+'/domain.prompt.json']));
const app = {
  authority:{source:'AGENTS.md',permissionExpansion:false},
  skillRegistry:'.agents/skills/registry.json',domainPrompts:links,
  tenPrEfficiencyMilestone:{
    schema:'CAPITAL_AI_TEN_PR_EFFICIENCY_MILESTONE@1', sourcePr:852,
    requiredVerifiedMerges:10, excludedPullRequests:[850],missingData:'NOT_PROVEN',
    appliesAfter:'2026-11-20 owner authorization; exact time is NOT_PROVEN',
    permissionExpansion:false,createsScheduler:false,createsRequiredChecks:false,
  },
};
const registry = { promptContracts:{application:'.agents/app.prompt.json',domains:links} };
const makePr = (number=901,mergedAt='2026-11-22T12:00:00Z')=>({
  number,state:'closed',merged:true,draft:false,
  title:'[CAPITAL-AI-PLATFORM] Mock only',created_at:'2026-11-19T00:00:00Z',merged_at:mergedAt,
  head:{sha:number.toString(16).padStart(40,'a')},
  merge_commit_sha:number.toString(16).padStart(40,'b'),
});
function makeChecks(pr,overrides={}) {
  const names=['Docker Security Gate','Domain Governance','CodeQL'];
  return {total_count:3,check_runs:names.map((name,i)=>({
    id:1000+i,name,head_sha:pr.head.sha,status:'completed',
    conclusion:overrides[name]||'success',
  }))};
}
const ancestry = pr=>({status:'ahead',behind_by:0,
  base_commit:{sha:pr.merge_commit_sha},merge_base_commit:{sha:pr.merge_commit_sha}});
function provider(prs=[makePr()],changes={}) {
  const seen=[];let mains=0;
  const fetchImpl=async (url, options)=>{
    assert.equal(options.method,'GET');
    assert.equal(options.redirect,'error');
    assert.ok(url.startsWith('https://api.github.com/repos/SvenKulessa/Capital-AI/'));
    const path=url.replace('https://api.github.com/repos/SvenKulessa/Capital-AI','');
    seen.push(path);
    if(changes[path]!==undefined)return Response.json(changes[path]);
    if(path==='/commits/main'){mains++;return Response.json({sha:mainSha});}
    if(path.startsWith('/pulls?'))return Response.json(path.includes('page=1&')?prs:[]);
    const item=/^\/pulls\/(\d+)$/.exec(path);
    if(item)return Response.json(prs.find(p=>p.number===Number(item[1]))||null);
    const checked=/^\/commits\/([a-f0-9]{40})\/check-runs\?per_page=100$/.exec(path);
    if(checked)return Response.json(makeChecks(prs.find(p=>p.head.sha===checked[1])));
    const compared=/^\/compare\/([a-f0-9]{40})\.\.\.([a-f0-9]{40})$/.exec(path);
    if(compared)return Response.json(ancestry(prs.find(p=>p.merge_commit_sha===compared[1])));
    throw Error('UNKNOWN_SOURCE_PATH');
  };
  return {fetchImpl,seen,get mains(){return mains;}};
}
const collect = async source=>collectTenPrEvidence({app,registry,fetchImpl:source.fetchImpl,
  now:()=>Date.parse('2026-11-22T13:00:00Z')});

test('canonical skill-registry contract is mandatory; no parallel or permissive prompt',()=>{
  assert.equal(validateMilestone(app,registry).requiredVerifiedMerges,10);
  for(const change of [
    {...app,skillRegistry:'shadow.json'},
    {...app,authority:{source:'PR-comment',permissionExpansion:false}},
    {...app,tenPrEfficiencyMilestone:{...app.tenPrEfficiencyMilestone,requiredVerifiedMerges:1}},
    {...app,tenPrEfficiencyMilestone:{...app.tenPrEfficiencyMilestone,excludedPullRequests:[]}},
    {...app,tenPrEfficiencyMilestone:{...app.tenPrEfficiencyMilestone,permissionExpansion:true}},
    {...app,domainPrompts:{...links,TRUST:'wrong'}},
  ])assert.throws(()=>validateMilestone(change,registry));
  assert.throws(()=>validateMilestone(app,{promptContracts:{application:'other',domains:links}}));
});

test('immutable SHA ancestry plus exact required checks and CodeQL are mandatory',()=>{
  const pr=makePr();
  const valid=verifyMilestoneMerge(pr,pr,makeChecks(pr),ancestry(pr),mainSha);
  assert.equal(valid.prNumber,901);
  assert.equal(valid.domain,'PLATFORM');
  assert.equal(valid.codeqlCheckId,1002);
  for(const bad of [
    {...pr,draft:true},{...pr,merged:false},
    {...pr,head:{sha:'x'}},{...pr,title:'[CAPITAL-AI-EVIL] Unauthorized'},
    {...pr,merged_at:'2026-11-20T15:00:00Z'},
    {...pr,merge_commit_sha:'fake'},
  ])assert.equal(verifyMilestoneMerge(bad,bad,makeChecks(pr),ancestry(pr),mainSha),null);
  assert.equal(verifyMilestoneMerge(pr,pr,makeChecks(pr,{'CodeQL':'neutral'}),ancestry(pr),mainSha),null);
  assert.equal(verifyMilestoneMerge(pr,pr,makeChecks(pr,{'Domain Governance':'failure'}),ancestry(pr),mainSha),null);
  assert.equal(verifyMilestoneMerge(pr,pr,makeChecks(pr),{...ancestry(pr),status:'diverged'},mainSha),null);
});

test('GET-only provider result verifies one merge but never grants publication',async()=>{
  const source=provider();
  const result=await collect(source);
  assert.equal(result.inventoryComplete,true);
  assert.equal(result.status,'VERIFIED_COUNT_BELOW_TARGET');
  assert.equal(result.verifiedCount,1);
  assert.equal(result.publishAuthorized,false);
  assert.equal(result.verifiedMerges[0].requiredCheckRunIds['Docker Security Gate'],1000);
  assert.equal(source.mains,2);
  assert.ok(source.seen.every(x=>x.startsWith('/')));
  assert.doesNotMatch(JSON.stringify(result),/Mock only/);
});

test('same-day unknown authorization time and PR #850 never count',async()=>{
  const sameDay=await collect(provider([makePr(901,'2026-11-20T15:00:00Z')]));
  assert.equal(sameDay.excludedAuthorizationDay,1);
  assert.equal(sameDay.verifiedCount,0);
  assert.equal(sameDay.status,'NOT_PROVEN_PARTIAL');
  const excluded=await collect(provider([makePr(850)]));
  assert.equal(excluded.verifiedCount,0);
});

test('failed or non-SHA-bound provider evidence stays NOT_PROVEN',async()=>{
  const failure=await collectTenPrEvidence({app,registry,fetchImpl:async()=>new Response('not found',{status:404})});
  assert.equal(failure.status,'NOT_PROVEN');
  assert.equal(failure.inventoryComplete,false);
  assert.equal(failure.verifiedCount,0);
  const pr=makePr();
  const bad=await collect(provider([pr],{'/commits/'+pr.head.sha+'/check-runs?per_page=100':makeChecks(pr,{'Docker Security Gate':'failure'})}));
  assert.equal(bad.verifiedCount,0);
  assert.equal(bad.status,'NOT_PROVEN_PARTIAL');
  assert.deepEqual(bad.unverifiedCandidates,[{prNumber:901,status:'NOT_PROVEN'}]);
});

test('main SHA changed during collection discards even previously validated evidence',async()=>{
  const source=provider();
  let count=0;
  const result=await collectTenPrEvidence({app,registry,fetchImpl:async(url,opt)=>{
    if(url.endsWith('/commits/main')&&++count===2)return Response.json({sha:'e'.repeat(40)});
    return source.fetchImpl(url,opt);
  }});
  assert.equal(result.verifiedCount,0);
  assert.equal(result.status,'NOT_PROVEN');
});

test('ten distinct source-bound successful merges reach threshold without publishing',async()=>{
  const prs=Array.from({length:10},(_,i)=>makePr(901+i));
  const result=await collect(provider(prs));
  assert.equal(result.status,'VERIFIED_THRESHOLD');
  assert.equal(result.verifiedCount,10);
  assert.equal(new Set(result.verifiedMerges.map(p=>p.prNumber)).size,10);
  assert.equal(result.publishAuthorized,false);
});

test('bounded inventory refuses excess candidates and never invents a partial count',async()=>{
  const prs=Array.from({length:45},(_,i)=>makePr(1001+i));
  const result=await collect(provider(prs));
  assert.equal(result.inventoryComplete,false);
  assert.equal(result.status,'NOT_PROVEN');
  assert.equal(result.verifiedCount,0);
});
