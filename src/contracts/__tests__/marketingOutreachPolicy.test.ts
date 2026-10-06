import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MARKETING_FROM_ADDRESS,
  authorizeMarketingOutreach,
  determineEmailMarketingPermission,
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
  gdprProcessingBasis: 'CONSENT' as const,
  gdprBasisEvidenceRef: 'gdpr:consent:123',
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
  assert.equal(determineEmailMarketingPermission(admittedBase), 'EXPLICIT_CONSENT');
  assert.equal(isMarketingEmailEligible(admittedBase), true);
});

test('cold promotional email remains blocked', () => {
  const decision = evaluateMarketingOutreach({
    ...admittedBase,
    explicitConsent: false,
    consentEvidenceRef: undefined,
    gdprProcessingBasis: 'NONE',
    gdprBasisEvidenceRef: undefined,
    existingCustomer: false,
  });
  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.includes('NO_EMAIL_MARKETING_PERMISSION'));
  assert.ok(decision.reasons.includes('GDPR_BASIS_NOT_ADMITTED'));
});

test('existing-customer exception requires all UWG conditions and separate GDPR evidence', () => {
  const decision = evaluateMarketingOutreach({
    ...admittedBase,
    explicitConsent: false,
    consentEvidenceRef: undefined,
    existingCustomer: true,
    addressObtainedDuringSale: true,
    ownSimilarProductsOnly: true,
    optOutNoticeAtCollection: true,
    gdprProcessingBasis: 'LEGITIMATE_INTERESTS',
    gdprBasisEvidenceRef: 'gdpr:lia:similar-products:1',
  });

  assert.equal(decision.emailPermission, 'EXISTING_CUSTOMER_EXCEPTION');
  assert.equal(decision.gdprProcessingBasis, 'LEGITIMATE_INTERESTS');
  assert.equal(decision.allowed, true);

  assert.equal(evaluateMarketingOutreach({
    ...admittedBase,
    explicitConsent: false,
    consentEvidenceRef: undefined,
    existingCustomer: true,
    addressObtainedDuringSale: true,
    ownSimilarProductsOnly: true,
    optOutNoticeAtCollection: true,
    gdprProcessingBasis: 'NONE',
    gdprBasisEvidenceRef: undefined,
  }).allowed, false);
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

test('automated outreach is technically unlockable only after policy and runtime gates pass', () => {
  assert.throws(
    () => authorizeMarketingOutreach(admittedBase, {}),
    /MARKETING_OUTREACH_DISABLED/,
  );

  assert.throws(
    () => authorizeMarketingOutreach(admittedBase, {
      GROWTH_OUTREACH_ENABLED: 'true',
      GROWTH_OUTREACH_KILL_SWITCH: 'true',
    }),
    /KILL_SWITCH/,
  );

  const permit = authorizeMarketingOutreach(admittedBase, {
    GROWTH_OUTREACH_ENABLED: 'true',
  });
  assert.equal(permit.from, MARKETING_FROM_ADDRESS);
  assert.equal(permit.emailPermission, 'EXPLICIT_CONSENT');

  assert.throws(
    () => authorizeMarketingOutreach({
      ...admittedBase,
      objected: true,
    }, {
      GROWTH_OUTREACH_ENABLED: 'true',
    }),
    /NOT_ELIGIBLE/,
  );
});
