import {readFile} from 'node:fs/promises';
const PATH='/api/profile/growth-intelligence/engine-readback';
const artifact=new URL('../evidence/growth-owner-engine-snapshot.json',import.meta.url);
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const count=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function validateEngineSnapshot(v){
  if(v?.schema!=='CAPITAL_AI_OWNER_ENGINE_SNAPSHOT@1'||v.scope!=='BUILD_ARTIFACT_ONLY'||v.private!==true||v.readOnly!==true||v.publicPublishAllowed!==false)
    throw Error('INVALID_ENGINE_SNAPSHOT');
  const m=v.market,c=v.content,g=v.langgraph;
  if(m?.state!=='SOURCE_SNAPSHOT_ONLY'||typeof m.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(m.date)||!count(m.homepage,3)||!count(m.overview,3)||!count(m.archive,10000)||!sha(m.editionSha256)||!sha(m.indexSha256)||
    c?.state!=='DRAFT_ONLY'||!count(c.drafts,100)||!sha(c.sourceSha256)||!sha(c.bundleSha256)||
    g?.state!=='SOURCE_ONLY_RUNTIME_NOT_PROVEN'||!sha(g.sourceSha256))throw Error('INVALID_ENGINE_SNAPSHOT');
  const p=v.productChannels;
  if(p!==undefined&&(p?.state!=='DRAFT_ONLY'||!count(p.products,133)||!count(p.mapped,133)||!count(p.researchQueue,133)||p.mapped+p.researchQueue!==p.products||!sha(p.sourceSha256)||p.liveMetrics!==null))throw Error('INVALID_PRODUCT_CHANNEL_SNAPSHOT');
  const visual=v.visualIntelligence;
  if(visual!==undefined&&(visual?.state!=='DRAFT_ONLY'||visual.actualMediaAssets!==0||visual.publicPublishAllowed!==false||visual.toolRadar!=='SCHEDULED_SOURCE_ONLY'||!Array.isArray(visual.sceneIds)||visual.sceneIds.length>100||new Set(visual.sceneIds).size!==visual.sceneIds.length||visual.sceneIds.some(id=>typeof id!=='string'||!/^CAP-GROW-[0-9]{3}$/.test(id))))throw Error('INVALID_VISUAL_SNAPSHOT');
  return {schema:v.schema,scope:v.scope,private:true,readOnly:true,publicPublishAllowed:false,
    ...(visual===undefined?{}:{visualIntelligence:{state:'DRAFT_ONLY',sceneIds:visual.sceneIds,actualMediaAssets:0,publicPublishAllowed:false,toolRadar:'SCHEDULED_SOURCE_ONLY'}}),
    ...(p===undefined?{}:{productChannels:{state:p.state,products:p.products,mapped:p.mapped,researchQueue:p.researchQueue,sourceSha256:p.sourceSha256,liveMetrics:null}}),
    market:{state:m.state,date:m.date,homepage:m.homepage,overview:m.overview,archive:m.archive,editionSha256:m.editionSha256,indexSha256:m.indexSha256},
    content:{state:c.state,drafts:c.drafts,sourceSha256:c.sourceSha256,bundleSha256:c.bundleSha256},
    langgraph:{state:g.state,sourceSha256:g.sourceSha256}};
}
export function createGrowthEngineReadback({authorized,load=()=>readFile(artifact)}={}){
  return {async handle(req,res,url,json){
    if(url.pathname!==PATH)return false;
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
    if(!await authorized?.(req,res)){json(res,404,{error:'not_found'});return true;}
    if(req.method!=='GET'){res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true;}
    try{const raw=await load();if(!Buffer.isBuffer(raw)||raw.length>16384)throw Error('INVALID_ARTIFACT');json(res,200,validateEngineSnapshot(JSON.parse(raw)));}
    catch{json(res,503,{status:'NOT_PROVEN',reason:'ENGINE_SNAPSHOT_UNAVAILABLE'});}
    return true;
  }};
}

const CONVERSION_PATH='/api/profile/growth-intelligence/conversion-readback';
const conversionKeys=['status','candidateRegistrations','candidatePaidSubscriptions','candidateInitialInvoiceCents','registrations','paidSubscriptions','revenueCents'];
function conversionGraphInput(raw,start,end){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length!==conversionKeys.length||
    !conversionKeys.every(k=>Object.hasOwn(raw,k))||raw.status!=='RECORDED_CANDIDATES_ONLY'||
    raw.registrations!==null||raw.paidSubscriptions!==null||raw.revenueCents!==null)throw Error('INVALID_CONVERSION_PROJECTION');
  const reg=raw.candidateRegistrations,paid=raw.candidatePaidSubscriptions,cents=raw.candidateInitialInvoiceCents;
  const valid=(n,max)=>n===null||(Number.isSafeInteger(n)&&n>=1&&n<=max);
  if(!valid(reg,1000)||!valid(paid,1000)||!valid(cents,100000000000)||
    (paid===null)!==(cents===null)||(paid!==null&&(reg===null||paid>reg||cents<paid)))throw Error('INVALID_CONVERSION_COUNTS');
  return {contractVersion:'CAPITAL_AI_X_CONVERSION_CANDIDATES@1',campaignId:'capital-ai-growth-20261120',contentId:'CAP-GROW-005',
    start,end,asOf:end,status:'SOURCE_RECORDED_NOT_AUTHENTICATED',candidateRegistrations:reg,
    candidatePaidSubscribers:paid,candidateInitialInvoiceCents:cents,registrations:null,paidSubscriptions:null,revenueCents:null,
    providerAuthentication:'NOT_PROVEN',publicPublishAllowed:false,costActivationAllowed:false,providerCalls:0,automaticChanges:false};
}
// Only the trusted server may inject the narrow aggregate reader. No production
// DB client, SQL, credentials or provider activation is supplied by this module.
export function createGrowthConversionReadback({env=process.env,authorized,readCandidates,now=Date.now}={}){
  const enabled=env.CAPITAL_AI_GROWTH_CONVERSION_READBACK_ENABLED==='true';
  const recovery=env.CAPITAL_AI_GROWTH_CONVERSION_RECOVERY_VERIFIED==='true';
  return {async handle(req,res,url,json){
    if(url.pathname!==CONVERSION_PATH)return false;
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    let allowed=false;try{allowed=await authorized?.(req,res)===true;}catch{}
    if(!allowed){json(res,404,{error:'not_found'});return true;}
    if(req.method!=='GET'){res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true;}
    if(url.search){json(res,400,{error:'unexpected_query'});return true;}
    if(!enabled||!recovery||typeof readCandidates!=='function'){
      json(res,503,{status:'BLOCKED',reason:'CONVERSION_ACTIVATION_RECOVERY_OR_ADAPTER_NOT_VERIFIED'});return true;
    }
    try{
      const asOf=now(),end=new Date(asOf).toISOString(),start=new Date(asOf-7*86400000).toISOString();
      const graphInput=conversionGraphInput(await readCandidates({start,end}),start,end);
      json(res,200,{schema:'CAPITAL_AI_OWNER_CONVERSION_READBACK@1',status:'RECORDED_CANDIDATES_ONLY',private:true,readOnly:true,
        cohort:'NOT_PROVEN',graphExecution:'NOT_PROVEN',graphInput});
    }catch{json(res,503,{status:'NOT_PROVEN',reason:'CONVERSION_READBACK_UNAVAILABLE'});}
    return true;
  }};
}
