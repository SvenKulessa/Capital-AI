import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GROWTH_AI_CAPABILITY_POLICY,
  GROWTH_AI_PROMOTION_POLICY_VERSION,
  GrowthMarketingDraftSchema,
  assertGrowthCapabilityAllowed,
} from '../growthAiPromotion.ts';

test('Gemini is the preferred admitted provider for owned marketing-content generation', () => {
  assert.equal(GROWTH_AI_CAPABILITY_POLICY.CONTENT_DRAFTING.provider, 'GEMINI');
  assert.equal(GROWTH_AI_CAPABILITY_POLICY.IMAGE_GENERATION.provider, 'GEMINI');
  assert.equal(GROWTH_AI_CAPABILITY_POLICY.TTS.provider, 'GEMINI');
  assert.equal(GROWTH_AI_CAPABILITY_POLICY.CONTENT_DRAFTING.productionEligible, false);
  assert.equal(GROWTH_AI_CAPABILITY_POLICY.IMAGE_GENERATION.productionEligible, false);
  assert.equal(GROWTH_AI_CAPABILITY_POLICY.TTS.productionEligible, false);
});

test('Google Search Grounding is fail-closed for autonomous lead discovery', () => {
  assert.equal(GROWTH_AI_CAPABILITY_POLICY.SEARCH_GROUNDING.leadDiscoveryAllowed, false);
  assert.equal(GROWTH_AI_CAPABILITY_POLICY.SEARCH_GROUNDING.interactiveOnly, true);
  assert.throws(
    () => assertGrowthCapabilityAllowed('SEARCH_GROUNDING', 'DISCOVERY'),
    /not admitted/,
  );
});

test('lead discovery remains provider-neutral and OSS-first', () => {
  const policy = assertGrowthCapabilityAllowed('LEAD_DISCOVERY', 'DISCOVERY');
  assert.equal(policy.provider, 'OSS');
  assert.equal(policy.productionEligible, false);
});

test('automated outreach remains blocked until compliance admission', () => {
  assert.throws(
    () => assertGrowthCapabilityAllowed('OUTREACH_DELIVERY', 'PUBLISH'),
    /not admitted/,
  );
});

test('video generation is draft-only until production admission is explicit', () => {
  const policy = assertGrowthCapabilityAllowed('VIDEO_GENERATION', 'DRAFT');
  assert.equal(policy.provider, 'GEMINI');
  assert.equal(policy.productionEligible, false);
  assert.throws(
    () => assertGrowthCapabilityAllowed('VIDEO_GENERATION', 'PUBLISH'),
    /not admitted/,
  );
});

test('Gemini marketing output is strictly schema-validated and evidence-bound', () => {
  const parsed = GrowthMarketingDraftSchema.parse({
    policyVersion: GROWTH_AI_PROMOTION_POLICY_VERSION,
    productId: 'capital-ai',
    sourceSha: 'c13de16d8af006c37b08db616d1016173c99e7db',
    locale: 'de-DE',
    canonicalUrl: 'https://capital-ai.online/',
    channels: ['WEBSITE', 'LINKEDIN'],
    headline: 'CAPITAL-AI',
    summary: 'Evidence-bound product draft.',
    callToAction: 'Produktdokumentation ansehen.',
    claims: [{
      text: 'Die Anwendung besitzt eine öffentlich dokumentierte Architektur.',
      kind: 'PRODUCT_FACT',
      evidenceUrls: ['https://capital-ai.online/documentary'],
    }],
    disclosures: ['Keine Anlageberatung.'],
    generatedBy: {
      provider: 'GEMINI',
      model: 'gemini-3.8-flash',
    },
  });

  assert.equal(parsed.policyVersion, GROWTH_AI_PROMOTION_POLICY_VERSION);
  assert.equal(parsed.claims.length, 1);

  assert.throws(() => GrowthMarketingDraftSchema.parse({
    ...parsed,
    unexpectedAuthority: true,
  }));

  assert.throws(() => GrowthMarketingDraftSchema.parse({
    ...parsed,
    claims: [{
      text: 'Unbelegter Claim',
      kind: 'MARKETING',
      evidenceUrls: [],
    }],
  }));
});
