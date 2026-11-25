import test from 'node:test';import assert from 'node:assert/strict';import{diagnoseGateFailure,sanitizeGateLog}from'./gate-diagnosis.mjs';const base={runId:11,attempt:1,headSha:'a'.repeat(40),jobId:22};
test('redacts credentials before evidence leaves runner',()=>{const clean=sanitizeGateLog('Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz123456\nWEBHOOK_SECRET=whsec_1234567890abcdef');assert.equal(clean.includes('ghp_'),false);assert.equal(clean.includes('whsec_'),false);assert.match(clean,/REDACTED/);});
test('security finding is never rerun or bypassed',()=>{const r=diagnoseGateFailure({...base,log:'CRITICAL vulnerability found'});assert.equal(r.classification,'SECURITY_FINDING');assert.equal(r.autoRerunAllowed,false);assert.equal(r.securityGateBypassAllowed,false);});
test('bounded transient retry is admitted once',()=>{const a=diagnoseGateFailure({...base,log:'hosted runner internal server error'});const b=diagnoseGateFailure({...base,attempt:2,log:'hosted runner internal server error'});assert.equal(a.autoRerunAllowed,true);assert.equal(b.autoRerunAllowed,false);assert.equal(a.fingerprint,b.fingerprint);});
test('unknown failures require reproduction',()=>{const r=diagnoseGateFailure({...base,log:'unexpected opaque state'});assert.equal(r.classification,'UNKNOWN_REPRODUCTION_REQUIRED');assert.equal(r.autoRerunAllowed,false);assert.equal(r.repairAuthority,'NONE');});

test('privileged workflow_run checks out trusted main, never an untrusted head',async()=>{
  const {readFileSync}=await import('node:fs');
  const workflow=readFileSync(new URL('../../.github/workflows/auto-loop-gate-diagnosis.yml',import.meta.url),'utf8');
  assert.match(workflow,/ref: main/);
  assert.doesNotMatch(workflow,/ref:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha/);
  assert.match(workflow,/head_repository\.full_name/);
  assert.doesNotMatch(workflow,/enable_debug_logging=true/);
});

test('colored and split credentials are redacted before classification or publication',()=>{
 const esc=String.fromCharCode(27);
 const log=esc+'[31mERROR Authorization: Bearer ghp_abc'+esc+'[0mdefghijklmnopqrstuvwxyz123456\n'+
  'WEBHOOK_SECRET=whsec_1234'+esc+'[32m567890abcdef\n'+esc+']0;untrusted title'+String.fromCharCode(7)+'fatal timeout';
 const clean=sanitizeGateLog(log);
 assert(!clean.includes(esc));assert(!clean.includes('ghp_'));assert(!clean.includes('whsec_'));
 assert(!clean.includes('untrusted title'));assert.match(clean,/REDACTED/);
 const r=diagnoseGateFailure({...base,log});
 assert(!JSON.stringify(r).includes('ghp_'));assert(!JSON.stringify(r).includes('whsec_'));
 assert(r.evidenceLines.every(line=>line.length<=1000));
});
test('workflow accepts escapes only into a private file and cleans it before publication',async()=>{
 const {readFileSync}=await import('node:fs');
 const workflow=readFileSync(new URL('../../.github/workflows/auto-loop-gate-diagnosis.yml',import.meta.url),'utf8');
 assert.match(workflow,/umask 077/);
 assert.match(workflow,/gh api --allow-escape-sequences "[^"]+\/logs" > gate-diagnosis\/raw\.log/);
 assert.equal((workflow.match(/--allow-escape-sequences/g)||[]).length,1);
 assert.match(workflow,/if: always\(\)\n        run: rm -f gate-diagnosis\/raw\.log/);
 assert.match(workflow,/path: gate-diagnosis\/report\.json/);
 assert.doesNotMatch(workflow,/cat gate-diagnosis\/raw\.log/);
});
