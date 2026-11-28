import { test } from 'node:test';
import assert from 'node:assert/strict';
import { probe,validateReceipt,selectRun } from './federated-healthz.mjs';
const id='12345678-1234-4234-8234-123456789abc',sha='a'.repeat(40);
const good=async()=>({httpStatus:200,status:'ok',runtimeIdentity:{sourceSha:sha},runtimeMatchesExpectedMain:true,buildIdentity:{bound:false}});
test('correlated success is HTTP claim, not signed proof',async()=>{
  const p=await probe(id,sha,{read:good});
  assert.equal(p.status,'HTTP_SHA_CLAIM_MATCH_ONLY');
  assert.equal(p.signedRuntimeIdentity,'NOT_PROVEN');
  assert.equal(validateReceipt({...p,secret:'hidden'},id,sha).secret,undefined);
});
test('workflow drift does not invoke probe',async()=>{
  const p=await probe(id,sha,{workflowSha:'b'.repeat(40),read:()=>assert.fail()});
  assert.equal(p.status,'NOT_PROVEN_WORKFLOW_SHA');
});
test('runtime drift and failures do not promote',async()=>{
  assert.equal((await probe(id,sha,{read:async()=>({...await good(),runtimeIdentity:{sourceSha:'b'.repeat(40)}})})).status,'NOT_PROVEN_RUNTIME_SHA_DRIFT');
  const p=await probe(id,sha,{read:async()=>{throw Error('secret');}});
  assert.equal(p.status,'NOT_PROVEN_HEALTH');
  assert.equal(JSON.stringify(p).includes('secret'),false);
});
test('foreign, stale or forged success denied',async()=>{
  const p=await probe(id,sha,{read:good});
  assert.throws(()=>validateReceipt({...p,requestId:'other'},id,sha));
  assert.throws(()=>validateReceipt({...p,observedAt:'2000-01-01'},id,sha));
  assert.throws(()=>validateReceipt({...p,runtimeSha:'b'.repeat(40)},id,sha));
  await assert.rejects(()=>probe('https://evil.test',sha));
});
test('only unique exact run with expected SHA',()=>{
  const run={displayTitle:'healthz-'+id,event:'workflow_dispatch',headSha:sha,databaseId:123};
  assert.equal(selectRun([run],id,sha),run);
  assert.equal(selectRun([{...run,displayTitle:'other'}],id,sha),null);
  assert.throws(()=>selectRun([run,run],id,sha));
  assert.throws(()=>selectRun([{...run,headSha:'b'.repeat(40)}],id,sha));
});
