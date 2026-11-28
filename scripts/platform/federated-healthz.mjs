// FEDERATED_HEALTHZ@1: no new credentials, provider or runtime authority.
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { readHealth, safeHealthFailure } from '../trust-runtime-readback.mjs';

const REPO = 'SvenKulessa/Capital-AI';
const WORKFLOW = 'google-cloud-admin.yml';
const SHA = /^[a-f0-9]{40}$/;
const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SCHEMA = 'CAPITAL_AI_FEDERATED_HEALTHZ@1';
const valid = (id, sha) => typeof id === 'string' && ID.test(id) &&
  typeof sha === 'string' && SHA.test(sha);
const shaOrNull = v => typeof v === 'string' && SHA.test(v) ? v : null;
const states = new Set(['HTTP_SHA_CLAIM_MATCH_ONLY','NOT_PROVEN_RUNTIME_SHA_DRIFT','NOT_PROVEN_HEALTH','NOT_PROVEN_WORKFLOW_SHA']);
const reasons = new Set(['HTTP_OK','RUNTIME_SHA_DRIFT','HEALTH_UNAVAILABLE','WORKFLOW_SHA_MISMATCH']);
function base(id, sha) {
  if (!valid(id, sha)) throw new Error('INVALID_REQUEST');
  return {schema:SCHEMA,requestId:id,expectedMainSha:sha,observedAt:new Date().toISOString(),
    readOnly:true, signedRuntimeIdentity:'NOT_PROVEN', permissionExpansion:false};
}
export async function probe(id, sha, {read = readHealth, workflowSha = sha} = {}) {
  const receipt = base(id,sha);
  if (workflowSha !== sha) return {...receipt,status:'NOT_PROVEN_WORKFLOW_SHA',
    reason:'WORKFLOW_SHA_MISMATCH',httpStatus:null,runtimeSha:null,buildBound:null};
  try {
    const p = await read({expectedMainSha:sha});
    if (p.httpStatus !== 200 || p.status !== 'ok') throw new Error('HEALTH_UNAVAILABLE');
    const runtimeSha = shaOrNull(p.runtimeIdentity?.sourceSha);
    const match = runtimeSha === sha && p.runtimeMatchesExpectedMain === true;
    return {...receipt,observedAt:new Date().toISOString(),
      status:match?'HTTP_SHA_CLAIM_MATCH_ONLY':'NOT_PROVEN_RUNTIME_SHA_DRIFT',
      reason:match?'HTTP_OK':'RUNTIME_SHA_DRIFT',httpStatus:200,runtimeSha,
      buildBound:typeof p.buildIdentity?.bound === 'boolean'?p.buildIdentity.bound:null};
  } catch (e) {
    // Never return untrusted error text, response bodies, headers or credentials.
    safeHealthFailure(e);
    return {...receipt,status:'NOT_PROVEN_HEALTH',reason:'HEALTH_UNAVAILABLE',
      httpStatus:null,runtimeSha:null,buildBound:null};
  }
}
export function validateReceipt(p,id,sha) {
  if (!valid(id,sha) || p?.schema!==SCHEMA || p.requestId!==id || p.expectedMainSha!==sha ||
      p.readOnly!==true || p.permissionExpansion!==false || p.signedRuntimeIdentity!=='NOT_PROVEN' ||
      !states.has(p.status) || !reasons.has(p.reason) ||
      ![null,200].includes(p.httpStatus) || ![null,true,false].includes(p.buildBound) ||
      (p.runtimeSha!==null && shaOrNull(p.runtimeSha)!==p.runtimeSha) ||
      typeof p.observedAt!=='string' || !Number.isFinite(Date.parse(p.observedAt)) ||
      Math.abs(Date.now()-Date.parse(p.observedAt))>300000 ||
      (p.status==='HTTP_SHA_CLAIM_MATCH_ONLY' &&
        (p.runtimeSha!==sha || p.httpStatus!==200 || p.reason!=='HTTP_OK'))) throw new Error('RECEIPT_DENIED');
  // Allowlisted projection; no arbitrary fields may cross the requester boundary.
  return {...base(id,sha),observedAt:new Date(p.observedAt).toISOString(),
    status:p.status,reason:p.reason,httpStatus:p.httpStatus,runtimeSha:p.runtimeSha,buildBound:p.buildBound};
}
function gh(args) {
  return execFileSync('gh',args,{encoding:'utf8',timeout:15000,maxBuffer:1024*1024,
    stdio:['ignore','pipe','ignore'],env:{...process.env,GH_PROMPT_DISABLED:'1'}});
}
export function selectRun(runs,id,sha) {
  if (!valid(id,sha) || !Array.isArray(runs)) throw new Error('INVALID_RUN_LOOKUP');
  const matches=runs.filter(x=>x.displayTitle==='healthz-'+id && x.event==='workflow_dispatch');
  if(matches.length>1) throw new Error('AMBIGUOUS_RUN');
  if(!matches.length) return null;
  const x=matches[0];
  if(x.headSha!==sha || !Number.isSafeInteger(x.databaseId) || x.databaseId<=0) throw new Error('RUN_BINDING_DENIED');
  return x;
}
async function federated(id,sha) {
  // Caller uses existing gh authorization; no fallback tokens or arbitrary callbacks.
  gh(['workflow','run',WORKFLOW,'-R',REPO,'--ref','main','-f','operation=healthz',
    '-f','request_id='+id,'-f','expected_main_sha='+sha]);
  const until=Date.now()+180000;
  while(Date.now()<until) {
    const runs=JSON.parse(gh(['run','list','-R',REPO,'--workflow',WORKFLOW,
      '--event','workflow_dispatch','--limit','50','--json','databaseId,displayTitle,event,headSha,status,conclusion']));
    const run=selectRun(runs,id,sha);
    if(run?.status==='completed') {
      const dir=mkdtempSync(join(tmpdir(),'cai-healthz-'));
      try {
        gh(['run','download',String(run.databaseId),'-R',REPO,'--name','healthz-'+run.databaseId,'--dir',dir]);
        const p=validateReceipt(JSON.parse(readFileSync(join(dir,'healthz-receipt.json'),'utf8')),id,sha);
        if(p.status==='HTTP_SHA_CLAIM_MATCH_ONLY' && run.conclusion!=='success') throw new Error('RUN_NOT_SUCCESS');
        return {...p,workflowRunId:run.databaseId};
      } finally {rmSync(dir,{recursive:true,force:true});}
    }
    await sleep(5000);
  }
  throw new Error('RUN_PENDING');
}
async function main() {
  const mode=process.argv[2],worker=mode==='worker';
  const id=worker?process.env.HEALTH_REQUEST_ID:randomUUID();
  const sha=worker?process.env.HEALTH_EXPECTED_SHA:process.argv[3];
  if(!valid(id,sha)) throw new Error('INVALID_REQUEST');
  if(worker && (process.env.HEALTH_REPOSITORY_ID!=='1293009324' ||
      process.env.GITHUB_REF!=='refs/heads/main' || process.env.GITHUB_EVENT_NAME!=='workflow_dispatch')) throw new Error('WORKER_SCOPE_DENIED');
  if(!['worker','local','federated'].includes(mode)) throw new Error('INVALID_MODE');
  let p;
  try {p=mode==='federated'?await federated(id,sha):await probe(id,sha,{workflowSha:worker?process.env.GITHUB_SHA:sha});}
  catch {p={...base(id,sha),status:'NOT_PROVEN_TRANSPORT',reason:'DISPATCH_OR_READBACK_UNAVAILABLE'};}
  console.log(JSON.stringify(p));
  if(p.status!=='HTTP_SHA_CLAIM_MATCH_ONLY') process.exitCode=2;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(()=>{console.error('FEDERATED_HEALTHZ_REQUEST_DENIED');process.exitCode=2;});
}
