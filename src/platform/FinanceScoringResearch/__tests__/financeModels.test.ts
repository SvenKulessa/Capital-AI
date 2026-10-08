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


test('Finance source factor golden vectors preserve original absolute weights and full-input normalization', () => {
  // Synthetic, independently hand-calculated arithmetic vectors; not a historical
  // provider backtest or evidence of production model/source parity.
  const cases = [
    { model:'stock', values: {
      trend:100,momentum:0,breakout_quality:80,volatility_quality:40,
      relative_strength:60,value:70,dividend:50,quality:90,
    }, expected:63.1, weights: {
      trend:0.18,momentum:0.14,breakout_quality:0.10,volatility_quality:0.10,
      relative_strength:0.13,value:0.15,dividend:0.08,quality:0.12,
    }},
    { model:'forex', values: {
      trend:100,momentum:0,breakout_quality:80,volatility_quality:40,relative_strength:60,
    }, expected:57, weights: {
      trend:0.30,momentum:0.25,breakout_quality:0.15,volatility_quality:0.15,
      relative_strength:0.15,
    }},
    { model:'commodity', values: {
      trend:80,momentum:60,breakout_quality:50,volatility_quality:90,
    }, expected:71.5, weights: {
      trend:0.30,momentum:0.25,breakout_quality:0.20,volatility_quality:0.25,
    }},
    { model:'sovereign', values: {
      yield_level_percentile:80,yield_trend:60,yield_stability:40,
    }, expected:64, weights: {
      yield_level_percentile:0.45,yield_trend:0.30,yield_stability:0.25,
    }},
  ] as const;
  for (const c of cases) {
    const actual = composeFinanceResearchFactors({
      assetId:'fixture:'+c.model,
      model:c.model,
      values:{...c.values},
      evidenceRefs:['synthetic://finance/replay-golden'],
      sourceSha:sha,
    });
    assert.deepEqual(actual.nominalWeights,c.weights,c.model);
    assert.equal(actual.status,'RESEARCH_READY',c.model);
    assert.ok(actual.researchCompositeValue !== null && Math.abs(actual.researchCompositeValue-c.expected)<1e-10,
      c.model+' expected '+c.expected+' got '+actual.researchCompositeValue);
    assert.deepEqual(actual.missingFactors,[],c.model);
    assert.equal(actual.scoreEligible,false,c.model);
    assert.equal(actual.rankEligible,false,c.model);
    assert.equal(actual.decisionEligible,false,c.model);
    assert.equal(actual.productionEligible,false,c.model);
  }
});
test('missing source factors renormalize only available weight and preserve distinct fingerprints', () => {
  const base={assetId:'stock:AAPL',model:'stock' as const,sourceSha:sha as typeof sha,
    evidenceRefs:['synthetic://finance/replay-partial']};
  const first=composeFinanceResearchFactors({...base,values:{trend:100,momentum:null,value:0}});
  const reordered=composeFinanceResearchFactors({...base,values:{value:0,trend:100,momentum:null}});
  const whole=composeFinanceResearchFactors({...base,values:{
    trend:100,momentum:0,breakout_quality:0,volatility_quality:0,
    relative_strength:0,value:0,dividend:0,quality:0,
  }});
  assert.equal(first.status,'RESEARCH_PARTIAL');
  assert.ok(first.researchCompositeValue!==null
    && Math.abs(first.researchCompositeValue-(100*0.18/(0.18+0.15)))<1e-10);
  assert.equal(first.effectiveWeightFingerprint,reordered.effectiveWeightFingerprint);
  assert.equal(first.featureFingerprint,reordered.featureFingerprint);
  assert.notEqual(first.effectiveWeightFingerprint,whole.effectiveWeightFingerprint);
  assert.equal(first.scoreEligible,false);
});


test('pinned Finance scoring-golden/1.1.0 stock and forex synthetic reference cases replay in research mode', () => {
  // Source: Finance@dcef421, tests/fixtures/scoringGoldenV1.ts;
  // Git blob cda86ad11bb065813ec56d361e0fc7050dac85b2; synthetic fixtures only.
  const cases = [
    {model:'stock' as const,expected:50,values:{
      trend:50,momentum:50,breakout_quality:50,volatility_quality:50,
      relative_strength:50,value:50,dividend:50,quality:50,
    }},
    {model:'forex' as const,expected:50,values:{
      trend:50,momentum:50,breakout_quality:50,
      volatility_quality:50,relative_strength:50,
    }},
  ];
  for(const entry of cases) {
    const result=composeFinanceResearchFactors({
      assetId:'synthetic:'+entry.model,model:entry.model,values:entry.values,
      evidenceRefs:['synthetic://finance/source-golden'],sourceSha:sha,
    });
    assert.equal(result.status,'RESEARCH_READY');
    assert.equal(Number(result.researchCompositeValue!.toFixed(1)),entry.expected);
    assert.deepEqual(result.missingFactors,[]);
    assert.equal(result.scoreEligible,false);
    assert.equal(result.productionEligible,false);
  }
});
test('Finance source technical-only and no-factor reference semantics remain distinguishable', () => {
  // Source: tests/unit/traditionalAssetScoring.test.ts at
  // blob 8d1469a66097e1af3922515fce94f34c4a095f05.
  // The source returns 0 with NO used factors; target returns null, not evidence of zero.
  const meta={assetId:'synthetic:AAPL',model:'stock' as const,
    sourceSha:sha,evidenceRefs:['synthetic://finance/traditional']};
  const available=composeFinanceResearchFactors({...meta,values:{
    trend:100,momentum:100,breakout_quality:100,
    volatility_quality:100,relative_strength:100,
  }});
  assert.equal(available.status,'RESEARCH_PARTIAL');
  assert.equal(available.researchCompositeValue,100);
  assert.deepEqual(available.missingFactors,['value','dividend','quality']);
  assert.equal(available.scoreEligible,false);
  const absent=composeFinanceResearchFactors({...meta,values:{}});
  assert.equal(absent.status,'RESEARCH_PARTIAL');
  assert.equal(absent.researchCompositeValue,null);
  assert.equal(absent.missingFactors.length,8);
  assert.equal(absent.productionEligible,false);
});
test('source one-decimal score precision is a comparison projection, not a production score', () => {
  // Finance traditionalAssetScoring.ts applies Number(score.toFixed(1)).
  // The target retains more precision only as research context.
  const out=composeFinanceResearchFactors({
    assetId:'synthetic:AAPL',model:'stock',sourceSha:sha,
    evidenceRefs:['synthetic://finance/rounding'],values:{trend:55.555},
  });
  assert.ok(out.researchCompositeValue!==null && Math.abs(out.researchCompositeValue-55.555)<1e-10);
  assert.equal(Number(out.researchCompositeValue!.toFixed(1)),55.6);
  assert.equal(out.status,'RESEARCH_PARTIAL');
  assert.equal(out.productionEligible,false);
});
