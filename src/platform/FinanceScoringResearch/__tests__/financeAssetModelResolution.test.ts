import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveFinanceSourceAssetModel, FINANCE_UAI_SOURCE_VERSION} from '../FinanceSourceAssetModelResolution.ts';
import {FINANCE_PINNED_SOURCE_SHA} from '../../../contracts/financeResearchFeatureBridge.ts';
const sourceCommit=FINANCE_PINNED_SOURCE_SHA;
const now=Date.parse('2026-10-08T12:00:00Z'),ref='evidence://asset-registry/source-target';
const snapshot={
  runId:'source-uai',evaluatedAt:now,horizon:'1d',regime:'baseline',isDemo:false,
  asset:{assetId:'crypto:BTC',symbol:'BTC',name:'Bitcoin',assetClass:'crypto' as const,
    subclass:'layer1_layer2',venue:'BINANCE',currency:'USD',status:'active' as const},
  features:[],rights:[],rawInputReferences:[ref],
};
const request={
  sourceCommit,sourceAsset:{contractVersion:FINANCE_UAI_SOURCE_VERSION,
    assetId:'crypto:BTC',symbol:'BTC',assetClass:'crypto' as const,instrumentKind:null},
  modelId:'crypto-technical-provenance',modelVersion:'0.7.0',targetIdentityEvidenceRef:ref,
};
test('Finance crypto source champion identity is mapped deterministically without authorizing target scoring',()=>{
 const a=resolveFinanceSourceAssetModel({snapshot,request});
 const b=resolveFinanceSourceAssetModel({snapshot,request});
 assert.equal(a.state,'IDENTITY_MAPPED',a.reasons.join(','));
 assert.equal(a.fingerprint,b.fingerprint);
 assert.equal(a.model?.sourceScoreEligible,true);
 assert.equal(a.scoreEligible,false);
 assert.equal(a.dataAdmitted,false);
 assert.equal(a.productionEligible,false);
});
test('Finance stock/forex/commodity/sovereign taxonomy maps with explicit model identity',()=>{
 const pairs=[
  [{...snapshot.asset,assetId:'stock:AAPL',symbol:'AAPL',assetClass:'equity_us' as const},'stock' as const,'traditional-scoring','2.1.0',null],
  [{...snapshot.asset,assetId:'forex:EURUSD',symbol:'EURUSD',assetClass:'forex' as const},'forex' as const,'traditional-scoring','2.1.0',null],
  [{...snapshot.asset,assetId:'commodity:WTI',symbol:'WTI',assetClass:'commodities' as const,subclass:'energy_crude_gas'},'commodity' as const,'commodity-energy-hybrid','0.1.0','commodity-energy-benchmark'],
  [{...snapshot.asset,assetId:'bond:DE10Y',symbol:'DE10Y',assetClass:'fixed_income' as const,subclass:'german_bund'},'bond' as const,'sovereign-benchmark-yield-scoring','1.0.0','government-benchmark-yield'],
 ] as const;
 for (const [target,cls,modelId,modelVersion,kind] of pairs){
   const sourceAsset={contractVersion:FINANCE_UAI_SOURCE_VERSION,assetId:cls+':'+target.symbol,
     symbol:target.symbol,assetClass:cls,instrumentKind:kind};
   const r=resolveFinanceSourceAssetModel({
     snapshot:{...snapshot,asset:target},
     request:{sourceCommit,sourceAsset,modelId,modelVersion,targetIdentityEvidenceRef:ref},
   });
   assert.equal(r.state,'IDENTITY_MAPPED',cls+':'+r.reasons.join(','));
   assert.equal(r.scoreEligible,false);
 }
});
test('index, unsupported bond, agricultural subtype, crypto DeFi category fail closed',()=>{
 const unsupportedIndex=resolveFinanceSourceAssetModel({
  snapshot:{...snapshot,asset:{...snapshot.asset,assetId:'index:SPX',symbol:'SPX',assetClass:'equity_us' as const}},
  request:{...request,sourceAsset:{...request.sourceAsset,assetId:'index:SPX',symbol:'SPX',assetClass:'index' as const},
    modelId:'traditional-scoring',modelVersion:'2.1.0'},
 });
 assert.ok(unsupportedIndex.reasons.includes('FINANCE_TARGET_INDEX_TAXONOMY_UNAVAILABLE'));
 const unsupportedBond=resolveFinanceSourceAssetModel({
  snapshot:{...snapshot,asset:{...snapshot.asset,assetId:'bond:USCREDIT',symbol:'USCREDIT',assetClass:'fixed_income' as const,subclass:'credit_spread'}},
  request:{...request,sourceAsset:{...request.sourceAsset,assetId:'bond:USCREDIT',symbol:'USCREDIT',assetClass:'bond' as const,instrumentKind:'government-benchmark-yield'},
    modelId:'sovereign-benchmark-yield-scoring',modelVersion:'1.0.0'},
 });
 assert.ok(unsupportedBond.reasons.includes('FINANCE_INDIVIDUAL_BOND_SCORING_UNSUPPORTED'));
 const defi=resolveFinanceSourceAssetModel({...{
   snapshot,request:{...request,modelId:'crypto-defi-fundamental',modelVersion:'0.3.0'}},
 });
 assert.ok(defi.reasons.includes('FINANCE_CRYPTO_RESEARCH_SUBCLASS_MISMATCH'));
 const agricultural=resolveFinanceSourceAssetModel({
   snapshot:{...snapshot,asset:{...snapshot.asset,assetId:'commodity:CORN',symbol:'CORN',assetClass:'commodities' as const,subclass:'agriculture'}},
   request:{...request,sourceAsset:{...request.sourceAsset,assetClass:'commodity' as const,assetId:'commodity:CORN',symbol:'CORN',instrumentKind:'commodity-agriculture-benchmark'},
    modelId:'commodity-agriculture-hybrid',modelVersion:'0.1.0'},
 });
 assert.ok(agricultural.reasons.includes('FINANCE_COMMODITY_AGRICULTURE_TARGET_SUBCLASS_UNAVAILABLE'));
});
test('identity evidence, source integrity, instrument and model version are not optional',()=>{
 const a=resolveFinanceSourceAssetModel({snapshot:{...snapshot,rawInputReferences:[]},request});
 assert.ok(a.reasons.includes('FINANCE_TARGET_IDENTITY_EVIDENCE_MISSING'));
 const b=resolveFinanceSourceAssetModel({snapshot,request:{...request,sourceAsset:{...request.sourceAsset,assetId:'stock:BTC'}}});
 assert.ok(b.reasons.includes('FINANCE_SOURCE_UAI_IDENTITY_INVALID'));
 const c=resolveFinanceSourceAssetModel({snapshot,request:{...request,modelVersion:'9.9.9'}});
 assert.ok(c.reasons.includes('FINANCE_SOURCE_MODEL_VERSION_MISMATCH'));
 const d=resolveFinanceSourceAssetModel({snapshot,request:{...request,sourceCommit:'a'.repeat(40) as typeof sourceCommit}});
 assert.equal(d.state,'BLOCKED');
 assert.ok(d.reasons.includes('FINANCE_UAI_SOURCE_REQUEST_INVALID'));
});
