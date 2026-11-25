import { createHash } from 'node:crypto';
import { constants, openSync, fstatSync, readSync, closeSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';
import { createViralTemplateDiskCache } from './viral-template-cache.mjs';
import { createViralProductEngine } from './viral-product-drafts.mjs';
import { ContentCampaignBriefSchema, planContentCampaign } from '../../src/contracts/contentEngine.ts';
import { buildDraftContentSocialPackage } from '../../src/contracts/contentSocialPackage.ts';

// The returned engine is scoped to one trusted operator invocation/session.
export function createViralContentEngine(options) {
  const build=createViralProductEngine(options);
  return (records,inputs)=>{
    const report=build(records,inputs);
    return {...report,selectedOpportunities:report.selectedOpportunities.map(item=>{
      const contentId='viral-'+createHash('sha256').update(JSON.stringify([item.recordSha256,item.productContextSha256])).digest('hex').slice(0,24);
      const campaign=ContentCampaignBriefSchema.parse({campaignId:contentId,productId:item.productId,sourceSha:item.productSourceSha,canonicalUrl:item.canonicalUrl,locale:'de-DE',objective:item.productBridgeLogic,audience:[item.audience],channels:['X','INSTAGRAM','YOUTUBE'],outputs:['TEXT'],sourceUrls:[item.canonicalUrl]});
      const draft=JSON.stringify(item.generatedAssets);
      const contentPlan=planContentCampaign(campaign);
      const socialPackage=buildDraftContentSocialPackage({campaign,contentId,assets:[{assetId:contentId+'-text',contentId,kind:'TEXT',sha256:createHash('sha256').update(draft).digest('hex'),mimeType:'application/json',evidenceRef:'viral-trend:'+item.recordSha256,sourceSha:item.productSourceSha}]});
      if(contentPlan.publication.publicPublishAllowed||socialPackage.approvals.length||socialPackage.deliveries.length)throw Error('VIRAL_AUTHORITY_VIOLATION');
      return {...item,contentPlan,socialPackage,tiktokDelivery:'INTEGRATION_PENDING',actualMediaAssets:0};
    })};
  };
}

const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const HEX=/^[a-f0-9]{64}$/;
export function projectViralGraphHandoff(report) {
  if(report?.contractVersion!=='CAPITAL_AI_VIRAL_PRODUCT_DRAFT@1'||report.publicationState!=='DRAFT_ONLY'||report.publicPublishAllowed!==false||report.providerCalls!==0||report.additionalCostUsd!==0||report.providerAuthentication!=='NOT_PROVEN'||!Number.isSafeInteger(report.analyzedTrendsCount)||report.analyzedTrendsCount<0||report.analyzedTrendsCount>1000||!['NOT_PROVEN','SOURCE_RECORDED_NOT_AUTHENTICATED'].includes(report.status)||!Array.isArray(report.selectedOpportunities)||report.selectedOpportunities.length>64||report.selectedOpportunities.length>report.analyzedTrendsCount)throw Error('VIRAL_GRAPH_INPUT_INVALID');
  const opportunities=report.selectedOpportunities.map(item=>{
    const draftSha256=item.socialPackage?.assets?.[0]?.sha256;
    if(![item.recordSha256,item.productContextSha256,draftSha256].every(v=>typeof v==='string'&&HEX.test(v))||typeof item.productSourceSha!=='string'||!/^[a-f0-9]{40}$/.test(item.productSourceSha)||!['TikTok','Instagram','X','YouTube'].includes(item.sourcePlatform)||!Number.isInteger(item.correlationScore)||item.correlationScore<70||item.correlationScore>100||item.review!=='REVIEW_REQUIRED'||item.publicPublishAllowed!==false||item.contentPlan?.publication?.publicPublishAllowed!==false||item.socialPackage?.approvals?.length!==0||item.socialPackage?.deliveries?.length!==0)throw Error('VIRAL_GRAPH_OPPORTUNITY_INVALID');
    return {recordSha256:item.recordSha256,productContextSha256:item.productContextSha256,productSourceSha:item.productSourceSha,draftSha256,sourcePlatform:item.sourcePlatform,correlationScore:item.correlationScore,review:'REVIEW_REQUIRED'};
  });
  if(new Set(opportunities.map(x=>x.recordSha256)).size!==opportunities.length)throw Error('VIRAL_GRAPH_DUPLICATE');
  return {contractVersion:'CAPITAL_AI_VIRAL_GRAPH_INPUT@1',status:report.status,analyzedTrendsCount:report.analyzedTrendsCount,opportunities,publicationState:'DRAFT_ONLY',publicPublishAllowed:false,providerCalls:0,additionalCostUsd:0,providerAuthentication:'NOT_PROVEN'};
}
export function readViralJsonFile(path,{ledger=false}={}) {
  if(typeof path!=='string'||!isAbsolute(path))throw Error('VIRAL_FILE_PATH_INVALID');
  let fd;
  try{
    fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const st=fstatSync(fd);
    if(!st.isFile()||st.size<1||st.size>2*1024*1024||(ledger&&(typeof process.getuid!=='function'||st.uid!==process.getuid()||(st.mode&0o777)!==0o600)))throw Error('VIRAL_FILE_INVALID');
    const buf=Buffer.alloc(st.size);let n=0;while(n<buf.length){const k=readSync(fd,buf,n,buf.length-n,null);if(!k)throw Error('VIRAL_FILE_CHANGED');n+=k;}
    const after=fstatSync(fd);if(after.size!==st.size||after.mtimeMs!==st.mtimeMs)throw Error('VIRAL_FILE_CHANGED');
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buf));
  }catch{throw Error('VIRAL_FILE_REJECTED');}finally{if(fd!==undefined)closeSync(fd);}
}
export function runViralOperatorInput(input,ledger,options) {
  if(!exact(input,['records','editorialSignals','engagementRecords'])||!exact(ledger,['asOf','trustedAnalyticsGrants','trustedEditorialGrants','trustedEngagementGrants','productContexts','trustedProductGrants']))throw Error('VIRAL_OPERATOR_ENVELOPE_INVALID');
  return createViralContentEngine(options)(input.records,{...ledger,editorialSignals:input.editorialSignals,engagementRecords:input.engagementRecords});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const args=process.argv.slice(2);
    if(![4,5].includes(args.length)||args[0]!=='--input'||args[2]!=='--ledger'||(args.length===5&&args[4]!=='--graph-handoff'))throw Error('VIRAL_CLI_ARGS');
    const input=readViralJsonFile(args[1]),ledger=readViralJsonFile(args[3],{ledger:true});
    const root=process.env.CAPITAL_AI_VIRAL_CACHE_DIR;
    const persistentCache=root?createViralTemplateDiskCache({root,ownerId:process.env.CAPITAL_AI_RENDER_OWNER_USER_ID,keyHex:process.env.BLUEPRINT_DISK_ENCRYPTION_KEY}):undefined;
    const report=runViralOperatorInput(input,ledger,{persistentCache});
    process.stdout.write(JSON.stringify(args.length===5?projectViralGraphHandoff(report):report)+'\n');
  }catch{process.stderr.write('VIRAL_OPERATOR_INPUT_FAILED\n');process.exitCode=1;}
}
