// Build-time read-only projection from the existing Market and Content engines.
// No scheduler, materializer, graph execution, provider calls or publishing.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {projectMarketplaceCatalog} from './product-channel-intelligence.mjs';
import {buildGrowthIntelligenceDraftBundle} from './growth-intelligence-drafts.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=path=>readFileSync(new URL('../../'+path,import.meta.url));
const isSha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export function projectOwnerEngineSnapshot({editionBytes,indexBytes,graphBytes,bundle}){
  const edition=JSON.parse(editionBytes),index=JSON.parse(indexBytes);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(edition.date)||!Array.isArray(edition.stories)||edition.stories.length>3||
    index.version!==1||!Array.isArray(index.overview)||index.overview.length>3||!Array.isArray(index.archive)||index.archive.length>10000)
    throw Error('MARKET_SOURCE_INVALID');
  if(bundle?.contractVersion!=='CAPITAL_AI_GROWTH_INTELLIGENCE_DRAFT_BUNDLE@1'||bundle.publicationState!=='DRAFT_ONLY'||
    bundle.publicPublishAllowed!==false||bundle.providerCalls!==0||bundle.campaignSpend!==0||!isSha(bundle.sourceSha256)||
    !Array.isArray(bundle.drafts)||bundle.drafts.length>100||!bundle.drafts.every(d=>Array.isArray(d.socialPackage?.approvals)&&d.socialPackage.approvals.length===0&&Array.isArray(d.socialPackage?.deliveries)&&d.socialPackage.deliveries.length===0))
    throw Error('CONTENT_DRAFT_INVALID');
  if(!Buffer.isBuffer(graphBytes)||graphBytes.length<1||graphBytes.length>262144)throw Error('GRAPH_SOURCE_INVALID');
  const p=bundle.productToMarket;
  if(p?.contractVersion!=='CAPITAL_AI_PRODUCT_CHANNEL_INTELLIGENCE@1'||p.publicationState!=='DRAFT_ONLY'||p.publicPublishAllowed!==false||p.liveSalesAllowed!==false||p.providerCalls!==0||p.campaignSpend!==0||!isSha(p.sourceSha256)||!Array.isArray(p.products)||p.products.length>133||p.products.some(x=>!Array.isArray(x.channels)||!['CANDIDATES_REVIEW_REQUIRED','UNMAPPED_RESEARCH_REQUIRED'].includes(x.researchStatus)||Boolean(x.channels.length)!==(x.researchStatus==='CANDIDATES_REVIEW_REQUIRED')))throw Error('PRODUCT_CHANNEL_SNAPSHOT_INVALID');
  const mapped=p.products.filter(x=>x.researchStatus==='CANDIDATES_REVIEW_REQUIRED').length;
  return {
    schema:'CAPITAL_AI_OWNER_ENGINE_SNAPSHOT@1',scope:'BUILD_ARTIFACT_ONLY',private:true,readOnly:true,publicPublishAllowed:false,
    market:{state:'SOURCE_SNAPSHOT_ONLY',date:edition.date,homepage:edition.stories.length,overview:index.overview.length,archive:index.archive.length,
      editionSha256:sha(editionBytes),indexSha256:sha(indexBytes)},
    content:{state:'DRAFT_ONLY',drafts:bundle.drafts.length,sourceSha256:bundle.sourceSha256,bundleSha256:sha(JSON.stringify(bundle))},
    visualIntelligence:{state:'DRAFT_ONLY',sceneIds:bundle.drafts.filter(d=>d.visualScene?.publicationAllowed===false && d.visualScene?.actualMediaAssets===0).map(d=>d.contentId),actualMediaAssets:0,publicPublishAllowed:false,toolRadar:'SCHEDULED_SOURCE_ONLY'},
    langgraph:{state:'SOURCE_ONLY_RUNTIME_NOT_PROVEN',sourceSha256:sha(graphBytes)},
    marketplace:projectMarketplaceCatalog(p),
    productChannels:{state:'DRAFT_ONLY',products:p.products.length,mapped,researchQueue:p.products.length-mapped,sourceSha256:p.sourceSha256,liveMetrics:null},
  };
}
export function buildOwnerEngineSnapshot(){
  return projectOwnerEngineSnapshot({
    editionBytes:source('src/features/home/homeEditorialEdition.json'),
    indexBytes:source('src/features/analysis/newsLifecycleIndex.json'),
    graphBytes:source('scripts/growth-agent/auto_loop.py'),
    bundle:buildGrowthIntelligenceDraftBundle()
  });
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.stdout.write(JSON.stringify(buildOwnerEngineSnapshot())+'\n');
