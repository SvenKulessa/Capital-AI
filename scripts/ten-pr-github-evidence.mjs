#!/usr/bin/env node
/** Fail-closed, GET-only GitHub milestone readback. No scheduler or publishing. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const REPO='SvenKulessa/Capital-AI';
const API='https://api.github.com/repos/'+REPO;
const SEARCH='https://api.github.com/search/issues';
const SHA=/^[a-f0-9]{40}$/i;
const DOMAINS=new Set(['PRODUCT','MARKET','PLATFORM','TRUST','GROWTH']);
const REQUIRED=['Docker Security Gate','Domain Governance','CodeQL'];
const CONSERVATIVE_AFTER='2026-11-21T00:00:00+01:00';
const validSha=s=>typeof s==='string'&&SHA.test(s);
const safeUtc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s));
const positive=n=>Number.isSafeInteger(n)&&n>0;
const fail=code=>{throw Error('GITHUB_MILESTONE_'+code);};

export function milestoneContract(){
  const app=JSON.parse(readFileSync(new URL('../.agents/app.prompt.json',import.meta.url),'utf8'));
  const m=app?.tenPrEfficiencyMilestone;
  if(app?.authority?.type!=='NON_AUTHORIZING_CONTEXT'||app?.skillRegistry!=='.agents/skills/registry.json'||
     m?.schema!=='CAPITAL_AI_TEN_PR_EFFICIENCY_MILESTONE@1'||m.requiredVerifiedMerges!==10||
     m.missingData!=='NOT_PROVEN'||!Array.isArray(m.excludedPullRequests)||
     !m.excludedPullRequests.includes(850)||m.permissionExpansion!==false||m.createsScheduler!==false)
    fail('INVALID_CANONICAL_CONTRACT');
  return m;
}

export function assessPullRequest({pr,checks,ancestry,mainSha,observedAt,threshold,excluded}){
  if(!pr||pr.state!=='closed'||!safeUtc(pr.merged_at)||!safeUtc(pr.created_at)||
     Date.parse(pr.merged_at)<=Date.parse(pr.created_at)||!validSha(pr.merge_commit_sha)||
     !validSha(pr.head?.sha)||pr.base?.ref!=='main'||pr.draft===true||
     !positive(pr.number)||excluded.includes(pr.number))
    return {status:'NOT_PROVEN',reason:'PR_IDENTITY_OR_SCOPE'};
  const mergedAt=Date.parse(pr.merged_at);
  if(mergedAt<=threshold||mergedAt>Date.parse(observedAt)+60000)
    return {status:'NOT_PROVEN',reason:'OWNER_AUTHORIZATION_TIME_OR_FUTURE'};
  const domain=/^\[CAPITAL-AI-(PRODUCT|MARKET|PLATFORM|TRUST|GROWTH)\]/.exec(pr.title||'')?.[1];
  if(!DOMAINS.has(domain))return {status:'NOT_PROVEN',reason:'DOMAIN_NOT_PROVEN'};
  if(!checks||!Array.isArray(checks.check_runs)||checks.total_count>100||
     !ancestry||ancestry.base_commit?.sha?.toLowerCase()!==pr.merge_commit_sha.toLowerCase()||
     !['ahead','identical'].includes(ancestry.status)||ancestry.behind_by!==0||
     ancestry.head_commit?.sha?.toLowerCase()!==mainSha.toLowerCase())
    return {status:'NOT_PROVEN',reason:'CI_OR_MAIN_ANCESTRY_NOT_PROVEN'};
  const bound=checks.check_runs.filter(c=>c.head_sha?.toLowerCase()===pr.head.sha.toLowerCase());
  const selected=REQUIRED.map(name=>bound.filter(c=>c.name===name).sort((a,b)=>
    Date.parse(b.completed_at||'1970-01-01')-Date.parse(a.completed_at||'1970-01-01'))[0]);
  if(selected.some(c=>!c||c.status!=='completed'||c.conclusion!=='success'||!safeUtc(c.completed_at)))
    return {status:'NOT_PROVEN',reason:'REQUIRED_CHECKS_NOT_SUCCESS'};
  const runIds=selected.slice(0,2).map(c=>Number(/\/actions\/runs\/(\d+)/.exec(c.details_url||'')?.[1]));
  if(runIds.some(x=>!positive(x)))return {status:'NOT_PROVEN',reason:'REQUIRED_RUN_ID_NOT_PROVEN'};
  return {status:'VERIFIED',prNumber:pr.number,domain,createdAt:pr.created_at,mergedAt:pr.merged_at,
    leadTimeHours:Math.round((mergedAt-Date.parse(pr.created_at))/36000)/100,
    testedHeadSha:pr.head.sha.toLowerCase(),mainMergeSha:pr.merge_commit_sha.toLowerCase(),
    requiredCheckRunIds:runIds,requiredCheckConclusions:Object.fromEntries(REQUIRED.map(n=>[n,'success'])),
    githubSourceUrls:['https://github.com/'+REPO+'/pull/'+pr.number,
      'https://github.com/'+REPO+'/commit/'+pr.merge_commit_sha,
      ...runIds.map(n=>'https://github.com/'+REPO+'/actions/runs/'+n)]};
}

/** Source-bound live read. Never uses POST, writes, secrets in output, or paid provider calls. */
export async function readTenPrGitHubCounter({fetchImpl=fetch,token,now=()=>Date.now(),maxPages=3}={}){
  const milestone=milestoneContract();
  if(typeof fetchImpl!=='function'||typeof now!=='function'||!positive(maxPages)||maxPages>5||
    (token!==undefined&&(typeof token!=='string'||token.length>4096||/[\r\n]/.test(token))))fail('INVALID_INPUT');
  const observedAt=new Date(now()).toISOString();
  const threshold=Date.parse(CONSERVATIVE_AFTER);
  let requests=0;
  const get=async url=>{
    if(typeof url!=='string'||!(url.startsWith(API+'/')||url.startsWith(SEARCH+'?'))||++requests>1000)
      fail('REQUEST_BUDGET_OR_URL');
    let response;
    try{
      response=await fetchImpl(url,{method:'GET',redirect:'error',headers:{
        Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
        ...(token?{Authorization:'Bearer '+token}:{})}});
    }catch{fail('READ_FAILED');}
    if(!response?.ok||response.status!==200)fail('READ_FAILED_HTTP_'+(response?.status??'UNKNOWN'));
    try{return await response.json();}catch{fail('MALFORMED_JSON');}
  };
  const main=await get(API+'/branches/main');
  const mainSha=main?.commit?.sha;
  if(!validSha(mainSha))fail('MAIN_SHA_NOT_PROVEN');
  const candidates=[];let total=null,complete=false;
  for(let page=1;page<=maxPages;page++){
    const query=encodeURIComponent('repo:'+REPO+' is:pr is:merged merged:>=2026-11-20');
    const search=await get(SEARCH+'?q='+query+'&sort=updated&order=desc&per_page=100&page='+page);
    if(search?.incomplete_results!==false||!Array.isArray(search.items)||
      !Number.isSafeInteger(search.total_count)||search.total_count<0||search.items.length>100||
      (total!==null&&total!==search.total_count))fail('SEARCH_INCOMPLETE');
    total=search.total_count;
    candidates.push(...search.items);
    if(candidates.length>=total){complete=true;break;}
    if(search.items.length!==100)fail('SEARCH_PAGINATION_INCOMPLETE');
  }
  if(!complete)return {schema:'CAPITAL_AI_TEN_PR_GITHUB_EVIDENCE@1',status:'NOT_PROVEN',
    reason:'SEARCH_BUDGET_EXHAUSTED',observedAt,mainSha,verifiedCount:null,
    requiredVerifiedMerges:10,remaining:null,eligible:[],sourceCoverage:'PARTIAL_LIMIT'};
  const seen=new Set(),eligible=[],rejected=[];
  for(const item of candidates){
    const number=item?.number;
    if(!positive(number)||seen.has(number))fail('DUPLICATE_OR_INVALID_PR');
    seen.add(number);
    const pr=await get(API+'/pulls/'+number);
    if(pr?.number!==number||!safeUtc(pr?.merged_at)){
      rejected.push({number,reason:'MERGE_NOT_PROVEN'});continue;
    }
    if(Date.parse(pr.merged_at)<=threshold){
      rejected.push({number,reason:'OWNER_AUTHORIZATION_TIME_OR_FUTURE'});continue;
    }
    if(milestone.excludedPullRequests.includes(number)){
      rejected.push({number,reason:'EXCLUDED_PR'});continue;
    }
    if(!validSha(pr.head?.sha)||!validSha(pr.merge_commit_sha)){
      rejected.push({number,reason:'SHA_NOT_PROVEN'});continue;
    }
    const [checks,ancestry]=await Promise.all([
      get(API+'/commits/'+pr.head.sha+'/check-runs?per_page=100'),
      get(API+'/compare/'+pr.merge_commit_sha+'...'+mainSha)]);
    const outcome=assessPullRequest({pr,checks,ancestry,mainSha,observedAt,threshold,
      excluded:milestone.excludedPullRequests});
    if(outcome.status==='VERIFIED')eligible.push(outcome);
    else rejected.push({number,reason:outcome.reason});
  }
  const readback=await get(API+'/branches/main');
  if(readback?.commit?.sha!==mainSha)fail('MAIN_CHANGED_DURING_READ');
  eligible.sort((a,b)=>a.mergedAt.localeCompare(b.mergedAt)||a.prNumber-b.prNumber);
  return {schema:'CAPITAL_AI_TEN_PR_GITHUB_EVIDENCE@1',source:'GITHUB_REST_GET_ONLY',
    observedAt,mainSha,status:eligible.length>=10?'VERIFIED_THRESHOLD':'IN_PROGRESS',
    cutoffMode:'CONSERVATIVE_END_OF_OWNER_AUTHORIZATION_DAY_EUROPE_BERLIN',
    guaranteedAfter:CONSERVATIVE_AFTER,sourceCoverage:'GITHUB_SEARCH_COMPLETED',
    candidateCount:candidates.length,verifiedCount:eligible.length,requiredVerifiedMerges:10,
    remaining:Math.max(0,10-eligible.length),eligible,rejected,
    publicationAuthorized:false,publication:'NO_AUTOMATIC_PUBLISHING',
    note:'GitHub-only evidence is not live deployment, revenue or publishing authorization'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3||process.argv[2]!=='--live'){
    console.error('Usage: node scripts/ten-pr-github-evidence.mjs --live');process.exitCode=2;
  }else{
    try{console.log(JSON.stringify(await readTenPrGitHubCounter({
      token:process.env.GITHUB_TOKEN||process.env.GH_TOKEN}),null,2));}
    catch(e){console.error(JSON.stringify({status:'NOT_PROVEN',
      reason:e.message?.startsWith('GITHUB_MILESTONE_')?e.message:'GITHUB_MILESTONE_READ_FAILED'}));
      process.exitCode=2;}
  }
}
