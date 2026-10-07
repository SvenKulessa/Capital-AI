import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GROWTH_DISCOVERY_POLICY_VERSION,
  assertDiscoveryProvenanceAllowed,
  scoreGrowthLead,
} from '../growthDiscovery.ts';

const provenance = {
  policyVersion: GROWTH_DISCOVERY_POLICY_VERSION,
  sourceUrl: 'https://example.org/project',
  sourceType: 'PUBLIC_WEB',
  discoveredAt: '2026-10-06T19:30:00.000Z',
  searchSource: 'SELF_HOSTED_SEARCH',
  robotsDecision: 'ALLOWED',
  robotsEvidenceRef: 'robots:https://example.org/robots.txt',
  termsDecision: 'ALLOWED_FOR_DISCOVERY',
  termsEvidenceRef: 'terms:example.org:2026-10-06',
  purpose: 'B2B_PRODUCT_FIT_DISCOVERY',
  containsSensitivePersonalData: false,
  personalContactHarvested: false,
} as const;

test('discovery provenance blocks robots and terms violations', () => {
  assert.equal(assertDiscoveryProvenanceAllowed(provenance).robotsDecision, 'ALLOWED');

  assert.throws(
    () => assertDiscoveryProvenanceAllowed({ ...provenance, robotsDecision: 'DISALLOWED' }),
    /ROBOTS_BLOCKED/,
  );
  assert.throws(
    () => assertDiscoveryProvenanceAllowed({ ...provenance, termsDecision: 'RESTRICTED' }),
    /TERMS_BLOCKED/,
  );
});

test('lead scoring is deterministic and never grants outreach authority', () => {
  const signals = {
    productNeed: 20,
    technicalOverlap: 18,
    openSourceAffinity: 12,
    commercialFit: 15,
    evidenceQuality: 8,
    recency: 8,
  };

  const first = scoreGrowthLead(signals, provenance);
  const second = scoreGrowthLead(signals, provenance);

  assert.deepEqual(first, second);
  assert.equal(first.score, 81);
  assert.equal(first.enrichmentEligible, true);
  assert.equal(first.outreachEligible, false);
});

test('weak evidence prevents enrichment even at otherwise high score', () => {
  const result = scoreGrowthLead({
    productNeed: 25,
    technicalOverlap: 20,
    openSourceAffinity: 15,
    commercialFit: 20,
    evidenceQuality: 2,
    recency: 10,
  }, provenance);

  assert.equal(result.score, 92);
  assert.equal(result.enrichmentEligible, false);
  assert.equal(result.outreachEligible, false);
});
