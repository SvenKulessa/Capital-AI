import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CADS_GITHUB_APP_REGISTRATION,
  CADS_MARKETPLACE_COMMUNITY_PLAN,
  handleCadsCommunityMarketplacePurchaseEvent,
  resolveCadsCommunityMarketplaceEntitlement,
} from './cads-marketplace-community.mjs';

test('CADS Community plan is free and cannot unlock paid capabilities', () => {
  const plan = CADS_MARKETPLACE_COMMUNITY_PLAN;
  assert.equal(plan.priceModel, 'FREE');
  assert.deepEqual(plan.billingCycles, []);
  assert.equal(plan.commerceBoundary.communityUserMayBeCharged, false);
  assert.equal(plan.commerceBoundary.stripeAuthoritative, false);
  assert.equal(plan.commerceBoundary.marketplaceAuthoritative, true);
  assert.equal(plan.commerceBoundary.paidMarketplacePlansEnabled, false);
  assert.equal(plan.capabilities.standardProfiles, true);
  assert.equal(plan.capabilities.githubCheck, 'neutral');
  assert.equal(plan.capabilities.runSummary, true);
  assert.equal(plan.capabilities.history, false);
  assert.equal(plan.capabilities.evidenceExport, false);
  assert.equal(plan.capabilities.customProfiles, false);
  assert.equal(plan.capabilities.enforcedPrGate, false);
  assert.equal(plan.capabilities.api, false);
  assert.equal(plan.capabilities.selfHostedRunner, false);
});

test('GitHub App permissions stay least-privilege for the community slice', () => {
  assert.deepEqual(CADS_GITHUB_APP_REGISTRATION.permissions, {
    metadata: 'read',
    contents: 'read',
    pull_requests: 'read',
    checks: 'write',
  });
  assert.deepEqual(CADS_GITHUB_APP_REGISTRATION.events, ['pull_request', 'installation']);
  assert.equal(CADS_GITHUB_APP_REGISTRATION.requestOauthOnInstall, false);
  assert.equal(CADS_GITHUB_APP_REGISTRATION.marketplaceWebhook, 'SEPARATE_LISTING_WEBHOOK_REQUIRED');
});

test('community entitlement is authoritative only for a Marketplace free/community plan', () => {
  assert.equal(resolveCadsCommunityMarketplaceEntitlement(null).active, false);
  assert.equal(resolveCadsCommunityMarketplaceEntitlement({plan:{name:'Enterprise'}}).active, false);

  const free = resolveCadsCommunityMarketplaceEntitlement({
    marketplace_purchase: { plan: { name: 'Free' } },
  });
  assert.equal(free.active, true);
  assert.equal(free.plan, 'community');
  assert.equal(free.capabilities.enforcedPrGate, false);
});

test('free-only marketplace lifecycle accepts purchase and cancellation but rejects paid transitions', () => {
  const purchased = handleCadsCommunityMarketplacePurchaseEvent({
    action: 'purchased',
    marketplace_purchase: { account: { id: 42 }, plan: { name: 'Community' } },
  });
  assert.equal(purchased.accepted, true);
  assert.equal(purchased.entitlementActive, true);

  const cancelled = handleCadsCommunityMarketplacePurchaseEvent({
    action: 'cancelled',
    marketplace_purchase: { account: { id: 42 }, plan: { name: 'Community' } },
  });
  assert.equal(cancelled.accepted, true);
  assert.equal(cancelled.entitlementActive, false);

  const changed = handleCadsCommunityMarketplacePurchaseEvent({
    action: 'changed',
    marketplace_purchase: { account: { id: 42 }, plan: { name: 'Community' } },
  });
  assert.equal(changed.accepted, false);
  assert.equal(changed.reason, 'PAID_MARKETPLACE_LIFECYCLE_NOT_ENABLED');
});
