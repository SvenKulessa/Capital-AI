// Private, explicit read-only provider transport. No raw provider payload escapes.
const ADS='https://api.ads.openai.com/v1';
const HYPD='https://mcp.hypd.ai/mcp/latest';
const tokenOk=v=>typeof v==='string'&&v.length>=8&&v.length<=8192&&!/[\s\x00-\x1f\x7f]/.test(v);
const fail=()=>{throw Error('READBACK_UNAVAILABLE');};
async function request(fetchImpl,url,token,options={}){
  const response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+token,Accept:'application/json, text/event-stream',...options.headers}});
  if(!response.ok)fail();
  if(response.status===202||response.status===204)return {value:null,headers:response.headers};
  const reader=response.body?.getReader();if(!reader)fail();
  let size=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();fail();}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
  const raw=Buffer.concat(chunks).toString('utf8');
  let value;
  if(response.headers.get('content-type')?.includes('text/event-stream')){
    const events=raw.split(/\r?\n\r?\n/).flatMap(event=>{
      const data=event.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
      return data?[JSON.parse(data)]:[];
    });
    const matches=events.filter(e=>e?.id===options.rpcId);
    if(matches.length!==1)fail();value=matches[0];
  }else value=JSON.parse(raw);
  if(!value||typeof value!=='object'||Array.isArray(value)||value.error)fail();
  return {value,headers:response.headers};
}
async function readAds(env,fetchImpl){
  const token=env.OPENAI_ADS_API_KEY,id=env.GROWTH_OPENAI_ADS_ACCOUNT_ID;
  if(!tokenOk(token)||typeof id!=='string'||!/^adacct_[a-zA-Z0-9_-]{1,100}$/.test(id))return {source:'OPENAI_ADS',status:'AUTH_REQUIRED'};
  const account=(await request(fetchImpl,ADS+'/ad_account',token)).value;
  if(account.id!==id||account.currency_code!=='EUR')return {source:'OPENAI_ADS',status:'IDENTITY_MISMATCH'};
  const campaigns=(await request(fetchImpl,ADS+'/campaigns?limit=20&order=desc',token)).value;
  if(campaigns.object!=='list'||!Array.isArray(campaigns.data)||campaigns.data.length>20||typeof campaigns.has_more!=='boolean')fail();
  return {source:'OPENAI_ADS',status:'READ_RESPONSE_RECEIVED',campaignsReturned:campaigns.data.length,partial:campaigns.has_more};
}
async function readHypd(env,fetchImpl){
  const token=env.GROWTH_HYPD_MCP_ACCESS_TOKEN;
  if(!tokenOk(token))return {source:'HYPD_MCP',status:'AUTH_REQUIRED'};
  let session,version='2025-03-26';
  async function rpc(method,params,id){
    const headers={'Content-Type':'application/json','MCP-Protocol-Version':version,...(session?{'Mcp-Session-Id':session}:{})};
    const r=await request(fetchImpl,HYPD,token,{method:'POST',headers,rpcId:id,body:JSON.stringify({jsonrpc:'2.0',...(id===undefined?{}:{id}),method,params})});
    if(id===undefined){if(r.value!==null)fail();return null;}
    if(r.value?.jsonrpc!=='2.0'||r.value.id!==id||!r.value.result)fail();
    const received=r.headers.get('mcp-session-id');
    if(received){if(!/^[\x21-\x7e]{1,256}$/.test(received)||(session&&session!==received))fail();session=received;}
    return r.value.result;
  }
  const init=await rpc('initialize',{protocolVersion:version,capabilities:{},clientInfo:{name:'capital-ai-private-growth',version:'1.0.0'}},1);
  if(!['2025-03-26','2025-06-18','2025-11-25'].includes(init.protocolVersion)||!init.capabilities?.tools)fail();
  version=init.protocolVersion;
  await rpc('notifications/initialized',{},undefined);
  const listed=await rpc('tools/list',{},2);
  if(!Array.isArray(listed.tools)||listed.tools.length>512)fail();
  // Tool descriptions are untrusted. Only a hard-coded read operation may run.
  const tool=listed.tools.find(t=>t?.name==='gtm_list_containers');
  if(!tool)return {source:'HYPD_MCP',status:'CAPABILITY_NOT_PROVEN',toolsListed:listed.tools.length};
  const result=await rpc('tools/call',{name:'gtm_list_containers',arguments:{}},3);
  const rows=result.structuredContent?.containers;
  if(result.isError===true||!Array.isArray(rows)||rows.length>100)fail();
  const expected=env.GROWTH_HYPD_GTM_PUBLIC_ID;
  if(typeof expected!=='string'||!/^GTM-[A-Z0-9]+$/.test(expected)||!rows.some(r=>r?.public_id===expected))return {source:'HYPD_MCP',status:'IDENTITY_MISMATCH'};
  return {source:'HYPD_MCP',status:'READ_RESPONSE_RECEIVED',containersReturned:rows.length};
}
export async function collectPrivateGrowthProviderStatus({env=process.env,fetchImpl=fetch,now=Date.now}={}){
  const sources=[];
  for(const [source,flag,read] of [['HYPD_MCP','GROWTH_HYPD_READ_ENABLED',readHypd],['OPENAI_ADS','GROWTH_OPENAI_ADS_READ_ENABLED',readAds]]){
    if(env[flag]!=='true'){sources.push({source,status:'DISABLED'});continue;}
    try{sources.push(await read(env,fetchImpl));}catch{sources.push({source,status:'NOT_PROVEN'});}
  }
  return {schema:'CAPITAL_AI_PRIVATE_GROWTH_PROVIDER_STATUS@1',observedAt:new Date(now()).toISOString(),private:true,readOnly:true,publicPublishAllowed:false,sources};
}

const PATH='/api/profile/growth-intelligence/private-provider-status';
export function createPrivateGrowthProviderStatusApi({authorized,env=process.env,fetchImpl=fetch,now=Date.now}={}){
  let pending=null;
  return {async handle(req,res,url,json){
    if(url.pathname!==PATH)return false;
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
    if(!await authorized?.(req,res)){json(res,404,{error:'not_found'});return true;}
    if(req.method!=='GET'){res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true;}
    if(!pending)pending=collectPrivateGrowthProviderStatus({env,fetchImpl,now}).finally(()=>{pending=null;});
    try{json(res,200,await pending);}catch{json(res,503,{status:'NOT_PROVEN'});}
    return true;
  }};
}
