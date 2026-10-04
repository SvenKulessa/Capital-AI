import { OPEN_SOURCE_MARKET_INGRESS } from '../data/openSourceStack';

export type SimulatedPipeline = {
  id: string;
  ingress: string;
  transport: 'nats';
  cache: 'valkey';
  analytics: 'duckdb' | 'clickhouse';
  observability: 'otel-prometheus';
  mode: 'rest' | 'websocket' | 'hybrid';
};

export type PipelineBenchmark = SimulatedPipeline & {
  benchmarkKind: 'DETERMINISTIC_SIMULATION';
  decisionEligible: false;
  cadScore: number;
  simulatedLatencyMs: number;
  simulatedThroughputEventsSec: number;
  recoveryScore: number;
  portabilityScore: number;
  licenseGate: 'PASS_SOFTWARE_LICENSE' | 'REVIEW_DATA_RIGHTS';
  caveat: string;
};

const ingressProfiles: Record<string,{latency:number;throughput:number;recovery:number;portability:number;modes:readonly ('rest'|'websocket'|'hybrid')[]}> = {
  ccxt:{latency:35,throughput:7000,recovery:92,portability:98,modes:['rest','websocket','hybrid']},
  hummingbot:{latency:42,throughput:6000,recovery:94,portability:93,modes:['rest','websocket','hybrid']},
  cryptofeed:{latency:24,throughput:12000,recovery:90,portability:86,modes:['websocket']},
  openbb:{latency:85,throughput:1600,recovery:88,portability:92,modes:['rest','hybrid']},
  'defillama-sdk':{latency:120,throughput:900,recovery:86,portability:95,modes:['rest']},
};

function score(latency:number, throughput:number, recovery:number, portability:number, rightsReview:boolean) {
  const performance=Math.max(0,Math.min(100,100-(latency/2)+(Math.log10(Math.max(10,throughput))*8)));
  const functional=rightsReview?72:90;
  const securityTrust=rightsReview?70:88;
  const maintainability=90;
  const license=rightsReview?65:92;
  const evidence=90;
  return Math.round((securityTrust*25+functional*20+performance*20+recovery*10+maintainability*10+license*5+evidence*5+portability*5)/100);
}

export function getUnbenchmarkedOssIngress(): string[] {
  return OPEN_SOURCE_MARKET_INGRESS.filter(ingress => !ingressProfiles[ingress.id]).map(ingress => ingress.id).sort();
}

export function enumerateLogicalOssPipelines(): SimulatedPipeline[] {
  const pipelines: SimulatedPipeline[]=[];
  for (const ingress of OPEN_SOURCE_MARKET_INGRESS) {
    const profile=ingressProfiles[ingress.id];
    if (!profile) continue;
    for (const mode of profile.modes) {
      for (const analytics of ['duckdb','clickhouse'] as const) {
        pipelines.push({
          id:`oss-${ingress.id}-${mode}-nats-valkey-${analytics}-otel`,
          ingress:ingress.id,
          transport:'nats',
          cache:'valkey',
          analytics,
          observability:'otel-prometheus',
          mode,
        });
      }
    }
  }
  return pipelines;
}

export function runDeterministicOssPipelineBenchmark(): PipelineBenchmark[] {
  return enumerateLogicalOssPipelines().map((pipeline): PipelineBenchmark => {
    const profile=ingressProfiles[pipeline.ingress];
    const analyticsPenalty=pipeline.analytics==='clickhouse'?8:0;
    const analyticsBoost=pipeline.analytics==='clickhouse'?1.22:1;
    const rightsReview=OPEN_SOURCE_MARKET_INGRESS.find(x=>x.id===pipeline.ingress)?.dataRights!=='SOFTWARE_ONLY';
    const simulatedLatencyMs=Math.round((profile.latency+analyticsPenalty)*(pipeline.mode==='hybrid'?1.08:1));
    const simulatedThroughputEventsSec=Math.round(profile.throughput*analyticsBoost*(pipeline.mode==='rest'?0.55:1));
    return {
      ...pipeline,
      benchmarkKind:'DETERMINISTIC_SIMULATION',
      decisionEligible:false,
      cadScore:score(simulatedLatencyMs,simulatedThroughputEventsSec,profile.recovery,profile.portability,rightsReview),
      simulatedLatencyMs,
      simulatedThroughputEventsSec,
      recoveryScore:profile.recovery,
      portabilityScore:profile.portability,
      licenseGate:rightsReview?'REVIEW_DATA_RIGHTS':'PASS_SOFTWARE_LICENSE',
      caveat:'Synthetic architecture comparison only. No live provider, exchange, network, SLA or production performance is asserted.',
    };
  }).sort((a,b)=>b.cadScore-a.cadScore || a.id.localeCompare(b.id));
}
