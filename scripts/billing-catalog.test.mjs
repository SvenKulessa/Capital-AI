import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { BILLING_CATALOG } from '../server/billing-catalog.mjs';

test('public billing IDs and version match the frontend projection', () => {
  const frontend = readFileSync(new URL('../src/data/pricingCatalog.ts', import.meta.url), 'utf8');
  assert.ok(frontend.includes(`'${BILLING_CATALOG.version}'`));
  assert.equal(BILLING_CATALOG.currency, 'eur');
  const frontendIds = [...frontend.matchAll(/(?:productId|priceId): '([^']+)'/g)].map(match => match[1]).sort();
  const backendIds = [
    ...Object.values(BILLING_CATALOG.tiers).flatMap(tier => Object.values(tier)),
    BILLING_CATALOG.addons.vocabulary.productId,
    BILLING_CATALOG.addons.vocabulary.priceId,
  ].sort();
  assert.deepEqual(frontendIds, backendIds);
  assert.equal(new Set(backendIds).size, 11);
});

test('catalog exposes only version, currency and public product/price identifiers', () => {
  assert.deepEqual(Object.keys(BILLING_CATALOG).sort(), ['addons', 'currency', 'tiers', 'version']);
  for (const tier of Object.values(BILLING_CATALOG.tiers)) {
    assert.deepEqual(Object.keys(tier).sort(), ['annualPriceId', 'monthlyPriceId', 'productId']);
    assert.match(tier.productId, /^prod_[A-Za-z0-9]+$/);
    assert.match(tier.monthlyPriceId, /^price_[A-Za-z0-9]+$/);
    assert.match(tier.annualPriceId, /^price_[A-Za-z0-9]+$/);
  }
  assert.deepEqual(Object.keys(BILLING_CATALOG.addons.vocabulary).sort(), [
    'amountCents', 'priceId', 'productId', 'taxBehavior',
  ]);
  assert.match(BILLING_CATALOG.addons.vocabulary.productId, /^prod_[A-Za-z0-9]+$/);
  assert.match(BILLING_CATALOG.addons.vocabulary.priceId, /^price_[A-Za-z0-9]+$/);
  assert.equal(BILLING_CATALOG.addons.vocabulary.amountCents, 1900);
  assert.equal(BILLING_CATALOG.addons.vocabulary.taxBehavior, 'inclusive');
  assert.equal('includedIn' in BILLING_CATALOG.addons.vocabulary, false);
});
