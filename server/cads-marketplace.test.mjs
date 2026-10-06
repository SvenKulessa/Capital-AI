import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import {
  cadsMarketplaceConfig,
  createCadsMarketplace,
  publicCadsMarketplaceReadiness,
  tierForMarketplacePlanId,
} from './cads-marketplace.mjs';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });

function baseEnv() {
  return {
    CADS_GITHUB_APP_ID: '12345',
    CADS_GITHUB_APP_PRIVATE_KEY: PRIVATE_KEY,
    CADS_GITHUB_MARKETPLACE_WEBHOOK_SECRET: 'x'.repeat(48),
    CADS_GITHUB_MARKETPLACE_OWNER_ORG: 'capital-ai-online',
    CADS_GITHUB_MARKETPLACE_LISTING_SLUG: 'capital-ai-cads',
    CADS_GITHUB_MARKETPLACE_STARTER_PLAN_ID: '1001',
    CADS_GITHUB_MARKETPLACE_PRO_PLAN_ID: '1002',
    CADS_GITHUB_MARKETPLACE_ENTERPRISE_PLAN_ID: '1003',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_' + 'x'.repeat(40),
  };
}

test('paid Marketplace runtime requires app, distinct plan IDs and service-role store', () => {
  const ready = publicCadsMarketplaceReadiness(baseEnv());
  assert.equal(ready.target, 'PAID_PRODUCTION');
  assert.deepEqual(ready.plans, ['starter', 'pro', 'enterprise']);
  assert.equal(ready.pricingCurrency, 'USD');
  assert.equal(ready.monthlyAndAnnualRequired, true);
  assert.equal(ready.freePlanEnabled, false);
  assert.equal(ready.appConfigured, true);
  assert.equal(ready.planIdsConfigured, true);
  assert.equal(ready.entitlementStoreConfigured, true);
  assert.equal(ready.runtimeReady, true);

  const broken = baseEnv();
  broken.CADS_GITHUB_MARKETPLACE_PRO_PLAN_ID = '1001';
  assert.equal(cadsMarketplaceConfig(broken).runtimeReady, false);
});

test('Marketplace plan IDs map only to canonical benchmark tiers', () => {
  const env = baseEnv();
  assert.equal(tierForMarketplacePlanId(1001, env), 'starter');
  assert.equal(tierForMarketplacePlanId(1002, env), 'pro');
  assert.equal(tierForMarketplacePlanId(1003, env), 'enterprise');
  assert.equal(tierForMarketplacePlanId(9999, env), null);
});

test('readiness exposes no secrets or concrete plan IDs', () => {
  const payload = JSON.stringify(publicCadsMarketplaceReadiness(baseEnv()));
  assert.equal(payload.includes(PRIVATE_KEY), false);
  assert.equal(payload.includes('1001'), false);
  assert.equal(payload.includes('sb_secret_'), false);
});

test('cleanup is fail-closed when the entitlement store is absent', async () => {
  const env = baseEnv();
  delete env.SUPABASE_SECRET_KEY;
  const marketplace = createCadsMarketplace({ env, fetchImpl: async () => { throw new Error('must not fetch'); } });
  assert.deepEqual(await marketplace.purgeCancelledData(), { configured: false });
});
