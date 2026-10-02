const DEFAULT_TIMEOUT_MS = 5000;

export const OSS_PROVIDER_ADAPTERS = Object.freeze({
  ccxt: { kind:'sidecar', env:'CCXT_ADAPTER_URL', protocols:['rest','websocket'] },
  hummingbot: { kind:'sidecar', env:'HUMMINGBOT_GATEWAY_URL', protocols:['rest','websocket'] },
  cryptofeed: { kind:'sidecar', env:'CRYPTOFEED_ADAPTER_URL', protocols:['websocket'] },
  openbb: { kind:'sidecar', env:'OPENBB_API_URL', protocols:['rest'] },
  defillama: { kind:'public-rest', baseUrl:'https://api.llama.fi', protocols:['rest'] },
  yfinance: { kind:'sidecar', env:'YFINANCE_ADAPTER_URL', protocols:['rest','websocket'], researchOnly:true },
});

function abortAfter(ms=DEFAULT_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return {signal:controller.signal,done:()=>clearTimeout(timer)};
}

export async function fetchOssAdapterHealth(id,{timeoutMs=DEFAULT_TIMEOUT_MS}={}){
  const adapter=OSS_PROVIDER_ADAPTERS[id];
  if(!adapter) return {ok:false,id,reason:'UNKNOWN_ADAPTER'};
  if(adapter.researchOnly && process.env.NODE_ENV==='production') return {ok:false,id,reason:'RESEARCH_ONLY'};
  const base=adapter.baseUrl || process.env[adapter.env];
  if(!base) return {ok:false,id,reason:'NOT_CONFIGURED'};
  const {signal,done}=abortAfter(timeoutMs);
  try{
    const target=adapter.kind==='public-rest' ? base : new URL('/healthz',base).toString();
    const response=await fetch(target,{signal,headers:{accept:'application/json'}});
    return {ok:response.ok,id,status:response.status,configured:true};
  }catch(error){
    return {ok:false,id,configured:true,reason:error?.name==='AbortError'?'TIMEOUT':'UNREACHABLE'};
  }finally{done();}
}

export function getOssAdapterInventory(){
  return Object.entries(OSS_PROVIDER_ADAPTERS).map(([id,adapter])=>({
    id,
    configured:Boolean(adapter.baseUrl || (adapter.env && process.env[adapter.env])),
    protocols:adapter.protocols,
    researchOnly:Boolean(adapter.researchOnly),
  }));
}
