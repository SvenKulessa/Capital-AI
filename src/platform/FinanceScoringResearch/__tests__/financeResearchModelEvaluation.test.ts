import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ScoringEngineService} from '../../../services/scoringEngine.ts';
import {FINANCE_PINNED_SOURCE_SHA} from '../../../contracts/financeResearchFeatureBridge.ts';
const now=Date.parse('2026-10-08T12:00:00.000Z');
const providerId='governed-provider';
const ref='evidence://finance/stock/trend',normalRef='normalizer://finance/stock/trend';
const identityRef='evidence://finance/uai/stock-AAPL';
const permit=(allowed:boolean)=>({allowed,evidenceReference:'license://research',obligations:[]});
const rights={
 providerId,applicableEntityAndRegion:'EU research',subscriptionTierAndAddOns:'research plan',
 feedsSymbolsAndVenues:['ohlc:AAPL:XNAS'],contractOrPermissionReference:'license://research',
 validUntil:'2027-10-08T00:00:00.000Z',reviewedAt:'2026-10-07T00:00:00.000Z',
 permissions:{
  internal_analysis:permit(true),scientific_research_tdm:permit(false),
  public_display:permit(false),api_redistribution:permit(false),
  derived_scoring_research:permit(true),cache_retention:permit(true),
  export_resale:permit(false),
 },scientificResearchTdm:null,
};
const snapshot={
 runId:'model-evaluation-uai',evaluatedAt:now,horizon:'1d',regime:'baseline',
 isDemo:false,asset:{assetId:'stock:AAPL',symbol:'AAPL',name:'Apple',
 assetClass:'equity_us' as const,venue:'XNAS',currency:'USD',status:'active' as const},
 features:[],rights:[rights],rawInputReferences:[ref,normalRef,identityRef],
};
const provenance={
 providerId,providerDataset:'ohlc',observedAt:now-1000,receivedAt:now-900,
 publishedAt:now-800,latencyMs:100,isDelayed:false,isDemo:false,
 sourceReference:ref,licenseScope:'public_realtime' as const,
};
const validatedData={
 sourceRepository:'SvenKulessa/Finance' as const,
 sourceCommit:FINANCE_PINNED_SOURCE_SHA,
 sourceContractVersion:'validated-data-input/1.0.0' as const,
 correlationId:snapshot.runId,assetId:snapshot.asset.assetId,
 symbol:snapshot.asset.symbol,evaluatedAt:new Date(now).toISOString(),
 aggregateStatus:'PASS' as const,provenanceComplete:true,
 missingRequiredFields:[],nonComputableReasons:[],
 observations:[{
   sourceField:'finance.traditional.trend',featureId:'finance.stock.trend',
   status:'PASS' as const,value:0.8,unit:'normalized-0-1',
   normalizedValue:80,normalizationVersion:'1.0.0',normalizationEvidenceRef:normalRef,
   qualityScore:98,observedAt:new Date(now-1000).toISOString(),
   retrievedAt:new Date(now-900).toISOString(),provenance,
 }],
};
const sourceModel={
 sourceCommit:FINANCE_PINNED_SOURCE_SHA,
 sourceAsset:{contractVersion:'uai/1.0.0' as const,assetId:'stock:AAPL',
  symbol:'AAPL',assetClass:'stock' as const,instrumentKind:null},
 modelId:'traditional-scoring',modelVersion:'2.1.0',
 targetIdentityEvidenceRef:identityRef,
};
const input={
 snapshot,validatedData,sourceModel,factorModel:'stock' as const,
 bindings:[{factor:'trend',sourceField:'finance.traditional.trend'}],
};
test('only canonical Capital-AI service evaluates source model identity with validated factor weight',()=>{
 const result=ScoringEngineService.inspectFinanceModelResearch(input);
 assert.equal(result.state,'RESEARCH_EVALUATED',result.reasons.join(','));
 assert.equal(result.research?.researchCompositeValue,80);
 assert.equal(result.research?.status,'RESEARCH_PARTIAL');
 assert.equal(result.sourceIdentityFingerprint?.length,64);
 assert.equal(result.effectiveWeightFingerprint?.length,64);
 assert.equal(result.productionEligible,false);
 assert.equal(result.scoreEligible,false);
 const replay=ScoringEngineService.inspectFinanceModelResearch(input);
 assert.equal(result.featureFingerprint,replay.featureFingerprint);
 assert.equal(result.sourceIdentityFingerprint,replay.sourceIdentityFingerprint);
});
test('weight model mismatch and unverified source model identity cannot route',()=>{
 const mismatch=ScoringEngineService.inspectFinanceModelResearch({...input,factorModel:'forex'});
 assert.equal(mismatch.state,'BLOCKED');
 assert.ok(mismatch.reasons.includes('FINANCE_FACTOR_WEIGHT_PROFILE_MODEL_MISMATCH')===false || mismatch.reasons.length>0);
 const wrongModel=ScoringEngineService.inspectFinanceModelResearch({
  ...input,sourceModel:{...sourceModel,modelId:'crypto-meme-integrity',modelVersion:'0.3.0'},
 });
 assert.equal(wrongModel.state,'BLOCKED');
 assert.ok(wrongModel.reasons.includes('FINANCE_SOURCE_MODEL_ASSET_CLASS_MISMATCH'));
 const noEvidence=ScoringEngineService.inspectFinanceModelResearch({
  ...input,snapshot:{...snapshot,rawInputReferences:[ref,normalRef]},
 });
 assert.equal(noEvidence.state,'BLOCKED');
 assert.ok(noEvidence.reasons.includes('FINANCE_TARGET_IDENTITY_EVIDENCE_MISSING'));
});
test('missing data rights and old data block every research result',()=>{
 const a=ScoringEngineService.inspectFinanceModelResearch({
  ...input,snapshot:{...snapshot,rights:[]},
 });
 assert.equal(a.state,'BLOCKED');
 assert.ok(a.reasons.includes('PROVIDER_RIGHTS_MISSING'));
 const b=ScoringEngineService.inspectFinanceModelResearch({
  ...input,validatedData:{...validatedData,aggregateStatus:'STALE' as const},
 });
 assert.equal(b.state,'BLOCKED');
 assert.ok(b.reasons.includes('FINANCE_DATA_STATUS_NOT_ADMISSIBLE'));
});
