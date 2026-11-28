import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const PATH='/api/profile/growth-intelligence/engine-readback';
const artifact=new URL('../evidence/growth-owner-engine-snapshot.json',import.meta.url);
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const count=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const marketplaceHosts={"stripeDirect":["dashboard.stripe.com","docs.stripe.com","stripe.com"],"gumroad":["gumroad.com"],"githubMarketplace":["github.com","docs.github.com"],"microsoftMarketplace":["partner.microsoft.com","learn.microsoft.com"],"awsMarketplace":["aws.amazon.com","docs.aws.amazon.com"],"googleCloudMarketplace":["console.cloud.google.com","docs.cloud.google.com"],"notionMarketplace":["www.notion.com"],"lemonSqueezy":["www.lemonsqueezy.com","docs.lemonsqueezy.com"],"paddle":["www.paddle.com","developer.paddle.com"],"atlassianMarketplace":["marketplace.atlassian.com","developer.atlassian.com"],"googlePlay":["play.google.com","developers.google.com","support.google.com"],"chromeWebStore":["chrome.google.com","developer.chrome.com"],"googleWorkspaceMarketplace":["workspace.google.com","developers.google.com"],"acode":["acode.app","docs.acode.app"],"website":["capital-ai.online","developers.google.com"],"acti":["openacti.com"],"chatgptApps":["developers.openai.com"],"gptStore":["chatgpt.com","help.openai.com"],"notionConnections":["www.notion.com"],"githubReleases":["github.com","docs.github.com"],"mcpRegistry":["registry.modelcontextprotocol.io","github.com"],"npmRegistry":["www.npmjs.com","docs.npmjs.com"],"pypi":["pypi.org","packaging.python.org"],"ghcr":["ghcr.io","docs.github.com"],"vscodeMarketplace":["marketplace.visualstudio.com","code.visualstudio.com"],"rapidApi":["rapidapi.com","docs.rapidapi.com"],"saasHub":["www.saashub.com"],"g2":["www.g2.com","documentation.g2.com"],"capterra":["www.capterra.com","documentation.g2.com"]};
const automationTypes=new Set(['HUMAN_ONLY_SUBMISSION_REQUIRED','API_SUBMISSION_DOCUMENTED','PORTAL_REVIEW','MCP_DRAFT_AND_PUBLISH_DOCUMENTED','PORTAL_CREATE_API_READ','API_CATALOG_DOCUMENTED','API_LISTING_DOCUMENTED','API_EXISTING_APP_EDITS','API_EXISTING_ITEM_RELEASES','NOT_PROVEN','PACKAGE_PUBLISH_DOCUMENTED','RELEASE_API_DOCUMENTED','CI_PUBLISH_DOCUMENTED']);
const exact=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).sort().join(',')===keys.split(',').sort().join(',');
const distributionModes=new Set(["DIRECT_MARKETPLACE","OWN_CHECKOUT","PACKAGE_DISTRIBUTION","DISCOVERY_ONLY","NO_DIGITAL_COMMERCE","RESTRICTED_OR_UNVERIFIED","UNKNOWN"]);
const distributionKinds=new Set(["WORKFLOW","MCP","PLUGIN","API","CLI","BLUEPRINT","SDK","CONTAINER","MICROSERVICE","SAAS","LEARNING","ANDROID_APP"]);
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function validDistribution(r){return distributionModes.has(r.distributionMode)&&Array.isArray(r.productTypes)&&r.productTypes.length<=8&&new Set(r.productTypes).size===r.productTypes.length&&r.productTypes.every(k=>distributionKinds.has(k))&&typeof r.policyNote==='string'&&r.policyNote.length>0&&r.policyNote.length<=300&&(r.distributionMode==='UNKNOWN'?r.reviewedOn===null&&r.nextReviewOn===null&&r.productTypes.length===0:day(r.reviewedOn)&&day(r.nextReviewOn)&&r.nextReviewOn>=r.reviewedOn&&r.productTypes.length>0);}
function marketplaceUrl(value,id){try{const u=new URL(value);return typeof value==='string'&&value.length<=300&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&marketplaceHosts[id]?.includes(u.hostname);}catch{return false;}}
export function validateMarketplaceCatalog(v){
 if(!exact(v,'schema,state,sourceSha256,catalogSha256,rows,accountAdmission,costAdmission,rightsAdmission,ownerApproval,publicationAllowed,providerCalls,spendCents')||v.schema!=='CAPITAL_AI_MARKETPLACE_CATALOG@2'||v.state!=='DRAFT_ONLY'||!sha(v.sourceSha256)||!sha(v.catalogSha256)||v.accountAdmission!=='NOT_PROVEN'||v.costAdmission!=='NOT_PROVEN'||v.rightsAdmission!=='NOT_PROVEN'||v.ownerApproval!=='NOT_GRANTED'||v.publicationAllowed!==false||v.providerCalls!==0||v.spendCents!==0||!Array.isArray(v.rows)||v.rows.length!==Object.keys(marketplaceHosts).length||new Set(v.rows.map(r=>r?.id)).size!==v.rows.length)throw Error('INVALID_MARKETPLACE_CATALOG');
 for(const r of v.rows){if(!exact(r,'id,url,source,automation,feeNote,feeSource,products,distributionMode,productTypes,reviewedOn,nextReviewOn,policyNote')||!Object.hasOwn(marketplaceHosts,r.id)||!marketplaceUrl(r.url,r.id)||!marketplaceUrl(r.source,r.id)||!validDistribution(r)||!automationTypes.has(r.automation)||(r.id==='saasHub'&&r.automation!=='HUMAN_ONLY_SUBMISSION_REQUIRED')||typeof r.feeNote!=='string'||r.feeNote.length>250||(r.feeSource!==null&&!marketplaceUrl(r.feeSource,r.id))||!Array.isArray(r.products)||r.products.length>133||new Set(r.products).size!==r.products.length||r.products.some(p=>typeof p!=='string'||!(/^[a-z0-9-]{1,80}$/).test(p)))throw Error('INVALID_MARKETPLACE_ROW');}
 if(createHash('sha256').update(JSON.stringify({sourceSha256:v.sourceSha256,rows:v.rows})).digest('hex')!==v.catalogSha256)throw Error('INVALID_MARKETPLACE_DIGEST');
 return v;
}
export function validateEngineSnapshot(v){
  if(v?.schema!=='CAPITAL_AI_OWNER_ENGINE_SNAPSHOT@1'||v.scope!=='BUILD_ARTIFACT_ONLY'||v.private!==true||v.readOnly!==true||v.publicPublishAllowed!==false)
    throw Error('INVALID_ENGINE_SNAPSHOT');
  const m=v.market,c=v.content,g=v.langgraph;
  if(m?.state!=='SOURCE_SNAPSHOT_ONLY'||typeof m.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(m.date)||!count(m.homepage,3)||!count(m.overview,3)||!count(m.archive,10000)||!sha(m.editionSha256)||!sha(m.indexSha256)||
    c?.state!=='DRAFT_ONLY'||!count(c.drafts,100)||!sha(c.sourceSha256)||!sha(c.bundleSha256)||
    g?.state!=='SOURCE_ONLY_RUNTIME_NOT_PROVEN'||!sha(g.sourceSha256))throw Error('INVALID_ENGINE_SNAPSHOT');
  const p=v.productChannels;
  if(p!==undefined&&(p?.state!=='DRAFT_ONLY'||!count(p.products,133)||!count(p.mapped,133)||!count(p.researchQueue,133)||p.mapped+p.researchQueue!==p.products||!sha(p.sourceSha256)||p.liveMetrics!==null))throw Error('INVALID_PRODUCT_CHANNEL_SNAPSHOT');
  const marketplace=v.marketplace===undefined?undefined:validateMarketplaceCatalog(v.marketplace);
  if(marketplace&&(!p||marketplace.sourceSha256!==p.sourceSha256))throw Error('MARKETPLACE_SOURCE_MISMATCH');
  const visual=v.visualIntelligence;
  if(visual!==undefined&&(visual?.state!=='DRAFT_ONLY'||visual.actualMediaAssets!==0||visual.publicPublishAllowed!==false||visual.toolRadar!=='SCHEDULED_SOURCE_ONLY'||!Array.isArray(visual.sceneIds)||visual.sceneIds.length>100||new Set(visual.sceneIds).size!==visual.sceneIds.length||visual.sceneIds.some(id=>typeof id!=='string'||!/^CAP-GROW-[0-9]{3}$/.test(id))))throw Error('INVALID_VISUAL_SNAPSHOT');
  return {schema:v.schema,scope:v.scope,private:true,readOnly:true,publicPublishAllowed:false,
    ...(marketplace===undefined?{}:{marketplace}),
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
    let allowed=false;try{allowed=await authorized?.(req,res)===true;}catch{}
    if(!allowed){json(res,404,{error:'not_found'});return true;}
    if(req.method!=='GET'){res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true;}
    if(url.search){json(res,400,{error:'unexpected_query'});return true;}
    try{const raw=await load();if(!Buffer.isBuffer(raw)||raw.length>32768)throw Error('INVALID_ARTIFACT');json(res,200,validateEngineSnapshot(JSON.parse(raw)));}
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
