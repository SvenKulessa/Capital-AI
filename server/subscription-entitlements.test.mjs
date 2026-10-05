import assert from 'node:assert/strict';
import test from 'node:test';
import { BILLING_CATALOG } from './billing-catalog.mjs';
import {
  normalizeStoredPaidTier,
  normalizeStripeSubscriptionTier,
  paidTierForPriceId,
} from './subscription-entitlements.mjs';

for (const [tier, catalog] of Object.entries(BILLING_CATALOG.tiers)) {
  test(`${tier} current monthly and annual Stripe prices normalize server-side`, () => {
    assert.equal(paidTierForPriceId(catalog.monthlyPriceId), tier);
    assert.equal(paidTierForPriceId(catalog.annualPriceId), tier);

    assert.equal(normalizeStripeSubscriptionTier({
      status: 'active',
      items: { data: [{ price: { id: catalog.monthlyPriceId } }] },
    }), tier);

    assert.equal(normalizeStripeSubscriptionTier({
      status: 'trialing',
      attrs: { items: { data: [{ price: catalog.annualPriceId }] }, status: 'trialing' },
    }), tier);
  });
}

test('metadata plan_id is normalized case-insensitively for active subscriptions', () => {
  assert.equal(normalizeStripeSubscriptionTier({
    status: 'active',
    metadata: { plan_id: 'ENTERPRISE' },
    items: { data: [] },
  }), 'enterprise');
});

test('metadata and price conflicts fail closed', () => {
  assert.equal(normalizeStripeSubscriptionTier({
    status: 'active',
    metadata: { plan_id: 'starter' },
    items: { data: [{ price: { id: BILLING_CATALOG.tiers.pro.monthlyPriceId } }] },
  }), null);
});

test('unknown prices and inactive subscriptions never grant paid tiers', () => {
  assert.equal(normalizeStripeSubscriptionTier({
    status: 'active',
    items: { data: [{ price: { id: 'price_unknown' } }] },
  }), null);
  assert.equal(normalizeStripeSubscriptionTier({
    status: 'canceled',
    metadata: { plan_id: 'enterprise' },
  }), null);
});

test('stored subscription projection requires active or trialing status', () => {
  assert.equal(normalizeStoredPaidTier({ tier: 'Starter', status: 'active' }), 'starter');
  assert.equal(normalizeStoredPaidTier({ tier: 'Pro', status: 'trialing' }), 'pro');
  assert.equal(normalizeStoredPaidTier({ tier: 'Enterprise', status: 'past_due' }), null);
  assert.equal(normalizeStoredPaidTier({ tier: 'Free', status: 'active' }), null);
});
