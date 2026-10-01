import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { evaluateMarketDataRights, type MarketDataRightsEvidence } from '../marketDataRightsEligibility';
import {
  FIRST_ACTIVATION_COHORT,
  bindFirstActivationCohort,
  projectProviderRights,
} from '../marketDataRightsInventoryProjection';

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
    assert.equal(evaluateMarketDataRights(base, ['api_redistribution']).decision, 'REVIEW_REQUIRED');
  });

  it('blocks an explicitly prohibited contractual use case', () => {
    assert.equal(evaluateMarketDataRights(base, ['export_resale']).decision, 'BLOCK');
  });

  it('preserves obligations for an allowed contractual use case', () => {
    const result = evaluateMarketDataRights(base, ['public_display']);
    assert.equal(result.decision, 'ALLOW_WITH_OBLIGATIONS');
    assert.equal(result.eligible, true);
    assert.ok(result.obligations.includes('ATTRIBUTION_REQUIRED'));
  });

  it('does not let derived-use permission imply redistribution permission', () => {
    assert.equal(evaluateMarketDataRights(base, ['derived_scoring_research', 'api_redistribution']).eligible, false);
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
    const result = evaluateMarketDataRights(research, ['scientific_research_tdm']);
    assert.equal(result.decision, 'ALLOW');
    assert.equal(result.eligible, true);
    assert.equal(evaluateMarketDataRights(research, ['scientific_research_tdm', 'api_redistribution']).eligible, false);
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
    assert.equal(result.eligible, false);
    assert.ok(result.reasons.includes('LAWFUL_ACCESS_UNVERIFIED'));
  });
});

const inventoryPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../docs/security/evidence/license-rights-review.json',
);

describe('provider rights inventory projection', () => {
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as { providers: unknown[] };
  const projections = inventory.providers.map(projectProviderRights);
  const cohort = bindFirstActivationCohort(projections);

  it('projects the four inventoried providers without filling null rights', () => {
    assert.deepEqual(projections.map(item => item.providerId), ['binance', 'kraken', 'twelvedata', 'polygon']);
    for (const projection of projections) {
      assert.equal(projection.inventoryStatus, 'CONTRACT_SCOPE_UNVERIFIED');
      assert.equal(projection.deployEligible, false);
      assert.equal(projection.datasetScopeVerified, false);
      assert.equal(projection.evidence.feedsSymbolsAndVenues, null);
      assert.notEqual(projection.evidence.feedsSymbolsAndVenues, projection.technicalEndpoint);
      assert.equal(projection.evidence.scientificResearchTdm, null);
      assert.equal(projection.evidence.reviewedAt, null);
      assert.equal(projection.evidence.validUntil, null);
      assert.equal(projection.unparsedValidityAndReviewDate, null);
      for (const permission of Object.values(projection.evidence.permissions)) {
        assert.equal(permission.allowed, null);
        assert.equal(permission.evidenceReference, null);
      }
      assert.equal(projection.researchOnly.decision, 'REVIEW_REQUIRED');
      assert.equal(projection.researchOnly.eligible, false);
      assert.equal(projection.commercialProduct.decision, 'REVIEW_REQUIRED');
      assert.equal(projection.commercialProduct.eligible, false);
      assert.ok(projection.researchOnly.reasons.includes('RESEARCH_TDM_EVIDENCE_MISSING'));
      assert.equal(projection.commercialProduct.decision === 'ALLOW', false);
      assert.equal(projection.researchOnly.decision === 'BLOCK', false);
    }
  });

  it('keeps the research path from authorizing the commercial path', () => {
    for (const projection of projections) {
      assert.equal(projection.researchOnly.eligible, false);
      assert.equal(evaluateMarketDataRights(projection.evidence, ['scientific_research_tdm', 'api_redistribution']).eligible, false);
      assert.ok(projection.researchScope?.includes('NOT_ARCHIVED_EXECUTED_CONTRACT'));
    }
  });

  it('binds integrity, data quality and liquidity without commercial activation', () => {
    assert.deepEqual(cohort.map(item => item.componentId), FIRST_ACTIVATION_COHORT.map(item => item.componentId));
    for (const binding of cohort) {
      assert.equal(binding.commerciallyActive, false);
      assert.equal(binding.researchOnlyEligible, false);
      for (const provider of binding.providers) {
        assert.equal(provider.commercialDecision, 'REVIEW_REQUIRED');
        assert.equal(provider.researchDecision, 'REVIEW_REQUIRED');
        assert.equal(provider.datasetScopeVerified, false);
      }
    }
    const integrity = cohort[0];
    assert.ok(integrity.providers.find(provider => provider.providerId === 'coinbase')?.reasons.includes('PROVIDER_NOT_IN_RIGHTS_INVENTORY'));
    const quality = cohort[1];
    assert.ok(quality.providers.find(provider => provider.providerId === 'alphavantage')?.reasons.includes('PROVIDER_NOT_IN_RIGHTS_INVENTORY'));
    const binance = integrity.providers.find(provider => provider.providerId === 'binance');
    assert.ok(binance?.reasons.includes('USE_CASE_UNVERIFIED:internal_analysis'));
    assert.ok(binance?.reasons.includes('USE_CASE_UNVERIFIED:derived_scoring_research'));
    assert.ok(binance?.reasons.includes('DATASET_SCOPE_UNVERIFIED'));
    assert.ok(binance?.reasons.includes('RESEARCH_SCOPE_IS_NOT_STATUTORY_EVIDENCE'));
  });
});
