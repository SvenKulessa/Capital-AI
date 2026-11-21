import test from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING_UNIVERSE_ASSETS } from '../Branding/learningUniverseAssetRegistry.mjs';
import {
  LEARNING_UNIVERSE_COMMERCIAL_DRAFT_SCHEMA,
  buildLearningUniverseCommercialDraft,
  LEARNING_UNIVERSE_INTERNAL_PRICE_TARGETS,
  LEARNING_UNIVERSE_PROMOTION_WINDOW,
  calculateLearningUniverseInternalPromotion,
  getLearningUniverseResellerPilotTarget,
} from '../Branding/learningUniverseCommercialLicenseDrafts.mjs';

test('all commercial concepts are inquiry-only and cannot grant licensing or publishing authority', () => {
  assert.equal(LEARNING_UNIVERSE_COMMERCIAL_DRAFT_SCHEMA, 'CAPITAL_AI_LEARNING_UNIVERSE_COMMERCIAL_DRAFTS@1');
  for (const offer of ['PUBLISHER', 'STUDIO', 'RESELLER']) {
    const draft = buildLearningUniverseCommercialDraft(offer);
    assert.equal(draft.status, 'DRAFT_ONLY');
    assert.equal(draft.salesMode, 'INQUIRY_ONLY');
    assert.equal(draft.priceStatus, 'OWNER_INTERNAL_TARGET_APPROVED_PUBLIC_SALES_HOLD');
    assert.equal(draft.publicPriceReference, 'NOT_PROVEN');
    assert.equal(draft.publicPromotionAllowed, false);
    assert.deepEqual(draft.internalTarget, LEARNING_UNIVERSE_INTERNAL_PRICE_TARGETS[offer]);
    assert.equal(draft.amountCents, null);
    assert.equal(draft.stripeProductId, null);
    assert.equal(draft.stripePriceId, null);
    assert.equal(draft.signedAgreement, false);
    assert.equal(draft.buyerEntitled, false);
    assert.equal(draft.licensedUseAllowed, false);
    assert.equal(draft.publishingAllowed, false);
    assert.equal(draft.rawAssetResaleAllowed, false);
    assert.equal(draft.sublicensingAllowed, false);
    assert.equal(draft.automaticFulfilmentAllowed, false);
    assert.equal(draft.assetBindings.length, 10);
    assert.deepEqual(draft.assetBindings, LEARNING_UNIVERSE_ASSETS.map(a => ({
      assetId: a.id, sha256: a.sha256, mimeType: a.mimeType,
    })));
    assert.equal(Object.isFrozen(draft), true);
    assert.equal(Object.isFrozen(draft.assetBindings), true);
    assert.ok(draft.termsRef.includes('/CAPITAL-AI-LEARNING-UNIVERSE-'));
  }
});

test('a reseller concept still prohibits raw-asset resale and automatic sublicenses', () => {
  const proposal = buildLearningUniverseCommercialDraft('RESELLER');
  assert.equal(proposal.intendedUse, 'RESELL_END_PRODUCT_WITH_SIGNED_SUBLICENSE');
  assert.equal(proposal.rawAssetResaleAllowed, false);
  assert.equal(proposal.sublicensingAllowed, false);
});

test('unknown, forged or mutable offer inputs never produce a license', () => {
  for (const bad of ['', null, undefined, {}, [], 'publisher', 'RESELLER_APPROVED', 'PUBLISHER;LICENSED', 1]) {
    assert.throws(() => buildLearningUniverseCommercialDraft(bad), /COMMERCIAL_LICENSE_DRAFT_UNKNOWN_OFFER/);
  }
});

test('discounts are additive percentage points: Publisher 99 to 74.25/69.30 and Studio 290 to 217.50/203.00', () => {
  assert.deepEqual(
    ['PUBLISHER', 'STUDIO'].map(k => calculateLearningUniverseInternalPromotion(k, '2026-11-26').internalTargetPriceCents),
    [7425, 21750]
  );
  assert.deepEqual(
    ['PUBLISHER', 'STUDIO'].map(k => calculateLearningUniverseInternalPromotion(k, '2026-11-27').internalTargetPriceCents),
    [6930, 20300]
  );
  assert.equal(calculateLearningUniverseInternalPromotion('PUBLISHER', '2026-12-01').discountPercent, 30);
  assert.equal(calculateLearningUniverseInternalPromotion('STUDIO', '2026-12-02').discountPercent, 25);
  assert.equal(calculateLearningUniverseInternalPromotion('PUBLISHER', '2026-12-31').discountPercent, 25);
  assert.equal(calculateLearningUniverseInternalPromotion('STUDIO', '2027-01-01').discountPercent, 0);
  assert.equal(calculateLearningUniverseInternalPromotion('PUBLISHER', '2026-11-20').discountPercent, 0);
  assert.equal(LEARNING_UNIVERSE_PROMOTION_WINDOW.timezone, 'Europe/Berlin');
});

test('approved internal target prices never authorize a live offer, fake previous-price reference or public campaign', () => {
  for (const key of ['PUBLISHER', 'STUDIO']) {
    for (const date of ['2026-11-21','2026-11-27','2026-12-01','2026-12-31','2027-01-01']) {
      const p = calculateLearningUniverseInternalPromotion(key, date);
      assert.equal(p.priceAuthority, 'OWNER_INTERNAL_TARGET_APPROVED');
      assert.equal(p.publicPriceReference, 'NOT_PROVEN');
      assert.equal(p.publicPromotionAllowed, false);
      assert.equal(p.orderCreationAllowed, false);
      assert.equal(p.currencyTaxTreatment, 'NET_B2B_SUBJECT_TO_TAX_REVIEW');
      assert.equal(Object.isFrozen(p), true);
      assert.equal(buildLearningUniverseCommercialDraft(key).amountCents, null);
      assert.equal(buildLearningUniverseCommercialDraft(key).buyerEntitled, false);
    }
  }
});

test('90-day invited reseller buys at 70% of non-promotional base with free onboarding, no stacking or price fixing', () => {
  assert.equal(LEARNING_UNIVERSE_INTERNAL_PRICE_TARGETS.RESELLER.pilotDays, 90);
  assert.equal(LEARNING_UNIVERSE_INTERNAL_PRICE_TARGETS.RESELLER.pilotOnboardingCents, 0);
  assert.deepEqual(
    ['PUBLISHER','STUDIO'].map(key => getLearningUniverseResellerPilotTarget(key).wholesaleTargetCents),
    [6930, 20300]
  );
  for (const key of ['PUBLISHER','STUDIO']) {
    const r = getLearningUniverseResellerPilotTarget(key);
    assert.equal(r.purchasePercentOfBasePrice, 70);
    assert.equal(r.seasonalPromotionsStack, false);
    assert.equal(r.downstreamCustomerPriceControlled, false);
    assert.equal(r.rawAssetResaleAllowed, false);
    assert.equal(r.grantStatus, 'NOT_ISSUED');
    assert.equal(r.publicSaleAllowed, false);
  }
});

test('invalid dates, resellers and untrusted inputs cannot enter promotion computation', () => {
  for (const bad of [null, undefined, '', {}, [], 123, '2026-02-30', '2026-11-27T00:00', '27.11.2026']) {
    assert.throws(() => calculateLearningUniverseInternalPromotion('PUBLISHER', bad),
      /LEARNING_PROMO_INVALID_LOCAL_DATE/);
  }
  for (const bad of ['RESELLER', 'PUBLISHER_APPROVED', null, {}, '__proto__']) {
    assert.throws(() => calculateLearningUniverseInternalPromotion(bad, '2026-11-27'), /LEARNING_PROMO_UNSUPPORTED_OFFER/);
    assert.throws(() => getLearningUniverseResellerPilotTarget(bad), /RESELLER_PILOT_INVALID_OFFER/);
  }
});
