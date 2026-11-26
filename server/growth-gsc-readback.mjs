// Owner-only direct GSC aggregate read; reuse the same provider transport and projection as LangGraph.
import {collectGrowthProviderData} from './growth-provider-read.mjs';
const PATH='/api/profile/growth-intelligence/gsc-readback';
const CACHE_MS=300000;
const ERROR_CACHE_MS=30000;
export function createGrowthGscReadback({authorized,env=process.env,fetchImpl=fetch,now=Date.now}={}){
  let cache=null,inflight=null;
  async function load(){
    const timestamp=now();
    if(cache&&timestamp>=cache.at&&timestamp-cache.at<cache.ttl)return cache.value;
    if(inflight)return inflight;
    inflight=(async()=>{
      const data=await collectGrowthProviderData({env:{GROWTH_GSC_READ_ENABLED:env.GROWTH_GSC_READ_ENABLED,
        GROWTH_GSC_READ_TOKEN:env.GROWTH_GSC_READ_TOKEN},fetchImpl,now:()=>timestamp});
      const source=data.growthDataLayer.sources.find(s=>s.source==='GSC');
      const transport=data.transport.find(s=>s.source==='GSC').status;
      const verified=transport==='READ_RESPONSE_RECEIVED'&&source.status==='SOURCE_RECORDED_NOT_AUTHENTICATED';
      const value={schema:'CAPITAL_AI_GROWTH_GSC_READBACK@1',source:'GSC_SEARCH_ANALYTICS_API',
        private:true,readOnly:true,publicPublishAllowed:false,attributionAuthority:'SEPARATE_FROM_GA4_UMAMI_SOCIAL',
        property:'sc-domain:capital-ai.online',observedAt:data.growthDataLayer.asOf,
        status:verified?'PROVIDER_READ_VERIFIED':'NOT_PROVEN',transport,
        period:verified?{startDate:source.startDate,endDate:source.endDate}:null,
        metrics:verified?source.metrics:null,evidenceSha256:verified?source.evidenceSha256:null};
      cache={at:timestamp,ttl:verified?CACHE_MS:ERROR_CACHE_MS,value};
      return value;
    })().finally(()=>{inflight=null;});
    return inflight;
  }
  return {async handle(req,res,url,json){
    if(url.pathname!==PATH)return false;
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('Vary','Cookie');
    if(!await authorized?.(req,res)){json(res,404,{error:'not_found'});return true;}
    if(req.method!=='GET'){res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true;}
    if(url.search){json(res,400,{error:'unexpected_query'});return true;}
    try{json(res,200,await load());}
    catch{json(res,503,{status:'NOT_PROVEN',reason:'GSC_READBACK_UNAVAILABLE'});}
    return true;
  }};
}
