import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AssetIdentitySchema } from '../canonicalContracts';
import { resolveProductAssetMapping } from '../marketAssetTaxonomy';
import { inspectInstrumentMaster, InstrumentMasterSchema } from '../assetMasterInstrument';
import { inspectResearchGateCohort } from '../../services/marketResearchGateDiagnostics';

const at = Date.parse('2026-10-09T10:00:00.000Z');
const asset = {
  assetId: 'TEST:BINANCE:BTCUSDT', symbol: 'BTCUSDT', name: 'Bitcoin / USDT',
  assetClass: 'crypto' as const, venue: 'BINANCE', currency: 'USDT', status: 'active' as const,
};
const provenance = {
  providerId: 'test-fixture', providerDataset: 'identity', observedAt: at - 1000,
  receivedAt: at - 900, publishedAt: at - 800, latencyMs: 100,
  isDemo: true, isDelayed: false, sourceReference: 'FIXTURE_NOT_PROVIDER_EVIDENCE',
  licenseScope: 'sandbox_demo' as const,
};
const instrument = {
  schemaVersion: 'CAPITAL_AI_INSTRUMENT_MASTER@1', assetId: asset.assetId,
  symbol: asset.symbol, name: asset.name, venue: asset.venue, currency: asset.currency,
  productAssetClass: 'crypto', status: 'active', subclass: null, evaluatedAt: at,
  identityProvenance: provenance, baseAsset: 'BTC', quoteAsset: 'USDT',
};

test('canonical crypto identity accepts non-ISO quote token without admitting instrument or scoring', () => {
  const parsed = AssetIdentitySchema.parse(asset);
  assert.equal(parsed.currency, 'USDT');
  const mapped = resolveProductAssetMapping({
    assetId: asset.assetId, symbol: asset.symbol, name: asset.name,
    productAssetClass: 'crypto', venue: asset.venue, currency: 'USDT',
    region: null, subclass: null, status: 'active',
  });
  assert.equal(mapped.canonicalAssetClass, 'crypto');
  assert.equal(mapped.asset?.currency, 'USDT');
  assert.equal(mapped.mappingStatus, 'MAPPED_NOT_ADMITTED');
  assert.equal(mapped.instrumentVerified, false);
  assert.equal(mapped.scoringEligible, false);
  assert.equal(mapped.rankingEligible, false);
});

test('noncrypto identities, product mappings and instrument masters still reject token quote units', () => {
  for (const assetClass of ['equity_us','equity_eu','forex','commodities','fixed_income']) {
    assert.equal(AssetIdentitySchema.safeParse({ ...asset, assetClass }).success, false, assetClass);
  }
  for (const productAssetClass of ['stocks','forex','bonds','etfs','indices','futures','options','commodities']) {
    assert.throws(() => resolveProductAssetMapping({
      assetId: asset.assetId, symbol: asset.symbol, name: asset.name, venue: asset.venue,
      productAssetClass, currency: 'USDT', region: productAssetClass === 'stocks' ? 'US' : null,
      subclass: null, status: 'active',
    }), undefined, productAssetClass);
  }
  assert.equal(AssetIdentitySchema.safeParse({ ...asset, currency: 'usdT' }).success, false);
  assert.equal(AssetIdentitySchema.safeParse({ ...asset, currency: 'USD/EUR' }).success, false);
  assert.equal(AssetIdentitySchema.safeParse({ ...asset, currency: 'X'.repeat(16) }).success, false);
});

test('crypto instrument quote asset equals its currency and stays non-production', () => {
  const inspected = inspectInstrumentMaster(instrument);
  assert.equal(inspected.instrument.quoteAsset, 'USDT');
  assert.equal(inspected.mapping.asset?.currency, 'USDT');
  assert.equal(inspected.identityVerified, false);
  assert.equal(inspected.productionEligible, false);
  assert.equal(inspected.mapping.rankingEligible, false);
  assert.equal(InstrumentMasterSchema.safeParse({ ...instrument, quoteAsset: 'USD' }).success, false);
  assert.equal(InstrumentMasterSchema.safeParse({ ...instrument, currency: 'USD' }).success, false);
  assert.equal(InstrumentMasterSchema.safeParse({ ...instrument, currency: 'USDT!' }).success, false);
  assert.equal(InstrumentMasterSchema.safeParse({ ...instrument, productAssetClass: 'forex',
    baseCurrency: 'BTC', quoteCurrency: 'USD', currency: 'USDT' }).success, false);
  assert.equal(InstrumentMasterSchema.safeParse({ ...instrument, productAssetClass: 'forex',
    baseCurrency: 'USDT', quoteCurrency: 'USD', currency: 'USD' }).success, false);
});

test('quote-unit-aware DQ diagnostics still fail closed for demo and absent provider rights', () => {
  const report = inspectResearchGateCohort({
    asset, symbol: asset.symbol, venue: asset.venue,
    quoteCurrency: 'USDT', liquidityCurrency: 'USDT',
    provenance, timeSemantics: 'realtime',
    bid: 101, ask: 102, sequenceContinuous: true,
    timestampJitterMs: 2, dailyTurnover: 200000, orderbookDepth2Pct: 120000,
    evaluatedAt: at, maxAgeMs: 3000, maxJitterMs: 5,
    minimumTurnover: 100000, minimumDepth2Pct: 50000,
    mode: 'demo', rights: null,
  });
  assert.equal(report.publicDisplayEligible, false);
  assert.equal(report.productionEligible, false);
  assert.ok(report.diagnostics.every(d => d.status === 'blocked' &&
    d.metric === null && d.scoreEligible === false));
  assert.ok(report.diagnostics.every(d => d.reasonCodes.includes('SOURCE_RIGHTS_NOT_PROVEN')));
  assert.ok(report.diagnostics.every(d => d.reasonCodes.includes('DEMO_NOT_ACTIONABLE')));
  const mismatch = inspectResearchGateCohort({
    asset, symbol: asset.symbol, venue: asset.venue,
    quoteCurrency: 'USD', liquidityCurrency: 'USDT',
    provenance, timeSemantics: 'realtime',
    bid: 101, ask: 102, sequenceContinuous: true,
    timestampJitterMs: 2, dailyTurnover: 200000, orderbookDepth2Pct: 120000,
    evaluatedAt: at, maxAgeMs: 3000, maxJitterMs: 5,
    minimumTurnover: 100000, minimumDepth2Pct: 50000,
    mode: 'demo', rights: null,
  });
  assert.ok(mismatch.diagnostics.every(d => d.status === 'blocked' &&
    d.reasonCodes.includes('OBSERVATION_CURRENCY_UNIT_MISMATCH')));
});
