import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GROWTH_ATTRIBUTION_POLICY_VERSION,
  assertAttributionSourceSeparation,
  correlateGrowthAttribution,
} from '../growthAttribution.ts';

const base = {
  policyVersion: GROWTH_ATTRIBUTION_POLICY_VERSION,
  canonicalUrl: 'https://capital-ai.online/',
  occurredAt: '2026-10-06T19:30:00.000Z',
  campaignId: 'launch-2026-10',
  contentId: 'homepage-launch',
} as const;

test('GSC, Umami and social evidence correlate without semantic mixing', () => {
  const bundles = correlateGrowthAttribution([
    {
      ...base,
      source: 'GSC_SEARCH',
      evidenceRef: 'gsc:query:1',
      metrics: [
        { name: 'clicks', value: 12, unit: 'COUNT' },
        { name: 'averagePosition', value: 8.2, unit: 'POSITION' },
      ],
    },
    {
      ...base,
      source: 'UMAMI_PRODUCT',
      evidenceRef: 'umami:event:1',
      metrics: [
        { name: 'sessions', value: 20, unit: 'COUNT' },
        { name: 'signupConversions', value: 3, unit: 'COUNT' },
      ],
    },
    {
      ...base,
      source: 'SOCIAL_PROVIDER',
      providerEntityId: 'post:123',
      evidenceRef: 'social:analytics:1',
      metrics: [
        { name: 'impressions', value: 400, unit: 'COUNT' },
        { name: 'clicks', value: 15, unit: 'COUNT' },
      ],
    },
  ]);

  assert.equal(bundles.length, 1);
  assert.equal(bundles[0].search.length, 1);
  assert.equal(bundles[0].product.length, 1);
  assert.equal(bundles[0].social.length, 1);
  assert.doesNotThrow(() => assertAttributionSourceSeparation(bundles[0]));
});

test('different canonical/campaign/content identities do not merge', () => {
  const bundles = correlateGrowthAttribution([
    {
      ...base,
      source: 'GSC_SEARCH',
      evidenceRef: 'gsc:1',
      metrics: [{ name: 'clicks', value: 1, unit: 'COUNT' }],
    },
    {
      ...base,
      campaignId: 'other-campaign',
      source: 'UMAMI_PRODUCT',
      evidenceRef: 'umami:2',
      metrics: [{ name: 'sessions', value: 1, unit: 'COUNT' }],
    },
  ]);

  assert.equal(bundles.length, 2);
});
