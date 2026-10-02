import { performance } from 'node:perf_hooks';
import { createClient } from 'redis';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager, StorageType, DiscardPolicy } from '@nats-io/jetstream';

if (process.env.CAPITAL_AI_BENCHMARK_ENV !== 'isolated-nonproduction') {
  throw new Error('BENCHMARK_REQUIRES_ISOLATED_NONPRODUCTION_ENV');
}

const iterations = Math.max(100, Math.min(Number(process.env.BENCHMARK_ITERATIONS || 2000), 100000));
const payloadBytes = Math.max(256, Math.min(Number(process.env.BENCHMARK_PAYLOAD_BYTES || 1024), 262144));
const payload = JSON.stringify({ schema:'CAPITAL_AI_SYNTHETIC_BENCHMARK@1', symbol:'SYNTH-001', value:'x'.repeat(Math.max(1, payloadBytes - 100)) });

function summarize(samples) {
  const sorted=[...samples].sort((a,b)=>a-b);
  const at=q=>sorted[Math.min(sorted.length-1, Math.floor(sorted.length*q))] ?? 0;
  return { samples: sorted.length, p50Ms:+at(.50).toFixed(3), p95Ms:+at(.95).toFixed(3), p99Ms:+at(.99).toFixed(3), maxMs:+at(1).toFixed(3) };
}

async function benchResp(name,url) {
  if (!url) return {name,state:'NOT_CONFIGURED'};
  const client=createClient({url,disableOfflineQueue:true,socket:{connectTimeout:3000,reconnectStrategy:false}});
  await client.connect();
  const set=[],get=[];
  try {
    for(let i=0;i<iterations;i++){
      const key='capital:bench:'+i;
      let t=performance.now(); await client.set(key,payload,{PX:60000}); set.push(performance.now()-t);
      t=performance.now(); await client.get(key); get.push(performance.now()-t);
    }
    return {name,state:'MEASURED',set:summarize(set),get:summarize(get)};
  } finally {
    await client.quit().catch(()=>client.destroy());
  }
}

async function benchNats(url,token) {
  if (!url) return {name:'NATS',state:'NOT_CONFIGURED'};
  const nc=await connect({servers:url,token,timeout:3000,maxReconnectAttempts:0});
  const core=[],jsSamples=[];
  const stream='CAPITAL_BENCH_'+Date.now();
  const subject='capital.bench.synthetic';
  try {
    for(let i=0;i<iterations;i++){
      const t=performance.now(); nc.publish(subject,payload); await nc.flush(); core.push(performance.now()-t);
    }
    const jsm=await jetstreamManager(nc,{timeout:3000});
    await jsm.streams.add({name:stream,subjects:[subject],storage:StorageType.Memory,num_replicas:1,discard:DiscardPolicy.Old,max_msgs:iterations+10,max_msg_size:262144});
    const js=jetstream(nc,{timeout:3000});
    for(let i=0;i<iterations;i++){
      const t=performance.now(); await js.publish(subject,payload,{msgID:'bench-'+i}); jsSamples.push(performance.now()-t);
    }
    return {name:'NATS',state:'MEASURED',corePublishFlush:summarize(core),jetStreamPubAck:summarize(jsSamples)};
  } finally {
    try { const jsm=await jetstreamManager(nc,{timeout:1000}); await jsm.streams.delete(stream); } catch {}
    await nc.close();
  }
}

const started=Date.now();
const results=[];
results.push(await benchResp('Valkey',process.env.BENCHMARK_VALKEY_URL));
results.push(await benchResp('Redis',process.env.BENCHMARK_REDIS_URL));
results.push(await benchNats(process.env.BENCHMARK_NATS_URL,process.env.BENCHMARK_NATS_TOKEN));
console.log(JSON.stringify({
  schema:'CAPITAL_AI_MARKET_INFRA_BENCHMARK@1',
  syntheticOnly:true,
  environment:'isolated-nonproduction',
  iterations,payloadBytes,
  durationMs:Date.now()-started,
  results,
  note:'No provider market-data API is called. Compare only measurements produced with the same workload and environment.'
},null,2));
