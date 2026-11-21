import { LEARNING_UNIVERSE_ASSETS } from './learningUniverseAssetRegistry.mjs';

/** Internal, non-authoritative licensing concepts. Never a sale, license, grant or entitlement. */
export const LEARNING_UNIVERSE_COMMERCIAL_DRAFT_SCHEMA = 'CAPITAL_AI_LEARNING_UNIVERSE_COMMERCIAL_DRAFTS@1';
const OFFER_DEFINITIONS = Object.freeze({
  PUBLISHER: Object.freeze({
    id: 'learning-universe-publisher-draft',
    label: 'Publisher Pack',
    intendedUse: 'PUBLISH_END_PRODUCT',
    termsRef: 'docs/licenses/CAPITAL-AI-LEARNING-UNIVERSE-PUBLISHING-LICENSE-DRAFT-1.0.md',
  }),
  STUDIO: Object.freeze({
    id: 'learning-universe-publisher-studio-draft',
    label: 'Publisher Studio',
    intendedUse: 'PUBLISH_END_PRODUCT',
    termsRef: 'docs/licenses/CAPITAL-AI-LEARNING-UNIVERSE-PUBLISHING-LICENSE-DRAFT-1.0.md',
  }),
  RESELLER: Object.freeze({
    id: 'learning-universe-reseller-draft',
    label: 'Authorized Reseller',
    intendedUse: 'RESELL_END_PRODUCT_WITH_SIGNED_SUBLICENSE',
    termsRef: 'docs/licenses/CAPITAL-AI-LEARNING-UNIVERSE-RESELLER-LICENSE-DRAFT-1.0.md',
  }),
});

/** Owner-authorized INTERNAL 2026 B2B target pricing. This module is not a live price authority. */
export const LEARNING_UNIVERSE_INTERNAL_PRICE_TARGETS = Object.freeze({
  PUBLISHER: Object.freeze({ basePriceCents: 9900, currency: 'EUR' }),
  STUDIO: Object.freeze({ basePriceCents: 29000, currency: 'EUR' }),
  RESELLER: Object.freeze({
    pilotOnboardingCents: 0, pilotDays: 90, purchasePercentOfBasePrice: 70,
    resalePriceControl: false, furtherResaleAllowed: false,
  }),
});
export const LEARNING_UNIVERSE_PROMOTION_WINDOW = Object.freeze({
  timezone: 'Europe/Berlin',
  standardStart: '2026-11-21',
  standardEnd: '2026-12-31',
  blackFridayStart: '2026-11-27',
  cyberTuesdayEnd: '2026-12-01',
  standardDiscountPercent: 25,
  blackFridayExtraPercentagePoints: 5,
  ownerDecision: 'INTERNAL_TARGET_APPROVED',
  publicPriceReference: 'NOT_PROVEN',
  publicPromotionAllowed: false,
});

/** Date-only logic is intentionally independent from servers and customer clocks. */
export function calculateLearningUniverseInternalPromotion(offerKey, localDate) {
  if (offerKey !== 'PUBLISHER' && offerKey !== 'STUDIO') {
    throw new Error('LEARNING_PROMO_UNSUPPORTED_OFFER');
  }
  if (typeof localDate !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(localDate) ||
      Number.isNaN(Date.parse(localDate + 'T00:00:00Z')) ||
      new Date(localDate + 'T00:00:00Z').toISOString().slice(0, 10) !== localDate) {
    throw new Error('LEARNING_PROMO_INVALID_LOCAL_DATE');
  }
  const w = LEARNING_UNIVERSE_PROMOTION_WINDOW;
  const active = localDate >= w.standardStart && localDate <= w.standardEnd;
  const blackFriday = active && localDate >= w.blackFridayStart &&
    localDate <= w.cyberTuesdayEnd;
  const percent = active ? w.standardDiscountPercent +
    (blackFriday ? w.blackFridayExtraPercentagePoints : 0) : 0;
  const basePriceCents = LEARNING_UNIVERSE_INTERNAL_PRICE_TARGETS[offerKey].basePriceCents;
  return Object.freeze({
    offerKey, localDate, currency: 'EUR',
    phase: blackFriday ? 'BLACK_FRIDAY_TO_CYBER_TUESDAY' : active ? 'YEAR_END' : 'BASE_ONLY',
    basePriceCents, discountPercent: percent,
    internalTargetPriceCents: Math.round(basePriceCents * (100 - percent) / 100),
    priceAuthority: 'OWNER_INTERNAL_TARGET_APPROVED',
    publicPriceReference: 'NOT_PROVEN',
    publicPromotionAllowed: false,
    orderCreationAllowed: false,
    currencyTaxTreatment: 'NET_B2B_SUBJECT_TO_TAX_REVIEW',
  });
}
export function getLearningUniverseResellerPilotTarget(offerKey) {
  if (offerKey !== 'PUBLISHER' && offerKey !== 'STUDIO') {
    throw new Error('RESELLER_PILOT_INVALID_OFFER');
  }
  const basePriceCents = LEARNING_UNIVERSE_INTERNAL_PRICE_TARGETS[offerKey].basePriceCents;
  const target = LEARNING_UNIVERSE_INTERNAL_PRICE_TARGETS.RESELLER;
  return Object.freeze({
    offerKey, currency: 'EUR', pilotDays: target.pilotDays,
    onboardingCents: target.pilotOnboardingCents,
    purchasePercentOfBasePrice: target.purchasePercentOfBasePrice,
    wholesaleTargetCents: Math.round(basePriceCents * target.purchasePercentOfBasePrice / 100),
    seasonalPromotionsStack: false,
    downstreamCustomerPriceControlled: false,
    rawAssetResaleAllowed: false,
    grantStatus: 'NOT_ISSUED',
    publicSaleAllowed: false,
  });
}

const BINDINGS = Object.freeze(LEARNING_UNIVERSE_ASSETS.map(({ id, sha256, mimeType }) =>
  Object.freeze({ assetId: id, sha256, mimeType })));
/**
 * Returns inquiry-only contract concepts, not authenticated license receipts.
 * Deliberately accepts only a fixed product key; no untrusted approvals or payment claims.
 */
export function buildLearningUniverseCommercialDraft(offerKey) {
  if (typeof offerKey !== 'string' || !Object.hasOwn(OFFER_DEFINITIONS, offerKey)) {
    throw new Error('COMMERCIAL_LICENSE_DRAFT_UNKNOWN_OFFER');
  }
  const item = OFFER_DEFINITIONS[offerKey];
  return Object.freeze({
    schema: LEARNING_UNIVERSE_COMMERCIAL_DRAFT_SCHEMA,
    ...item,
    status: 'DRAFT_ONLY',
    salesMode: 'INQUIRY_ONLY',
    priceStatus: 'OWNER_INTERNAL_TARGET_APPROVED_PUBLIC_SALES_HOLD',
    internalTarget: LEARNING_UNIVERSE_INTERNAL_PRICE_TARGETS[offerKey],
    publicPriceReference: 'NOT_PROVEN',
    publicPromotionAllowed: false,
    amountCents: null,
    stripeProductId: null,
    stripePriceId: null,
    signedAgreement: false,
    buyerEntitled: false,
    rightsStatus: 'REVIEW_REQUIRED',
    licensedUseAllowed: false,
    publishingAllowed: false,
    rawAssetResaleAllowed: false,
    sublicensingAllowed: false,
    automaticFulfilmentAllowed: false,
    assetBindings: BINDINGS,
  });
}
