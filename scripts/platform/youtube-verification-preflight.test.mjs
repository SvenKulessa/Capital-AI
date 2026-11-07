import test from 'node:test';import assert from 'node:assert/strict';import {preflight} from './youtube-verification-preflight.mjs';
const repo='SvenKulessa/Capital-AI';
const opts={artifactId:'123',sha256:'a'.repeat(64),token:'synthetic-github-token',runId:'456'};
function mock(prior=false,foreign=false){return async url=>({ok:true,json:async()=>url.includes('?per_page')?{artifacts:prior?[{name:'youtube-demo-claim-'+opts.sha256}]:[]}:url.includes('/artifacts/')?{name:'youtube-verification-media',expired:false,size_in_bytes:1000,workflow_run:{head_branch:'main',id:789}}:{repository:{full_name:repo},head_repository:{full_name:foreign?'foreign/repo':repo},head_branch:'main',event:'workflow_dispatch',status:'completed',conclusion:'success'}});}
test('trusted same-repo main artifact produces a claim',async()=>{assert.equal((await preflight({...opts,fetchImpl:mock()})).sourceRunId,'789');});
test('previous claim forbids a duplicate insert',async()=>{await assert.rejects(()=>preflight({...opts,fetchImpl:mock(true)}),/PRIOR_UPLOAD_CLAIM/);});
test('foreign source repository is rejected',async()=>{await assert.rejects(()=>preflight({...opts,fetchImpl:mock(false,true)}),/SOURCE_UNTRUSTED/);});
test('input injection is rejected before IO',async()=>{await assert.rejects(()=>preflight({...opts,artifactId:'1\nx=2',fetchImpl:()=>assert.fail()}),/INPUT_INVALID/);});
