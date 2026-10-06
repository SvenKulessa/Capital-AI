import assert from 'node:assert/strict';
import test from 'node:test';
import { createBenchmarkStore } from './benchmark-store.mjs';

const env={
  SUPABASE_URL:'https://project.supabase.co',
  SUPABASE_SECRET_KEY:'sb_secret_test_0123456789012345678901234567890123456789',
};

function rpcFetch(calls) {
  return async (url, options) => {
    const target=new URL(String(url));
    calls.push({target,options,body:JSON.parse(String(options.body||'{}'))});
    if (target.pathname.endsWith('/capital_ai_list_benchmark_runs')) return Response.json([]);
    return Response.json({
      id:'11111111-1111-4111-8111-111111111111',
      userId:'00000000-0000-4000-8000-000000000001',
      tier:'starter',
      profileId:'CAPITAL_AI_EVENT_BACKBONE@1',
      repository:'SvenKulessa/Capital-AI',
      commitSha:'a'.repeat(40),
      status:'QUEUED',
      createdAt:'2026-10-06T08:01:24.000Z',
      usage:{measurementStatus:'PENDING'},
    });
  };
}

test('store fails closed without a supported Supabase admin credential',()=>{
  assert.equal(createBenchmarkStore({env:{SUPABASE_URL:'https://project.supabase.co'}}),null);
  assert.equal(createBenchmarkStore({env:{...env,SUPABASE_SECRET_KEY:'anon-key'}}),null);
});

test('create uses service-side RPC and generates the run id itself',async()=>{
  const calls=[];
  const store=createBenchmarkStore({
    env,
    fetchImpl:rpcFetch(calls),
    randomUUIDImpl:()=> '11111111-1111-4111-8111-111111111111',
  });
  const row=await store.create({
    userId:'00000000-0000-4000-8000-000000000001',
    tier:'starter',
    profileId:'CAPITAL_AI_EVENT_BACKBONE@1',
    repository:'SvenKulessa/Capital-AI',
    commitSha:'a'.repeat(40),
  });
  assert.equal(row.status,'QUEUED');
  assert.equal(calls[0].target.pathname,'/rest/v1/rpc/capital_ai_create_benchmark_run');
  assert.equal(calls[0].body._tier,'starter');
  assert.equal(calls[0].body._run_id,'11111111-1111-4111-8111-111111111111');
  assert.equal(calls[0].options.headers.apikey.startsWith('sb_secret_'),true);
  assert.equal('Authorization' in calls[0].options.headers,false);
});

test('list and get remain user-scoped at the RPC boundary',async()=>{
  const calls=[];
  const store=createBenchmarkStore({env,fetchImpl:rpcFetch(calls)});
  const userId='00000000-0000-4000-8000-000000000001';
  await store.getById(userId,'11111111-1111-4111-8111-111111111111');
  await store.list(userId,20);
  assert.equal(calls[0].body._user_id,userId);
  assert.equal(calls[1].body._user_id,userId);
  assert.equal(calls[1].body._limit,20);
});

test('uncalibrated usage can never charge credits',async()=>{
  const calls=[];
  const store=createBenchmarkStore({env,fetchImpl:rpcFetch(calls)});
  await store.recordUsage({
    runId:'11111111-1111-4111-8111-111111111111',
    status:'SUCCEEDED',
    resources:{wallTimeMs:100,cpuTimeMs:80,peakMemoryMiB:64,diskBytesWritten:0,networkBytes:0},
    cost:{computeEur:null,storageEur:null,networkEur:null,totalEur:null,pricingEvidenceRefs:[]},
    credits:{calibrated:false,unitsCharged:999},
  });
  const body=calls[0].body;
  assert.equal(body._credits_calibrated,false);
  assert.equal(body._units_charged,null);
  assert.equal(body._total_eur,null);
});
