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
  return {schema:v.schema,scope:v.scope,private:true,readOnly:true,publicPublishAllowed:false,
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
