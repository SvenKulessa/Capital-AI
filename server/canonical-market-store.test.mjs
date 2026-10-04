import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CanonicalMarketStore } from './canonical-market-store.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('canonical market store persists acknowledged JetStream envelope with service credentials', async () => {
  let request = null;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 201 };
  };
  const env = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
  };
  const store = new CanonicalMarketStore(env, fetchImpl);
  const rawPayload = { source: 'unit-test' };
  const fact = {
    schemaVersion: '1.0.0',
    symbol: 'BTCUSD',
    venue: 'KRAKEN',
    provider: 'kraken',
    price: 100,
    quote: 'USD',
    bid: 99,
    ask: 101,
    volume24h: null,
    observedAt: Date.now() - 100,
    receivedAt: Date.now(),
    mode: 'rest',
    isDemo: false,
    licenseScope: 'unverified',
    payloadHash: hash(rawPayload),
  };
  const envelope = { schemaVersion: '1.0.0', fact, rawPayload };
  const evidenceId = `CAPITAL_FACTS:7:${hash(envelope)}`;
  const delivery = {
    ...fact,
    evidenceId,
    availability: 'live',
    validated: true,
    actionable: false,
    reasonCodes: ['PROVIDER_RIGHTS_UNVERIFIED'],
  };

  assert.equal(await store.persist(delivery, envelope), evidenceId);
  assert.equal(request.url, 'https://project.supabase.co/rest/v1/canonical_market_facts?on_conflict=evidence_id');
  assert.equal(request.options.method, 'POST');
  const body = JSON.parse(request.options.body);
  assert.equal(body.evidence_id, evidenceId);
  assert.equal(body.stream_seq, 7);
  assert.equal(body.symbol, 'BTCUSD');
  assert.deepEqual(body.raw_payload, rawPayload);
});

test('canonical market store fails closed on missing credentials and hash mismatch', async () => {
  const store = new CanonicalMarketStore({}, async () => ({ ok: true, status: 201 }));
  await assert.rejects(store.persist({}, {}), /CANONICAL_DB_NOT_CONFIGURED/);

  const env = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
  };
  const configured = new CanonicalMarketStore(env, async () => ({ ok: true, status: 201 }));
  const rawPayload = { source: 'unit-test' };
  const fact = {
    schemaVersion: '1.0.0', symbol: 'BTCUSD', venue: 'KRAKEN', provider: 'kraken', price: 100,
    quote: 'USD', bid: null, ask: null, volume24h: null, observedAt: Date.now() - 100, receivedAt: Date.now(),
    mode: 'rest', isDemo: false, licenseScope: 'unverified', payloadHash: hash(rawPayload),
  };
  const envelope = { schemaVersion: '1.0.0', fact, rawPayload };
  const delivery = {
    ...fact, evidenceId: `CAPITAL_FACTS:1:${'0'.repeat(64)}`,
    availability: 'live', validated: true, actionable: false, reasonCodes: [],
  };
  await assert.rejects(configured.persist(delivery, envelope), /CANONICAL_ENVELOPE_HASH_MISMATCH/);
});


test('canonical market store reads latest symbol row for MARKET fallback', async () => {
  const rawPayload = { source: 'unit-test-read' };
  const fact = {
    schemaVersion: '1.0.0', symbol: 'BTCUSD', venue: 'KRAKEN', provider: 'kraken', price: 101,
    quote: 'USD', bid: 100, ask: 102, volume24h: null, observedAt: Date.now() - 100, receivedAt: Date.now(),
    mode: 'rest', isDemo: false, licenseScope: 'unverified', payloadHash: hash(rawPayload),
  };
  const envelope = { schemaVersion: '1.0.0', fact, rawPayload };
  const evidenceId = `CAPITAL_FACTS:9:${hash(envelope)}`;
  const env = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
  };
  let requestedUrl = null;
  const store = new CanonicalMarketStore(env, async url => {
    requestedUrl = String(url);
    return {
      ok: true,
      status: 200,
      async json() { return [{ evidence_id: evidenceId, fact, observed_at: new Date(fact.observedAt).toISOString() }]; },
    };
  });

  const latest = await store.readLatest('btcusd');
  assert.equal(latest.evidenceId, evidenceId);
  assert.deepEqual(latest.fact, fact);
  assert.match(requestedUrl, /symbol=eq\.BTCUSD/);
  assert.match(requestedUrl, /order=observed_at\.desc/);
});
