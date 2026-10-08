import test from 'node:test';
import assert from 'node:assert/strict';
import { projectCanonicalAssetValue } from '../marketValuesProjection';

const referenceDate = '2026-10-07';
const observedAt = Date.parse(referenceDate + 'T00:00:00.000Z');
const publishedAt = Date.parse(referenceDate + 'T14:00:00.000Z');
const now = Date.parse('2026-10-08T09:00:00.000Z');
const verifiedReference = {
  schema: 'CAPITAL_AI_ASSET_VALUE@1',
  instrumentId: 'fx:EUR-USD:ecb-reference',
  symbol: 'EUR/USD',
  value: 1.1177,
  quoteCurrency: 'USD',
  observedAt,
  observedAtPrecision: 'date',
  publishedAt,
  referenceDate,
  timeSemantics: 'reference',
  provider: 'ecb-reference-rates',
  venue: 'ECB reference rates',
  evidenceId: 'CAPITAL_FACTS:1:' + 'a'.repeat(64),
  replayVerified: true,
  sourceAdmission: 'OPEN_SOURCE_OPEN_DATA_ADMITTED',
  scoreEligible: false,
  decisionEligible: false,
  reasonCodes: ['REFERENCE_RATE_INFORMATION_ONLY'],
};

test('daily ECB reference value is informational and carries durable evidence', () => {
  const item = projectCanonicalAssetValue(verifiedReference, now);
  assert.equal(item.symbol, 'EUR/USD');
  assert.equal(item.mainCategory, 'FOREX');
  assert.equal(item.price, 1.1177);
  assert.equal(item.dataAvailability, 'reference');
  assert.equal(item.aiScore, null);
  assert.equal(item.actionable, false);
  assert.equal(item.evidenceId, verifiedReference.evidenceId);
  assert.equal(item.referenceDate, referenceDate);
});

test('expired, tampered or unadmitted values fail closed', () => {
  assert.throws(() => projectCanonicalAssetValue(verifiedReference, publishedAt + 9 * 86400000), /MARKET_VALUE_EXPIRED/);
  assert.throws(() => projectCanonicalAssetValue({ ...verifiedReference, provider: 'kraken' }, now), /MARKET_INSTRUMENT_MISMATCH/);
  assert.throws(() => projectCanonicalAssetValue({ ...verifiedReference, replayVerified: false }, now));
  assert.throws(() => projectCanonicalAssetValue({ ...verifiedReference, scoreEligible: true }, now));
  assert.throws(() => projectCanonicalAssetValue({ ...verifiedReference, evidenceId: 'NOT_EVIDENCE' }, now));
});
