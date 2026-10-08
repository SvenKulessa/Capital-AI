import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFinanceResearchForReceipt } from './financeResearchReceiptOrchestrator.ts';
import { FINANCE_PINNED_SOURCE_SHA } from '../contracts/financeResearchFeatureBridge.ts';

const at = Date.parse('2026-10-08T12:00:00.000Z');
function fixture(providerId='kraken') {
  const identityRef='reference://identity';
  const valueRef='reference://value';
  const normRef='reference://normalizer';
  const snapshot={
    runId:'finance-run',evaluatedAt:at,horizon:'daily',regime:'base',
    isDemo:false,
    asset:{assetId:'fx:EURUSD',symbol:'EURUSD',name:'EUR/USD',
      assetClass:'forex' as const,venue:'ECB',currency:'USD',status:'active' as const},
    features:[], rights:[],rawInputReferences:[identityRef,valueRef,normRef],
  };
  const observedAt=at-2000,receivedAt=at-1000;
  const validatedData={
    sourceRepository:'SvenKulessa/Finance' as const,sourceCommit:FINANCE_PINNED_SOURCE_SHA,
    sourceContractVersion:'validated-data-input/1.0.0' as const,
    correlationId:snapshot.runId,assetId:snapshot.asset.assetId,symbol:snapshot.asset.symbol,
    evaluatedAt:new Date(at).toISOString(),aggregateStatus:'PASS' as const,
    provenanceComplete:true,missingRequiredFields:[],nonComputableReasons:[],
    observations:[{
      sourceField:'finance.fx.trend',featureId:'finance.fx.trend',
      status:'PASS' as const,value:0.6,unit:'unit',normalizedValue:60,
      normalizationVersion:'1.0.0',normalizationEvidenceRef:normRef,
      qualityScore:98,observedAt:new Date(observedAt).toISOString(),
      retrievedAt:new Date(receivedAt).toISOString(),
      provenance:{providerId,providerDataset:'daily',observedAt,receivedAt,
        publishedAt:receivedAt+100,latencyMs:receivedAt-observedAt,
        isDelayed:false,isDemo:false,sourceReference:valueRef,
        licenseScope:'public_realtime' as const},
    }],
  };
  const sourceModel={
    sourceCommit:FINANCE_PINNED_SOURCE_SHA,
    sourceAsset:{contractVersion:'uai/1.0.0' as const,assetId:'fx:EURUSD',
      symbol:'EURUSD',assetClass:'forex' as const,instrumentKind:null},
    modelId:'traditional-scoring',modelVersion:'2.1.0',
    targetIdentityEvidenceRef:identityRef,
  };
  return {
    snapshot,validatedData,sourceModel,factorModel:'forex' as const,
    bindings:[{factor:'trend',sourceField:'finance.fx.trend'}],
  };
}

test('private Kraken inputs never call the public research receipt sink',async()=>{
 let writes=0;
 const result=await evaluateFinanceResearchForReceipt(fixture(), async()=>{writes++;},at);
 assert.equal(result.state,'BLOCKED');
 if (result.state === 'BLOCKED') assert.ok(result.reasonCodes.includes('PROVIDER_NOT_ADMITTED'));
 assert.equal(writes,0);
});

test('ECB source obligations block research publication without implementation evidence',async()=>{
 let writes=0;
 const result=await evaluateFinanceResearchForReceipt(fixture('ecb-reference-rates'), async()=>{writes++;},at);
 assert.equal(result.state,'BLOCKED');
 if (result.state === 'BLOCKED') assert.ok(result.reasonCodes.includes('RIGHTS_OBLIGATIONS_UNIMPLEMENTED'));
 assert.equal(writes,0);
});

test('demo and future data cannot reach receipt sink',async()=>{
 let writes=0;
 const sink=async()=>{writes++;};
 const a=await evaluateFinanceResearchForReceipt({
   ...fixture(), snapshot:{...fixture().snapshot,isDemo:true},
 },sink,at);
 const b=await evaluateFinanceResearchForReceipt(fixture(),sink,at-10000);
 assert.equal(a.state,'BLOCKED');
 assert.equal(b.state,'BLOCKED');
 assert.equal(writes,0);
});
