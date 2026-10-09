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
  assert.match(pricing, /Zusatzprodukte/);
  assert.match(pricing, /Separater Lernzugang/);
  assert.match(pricing, /nicht Bestandteil von Starter,[\s\S]*Pro oder Enterprise/);

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


test('additional products catalog exposes only currently available add-ons', () => {
  const catalog = readFileSync(new URL('../src/data/additionalProductsCatalog.ts', import.meta.url), 'utf8');
  const pricing = readFileSync(new URL('../src/features/pricing/MonetizationModal.tsx', import.meta.url), 'utf8');

  assert.match(catalog, /id: 'market-vocabulary'/);
  assert.match(catalog, /state: 'available'/);
  assert.match(catalog, /badgeLicense: 'LicenseRef-CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-1\.0'/);
  assert.match(pricing, /Starter · Pro · Enterprise/);
  assert.match(pricing, /Zusatzprodukte/);
  assert.match(pricing, /BENCHMARK_TIERS/);
  assert.match(pricing, /CADS Benchmark Engine enthalten/);
  assert.match(pricing, /GitHub Check · enforced/);
  assert.match(pricing, /Benchmark-Evidence unterstützt Entscheidungen/);
  assert.match(pricing, /ADDITIONAL_PRODUCTS_CATALOG\.map/);
  assert.match(pricing, /Vocabulary ansehen \/ erwerben/);
  assert.doesNotMatch(catalog, /data-api|white-label|cpt-|token|nft/i);
});


test('pricing uses licensed badges and server-authorized subscription checkout state', () => {
  const pricing = readFileSync(new URL('../src/features/pricing/MonetizationModal.tsx', import.meta.url), 'utf8');

  assert.match(pricing, /\/branding\/badges\/starter\.svg/);
  assert.match(pricing, /\/branding\/badges\/pro\.svg/);
  assert.match(pricing, /\/branding\/badges\/enterprise\.svg/);
  assert.match(pricing, /\/branding\/badges\/vocabulary\.svg/);
  assert.match(pricing, /\/branding\/badges\/data-pipeline-blueprint\.svg/);
  assert.match(pricing, /geschützten Quant-\/Pro-Begriffen/);
  assert.match(pricing, /serverseitig berechtigte Lernzugang/);
  assert.match(pricing, /if \(authenticated === false\)/);
  const commerceState = readFileSync(new URL('../src/features/pricing/commerceState.ts', import.meta.url), 'utf8');
  assert.match(commerceState, /\/api\/billing\/subscriptions\/readiness/);
  assert.match(pricing, /\/api\/billing\/subscriptions\/checkout/);
  assert.match(pricing, /if \(!subscriptionCheckoutEnabled\)/);
  assert.match(pricing, /Es wurde keine Zahlung gestartet/);
  assert.match(pricing, /target\.hostname !== 'checkout\.stripe\.com'/);
  assert.match(pricing, /pointer-events-none select-none opacity-45/);
});

test('profile reads CADS entitlements only from the authenticated server endpoint', () => {
  const profile = readFileSync(new URL('../src/components/ProfilePage.tsx', import.meta.url), 'utf8');

  assert.match(profile, /\/api\/cads\/commerce\/entitlement/);
  assert.match(profile, /credentials: 'same-origin'/);
  assert.match(profile, /cache: 'no-store'/);
  assert.match(profile, /response\.status === 403/);
  assert.match(profile, /CADS-Berechtigungen konnten nicht sicher geladen werden und bleiben fail-closed/);
  assert.match(profile, /Es wurde keine CADS-Berechtigung clientseitig abgeleitet/);
  assert.match(profile, /serverseitig verifiziert/);
  assert.doesNotMatch(profile, /price_1UMA4/);
});
