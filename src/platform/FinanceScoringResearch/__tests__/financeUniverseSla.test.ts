import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
 evaluateUniverseSla,TOP_LEVEL_MINIMUM_AVAILABLE_ASSETS,SUBCATEGORY_TARGET_AVAILABLE_ASSETS,
} from '../UniverseSla.ts';
import { UNIVERSAL_ASSET_CONTRACT_VERSION } from '../FinanceUniversalAssetIdentity.ts';
const assets=Array.from({length:25},(_,i)=>({
 asset:{contractVersion:UNIVERSAL_ASSET_CONTRACT_VERSION,assetId:'stock:ASSET'+i,symbol:'ASSET'+i,
 assetClass:'stock' as const,source:'catalog' as const},
 admitted:true,evidenceSufficient:true,
}));
test('Finance universe SLA deduplicates only evidence-admitted real assets',()=>{
 const result=evaluateUniverseSla([...assets,...assets.slice(0,2)],'stock');
 assert.equal(result.status,'AVAILABLE');
 assert.equal(result.availableCount,25);
 assert.equal(result.availableAssets.length,25);
 assert.equal(result.hardMinimum,false);
 assert.equal(TOP_LEVEL_MINIMUM_AVAILABLE_ASSETS,24);
 assert.equal(SUBCATEGORY_TARGET_AVAILABLE_ASSETS,24);
});
test('underfilled universe never invents filler assets',()=>{
 const result=evaluateUniverseSla([...assets.slice(0,8),
  {...assets[8],admitted:false}], 'stock');
 assert.equal(result.status,'INSUFFICIENT_REAL_UNIVERSE');
 assert.equal(result.availableCount,8);
 assert.equal(result.availableAssets.length,8);
 assert.equal(result.hardMinimum,false);
});
test('provider degradation and insufficient evidence are transparent',()=>{
 const provider=evaluateUniverseSla([{...assets[0],providerDegraded:true}], 'stock');
 assert.equal(provider.status,'PROVIDER_DEGRADED');
 const evidence=evaluateUniverseSla([{...assets[0],evidenceSufficient:false}],'stock');
 assert.equal(evidence.status,'EVIDENCE_INSUFFICIENT');
 assert.equal(evidence.availableCount,0);
});
