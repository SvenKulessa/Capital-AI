import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBinanceResearchUniverse, buildCoinPaprikaResearchUniverse, canonicalScorerOrigin } from './mobile-scorer.mjs';

test('canonical scorer origin is explicit and cannot point back to the public app origin', () => {
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online' }), null);
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ORIGIN: 'https://capital-ai.online' }), null);
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ALLOW_SAME_ORIGIN: 'true' }), 'https://capital-ai.online');
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ORIGIN: 'https://finance-7clq.onrender.com' }), 'https://finance-7clq.onrender.com');
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ORIGIN: 'http://finance.invalid' }), null);
});

test('research universe deterministically returns the top 400 unique active USDT spot assets by quote volume', () => {
  const symbols = [];
  const tickers = [];
  for (let i = 0; i < 405; i++) {
    const base = 'C' + String(i).padStart(3, '0');
    const symbol = base + 'USDT';
    symbols.push({ symbol, baseAsset: base, quoteAsset: 'USDT', status: 'TRADING', isSpotTradingAllowed: true });
    tickers.push({ symbol, quoteVolume: String(1000000 - i) });
  }
  symbols.push({ symbol: 'OFFUSDT', baseAsset: 'OFF', quoteAsset: 'USDT', status: 'BREAK', isSpotTradingAllowed: true });
  symbols.push({ symbol: 'USDTUSDT', baseAsset: 'USDT', quoteAsset: 'USDT', status: 'TRADING', isSpotTradingAllowed: true });
  const universe = buildBinanceResearchUniverse({ symbols }, tickers);
  assert.equal(universe.length, 400);
  assert.equal(universe[0].symbol, 'C000');
  assert.equal(universe[399].symbol, 'C399');
  assert.equal(universe[0].universeRank, 1);
  assert.equal(universe[399].universeRank, 400);
  assert.equal(new Set(universe.map(x => x.symbol)).size, 400);
  assert.ok(universe.every(x => x.rankMetric === 'binanceSpotUsdtQuoteVolume24h'));
  assert.ok(universe.every(x => x.source === 'binance-public-spot-private-research'));
});


test('CoinPaprika private-research universe preserves market-cap rank and de-duplicates symbols', () => {
  const rows = [];
  for (let i = 1; i <= 405; i++) rows.push({ rank: i, symbol: 'P' + String(i).padStart(3, '0'), name: 'Paprika ' + i });
  rows.push({ rank: 2, symbol: 'P002', name: 'Duplicate' });
  const universe = buildCoinPaprikaResearchUniverse(rows);
  assert.equal(universe.length, 400);
  assert.equal(universe[0].universeRank, 1);
  assert.equal(universe[399].universeRank, 400);
  assert.ok(universe.every(x => x.rankMetric === 'marketCap'));
  assert.ok(universe.every(x => x.source === 'coinpaprika-public-private-research'));
});
