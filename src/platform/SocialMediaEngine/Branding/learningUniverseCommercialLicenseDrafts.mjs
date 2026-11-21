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
    priceStatus: 'UNAUTHORIZED',
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
