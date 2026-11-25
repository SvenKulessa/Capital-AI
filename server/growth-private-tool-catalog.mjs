// Owner-only discovery, public topic queries, existing encrypted archive format.
import {createHash} from 'node:crypto';
import {discoverGrowthTools} from './tool-update-discovery.mjs';
import {createGrowthEvidenceArchive} from './growth-owner-evidence-archive.mjs';
export const DOMAIN_TOPICS=Object.freeze({PRODUCT:['accessibility','content-generation','mcp-server'],MARKET:['finance','data-analysis','mcp-server'],PLATFORM:['developer-tools','observability','mcp-server'],TRUST:['security','testing','mcp-server'],GROWTH:['analytics','advertising','seo','tag-manager','mcp-server']});
const PATH='/api/internal/growth-tool-candidates';
const domainOk=v=>typeof v==='string'&&Object.hasOwn(DOMAIN_TOPICS,v);
const repoOk=v=>typeof v==='string'&&v.length<=110&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v);
const idFor=v=>'tool-'+createHash('sha256').update(v.toLowerCase()).digest('hex').slice(0,48);
const allowedLicenses=new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','MPL-2.0']);
export function mergeToolCandidates(previous,radar,domain){
  if(!domainOk(domain)||!Array.isArray(previous)||previous.length>100||radar?.schema!=='CAPITAL_AI_GROWTH_TOOL_RADAR@1'||radar.metadataOnly!==true||radar.automaticInstall!==false||radar.publicPublishAllowed!==false||radar.paidProviderCalls!==0||!Array.isArray(radar.candidates)||radar.candidates.length>40||!Array.isArray(radar.topics)||!radar.topics.every(t=>DOMAIN_TOPICS[domain].includes(t.topic)))throw Error('INVALID_RADAR');
  const observedAt=radar.observedAt;
  if(typeof observedAt!=='string'||!Number.isFinite(Date.parse(observedAt))||new Date(observedAt).toISOString()!==observedAt)throw Error('INVALID_RADAR_TIME');
  const rows=new Map(previous.map(r=>[r.id,r]));
  if(rows.size!==previous.length)throw Error('INVALID_PREVIOUS');
  for(const c of radar.candidates){
    if(!repoOk(c?.repository)||!DOMAIN_TOPICS[domain].includes(c.topic)||c.installAllowed!==false||c.activationAllowed!==false||c.commercialRights!=='NOT_PROVEN'||c.outputRights!=='NOT_PROVEN')throw Error('INVALID_CANDIDATE');
    const id=idFor(c.repository),license=allowedLicenses.has(c.declaredLicense)?c.declaredLicense:'NOT_PROVEN';
    const row={id,name:c.repository,domain,priority:'P2',status:'NOT_PROVEN',endpoint:'https://github.com/'+c.repository,auth:'Metadata only; runtime NOT_PROVEN',flow:'Official GitHub repository metadata; topic '+c.topic,tests:'NOT_PROVEN',error:'',dependencies:'Alternatives: compare existing catalog; NOT_PROVEN',approvals:'Commercial / redistribution / output rights NOT_PROVEN; cost NOT_PROVEN',operation:'Version / exact artifact NOT_PROVEN; declared license '+license,next:'Review exact revision, license, security, costs and data rights before use',evidence:'Observed '+observedAt,origin:'OWNER_NOTE'};
    if(rows.has(id)&&rows.get(id).evidence>row.evidence)continue;
    if(!rows.has(id)&&rows.size>=100)throw Error('CATALOG_CAPACITY');
    rows.set(id,row);
  }
  return [...rows.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
export async function discoverPrivateDomain(domain,{fetchImpl=fetch,now=Date.now}={}){
  if(!domainOk(domain))throw Error('INVALID_DOMAIN');
  return discoverGrowthTools({topics:DOMAIN_TOPICS[domain],fetchImpl,now});
}
async function readDomain(req){
  if(req.headers['content-type']!=='application/json')throw Error('INVALID_CONTENT_TYPE');
  const chunks=[];let size=0;
  for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>128)throw Error('BODY_LIMIT');chunks.push(b);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!v||Object.keys(v).length!==1||!domainOk(v.domain))throw Error('INVALID_DOMAIN');return v.domain;
}
export function createPrivateToolCatalogApi({authorized,auth,env=process.env,fetchImpl=fetch,now=Date.now,archive}={}){
  // Separate catalog snapshots on the existing private disk; never overwrite evidence-history.
  const store=archive??createGrowthEvidenceArchive({root:'/var/data/capital-ai-growth-tool-evidence',ownerId:env.CAPITAL_AI_RENDER_OWNER_USER_ID,keyHex:env.BLUEPRINT_DISK_ENCRYPTION_KEY});
  const storageReady=()=>env.CAPITAL_AI_GROWTH_EVIDENCE_ARCHIVE_ENABLED==='true'&&env.CAPITAL_AI_GROWTH_EVIDENCE_RECOVERY_VERIFIED==='true'&&store.configured();
  let busy=false;
  async function latest(){
    const entries=await store.list();
    if(!entries.length)return {version:0,rows:[]};
    const newest=[...entries].sort((a,b)=>b.version-a.version)[0];
    const data=JSON.parse((await store.read(newest.id)).toString('utf8'));
    return data.snapshots.at(-1);
  }
  return {async handle(req,res,url,json){
    if(url.pathname!==PATH)return false;
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
    if(!await authorized?.(req,res)){json(res,404,{error:'not_found'});return true;}
    if(req.method!=='GET'&&req.method!=='POST'){res.setHeader('Allow','GET, POST');json(res,405,{error:'method_not_allowed'});return true;}
    if(req.method==='GET'){
      if(!storageReady()){json(res,200,{schema:'GROWTH_TOOL_DISCOVERY@1',storage:'BLOCKED_RECOVERY',rows:[]});return true;}
      try{json(res,200,{schema:'GROWTH_TOOL_DISCOVERY@1',storage:'AVAILABLE',rows:(await latest()).rows});}catch{json(res,503,{status:'NOT_PROVEN'});}return true;
    }
    if(!auth?.sameOrigin?.(req)){json(res,403,{error:'forbidden_origin'});return true;}
    if(busy){json(res,409,{error:'discovery_busy'});return true;}
    busy=true;
    try{
      const domain=await readDomain(req);
      const radar=await discoverPrivateDomain(domain,{fetchImpl,now});
      const rows=mergeToolCandidates([],radar,domain);
      let storage='BLOCKED_RECOVERY',persisted=false;
      if(storageReady()){
        try{
          const prior=await latest(),merged=mergeToolCandidates(prior.rows,radar,domain);
          if(JSON.stringify(merged)!==JSON.stringify(prior.rows)){
            const snapshot={version:prior.version+1,at:new Date(now()).toISOString(),rows:merged};
            await store.put(Buffer.from(JSON.stringify({schema:'CAPITAL_AI_GROWTH_OWNER_WORKSPACE@1',snapshots:[snapshot]})));
          }
          storage='AVAILABLE';persisted=true;
        }catch{storage='NOT_PROVEN';}
      }
      json(res,200,{schema:'GROWTH_TOOL_DISCOVERY@1',domain,observedAt:radar.observedAt,topics:radar.topics,rows,storage,persisted,pluginDirectory:'NOT_PROVEN_IN_RUNTIME',commercialRights:'NOT_PROVEN',automaticInstall:false});
    }catch{json(res,422,{error:'discovery_rejected'});}finally{busy=false;}
    return true;
  }};
}
