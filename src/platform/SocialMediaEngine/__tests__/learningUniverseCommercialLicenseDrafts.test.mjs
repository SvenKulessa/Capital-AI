import test from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING_UNIVERSE_ASSETS } from '../Branding/learningUniverseAssetRegistry.mjs';
import {
  LEARNING_UNIVERSE_COMMERCIAL_DRAFT_SCHEMA,
  buildLearningUniverseCommercialDraft,
} from '../Branding/learningUniverseCommercialLicenseDrafts.mjs';

test('all commercial concepts are inquiry-only and cannot grant licensing or publishing authority', () => {
  assert.equal(LEARNING_UNIVERSE_COMMERCIAL_DRAFT_SCHEMA, 'CAPITAL_AI_LEARNING_UNIVERSE_COMMERCIAL_DRAFTS@1');
  for (const offer of ['PUBLISHER', 'STUDIO', 'RESELLER']) {
    const draft = buildLearningUniverseCommercialDraft(offer);
    assert.equal(draft.status, 'DRAFT_ONLY');
    assert.equal(draft.salesMode, 'INQUIRY_ONLY');
    assert.equal(draft.priceStatus, 'UNAUTHORIZED');
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
