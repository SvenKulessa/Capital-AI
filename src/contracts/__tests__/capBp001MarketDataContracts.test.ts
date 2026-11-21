import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RawTickStreamContractSchema, ExchangeStatusContractSchema,
  IntegrityStatusContractSchema, inspectCapBp001PointInTimePair,
} from '../capBp001MarketDataContracts';
import { componentActivationReasons } from '../analysisComponentRegistryValidator';

const NOW = 1_700_000_010_000;
const HASH = 'a'.repeat(64);
const asset = () => ({
  assetId: 'BTC-SYNTH', symbol: 'BTC', name: 'Synthetic BTC', assetClass: 'crypto' as const,
  venue: 'SYNTH-EXCHANGE', currency: 'USDT', status: 'active' as const,
});
const provenance = () => ({
  providerId: 'binance', providerDataset: 'synthetic_l1',
  observedAt: NOW - 2000, receivedAt: NOW - 1900, publishedAt: NOW - 1800,
  latencyMs: 100, isDelayed: false, isDemo: true,
  sourceReference: 'SYNTHETIC', licenseScope: 'sandbox_demo' as const,
});
const ticks = () => ({
  schemaVersion: 'CAP_BP_001_MARKET_DATA@1', kind: 'raw_tick_stream',
  asset: asset(), provenance: provenance(),
  sourceDigestSha256: HASH, sourceReference: 'SYNTHETIC',
  ticks: [
    { sequence: 4, observedAt: NOW - 3000, bid: 99, ask: 100 },
    { sequence: 5, observedAt: NOW - 2000, bid: 100, ask: 101 },
  ],
});
const exchange = () => ({
  schemaVersion: 'CAP_BP_001_MARKET_DATA@1', kind: 'exchange_status',
  asset: asset(), provenance: provenance(),
  sourceDigestSha256: HASH, sourceReference: 'SYNTHETIC',
  status: 'open', effectiveAt: NOW - 2000,
});
test('synthetic contracts are valid but never independently admitted', () => {
  assert.equal(RawTickStreamContractSchema.safeParse(ticks()).success, true);
  assert.equal(ExchangeStatusContractSchema.safeParse(exchange()).success, true);
  const a = inspectCapBp001PointInTimePair(ticks(), exchange(), NOW - 1000);
  assert.deepEqual(a, inspectCapBp001PointInTimePair(structuredClone(ticks()), structuredClone(exchange()), NOW - 1000));
  assert.equal(a.candidateConsistent, true);
  assert.equal(a.state, 'BLOCKED');
  assert.deepEqual(a.reasonCodes, ['CAP_BP_001_RIGHTS_AND_REPLAY_NOT_INDEPENDENTLY_VERIFIED']);
  assert.ok(componentActivationReasons('market_integrity_gate').includes('CONTRACT_REFERENCE_UNRESOLVED'));
});
test('strict contracts reject unknown keys and forged output eligibility', () => {
  assert.equal(RawTickStreamContractSchema.safeParse({ ...ticks(), secret: 'no' }).success, false);
  assert.equal(ExchangeStatusContractSchema.safeParse({ ...exchange(), token: 'no' }).success, false);
  const result = {
    schemaVersion: 'CAP_BP_001_INTEGRITY_STATUS@1', componentId: 'market_integrity_gate',
    assetId: 'BTC-SYNTH', evaluatedAt: NOW, inputTickDigestSha256: HASH,
    inputExchangeDigestSha256: HASH, state: 'BLOCKED', reasonCodes: ['NOT_PROVEN'],
    immutableReplayVerified: false, productionEligible: false, scoreEligible: false,
    decisionEligible: false, publishable: false,
  };
  assert.equal(IntegrityStatusContractSchema.safeParse(result).success, true);
  for (const change of [{ state: 'ACTIVE' }, { productionEligible: true },
    { scoreEligible: true }, { immutableReplayVerified: true }, { publishable: true },
    { inputTickDigestSha256: 'not-a-hash' }, { secret: 'injected' }]) {
    assert.equal(IntegrityStatusContractSchema.safeParse({ ...result, ...change }).success, false);
  }
});
test('reject crossed book, sequence gaps, regressions, hash spoofing and invalid provenance', () => {
  const cases: ((x: ReturnType<typeof ticks>) => void)[] = [
    x => { x.ticks[1]!.bid = 102; },
    x => { x.ticks[1]!.sequence = 8; },
    x => { x.ticks[1]!.observedAt = NOW - 4000; },
    x => { x.sourceDigestSha256 = 'unverified'; },
    x => { x.provenance.latencyMs = 500; },
    x => { x.provenance.publishedAt = NOW - 4000; },
    x => { x.provenance.observedAt = NOW - 9000; },
  ];
  for (const mutate of cases) {
    const f = ticks(); mutate(f);
    assert.equal(RawTickStreamContractSchema.safeParse(f).success, false);
    assert.equal(inspectCapBp001PointInTimePair(f, exchange(), NOW).candidateConsistent, false);
  }
});
test('reject lookahead, mismatched instruments, halted exchange, and future status', () => {
  const cases: [ReturnType<typeof ticks>, ReturnType<typeof exchange>, number][] = [];
  const lookahead = exchange(); lookahead.provenance.publishedAt = NOW - 100;
  cases.push([ticks(), lookahead, NOW - 1000]);
  const wrong = exchange(); wrong.asset.assetId = 'OTHER'; cases.push([ticks(), wrong, NOW]);
  const halted = exchange(); halted.status = 'halted'; cases.push([ticks(), halted, NOW]);
  const future = exchange(); future.effectiveAt = NOW + 100; cases.push([ticks(), future, NOW]);
  for (const [t, e, at] of cases) {
    const r = inspectCapBp001PointInTimePair(t, e, at);
    assert.equal(r.state, 'BLOCKED');
    assert.equal(r.candidateConsistent, false);
  }
});
test('invalid candidate and invalid decision time fail closed', () => {
  for (const raw of [null, {}, { ...ticks(), sourceReference: '' }]) {
    const r = inspectCapBp001PointInTimePair(raw, exchange(), NOW);
    assert.equal(r.candidateConsistent, false);
  }
  assert.equal(inspectCapBp001PointInTimePair(ticks(), exchange(), -1).candidateConsistent, false);
});
