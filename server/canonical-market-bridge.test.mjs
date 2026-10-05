import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CanonicalMarketEventSchema, canonicalMarketSubject } from '../shared/canonical-market-events.mjs';
import { normalizeRawQuoteEvidence } from './canonical-market-bridge.mjs';

const rawEvidenceId = 'CAPITAL_FACTS:42:' + 'a'.repeat(64);
const rawRecord = {
  fact: {
    schemaVersion: '1.0.0',
    symbol: 'BTCUSD',
    venue: 'KRAKEN',
    provider: 'kraken',
    price: 100,
    quote: 'USD',
    bid: 99,
    ask: 101,
    volume24h: 123,
    observedAt: 1_790_000_000_000,
    receivedAt: 1_790_000_000_010,
    mode: 'websocket',
    isDemo: false,
    licenseScope: 'unverified',
    payloadHash: 'b'.repeat(64),
  },
  rawPayload: { fixture: true },
};
const asset = {
  assetId: 'crypto:BTC:USD:KRAKEN',
  symbol: 'BTCUSD',
  name: 'Bitcoin / US Dollar',
  assetClass: 'crypto',
  venue: 'KRAKEN',
  currency: 'USD',
  status: 'active',
};

test('canonical normalization preserves immutable raw evidence lineage', () => {
  const event = normalizeRawQuoteEvidence({
    rawInputEvidenceId: rawEvidenceId,
    rawRecord,
    asset,
    providerDataset: 'fixture-dataset',
    rightsEvidenceReference: 'TEST-RIGHTS-EVIDENCE',
    instrumentManifestReference: 'TEST-INSTRUMENT-MANIFEST',
    normalizationVersion: '1.0.0',
    publishedAt: rawRecord.fact.receivedAt + 1,
    licenseScope: 'commercial_redistribution',
    isDelayed: false,
  });
  assert.equal(event.rawInputEvidenceId, rawEvidenceId);
  assert.equal(event.provenance.sourceReference, rawEvidenceId);
  assert.equal(event.provenance.latencyMs, 10);
  assert.equal(event.scoreEligible, false);
  assert.equal(event.decisionEligible, false);
  assert.equal(canonicalMarketSubject(event), 'capital.market.canonical.crypto.crypto:BTC:USD:KRAKEN');
});

test('canonical normalization never guesses asset identity or rights evidence', () => {
  const base = {
    rawInputEvidenceId: rawEvidenceId,
    rawRecord,
    asset,
    providerDataset: 'fixture-dataset',
    rightsEvidenceReference: 'TEST-RIGHTS-EVIDENCE',
    instrumentManifestReference: 'TEST-INSTRUMENT-MANIFEST',
    normalizationVersion: '1.0.0',
    publishedAt: rawRecord.fact.receivedAt + 1,
    licenseScope: 'commercial_redistribution',
  };
  assert.throws(() => normalizeRawQuoteEvidence({ ...base, asset: { ...asset, venue: 'OTHER' } }), /CANONICAL_ASSET_MAPPING_MISMATCH/);
  assert.throws(() => normalizeRawQuoteEvidence({ ...base, providerDataset: '' }), /PROVIDER_DATASET_REQUIRED/);
  assert.throws(() => normalizeRawQuoteEvidence({ ...base, rightsEvidenceReference: '' }), /RIGHTS_EVIDENCE_REFERENCE_REQUIRED/);
  assert.throws(() => normalizeRawQuoteEvidence({ ...base, instrumentManifestReference: '' }), /INSTRUMENT_MANIFEST_REFERENCE_REQUIRED/);
});

test('canonical event rejects actionability, broken lineage and inconsistent timing', () => {
  const valid = normalizeRawQuoteEvidence({
    rawInputEvidenceId: rawEvidenceId,
    rawRecord,
    asset,
    providerDataset: 'fixture-dataset',
    rightsEvidenceReference: 'TEST-RIGHTS-EVIDENCE',
    instrumentManifestReference: 'TEST-INSTRUMENT-MANIFEST',
    normalizationVersion: '1.0.0',
    publishedAt: rawRecord.fact.receivedAt + 1,
    licenseScope: 'commercial_redistribution',
  });
  assert.equal(CanonicalMarketEventSchema.safeParse({ ...valid, scoreEligible: true }).success, false);
  assert.equal(CanonicalMarketEventSchema.safeParse({
    ...valid,
    provenance: { ...valid.provenance, sourceReference: 'CAPITAL_FACTS:41:' + 'c'.repeat(64) },
  }).success, false);
  assert.equal(CanonicalMarketEventSchema.safeParse({
    ...valid,
    provenance: { ...valid.provenance, latencyMs: 999 },
  }).success, false);
});
