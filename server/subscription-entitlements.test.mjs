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
      status: 'active', livemode: true,
      items: { data: [{ price: { id: catalog.monthlyPriceId } }] },
    }), tier);

    assert.equal(normalizeStripeSubscriptionTier({
      status: 'trialing', livemode: true,
      attrs: { items: { data: [{ price: catalog.annualPriceId }] }, status: 'trialing' },
    }), tier);
  });
}

test('metadata alone cannot grant a paid tier', () => {
  assert.equal(normalizeStripeSubscriptionTier({
    status: 'active', livemode: true,
    metadata: { plan_id: 'ENTERPRISE' },
    items: { data: [] },
  }), null);
});

test('metadata and price conflicts fail closed', () => {
  assert.equal(normalizeStripeSubscriptionTier({
    status: 'active', livemode: true,
    metadata: { plan_id: 'starter' },
    items: { data: [{ price: { id: BILLING_CATALOG.tiers.pro.monthlyPriceId } }] },
  }), null);
});

test('unknown prices and inactive subscriptions never grant paid tiers', () => {
  assert.equal(normalizeStripeSubscriptionTier({
    status: 'active', livemode: true,
    items: { data: [{ price: { id: 'price_unknown' } }] },
  }), null);
  assert.equal(normalizeStripeSubscriptionTier({
    status: 'canceled',
    metadata: { plan_id: 'enterprise' },
  }), null);
});

test('stored paid tiers require an active or trialing subscription with unexpired period', () => {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  assert.equal(normalizeStoredPaidTier({ tier: 'Starter', status: 'active', currentPeriodEnd: future }), 'starter');
  assert.equal(normalizeStoredPaidTier({ tier: 'Pro', status: 'trialing', currentPeriodEnd: future.replace('Z', '+00:00') }), 'pro');
  assert.equal(normalizeStoredPaidTier({ tier: 'Enterprise', status: 'past_due', currentPeriodEnd: future }), null);
  assert.equal(normalizeStoredPaidTier({ tier: 'Free', status: 'active', currentPeriodEnd: future }), null);
});

test('stored paid tiers fail closed when their subscription period has ended', () => {
  const expired = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  for (const [tier, status] of [['Starter', 'active'], ['Pro', 'trialing'], ['Enterprise', 'active']]) {
    assert.equal(normalizeStoredPaidTier({ tier, status, currentPeriodEnd: expired }), null);
  }
});

test('stored paid tiers fail closed for missing, malformed, or timezone-ambiguous period', () => {
  const base = { tier: 'Pro', status: 'active' };
  for (const currentPeriodEnd of [undefined, null, '', 1234567890000, 'not-a-date', '2030-01-01', '2030-01-01T00:00:00']) {
    assert.equal(normalizeStoredPaidTier({ ...base, currentPeriodEnd }), null);
  }
});

for (const invalid of [
  { metadata: { plan_id: 'PRO' }, items: { data: [{ price: { id: 'price_unknown' } }] } },
  { metadata: { plan_id: 'PRO' } },
  { livemode: false, items: { data: [{ price: { id: BILLING_CATALOG.tiers.pro.monthlyPriceId } }] } },
  { metadata: { plan_id: 'ADMIN' }, items: { data: [{ price: { id: BILLING_CATALOG.tiers.pro.monthlyPriceId } }] } },
  { items: { data: [{ price: { id: BILLING_CATALOG.tiers.pro.monthlyPriceId } }, { price: { id: 'price_unknown' } }] } },
]) test('unknown/missing price, testmode, malformed metadata or multiple items deny paid tier', () => {
  assert.equal(normalizeStripeSubscriptionTier({ status: 'active', livemode: true, ...invalid }), null);
});
