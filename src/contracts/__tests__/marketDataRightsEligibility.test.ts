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
    scientific_research_tdm: { allowed: null, evidenceReference: null, obligations: [] },
    public_display: { allowed: true, evidenceReference: 'evidence://contract/1#display', obligations: ['ATTRIBUTION_REQUIRED'] },
    api_redistribution: { allowed: null, evidenceReference: null, obligations: [] },
    derived_scoring_research: { allowed: true, evidenceReference: 'evidence://contract/1#derived', obligations: [] },
    cache_retention: { allowed: true, evidenceReference: 'evidence://contract/1#cache', obligations: [] },
    export_resale: { allowed: false, evidenceReference: 'evidence://contract/1#resale', obligations: [] },
  },
  scientificResearchTdm: null,
};

describe('market data rights eligibility', () => {
  it('fails closed when a required contractual use case is unverified', () => {
    expect(evaluateMarketDataRights(base, ['api_redistribution']).decision).toBe('REVIEW_REQUIRED');
  });

  it('blocks an explicitly prohibited contractual use case', () => {
    expect(evaluateMarketDataRights(base, ['export_resale']).decision).toBe('BLOCK');
  });

  it('preserves obligations for an allowed contractual use case', () => {
    const result = evaluateMarketDataRights(base, ['public_display']);
    expect(result.decision).toBe('ALLOW_WITH_OBLIGATIONS');
    expect(result.eligible).toBe(true);
    expect(result.obligations).toContain('ATTRIBUTION_REQUIRED');
  });

  it('does not let derived-use permission imply redistribution permission', () => {
    expect(evaluateMarketDataRights(base, ['derived_scoring_research', 'api_redistribution']).eligible).toBe(false);
  });

  it('allows a separately evidenced statutory research-TDM basis without inventing provider redistribution rights', () => {
    const research: MarketDataRightsEvidence = {
      ...base,
      applicableEntityAndRegion: null,
      subscriptionTierAndAddOns: null,
      contractOrPermissionReference: null,
      scientificResearchTdm: {
        jurisdiction: 'DE/EU',
        legalBasis: 'DE_URHG_60D_EU_DSM_ART3',
        actorQualification: 'QUALIFIED_RESEARCH_ORGANISATION',
        lawfulAccess: true,
        lawfulAccessEvidenceReference: 'evidence://lawful-access/1',
        scientificTdmPurpose: true,
        purposeEvidenceReference: 'evidence://research-purpose/1',
        statutoryEligibilitySatisfied: true,
        accessControlsAndNetworkIntegrityRespected: true,
        legalReviewReference: 'evidence://legal-review/1',
      },
    };
    expect(evaluateMarketDataRights(research, ['scientific_research_tdm'])).toMatchObject({
      decision: 'ALLOW',
      eligible: true,
    });
    expect(evaluateMarketDataRights(research, ['scientific_research_tdm', 'api_redistribution']).eligible).toBe(false);
  });

  it('does not treat a research label as lawful API access', () => {
    const research: MarketDataRightsEvidence = {
      ...base,
      scientificResearchTdm: {
        jurisdiction: 'DE/EU',
        legalBasis: 'DE_URHG_60D_EU_DSM_ART3',
        actorQualification: 'UNVERIFIED',
        lawfulAccess: null,
        lawfulAccessEvidenceReference: null,
        scientificTdmPurpose: true,
        purposeEvidenceReference: 'evidence://research-purpose/1',
        statutoryEligibilitySatisfied: null,
        accessControlsAndNetworkIntegrityRespected: null,
        legalReviewReference: null,
      },
    };
    const result = evaluateMarketDataRights(research, ['scientific_research_tdm']);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('LAWFUL_ACCESS_UNVERIFIED');
  });
});
