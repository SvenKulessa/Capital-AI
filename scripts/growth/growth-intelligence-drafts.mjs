import { createHash } from 'node:crypto';
import { readFileSync, readSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildGrowthIntelligenceContentDrafts, xAcquisitionDraftOverview, forecastXAcquisitionBudget, buildXAcquisitionCandidate } from '../../src/contracts/growthIntelligenceContent.ts';

import { buildProductChannelIntelligence } from './product-channel-intelligence.mjs';
import { buildResearchRound, buildSmartcopyPilot } from './product-market-research.mjs';
import { planContentCampaign } from '../../src/contracts/contentEngine.ts';
import { buildDraftContentSocialPackage } from '../../src/contracts/contentSocialPackage.ts';
import { readViralJsonFile } from './viral-content-engine.mjs';


export const GROWTH_INTELLIGENCE_PLAN_PATH =
  'CAPITAL-AI-GROWTH/growth-intelligence/content-plan-v1.json';
const sourceUrl = new URL('../../' + GROWTH_INTELLIGENCE_PLAN_PATH, import.meta.url);

/**
 * Deterministic, provider-free Content/Social package handoff.
 * Build-time draft projection only: no scheduler, provider request or publication.
 */

import {collectGrowthProviderData as collectReadPlane} from '../../server/growth-provider-read.mjs';
export {GROWTH_DATA_LAYER_VERSION,projectGrowthDataLayer,createGrowthProviderReaders} from '../../server/growth-provider-read.mjs';
import {projectGrowthDataLayer} from '../../server/growth-provider-read.mjs';

export async function collectGrowthProviderData({includeDraftBundle=true,...options}={}){
  const result=await collectReadPlane(options);
  return includeDraftBundle?{...result,draftBundle:{...buildGrowthIntelligenceDraftBundle(),growthDataLayer:result.growthDataLayer}}:result;
}

export function buildGrowthIntelligenceDraftBundle(dataInput) {
  const sourceBytes = readFileSync(fileURLToPath(sourceUrl));
  const rawPlan = JSON.parse(sourceBytes.toString('utf8'));
  const drafts = buildGrowthIntelligenceContentDrafts(rawPlan);
  return {
    contractVersion: 'CAPITAL_AI_GROWTH_INTELLIGENCE_DRAFT_BUNDLE@1',
    sourcePath: GROWTH_INTELLIGENCE_PLAN_PATH,
    sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    sourceGeneratedDate: rawPlan.generated_date,
    publicationState: 'DRAFT_ONLY',
    publicPublishAllowed: false,
    providerCalls: 0,
    campaignSpend: 0,
    mediaAssetsProduced: 0,
    providerCandidates: [{
      id: 'legal-data-hunter',
      intendedUse: 'CUSTOMER_FACING_LEGAL_SOURCE_RESEARCH',
      commercialState: 'BLOCKED_ORDER_FORM_REQUIRED',
      termsUrl: 'https://legaldatahunter.com/api-mcp-terms',
      termsEffectiveDate: '2026-08-11',
      reviewedAt: '2026-11-21',
      providerEnabled: false,
    }],
    drafts,
    xAcquisition: xAcquisitionDraftOverview(drafts),
    productToMarket: buildProductChannelIntelligence(),
    ...(dataInput === undefined ? {} : { growthDataLayer: projectGrowthDataLayer(dataInput) }),
  };
}

// Bounded local JSON input; no raw input, credentials or provider error output.
function readXPlanningInput() {
  const limit=16384, bytes=Buffer.alloc(limit+1);
  let length=0;
  while(length<=limit) {
    const count=readSync(0,bytes,length,bytes.length-length,null);
    if(count===0)break;
    length+=count;
    if(length>limit)throw Error('X_ACQUISITION_INPUT_TOO_LARGE');
  }
  try { return JSON.parse(bytes.subarray(0,length).toString('utf8')); }
  catch { throw Error('X_ACQUISITION_INPUT_INVALID'); }
}

export function planXAcquisitionCandidate(input) {
  if(!input || Object.keys(input).length!==2 || !Object.hasOwn(input,'contentId')
    || !Object.hasOwn(input,'editorialBody'))throw Error('X_ACQUISITION_INPUT_INVALID');
  const draft=buildGrowthIntelligenceDraftBundle().drafts.find(d=>d.contentId===input.contentId && d.channel==='X');
  if(!draft)throw Error('X_ACQUISITION_CONTENT_UNKNOWN');
  return buildXAcquisitionCandidate(draft,input.editorialBody);
}


// Operator-local research; trusted review file must be independently supplied.
export function runProductMarketResearch(input, ledger) {
  if (!input || Object.keys(input).length!==1 || !Object.hasOwn(input,'records') ||
      !ledger || Object.keys(ledger).length!==2 || !Object.hasOwn(ledger,'asOf') ||
      !Object.hasOwn(ledger,'reviewGrants')) throw Error('PRODUCT_RESEARCH_ENVELOPE_INVALID');
  const plan=buildProductChannelIntelligence();
  const args={asOf:ledger.asOf,records:input.records,reviewGrants:ledger.reviewGrants};
  const research=buildResearchRound(plan,args);
  const rows=research.accepted.filter(r=>r.productId==='ai-smartcopy');
  const pilot=rows.some(r=>r.kind==='PLATFORM_RULE'&&r.entityId==='acode')&&rows.some(r=>r.kind==='COMPETITOR')
    ? buildSmartcopyPilot(plan,args,{planContentCampaign,buildDraftContentSocialPackage}):null;
  return {research,pilot,publicationState:'DRAFT_ONLY',publicPublishAllowed:false};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args=process.argv.slice(2);
  if(args.length===0) process.stdout.write(JSON.stringify(buildGrowthIntelligenceDraftBundle(), null, 2) + '\n');
  else if(args.length===1 && ['--x-acquisition-forecast','--x-acquisition-candidate'].includes(args[0])) {
    try {
      const input=readXPlanningInput();
      const result=args[0]==='--x-acquisition-forecast'
        ? forecastXAcquisitionBudget(input) : planXAcquisitionCandidate(input);
      process.stdout.write(JSON.stringify(result,null,2)+'\n');
    } catch {
      process.stderr.write('X_ACQUISITION_PLANNING_REJECTED\n');
      process.exitCode=1;
    }
  }
  else if(args.length===3 && args[0]==='--product-research') {
    try {
      const input=readViralJsonFile(args[1],{ledger:true});
      const ledger=readViralJsonFile(args[2],{ledger:true});
      process.stdout.write(JSON.stringify(runProductMarketResearch(input,ledger),null,2)+'\n');
    } catch {
      process.stderr.write('PRODUCT_RESEARCH_REJECTED\n');
      process.exitCode=1;
    }
  }
  else if(args.length===1 && args[0]==='--read-providers') process.stdout.write(JSON.stringify(await collectGrowthProviderData(),null,2)+'\n');
  else if(args.length===2 && args[0]==='--read-providers' && args[1]==='--graph-handoff')
    process.stdout.write(JSON.stringify(await collectGrowthProviderData({includeDraftBundle:false}))+'\n');
  else throw Error('GROWTH_CLI_ARGUMENT_INVALID');
}
