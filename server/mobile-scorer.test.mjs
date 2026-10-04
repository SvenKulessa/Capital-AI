import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalScorerOrigin, createMobileScorer, loadUniverseForEvidence } from './mobile-scorer.mjs';
import { scorerBus } from './scorer-bus.mjs';

test('non-admitted scoring blocks cache, calculation and SSE before any bus or provider access', async () => {
  const original = { read: scorerBus.read, persist: scorerBus.persist, subscribe: scorerBus.subscribe, fetch: globalThis.fetch };
  let calls = 0;
  const forbidden = async () => { calls++; throw new Error('admission must precede I/O'); };
  scorerBus.read = scorerBus.persist = scorerBus.subscribe = globalThis.fetch = forbidden;
  try {
    const service = createMobileScorer({ CAPITAL_AI_SCORER_ORIGIN: 'https://example.invalid' });
    for (const [method, path] of [['GET', '/api/mobile/enterprise-score'], ['POST', '/api/mobile/enterprise-score'], ['GET', '/api/mobile/scorer/events']]) {
      let result;
      const res = { writeHead() { throw new Error('SSE must not open'); } };
      const handled = await service.handle({ method, headers: {} }, res,
        new URL(`http://local${path}?symbol=BTC`), (_, status, body) => { result = { status, body }; }, {});
      assert.equal(handled, true);
      assert.equal(result.status, 503);
      assert.equal(result.body.scoreEligible, false);
      assert.equal(result.body.productionAdmission, 'BLOCKED');
      assert.equal(result.body.requiredCapability, 'scoringPriceInput');
    }
    assert.equal(calls, 0);
  } finally {
    scorerBus.read = original.read; scorerBus.persist = original.persist; scorerBus.subscribe = original.subscribe; globalThis.fetch = original.fetch;
  }
});

test('canonical scorer origin is explicit and cannot point back to the public app origin', () => {
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online' }), null);
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ORIGIN: 'https://capital-ai.online' }), null);
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ALLOW_SAME_ORIGIN: 'true' }), 'https://capital-ai.online');
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ORIGIN: 'https://finance-7clq.onrender.com' }), 'https://finance-7clq.onrender.com');
  assert.equal(canonicalScorerOrigin({ PUBLIC_APP_ORIGIN: 'https://capital-ai.online', CAPITAL_AI_SCORER_ORIGIN: 'http://finance.invalid' }), null);
});

test('mobile universe stays fail-closed without a mobileCryptoUniverse-capable Source Admission', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error('network must not be reached without admitted source');
  };
  try {
    const universe = await loadUniverseForEvidence({
      MOBILE_CRYPTO_BINANCE_RESEARCH: 'true',
      MOBILE_CRYPTO_COINPAPRIKA_RESEARCH: 'true',
      CAPITAL_AI_OSS_CRYPTO_UNIVERSE_URL: 'https://example.invalid',
      CAPITAL_AI_OSS_CRYPTO_UNIVERSE_SOURCE_ID: 'not-admitted',
      CAPITAL_AI_SCORER_ORIGIN: 'https://example.invalid',
    });
    assert.equal(universe.status, 'BLOCKED');
    assert.equal(universe.sourcePolicy, 'OPEN_SOURCE_AND_OPEN_DATA_ONLY');
    assert.equal(universe.admittedSources, 0);
    assert.equal(universe.count, 0);
    assert.deepEqual(universe.assets, []);
    assert.deepEqual(universe.sources, []);
    assert.equal(universe.rightsScope, 'OPEN_SOURCE_OPEN_DATA_REQUIRED');
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
