import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MARKETING_FROM_ADDRESS,
  determineMarketingLegalBasis,
  evaluateFrequencyCap,
  evaluateMarketingOutreach,
  isMarketingEmailEligible,
} from '../marketingOutreachPolicy.ts';

const admittedBase = {
  explicitConsent: true,
  consentEvidenceRef: 'consent:123',
  consentWithdrawn: false,
  existingCustomer: false,
  addressObtainedDuringSale: false,
  ownSimilarProductsOnly: false,
  objected: false,
  optOutNoticeAtCollection: false,
  optOutNoticeInMessage: true,
  unsubscribeMechanismAvailable: true,
  suppressed: false,
  frequencyCapAllowed: true,
  frequency: {
    sentLast24Hours: 0,
    sentLast7Days: 0,
    sentLast30Days: 0,
    maxPer24Hours: 1,
    maxPer7Days: 2,
    maxPer30Days: 4,
  },
  senderIdentityVerified: true,
  auditEvidenceRef: 'audit:outreach:123',
} as const;

test('consent path is evidence-bound and sender identity is fixed', () => {
  assert.equal(MARKETING_FROM_ADDRESS, 'support@capital-ai.online');
  assert.equal(determineMarketingLegalBasis(admittedBase), 'EXPLICIT_CONSENT');
  assert.equal(isMarketingEmailEligible(admittedBase), true);
});

test('cold promotional email remains blocked', () => {
  const decision = evaluateMarketingOutreach({
    ...admittedBase,
    explicitConsent: false,
    consentEvidenceRef: undefined,
    existingCustomer: false,
  });
  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.includes('NO_ADMITTED_LEGAL_BASIS'));
});

test('existing-customer similar-product path requires collection and message opt-out', () => {
  const decision = evaluateMarketingOutreach({
    ...admittedBase,
    explicitConsent: false,
    consentEvidenceRef: undefined,
    existingCustomer: true,
    addressObtainedDuringSale: true,
    ownSimilarProductsOnly: true,
    optOutNoticeAtCollection: true,
  });

  assert.equal(decision.legalBasis, 'EXISTING_CUSTOMER_SIMILAR_PRODUCTS');
  assert.equal(decision.allowed, true);
});

test('suppression, objection and withdrawn consent are fail-closed', () => {
  for (const patch of [
    {
      suppressed: true,
      suppressionReason: 'UNSUBSCRIBED' as const,
      suppressionEvidenceRef: 'suppression:1',
    },
    { objected: true },
    { consentWithdrawn: true },
  ]) {
    assert.equal(evaluateMarketingOutreach({ ...admittedBase, ...patch }).allowed, false);
  }
});

test('frequency cap is deterministic and mandatory', () => {
  assert.equal(evaluateFrequencyCap(admittedBase.frequency), true);
  assert.equal(evaluateFrequencyCap({
    ...admittedBase.frequency,
    sentLast7Days: 2,
  }), false);

  assert.equal(evaluateMarketingOutreach({
    ...admittedBase,
    frequency: {
      ...admittedBase.frequency,
      sentLast30Days: 4,
    },
  }).allowed, false);
});

test('unsubscribe mechanism, sender identity and audit evidence are required', () => {
  assert.equal(evaluateMarketingOutreach({
    ...admittedBase,
    unsubscribeMechanismAvailable: false,
  }).allowed, false);

  assert.equal(evaluateMarketingOutreach({
    ...admittedBase,
    senderIdentityVerified: false,
  }).allowed, false);

  assert.equal(evaluateMarketingOutreach({
    ...admittedBase,
    auditEvidenceRef: undefined,
  }).allowed, false);
});
