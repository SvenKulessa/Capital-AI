import { performance } from 'node:perf_hooks';
import { ScoringEngineService } from '../src/services/scoringEngine.ts';
import { ExplicitDemoAdapter } from '../src/contracts/__tests__/fixtures/demoAdapter.ts';
import { FeatureStoreService } from '../src/contracts/__tests__/fixtures/demoFeatureStore.ts';

const CLASSES = ['crypto','equity_us','equity_eu','commodities','forex','fixed_income'];
if (process.env.CAPITAL_AI_BENCHMARK_ENV !== 'isolated-nonproduction') {
  throw new Error('CAPACITY_BENCHMARK_REQUIRES_ISOLATED_NONPRODUCTION');
}

const adapter = new ExplicitDemoAdapter();
const featureStore = new FeatureStoreService();

function percentile(values, p) {
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1, Math.floor((sorted.length-1)*p))] || 0;
}

function asset(assetClass, index) {
  const prefix=assetClass.replace(/[^a-z]/g,'').slice(0,6).toUpperCase();
  return {
    assetId: `bench_${assetClass}_${index}`,
    symbol: `${prefix}${String(index).padStart(3,'0')}`,
    name: `Synthetic ${assetClass} ${index}`,
    assetClass,
    venue: 'SANDBOX',
    currency: assetClass === 'equity_eu' ? 'EUR' : 'USD',
    status: 'active',
  };
}

async function scoreOne(assetValue) {
  const started=performance.now();
  const observation=await adapter.fetchObservation(assetValue);
  const features=featureStore.extractFeatures({ asset:assetValue, observation });
  const result=await ScoringEngineService.computeFinalScore(assetValue, features, true);
  if (typeof result.finalScore !== 'number' || result.resultStatus !== 'demo_fallback' || result.isDemo !== true) {
    throw new Error('SYNTHETIC_SCORE_NOT_COMPUTED:' + assetValue.assetId);
  }
  if (result.scoreEligible !== false || result.dataAvailability !== 'simulated') {
    throw new Error('SYNTHETIC_CAPACITY_MUST_NOT_BECOME_PRODUCTION_ELIGIBLE');
  }
  return { assetClass:assetValue.assetClass, durationMs:performance.now()-started };
}

const assets=CLASSES.flatMap(assetClass=>Array.from({length:100},(_,i)=>asset(assetClass,i+1)));
const wallStarted=performance.now();
const settled=await Promise.allSettled(assets.map(scoreOne));
const wallMs=performance.now()-wallStarted;

const rows=CLASSES.map(assetClass=>{
  const indexes=assets.map((a,i)=>a.assetClass===assetClass?i:-1).filter(i=>i>=0);
  const durations=indexes.flatMap(i=>settled[i].status==='fulfilled'?[settled[i].value.durationMs]:[]);
  const failed=indexes.length-durations.length;
  return {
    assetClass,
    concurrent:100,
    attempted:indexes.length,
    succeeded:durations.length,
    failed,
    scoreEngine: failed===0 ? 'PASS' : 'FAIL',
    productionEligibility:'CAPACITY_ONLY',
    dataRights:'SANDBOX_DEMO_ONLY',
    p50Ms:+percentile(durations,.50).toFixed(3),
    p95Ms:+percentile(durations,.95).toFixed(3),
    maxMs:+Math.max(0,...durations).toFixed(3),
  };
});

const evidence={
  schema:'CAPITAL_AI_SCORING_CAPACITY@1',
  scope:'ENGINE_CAPACITY_ONLY',
  synthetic:true,
  productionEligible:false,
  externalProviderRequests:false,
  totalConcurrent:assets.length,
  attempted:assets.length,
  succeeded:settled.filter(x=>x.status==='fulfilled').length,
  failed:settled.filter(x=>x.status==='rejected').length,
  wallMs:+wallMs.toFixed(3),
  assetClasses:rows,
};

process.stdout.write(JSON.stringify(evidence,null,2)+'\n');
if (evidence.failed || rows.some(r=>r.succeeded<100)) process.exitCode=1;
