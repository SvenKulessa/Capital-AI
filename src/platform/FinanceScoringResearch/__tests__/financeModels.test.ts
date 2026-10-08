import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCE_SOURCE_MODEL_CATALOG, getFinanceSourceModel,
} from '../FinanceSourceModelCatalog.ts';
import {
  composeFinanceResearchFactors, STOCK_SCORING_WEIGHTS, FX_SCORING_WEIGHTS,
  COMMODITY_SOURCE_WEIGHTS, SOVEREIGN_SOURCE_WEIGHTS,
} from '../FinanceFactorWeights.ts';
import { CRYPTO_RESEARCH_MODEL_CONTRACTS } from '../CryptoResearchModelContracts.ts';
import { COMMODITY_RESEARCH_MODEL_CONTRACTS } from '../CommodityResearchModelContracts.ts';
const sha = 'dcef421fe6e350a3a2ade61d0299aad9ecca213c';
test('all ten original Finance model descriptors are inventoried without CAPITAL-AI production authority', () => {
  assert.equal(FINANCE_SOURCE_MODEL_CATALOG.length, 10);
  assert.equal(new Set(FINANCE_SOURCE_MODEL_CATALOG.map(x => x.modelId)).size, 10);
  assert.equal(FINANCE_SOURCE_MODEL_CATALOG.filter(x=>x.sourceScoreEligible).length, 4);
  assert.equal(FINANCE_SOURCE_MODEL_CATALOG.filter(x=>x.lifecycle==='challenger').length,6);
  for(const model of FINANCE_SOURCE_MODEL_CATALOG) {
    assert.equal(model.capitalProductionEligible, false);
    assert.equal(model.capitalScoreEligible, false);
  }
  assert.equal(getFinanceSourceModel('crypto-defi-fundamental')?.evidencePolicy, 'research-only');
  assert.equal(getFinanceSourceModel('sovereign-benchmark-yield-scoring')?.sourceScoreEligible,true);
  assert.equal(getFinanceSourceModel('unknown'),null);
});
test('crypto/commodity source contracts cover six research challenger models', () => {
  assert.equal(CRYPTO_RESEARCH_MODEL_CONTRACTS.length,2);
  assert.equal(COMMODITY_RESEARCH_MODEL_CONTRACTS.length,4);
  assert.ok(COMMODITY_RESEARCH_MODEL_CONTRACTS.every(x=>x.scoreEligible===false));
});
test('traditional, FX, commodity, sovereign weights preserve Finance sums', () => {
  for(const w of [STOCK_SCORING_WEIGHTS,FX_SCORING_WEIGHTS,COMMODITY_SOURCE_WEIGHTS,SOVEREIGN_SOURCE_WEIGHTS]) {
    assert.ok(Math.abs(Object.values(w).reduce((a,b)=>a+b,0)-1)<1e-10);
  }
});
test('source factor normalization is deterministic, partial factors never authorize scores', () => {
 const input = { assetId:'stock:AAPL',model:'stock' as const, values:{
    trend:80,momentum:60,breakout_quality:75,volatility_quality:70,relative_strength:55,
    value:65,dividend:60,quality:90,
  },evidenceRefs:['evidence://a'],sourceSha:sha as typeof sha};
 const a=composeFinanceResearchFactors(input),b=composeFinanceResearchFactors(input);
 assert.equal(a.status,'RESEARCH_READY');
 assert.equal(a.researchCompositeValue,b.researchCompositeValue);
 assert.equal(a.effectiveWeightFingerprint,b.effectiveWeightFingerprint);
 assert.equal(a.scoreEligible,false);
 assert.equal(a.productionEligible,false);
 const partial=composeFinanceResearchFactors({...input,values:{trend:80}});
 assert.equal(partial.status,'RESEARCH_PARTIAL');
 assert.equal(partial.researchCompositeValue,80);
 assert.equal(partial.scoreEligible,false);
});
test('invalid factor data, missing evidence and non-pinned source are rejected', () => {
 const raw={assetId:'stock:AAPL',model:'stock',sourceSha:sha,values:{trend:51},evidenceRefs:['ref://1']};
 assert.throws(()=>composeFinanceResearchFactors({...raw,values:{trend:NaN}} as never));
 assert.throws(()=>composeFinanceResearchFactors({...raw,evidenceRefs:[]} as never));
 assert.throws(()=>composeFinanceResearchFactors({...raw,values:{invented:50}} as never),/FINANCE_UNKNOWN_FACTOR_KEYS/);
 assert.throws(()=>composeFinanceResearchFactors({...raw,sourceSha:'a'.repeat(40)} as never));
});
