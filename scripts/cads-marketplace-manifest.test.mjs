import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  CADS_GITHUB_APP_REGISTRATION,
  CADS_MARKETPLACE_COMMUNITY_PLAN,
} from '../server/cads-marketplace-community.mjs';

const registration = JSON.parse(readFileSync(
  new URL('../apps/cads-github-app/github-app-registration.example.json', import.meta.url),
  'utf8',
));
const plans = JSON.parse(readFileSync(
  new URL('../apps/cads-github-app/marketplace-plans.json', import.meta.url),
  'utf8',
));

test('CADS GitHub App registration manifest matches the code authority', () => {
  assert.equal(registration.name, CADS_GITHUB_APP_REGISTRATION.name);
  assert.equal(registration.public, true);
  assert.equal(registration.request_oauth_on_install, false);
  assert.deepEqual(registration.permissions, CADS_GITHUB_APP_REGISTRATION.permissions);
  assert.deepEqual(registration.events, CADS_GITHUB_APP_REGISTRATION.events);
  assert.equal(registration.marketplace_webhook, 'CONFIGURE_SEPARATELY_IN_DRAFT_LISTING');
});

test('CADS Marketplace manifest publishes Community only and no paid pricing', () => {
  assert.equal(plans.strategy, 'COMMUNITY_FIRST');
  assert.equal(plans.plans.length, 1);
  assert.equal(plans.plans[0].id, CADS_MARKETPLACE_COMMUNITY_PLAN.id);
  assert.equal(plans.plans[0].priceModel, 'FREE');
  assert.deepEqual(plans.plans[0].billing, []);
  assert.equal(plans.paidPlans.enabled, false);
  assert.equal(plans.paidPlans.planIdsAssigned, false);
  assert.equal(plans.paidPlans.pricingAssigned, false);
});
