import { evaluateOpenSourceMarketAdmission } from './open-source-market-policy.mjs';

const DEFAULT_TIMEOUT_MS = 5000;

// Software candidates only. None of these entries is a data-source admission.
export const OSS_PROVIDER_ADAPTERS = Object.freeze({
  ccxt: {
    kind:'sidecar', env:'CCXT_ADAPTER_URL', protocols:['rest','websocket'],
    softwareLicense:'MIT', activationReviewRequired:true,
  },
  hummingbot: {
    kind:'sidecar', env:'HUMMINGBOT_GATEWAY_URL', protocols:['rest','websocket'],
    softwareLicense:'Apache-2.0', activationReviewRequired:true,
  },
  cryptofeed: {
    kind:'sidecar', env:'CRYPTOFEED_ADAPTER_URL', protocols:['websocket'],
    softwareLicense:'AGPL-3.0-or-later', activationReviewRequired:true,
  },
  openbb: {
    kind:'sidecar', env:'OPENBB_API_URL', protocols:['rest'],
    softwareLicense:'Apache-2.0', activationReviewRequired:true,
  },
});

function abortAfter(ms=DEFAULT_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return {signal:controller.signal,done:()=>clearTimeout(timer)};
}

export async function fetchOssAdapterHealth(id,{timeoutMs=DEFAULT_TIMEOUT_MS,admission=null}={}){
  const adapter=OSS_PROVIDER_ADAPTERS[id];
  if(!adapter) return {ok:false,id,reason:'UNKNOWN_ADAPTER'};
  const decision=evaluateOpenSourceMarketAdmission({
    ...admission,
    softwareLicense:admission?.softwareLicense || adapter.softwareLicense,
  });
  if(!decision.eligible) return {ok:false,id,reason:'OPEN_DATA_ADMISSION_REQUIRED',reasons:decision.reasons};
  const base=process.env[adapter.env];
  if(!base) return {ok:false,id,reason:'NOT_CONFIGURED'};
  const {signal,done}=abortAfter(timeoutMs);
  try{
    const target=new URL('/healthz',base).toString();
    const response=await fetch(target,{signal,headers:{accept:'application/json'}});
    return {ok:response.ok,id,status:response.status,configured:true};
  }catch(error){
    return {ok:false,id,configured:true,reason:error?.name==='AbortError'?'TIMEOUT':'UNREACHABLE'};
  }finally{done();}
}

export function getOssAdapterInventory(){
  return Object.entries(OSS_PROVIDER_ADAPTERS).map(([id,adapter])=>({
    id,
    configured:Boolean(adapter.env && process.env[adapter.env]),
    protocols:adapter.protocols,
    softwareLicense:adapter.softwareLicense,
    activationReviewRequired:true,
    openDataAdmissionRequired:true,
  }));
}
