import assert from 'node:assert/strict';
import test from 'node:test';
import { createCadsCommerce } from './cads-commerce.mjs';
import { BILLING_CATALOG } from './billing-catalog.mjs';

function responseHarness() {
  return { setHeader() {} };
}

async function invoke(commerce, path, method = 'GET') {
  let status = 0;
  let payload = null;
  const handled = await commerce.handle(
    { method, headers: {} },
    responseHarness(),
    new URL('https://capital-ai.online' + path),
    (_res, nextStatus, nextPayload) => { status = nextStatus; payload = nextPayload; },
  );
  return { handled, status, payload };
}

test('CADS readiness projects the existing Stripe tiers without inventing a new SKU', async () => {
  const commerce = createCadsCommerce();
  const result = await invoke(commerce, '/api/cads/commerce/readiness');

  assert.equal(result.status, 200);
  assert.equal(result.payload.catalogVersion, BILLING_CATALOG.version);
  assert.deepEqual(Object.keys(result.payload.tiers), ['starter', 'pro', 'enterprise']);
  assert.equal(result.payload.tiers.starter.stripeProductId, BILLING_CATALOG.tiers.starter.productId);
  assert.equal(result.payload.tiers.pro.capabilities.history, true);
  assert.equal(result.payload.tiers.enterprise.capabilities.enforcedPrGate, true);
  assert.equal(result.payload.githubMarketplace.stripeStatusAuthoritative, false);
  assert.equal(result.payload.githubMarketplace.strategy, 'COMMUNITY_FIRST');
  assert.equal(result.payload.githubMarketplace.communityPlan.priceModel, 'FREE');
  assert.equal(result.payload.githubMarketplace.communityPlan.capabilities.githubCheck, 'neutral');
  assert.equal(result.payload.githubMarketplace.communityPlan.capabilities.enforcedPrGate, false);
  assert.equal(result.payload.githubMarketplace.communityPurchaseLifecycleImplemented, true);
  assert.equal(result.payload.githubMarketplace.paidMarketplacePlansEnabled, false);
  assert.equal(result.payload.githubMarketplace.paidMarketplacePlanIdsAssigned, false);
  assert.equal(result.payload.productionEligible, false);
  assert.equal(result.payload.decisionEligible, false);
});

test('CADS entitlement is derived only from a verified paid subscription tier', async () => {
  const commerce = createCadsCommerce({
    auth: {
      verify: async () => ({ userId: '00000000-0000-4000-8000-000000000001' }),
      resolvePaidTier: async () => 'pro',
    },
  });
  const result = await invoke(commerce, '/api/cads/commerce/entitlement');

  assert.equal(result.status, 200);
  assert.equal(result.payload.tier, 'pro');
  assert.equal(result.payload.capabilities.standardProfiles, true);
  assert.equal(result.payload.capabilities.history, true);
  assert.equal(result.payload.capabilities.customProfiles, false);
  assert.equal(result.payload.billingAuthority, 'STRIPE_SUBSCRIPTION');
  assert.equal(result.payload.marketplaceEntitlement, false);
  assert.equal(result.payload.benchmarkEvidenceOnly, true);
});

test('CADS entitlement fails closed without authentication or paid tier', async () => {
  const unauthenticated = createCadsCommerce({
    auth: { verify: async () => null, resolvePaidTier: async () => { throw new Error('must not run'); } },
  });
  assert.equal((await invoke(unauthenticated, '/api/cads/commerce/entitlement')).status, 401);

  const free = createCadsCommerce({
    auth: {
      verify: async () => ({ userId: '00000000-0000-4000-8000-000000000001' }),
      resolvePaidTier: async () => null,
    },
  });
  const result = await invoke(free, '/api/cads/commerce/entitlement');
  assert.equal(result.status, 403);
  assert.equal(result.payload.error, 'paid_cads_entitlement_required');
});

test('CADS commerce exposes no mutating method', async () => {
  const commerce = createCadsCommerce();
  const result = await invoke(commerce, '/api/cads/commerce/readiness', 'POST');
  assert.equal(result.status, 405);
});

test('CADS entitlement response does not expose redundant user identifiers', async () => {
  const commerce = createCadsCommerce({
    auth: {
      verify: async () => ({ userId: '00000000-0000-4000-8000-000000000001' }),
      resolvePaidTier: async () => 'starter',
    },
  });
  const result = await invoke(commerce, '/api/cads/commerce/entitlement');
  assert.equal(result.status, 200);
  assert.equal('userId' in result.payload, false);
});
