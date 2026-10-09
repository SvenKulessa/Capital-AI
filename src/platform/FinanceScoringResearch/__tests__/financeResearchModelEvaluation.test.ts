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
 const mismatch=ScoringEngineService.inspectFinanceModelResearch({...input,factorModel:'commodity'});
 assert.equal(mismatch.state,'BLOCKED');
 assert.ok(mismatch.reasons.includes('FINANCE_FACTOR_WEIGHT_PROFILE_MODEL_MISMATCH'));
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


test('full Finance stock weights replay numerically through the canonical service with value-sensitive evidence', () => {
  // Synthetic input: verifies target numerical composition, NOT upstream real-data parity.
  const samples=[
    ['trend',100],['momentum',0],['breakout_quality',80],['volatility_quality',40],
    ['relative_strength',60],['value',70],['dividend',50],['quality',90],
  ] as const;
  const observations=samples.map(([factor,score])=>({
    ...validatedData.observations[0],
    sourceField:'finance.traditional.'+factor,
    featureId:'finance.stock.'+factor,
    value:score/100,
    normalizedValue:score,
    normalizationEvidenceRef:'normalizer://finance/stock/'+factor,
    provenance:{...provenance,sourceReference:'evidence://finance/stock/'+factor},
  }));
  const bindings=samples.map(([factor])=>({
    factor,sourceField:'finance.traditional.'+factor,
  }));
  const fullInput={
    ...input,
    snapshot:{...snapshot,rawInputReferences:[
      identityRef,
      ...observations.flatMap(obs=>[obs.normalizationEvidenceRef,obs.provenance.sourceReference]),
    ]},
    validatedData:{...validatedData,observations},
    bindings,
  };
  const evaluated=ScoringEngineService.inspectFinanceModelResearch(fullInput);
  assert.equal(evaluated.state,'RESEARCH_EVALUATED',evaluated.reasons.join(','));
  assert.equal(evaluated.research?.status,'RESEARCH_READY');
  assert.ok(evaluated.research?.researchCompositeValue!==null
    && Math.abs(evaluated.research!.researchCompositeValue!-63.1)<1e-10);
  assert.equal(evaluated.researchReplayFingerprint?.length,64);
  assert.equal(evaluated.productionEligible,false);
  assert.equal(evaluated.scoreEligible,false);

  const reordered=ScoringEngineService.inspectFinanceModelResearch({
    ...fullInput,
    bindings:[...bindings].reverse(),
    validatedData:{...fullInput.validatedData,observations:[...observations].reverse()},
  });
  assert.equal(reordered.state,'RESEARCH_EVALUATED',reordered.reasons.join(','));
  assert.equal(evaluated.researchReplayFingerprint,reordered.researchReplayFingerprint);
  assert.equal(evaluated.effectiveWeightFingerprint,reordered.effectiveWeightFingerprint);

  const changed=ScoringEngineService.inspectFinanceModelResearch({
    ...fullInput,
    validatedData:{...fullInput.validatedData,observations:observations.map(obs=>
      obs.sourceField==='finance.traditional.trend'
        ? {...obs,value:0.9,normalizedValue:90} : obs,
    )},
  });
  assert.equal(changed.state,'RESEARCH_EVALUATED',changed.reasons.join(','));
  assert.ok(changed.research?.researchCompositeValue!==null
    && Math.abs(changed.research!.researchCompositeValue!-61.3)<1e-10);
  assert.equal(evaluated.featureFingerprint,changed.featureFingerprint);
  assert.equal(evaluated.effectiveWeightFingerprint,changed.effectiveWeightFingerprint);
  assert.notEqual(evaluated.researchReplayFingerprint,changed.researchReplayFingerprint);

  const denied=ScoringEngineService.inspectFinanceModelResearch({
    ...fullInput,snapshot:{...fullInput.snapshot,rights:[]},
  });
  assert.equal(denied.state,'BLOCKED');
  assert.equal(denied.researchReplayFingerprint,null);
});
