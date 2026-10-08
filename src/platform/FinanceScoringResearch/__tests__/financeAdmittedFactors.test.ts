import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScoringEngineService } from '../../../services/scoringEngine.ts';
import { FINANCE_PINNED_SOURCE_SHA } from '../../../contracts/financeResearchFeatureBridge.ts';
const now=Date.parse('2026-10-08T12:00:00.000Z');
const providerId='governed-provider',ref='evidence://finance/trend';
const permission=(allowed: boolean)=>({allowed,evidenceReference:'license://rights',obligations:[]});
const rights={providerId,applicableEntityAndRegion:'EU business',subscriptionTierAndAddOns:'market api',
 feedsSymbolsAndVenues:['ohlc:AAPL:XNAS'],contractOrPermissionReference:'license://rights',
 validUntil:'2027-10-08T12:00:00.000Z',reviewedAt:'2026-10-07T12:00:00.000Z',
 permissions:{
 internal_analysis:permission(true),scientific_research_tdm:permission(false),
 public_display:permission(false),api_redistribution:permission(false),
 derived_scoring_research:permission(true),cache_retention:permission(true),
 export_resale:permission(false)},scientificResearchTdm:null};
const feature={featureId:'finance.stock.trend',assetId:'stock:AAPL',value:0.8,unit:'normalized-0-1',
 normalizedValue:80,observedAt:now-1000,calculationVersion:'1.0.0',qualityScore:98,
 provenance:{providerId,providerDataset:'ohlc',observedAt:now-1000,receivedAt:now-900,
 publishedAt:now-800,latencyMs:100,isDelayed:false,isDemo:false,sourceReference:ref,
 licenseScope:'public_realtime' as const}};
const snapshot={
 runId:'source-factor-mapping-test',evaluatedAt:now,horizon:'1d',regime:'baseline',
 isDemo:false,asset:{assetId:'stock:AAPL',symbol:'AAPL',name:'Apple Inc.',
 assetClass:'equity_us' as const,venue:'XNAS',currency:'USD',status:'active' as const},
 features:[],rights:[rights],rawInputReferences:[ref],
};
const candidate={sourceRepository:'SvenKulessa/Finance' as const,
 sourceCommit:FINANCE_PINNED_SOURCE_SHA,sourceField:'finance.traditional.trend',
 sourceEvidenceRef:ref,feature};
const input={snapshot,model:'stock' as const,candidates:[candidate],
 bindings:[{factor:'trend',sourceField:'finance.traditional.trend'}]};
test('a matched Finance factor is composable only from Capital-AI admitted evidence',()=>{
 const out=ScoringEngineService.inspectFinanceResearchFactors(input);
 assert.equal(out.state,'RESEARCH_FACTORS_EVALUATED',out.reasons.join(','));
 assert.equal(out.research?.researchCompositeValue,80);
 assert.equal(out.research?.status,'RESEARCH_PARTIAL');
 assert.equal(out.research?.missingFactors.length,7);
 assert.equal(out.scoreEligible,false);
 assert.equal(out.productionEligible,false);
 const repeated=ScoringEngineService.inspectFinanceResearchFactors(input);
 assert.equal(out.research?.effectiveWeightFingerprint,repeated.research?.effectiveWeightFingerprint);
});
test('missing rights, mismatched asset, duplicate or synthetic factor are blocked',()=>{
 const denied=ScoringEngineService.inspectFinanceResearchFactors({...input,snapshot:{...snapshot,rights:[]}});
 assert.equal(denied.state,'BLOCKED');
 assert.ok(denied.reasons.includes('PROVIDER_RIGHTS_MISSING'));
 const mismatched=ScoringEngineService.inspectFinanceResearchFactors({...input,model:'forex'});
 assert.ok(mismatched.reasons.includes('FINANCE_ASSET_CLASS_MODEL_MISMATCH'));
 const unknown=ScoringEngineService.inspectFinanceResearchFactors({...input,bindings:[{factor:'invented',sourceField: candidate.sourceField}]});
 assert.ok(unknown.reasons.includes('FINANCE_FACTOR_NOT_IN_SOURCE_WEIGHTS'));
 const duplicate=ScoringEngineService.inspectFinanceResearchFactors({...input,bindings:[...input.bindings,...input.bindings]});
 assert.ok(duplicate.reasons.includes('FINANCE_DUPLICATE_FACTOR_BINDING'));
});
test('fixed income requires a supported sovereign instrument; index has no direct target class',()=>{
 const sovereign=ScoringEngineService.inspectFinanceResearchFactors({...input,model:'sovereign'});
 assert.ok(sovereign.reasons.includes('FINANCE_ASSET_CLASS_MODEL_MISMATCH'));
 const index=ScoringEngineService.inspectFinanceResearchFactors({...input,model:'index'});
 assert.ok(index.reasons.includes('FINANCE_ASSET_CLASS_MODEL_MISMATCH'));
});
