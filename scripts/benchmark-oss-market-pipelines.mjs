import { writeFile } from 'node:fs/promises';
import { runDeterministicOssPipelineBenchmark } from '../src/services/openSourcePipelineSimulation.ts';

const rows=runDeterministicOssPipelineBenchmark();
const payload={
  schemaVersion:1,
  benchmarkId:'OSS-MARKET-PIPELINES-SIM@1',
  scoreProfile:'DATA_PIPELINE@1',
  benchmarkKind:'DETERMINISTIC_SIMULATION',
  generatedAt:new Date().toISOString(),
  decisionEligible:false,
  assumptions:{
    transport:'NATS + JetStream',
    cache:'Valkey',
    observability:'OpenTelemetry + Prometheus',
    note:'Synthetic workload model; live provider measurements and contractual data rights remain separate gates.'
  },
  count:rows.length,
  results:rows
};
await writeFile(new URL('../docs/benchmarks/oss-market-pipelines-sim/results.json', import.meta.url), JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({benchmarkId:payload.benchmarkId,count:rows.length,top:rows.slice(0,5)},null,2));
