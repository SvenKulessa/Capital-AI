import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BILLING_CATALOG } from '../server/billing-catalog.mjs';

const evidence=JSON.parse(readFileSync(new URL('../docs/security/evidence/stripe-catalog-readback-20261006.json',import.meta.url),'utf8'));
const frontend=readFileSync(new URL('../src/data/pricingCatalog.ts',import.meta.url),'utf8');

test('Supabase Stripe wrapper readback matches the authoritative three-tier catalog',()=>{
  assert.equal(evidence.schemaVersion,'CAPITAL_AI_STRIPE_CATALOG_READBACK@1');
  assert.equal(evidence.catalogVersion,BILLING_CATALOG.version);
  assert.equal(evidence.currency,BILLING_CATALOG.currency);
  assert.equal(evidence.products.length,3);
  assert.equal(evidence.prices.length,6);

  for(const product of evidence.products){
    assert.equal(product.id,BILLING_CATALOG.tiers[product.tier].productId);
    assert.equal(product.active,true);
    assert.equal(product.livemode,true);
  }
  for(const price of evidence.prices){
    const tier=BILLING_CATALOG.tiers[price.tier];
    assert.equal(price.productId,tier.productId);
    assert.equal(price.id,price.cycle==='annual'?tier.annualPriceId:tier.monthlyPriceId);
    assert.equal(price.active,true);
    assert.equal(price.livemode,true);
    assert.ok(frontend.includes(`priceId: '${price.id}'`));
    assert.ok(frontend.includes(`amountCents: ${price.amountCents}`));
  }
});

test('historical 2026-10-06 evidence records the superseded three-purchase policy and forbids live Price IDs',()=>{
  assert.deepEqual(evidence.testPurchasePolicy.tiers,['starter','pro','enterprise']);
  assert.equal(evidence.testPurchasePolicy.requiredCount,3);
  assert.equal(evidence.testPurchasePolicy.stripeMode,'test');
  assert.equal(evidence.testPurchasePolicy.livePriceIdsAllowed,false);
  assert.equal(evidence.securityGate.dataApiExposureReview,'PASS_NO_CLIENT_PRIVILEGES_OBSERVED');
  assert.equal(evidence.securityGate.effectiveAnonSchemaUsage,false);
  assert.equal(evidence.securityGate.effectiveAuthenticatedSchemaUsage,false);
  assert.equal(evidence.securityGate.effectiveAnonProductsPricesSubscriptionsSelect,false);
  assert.equal(evidence.securityGate.effectiveAuthenticatedProductsPricesSubscriptionsSelect,false);
  assert.equal(evidence.securityGate.supabaseSecurityAdvisorStripeRlsFinding,false);
  assert.equal(evidence.securityGate.evidenceDoesNotGrantProductionApproval,true);
});
