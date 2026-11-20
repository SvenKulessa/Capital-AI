import test from 'node:test';
import assert from 'node:assert/strict';
import { assessPullRequest, readTenPrGitHubCounter, milestoneContract } from './ten-pr-github-evidence.mjs';

const main='a'.repeat(40),head='b'.repeat(40),merge='c'.repeat(40);
const observed=()=>Date.parse('2026-12-04T12:00:00Z');
const api='https://api.github.com/repos/SvenKulessa/Capital-AI';
const pr=(patch={})=>({number:901,state:'closed',draft:false,
  title:'[CAPITAL-AI-PLATFORM] QA synthetic, no live evidence',
  created_at:'2026-11-22T09:00:00Z',merged_at:'2026-11-22T12:00:00Z',
  merge_commit_sha:merge,head:{sha:head},base:{ref:'main'},...patch});
const checks=()=>({total_count:3,check_runs:['Docker Security Gate','Domain Governance','CodeQL']
  .map((name,i)=>({name,head_sha:head,status:'completed',conclusion:'success',
    completed_at:'2026-11-22T11:00:00Z',
    details_url:'https://github.com/SvenKulessa/Capital-AI/actions/runs/'+(101+i)}))});
const ancestry=()=>({status:'ahead',behind_by:0,base_commit:{sha:merge},head_commit:{sha:main}});
const response=data=>({ok:true,status:200,json:async()=>data});
function mocked(overrides={}){
  const requests=[];let branchReads=0;
  const fetchImpl=async (url,init)=>{
    requests.push({url,init});
    if(overrides.httpError)return {ok:false,status:403};
    if(url===api+'/branches/main')return response({commit:{sha:overrides.mainMoved&&++branchReads>1?'f'.repeat(40):main}});
    if(url.startsWith('https://api.github.com/search/issues?'))
      return response({total_count:overrides.total??1,incomplete_results:overrides.incomplete??false,
        items:overrides.items??[{number:901}]});
    if(url===api+'/pulls/901')return response(overrides.pr??pr());
    if(url===api+'/commits/'+head+'/check-runs?per_page=100')
      return response(overrides.checks??checks());
    if(url===api+'/compare/'+merge+'...'+main)return response(overrides.ancestry??ancestry());
    throw Error('unexpected GET in fixture');
  };
  return {fetchImpl,requests};
}

test('uses the canonical non-authorizing ten-PR contract',()=>{
  const x=milestoneContract();
  assert.equal(x.requiredVerifiedMerges,10);
  assert.deepEqual(x.excludedPullRequests,[850]);
  assert.equal(x.missingData,'NOT_PROVEN');
  assert.equal(x.permissionExpansion,false);
  assert.equal(x.createsScheduler,false);
});

test('GET-only source-bound audit admits verified synthetic PR and denies automatic publication',async()=>{
  const mock=mocked();
  const report=await readTenPrGitHubCounter({fetchImpl:mock.fetchImpl,token:'DO_NOT_DISCLOSE',now:observed});
  assert.equal(report.status,'IN_PROGRESS');assert.equal(report.verifiedCount,1);
  assert.equal(report.remaining,9);assert.equal(report.eligible[0].domain,'PLATFORM');
  assert.equal(report.eligible[0].testedHeadSha,head);
  assert.equal(report.eligible[0].mainMergeSha,merge);
  assert.deepEqual(report.eligible[0].requiredCheckRunIds,[101,102]);
  assert.equal(report.publicationAuthorized,false);
  assert.equal(report.sourceCoverage,'GITHUB_SEARCH_COMPLETED');
  assert.ok(mock.requests.every(r=>r.init.method==='GET'&&r.init.redirect==='error'));
  assert.ok(!JSON.stringify(report).includes('DO_NOT_DISCLOSE'));
});

test('negative cases deny forged PR title, wrong base, draft or invalid SHA',()=>{
  for(const patch of [
    {title:'[CAPITAL-AI-OTHER] fake'}, {base:{ref:'release'}}, {draft:true},
    {merge_commit_sha:'forged'}, {head:{sha:'invalid'}}, {number:850} ]){
    const o=assessPullRequest({pr:pr(patch),checks:checks(),ancestry:ancestry(),
      mainSha:main,observedAt:new Date(observed()).toISOString(),
      threshold:Date.parse('2026-11-21T00:00:00+01:00'),excluded:[850]});
    assert.equal(o.status,'NOT_PROVEN');
  }
});

test('negative cases deny neutral CodeQL, missing Docker gate and non-matching checked head',()=>{
  for(const bad of [
    {...checks(),check_runs:checks().check_runs.slice(1)},
    {...checks(),check_runs:checks().check_runs.map(c=>c.name==='CodeQL'?{...c,conclusion:'neutral'}:c)},
    {...checks(),check_runs:checks().check_runs.map(c=>c.name==='Domain Governance'?{...c,head_sha:main}:c)}]){
    const mock=mocked({checks:bad});
    const r=readTenPrGitHubCounter({fetchImpl:mock.fetchImpl,now:observed});
    return r.then(data=>{assert.equal(data.verifiedCount,0);assert.equal(data.rejected[0].reason,'REQUIRED_CHECKS_NOT_SUCCESS');});
  }
});

test('negative cases deny unverifiable main ancestry and same-day owner-time ambiguity',async()=>{
  const cases=[
    {ancestry:{...ancestry(),base_commit:{sha:'d'.repeat(40)}}},
    {checks:{...checks(),total_count:101}},
    {pr:pr({created_at:'2026-11-20T18:00:00Z',merged_at:'2026-11-20T19:00:00Z'})}
  ];
  for(const c of cases){
    const fixture=mocked(c);
    const result=await readTenPrGitHubCounter({fetchImpl:fixture.fetchImpl,now:observed});
    assert.equal(result.verifiedCount,0);
  }
});

test('incomplete search and result page cap cannot become a fabricated count',async()=>{
  const inc=mocked({incomplete:true});
  await assert.rejects(readTenPrGitHubCounter({fetchImpl:inc.fetchImpl,now:observed}),/SEARCH_INCOMPLETE/);
  const cap=mocked({total:9999,items:Array.from({length:100},(_,i)=>({number:i+901}))});
  const partial=await readTenPrGitHubCounter({fetchImpl:cap.fetchImpl,now:observed,maxPages:1});
  assert.equal(partial.status,'NOT_PROVEN');assert.equal(partial.verifiedCount,null);
  assert.equal(partial.sourceCoverage,'PARTIAL_LIMIT');
});

test('provider failure, main movement and secret handling fail closed',async()=>{
  const moved=mocked({mainMoved:true});
  await assert.rejects(readTenPrGitHubCounter({fetchImpl:moved.fetchImpl,now:observed}),/MAIN_CHANGED_DURING_READ/);
  const forbidden=mocked({httpError:true});
  await assert.rejects(readTenPrGitHubCounter({fetchImpl:forbidden.fetchImpl,token:'PRIVATE_TOKEN',now:observed}),
    e=>e.message.includes('HTTP_403')&&!e.message.includes('PRIVATE_TOKEN'));
  await assert.rejects(readTenPrGitHubCounter({fetchImpl:mocked().fetchImpl,token:'bad\nvalue',now:observed}),
    /INVALID_INPUT/);
});
