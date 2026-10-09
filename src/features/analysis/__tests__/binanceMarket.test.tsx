import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { projectCanonicalAssetValue } from '../../../services/marketValuesProjection';
import { appendBinanceQuote, binanceChart, verifiedBinanceQuote } from '../binanceQuoteHistory';
import { BinanceMarketView } from '../BinanceMarketPanel';
const now=1_791_000_000_000;
function quote(offset=0, value=100) {
  return projectCanonicalAssetValue({schema:'CAPITAL_AI_ASSET_VALUE@1',instrumentId:'market:BINANCE:BTCUSDT',
    symbol:'BTCUSDT',value,quoteCurrency:'USDT',observedAt:now+offset,observedAtPrecision:'instant',
    publishedAt:null,referenceDate:null,timeSemantics:'realtime',provider:'binance',venue:'BINANCE',
    evidenceId:`CAPITAL_FACTS:${offset+1}:${'a'.repeat(64)}`,replayVerified:true,
    sourceAdmission:'OPEN_SOURCE_OPEN_DATA_ADMITTED',scoreEligible:false,decisionEligible:false,
    reasonCodes:['ANALYSIS_INPUTS_INCOMPLETE']}, now+offset);
}
test('history rejects stale, future, mismapped and unverified/private quotes',()=>{
  const valid=quote();assert.equal(verifiedBinanceQuote(valid,now),true);
  for(const bad of [{...valid,provider:'kraken'},{...valid,quoteCurrency:'USD'},
    {...valid,observedAt:now+1},{...valid,evidenceId:'private-result'}, {...valid,price:NaN}]) {
    assert.equal(verifiedBinanceQuote(bad,now),false);assert.deepEqual(appendBinanceQuote([],bad,now),[]);
  }
  assert.equal(verifiedBinanceQuote(valid,now+30_000),false);
});
test('bounded history deduplicates evidence, preserves timestamps and does not bridge gaps',()=>{
  let points=appendBinanceQuote([],quote(),now);
  assert.equal(appendBinanceQuote(points,quote(),now).length,1);
  points=appendBinanceQuote(points,quote(10_000,110),now+10_000);
  const chart=binanceChart(points)!;
  assert.ok(Math.abs(chart.changePct-10)<1e-10);
  assert.match(chart.paths[0],/M 20.00 180.00 L 580.00 20.00/);
  points=appendBinanceQuote(points,quote(110_000,120),now+110_000);
  assert.equal(binanceChart(points)!.paths.length,2);
  for(let i=111;i<250;i++)points=appendBinanceQuote(points,quote(i*1000),now+i*1000);
  assert.equal(points.length,120);
  points=appendBinanceQuote(points,quote(2_100_000),now+2_100_000);
  assert.equal(points.length,1);
});
test('UI never publishes a fabricated score or a stale chart; chart has units and accessible text',()=>{
  const asset=quote(10_000,110),history=appendBinanceQuote(appendBinanceQuote([],quote(),now),asset,now+10_000);
  const html=renderToStaticMarkup(<BinanceMarketView asset={asset} history={history} now={now+10_000}/>);
  assert.match(html,/role="img"/);assert.match(html,/USDT/);assert.match(html,/10.00 %/);
  assert.match(html,/Modell-Score<\/dt><dd[^>]*>Nicht verfügbar<\/dd>/);
  const stale=renderToStaticMarkup(<BinanceMarketView asset={asset} history={history} now={now+40_000}/>);
  assert.doesNotMatch(stale,/<svg/);assert.doesNotMatch(stale,/110 USDT/);
});
