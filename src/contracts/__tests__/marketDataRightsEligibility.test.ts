import { describe, expect, it } from 'vitest';
import { evaluateMarketDataRights, type MarketDataRightsEvidence } from '../marketDataRightsEligibility';

const base: MarketDataRightsEvidence = {
  providerId: 'provider',
  applicableEntityAndRegion: 'Example entity / EU',
  subscriptionTierAndAddOns: 'Commercial',
  feedsSymbolsAndVenues: ['feed:A'],
  contractOrPermissionReference: 'evidence://contract/1',
  reviewedAt: '2026-10-01T20:00:00.000Z',
  validUntil: null,
  permissions: {
    internal_analysis: { allowed: true, evidenceReference: 'evidence://contract/1#internal', obligations: [] },
    public_display: { allowed: true, evidenceReference: 'evidence://contract/1#display', obligations: ['ATTRIBUTION_REQUIRED'] },
    api_redistribution: { allowed: null, evidenceReference: null, obligations: [] },
    derived_scoring_research: { allowed: true, evidenceReference: 'evidence://contract/1#derived', obligations: [] },
    cache_retention: { allowed: true, evidenceReference: 'evidence://contract/1#cache', obligations: [] },
    export_resale: { allowed: false, evidenceReference: 'evidence://contract/1#resale', obligations: [] },
  },
};

describe('market data rights eligibility', () => {
  it('fails closed when a required use case is unverified', () => {
    expect(evaluateMarketDataRights(base, ['api_redistribution']).decision).toBe('REVIEW_REQUIRED');
  });
  it('blocks an explicitly prohibited use case', () => {
    expect(evaluateMarketDataRights(base, ['export_resale']).decision).toBe('BLOCK');
  });
  it('preserves obligations for an allowed use case', () => {
    const result = evaluateMarketDataRights(base, ['public_display']);
    expect(result.decision).toBe('ALLOW_WITH_OBLIGATIONS');
    expect(result.eligible).toBe(true);
    expect(result.obligations).toContain('ATTRIBUTION_REQUIRED');
  });
  it('does not let derived-use permission imply redistribution permission', () => {
    expect(evaluateMarketDataRights(base, ['derived_scoring_research', 'api_redistribution']).eligible).toBe(false);
  });
});
