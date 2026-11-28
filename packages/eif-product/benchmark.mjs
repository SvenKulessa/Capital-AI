import { performance } from 'node:perf_hooks';
import { demo } from './index.mjs';
const n=2000;
for(let i=0;i<200;i++)demo();
const cpu=process.cpuUsage(),rss=process.memoryUsage().rss,t=performance.now(),samples=[];
for(let i=0;i<n;i++){const s=performance.now();demo();samples.push(performance.now()-s);}
const elapsed=performance.now()-t,used=process.cpuUsage(cpu);samples.sort((a,b)=>a-b);
console.log(JSON.stringify({schema:'CAPITAL_AI_EIF_LOCAL_MEASUREMENTS@1',node:process.version,platform:process.platform,arch:process.arch,workload:'synthetic demo (4 scoring runs and comparison)',iterations:n,warmup:200,elapsedMs:elapsed,p50Ms:samples[Math.floor((n-1)*.5)],p95Ms:samples[Math.floor((n-1)*.95)],cpuSeconds:(used.user+used.system)/1e6,rssBeforeBytes:rss,rssAfterBytes:process.memoryUsage().rss,maxRssKiB:process.resourceUsage().maxRSS,externalProviderCalls:0,incrementalProviderChargesEur:0,fullyLoadedUnitCostEur:null,customerRevenueEur:null,customerMarginEur:null},null,2));
