export const MARKETING_OUTREACH_POLICY_VERSION = 'MARKETING_OUTREACH_POLICY@2' as const;
export const MARKETING_FROM_ADDRESS = 'support@capital-ai.online' as const;

export type MarketingLegalBasis =
  | 'EXPLICIT_CONSENT'
  | 'EXISTING_CUSTOMER_SIMILAR_PRODUCTS'
  | 'NONE';

export type MarketingSuppressionReason =
  | 'UNSUBSCRIBED'
  | 'OBJECTED'
  | 'CONSENT_WITHDRAWN'
  | 'HARD_BOUNCE'
  | 'COMPLAINT'
  | 'MANUAL_BLOCK'
  | 'LEGAL_HOLD';

export interface MarketingFrequencyWindow {
  sentLast24Hours: number;
  sentLast7Days: number;
  sentLast30Days: number;
  maxPer24Hours: number;
  maxPer7Days: number;
  maxPer30Days: number;
}

export interface MarketingEmailEligibilityInput {
  explicitConsent: boolean;
  consentEvidenceRef?: string;
  consentWithdrawn?: boolean;
  existingCustomer: boolean;
  addressObtainedDuringSale: boolean;
  ownSimilarProductsOnly: boolean;
  objected: boolean;
  optOutNoticeAtCollection: boolean;
  optOutNoticeInMessage: boolean;
  unsubscribeMechanismAvailable?: boolean;
  suppressed: boolean;
  suppressionReason?: MarketingSuppressionReason;
  suppressionEvidenceRef?: string;
  frequencyCapAllowed: boolean;
  frequency?: MarketingFrequencyWindow;
  senderIdentityVerified?: boolean;
  auditEvidenceRef?: string;
}

export interface MarketingOutreachDecision {
  policyVersion: typeof MARKETING_OUTREACH_POLICY_VERSION;
  allowed: boolean;
  legalBasis: MarketingLegalBasis;
  reasons: string[];
}

export function evaluateFrequencyCap(window: MarketingFrequencyWindow): boolean {
  const values = [
    window.sentLast24Hours,
    window.sentLast7Days,
    window.sentLast30Days,
    window.maxPer24Hours,
    window.maxPer7Days,
    window.maxPer30Days,
  ];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error('MARKETING_INVALID_FREQUENCY_WINDOW');
  }

  return window.sentLast24Hours < window.maxPer24Hours
    && window.sentLast7Days < window.maxPer7Days
    && window.sentLast30Days < window.maxPer30Days;
}

export function determineMarketingLegalBasis(
  input: MarketingEmailEligibilityInput,
): MarketingLegalBasis {
  if (input.explicitConsent && input.consentEvidenceRef && !input.consentWithdrawn) {
    return 'EXPLICIT_CONSENT';
  }

  if (
    input.existingCustomer
    && input.addressObtainedDuringSale
    && input.ownSimilarProductsOnly
    && input.optOutNoticeAtCollection
  ) {
    return 'EXISTING_CUSTOMER_SIMILAR_PRODUCTS';
  }

  return 'NONE';
}

export function evaluateMarketingOutreach(
  input: MarketingEmailEligibilityInput,
): MarketingOutreachDecision {
  const reasons: string[] = [];
  const legalBasis = determineMarketingLegalBasis(input);

  if (legalBasis === 'NONE') reasons.push('NO_ADMITTED_LEGAL_BASIS');
  if (input.consentWithdrawn) reasons.push('CONSENT_WITHDRAWN');
  if (input.suppressed) reasons.push('SUPPRESSED');
  if (input.objected) reasons.push('OBJECTED');
  if (!input.optOutNoticeInMessage) reasons.push('MESSAGE_OPT_OUT_NOTICE_MISSING');
  if (input.unsubscribeMechanismAvailable !== true) reasons.push('UNSUBSCRIBE_MECHANISM_MISSING');
  if (input.senderIdentityVerified !== true) reasons.push('SENDER_IDENTITY_NOT_VERIFIED');
  if (!input.auditEvidenceRef) reasons.push('AUDIT_EVIDENCE_MISSING');

  if (input.suppressed && (!input.suppressionReason || !input.suppressionEvidenceRef)) {
    reasons.push('SUPPRESSION_EVIDENCE_INCOMPLETE');
  }

  let frequencyAllowed = input.frequencyCapAllowed;
  if (input.frequency) frequencyAllowed = frequencyAllowed && evaluateFrequencyCap(input.frequency);
  if (!frequencyAllowed) reasons.push('FREQUENCY_CAP_BLOCKED');

  return {
    policyVersion: MARKETING_OUTREACH_POLICY_VERSION,
    allowed: reasons.length === 0,
    legalBasis,
    reasons,
  };
}

export function isMarketingEmailEligible(input: MarketingEmailEligibilityInput): boolean {
  return evaluateMarketingOutreach(input).allowed;
}
