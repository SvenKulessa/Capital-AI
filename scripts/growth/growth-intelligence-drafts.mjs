import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildGrowthIntelligenceContentDrafts, xAcquisitionDraftOverview } from '../../src/contracts/growthIntelligenceContent.ts';

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
    ...(dataInput === undefined ? {} : { growthDataLayer: projectGrowthDataLayer(dataInput) }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args=process.argv.slice(2);
  if(args.length===0) process.stdout.write(JSON.stringify(buildGrowthIntelligenceDraftBundle(), null, 2) + '\n');
  else if(args.length===1 && args[0]==='--read-providers') process.stdout.write(JSON.stringify(await collectGrowthProviderData(),null,2)+'\n');
  else if(args.length===2 && args[0]==='--read-providers' && args[1]==='--graph-handoff')
    process.stdout.write(JSON.stringify(await collectGrowthProviderData({includeDraftBundle:false}))+'\n');
  else throw Error('GROWTH_CLI_ARGUMENT_INVALID');
}
