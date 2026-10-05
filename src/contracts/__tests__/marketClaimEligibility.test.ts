import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MARKET_CLAIM_SCHEMA_VERSION,
  MarketClaimEvidenceSchema,
  evaluateMarketClaimEligibility,
} from '../marketClaimEligibility';

const base = {
  schemaVersion: MARKET_CLAIM_SCHEMA_VERSION,
  provider: {
    providerId: 'provider-a',
    selectable: true,
    configured: true,
    admitted: true,
    runtimeReady: true,
  },
  timeSemantics: 'realtime' as const,
  dataEvidenceVerified: true,
  freshnessVerified: true,
  instrumentManifestBound: true,
  verifiedAssetCount: 20,
  scoreEvidenceVerified: true,
  rankEvidenceVerified: false,
  alertEvidenceVerified: false,
  decisionEvidenceVerified: false,
  productionEvidenceVerified: false,
};

test('provider lifecycle flags stay distinct and runtime-ready cannot bypass configuration/admission', () => {
  const configuredButBlocked = evaluateMarketClaimEligibility({
    ...base,
    provider: { ...base.provider, admitted: false, runtimeReady: false },
  });
  assert.equal(configuredButBlocked.providerStatus.selectable, true);
  assert.equal(configuredButBlocked.providerStatus.configured, true);
  assert.equal(configuredButBlocked.providerStatus.admitted, false);
  assert.equal(configuredButBlocked.claims.providerReady, false);
  assert.equal(configuredButBlocked.eligibility.scoreEligible, false);

  assert.equal(MarketClaimEvidenceSchema.safeParse({
    ...base,
    provider: { ...base.provider, admitted: false, runtimeReady: true },
  }).success, false);
});

test('time semantics never promote delayed/reference/historical data to realtime', () => {
  for (const timeSemantics of ['delayed', 'reference', 'historical'] as const) {
    const projection = evaluateMarketClaimEligibility({ ...base, timeSemantics });
    assert.equal(projection.dataState, timeSemantics);
    assert.equal(projection.claims.realtime, false);
  }
  assert.equal(evaluateMarketClaimEligibility(base).claims.realtime, true);
});

test('score, rank, alert and decision eligibility remain independent downstream gates', () => {
  const scoreOnly = evaluateMarketClaimEligibility(base);
  assert.deepEqual(scoreOnly.eligibility, {
    scoreEligible: true,
    rankEligible: false,
    alertEligible: false,
    decisionEligible: false,
  });

  const decisionOnly = evaluateMarketClaimEligibility({ ...base, decisionEvidenceVerified: true });
  assert.equal(decisionOnly.eligibility.scoreEligible, true);
  assert.equal(decisionOnly.eligibility.rankEligible, false);
  assert.equal(decisionOnly.eligibility.alertEligible, false);
  assert.equal(decisionOnly.eligibility.decisionEligible, true);
});

test('unavailable or unverified data is fail-closed for actionable claims', () => {
  const unavailable = evaluateMarketClaimEligibility({
    ...base,
    timeSemantics: 'unavailable',
    dataEvidenceVerified: false,
    freshnessVerified: false,
  });
  assert.equal(unavailable.claims.realtime, false);
  assert.equal(unavailable.eligibility.scoreEligible, false);
  assert.ok(unavailable.reasonCodes.includes('DATA_UNAVAILABLE'));
  assert.ok(unavailable.reasonCodes.includes('DATA_EVIDENCE_UNVERIFIED'));
});

test('Top-N and production-ready claims require explicit evidence instead of inference', () => {
  assert.equal(MarketClaimEvidenceSchema.safeParse({
    ...base,
    instrumentManifestBound: false,
    verifiedAssetCount: 20,
  }).success, false);

  const notProduction = evaluateMarketClaimEligibility({ ...base, decisionEvidenceVerified: true });
  assert.equal(notProduction.claims.productionReady, false);

  const production = evaluateMarketClaimEligibility({
    ...base,
    rankEvidenceVerified: true,
    alertEvidenceVerified: true,
    decisionEvidenceVerified: true,
    productionEvidenceVerified: true,
  });
  assert.equal(production.claims.productionReady, true);
  assert.equal(production.claims.verifiedAssetCount, 20);
});
