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


test('production pricing surface only renders catalog-backed products and standalone Vocabulary', () => {
  const pricing = readFileSync(new URL('../src/features/pricing/MonetizationModal.tsx', import.meta.url), 'utf8');

  assert.match(pricing, /PRICING_CATALOG\.starter\.label/);
  assert.match(pricing, /PRICING_CATALOG\.pro\.label/);
  assert.match(pricing, /PRICING_CATALOG\.enterprise\.label/);
  assert.match(pricing, /Eigenständiges Paket/);
  assert.match(pricing, /nicht Bestandteil[\s\S]*Starter, Pro oder Enterprise/);

  assert.doesNotMatch(pricing, /In Pro &amp; Enterprise inklusive/);
  assert.doesNotMatch(pricing, /B2B &amp; Data API|Ertrags-Simulator|Strategie &amp; Compliance/);
  assert.doesNotMatch(pricing, /499 € \/ Mo\.|1\.499 € \/ Mo\.|2\.499 € \/ Mo\./);
  assert.doesNotMatch(pricing, /CPA Neukunden-Provision|Trading-Fee Revenue-Share/);
  assert.doesNotMatch(pricing, /Stripe Price|VOCABULARY_PRICE\.priceId/);
  assert.doesNotMatch(pricing, /Alpha Elite|Trader &amp; Pro/);
});

test('production pricing dialog exposes keyboard and modal semantics', () => {
  const pricing = readFileSync(new URL('../src/features/pricing/MonetizationModal.tsx', import.meta.url), 'utf8');

  assert.match(pricing, /role="dialog"/);
  assert.match(pricing, /aria-modal="true"/);
  assert.match(pricing, /aria-labelledby="pricing-dialog-title"/);
  assert.match(pricing, /aria-label="Preisliste schließen"/);
  assert.match(pricing, /role="switch"/);
  assert.match(pricing, /aria-checked=\{billingCycle === 'annual'\}/);
  assert.match(pricing, /event\.key === 'Escape'/);
  assert.match(pricing, /event\.key !== 'Tab'/);
  assert.match(pricing, /closeButtonRef\.current\?\.focus\(\)/);
});
