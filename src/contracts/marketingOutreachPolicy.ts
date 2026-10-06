export const MARKETING_OUTREACH_POLICY_VERSION = 'MARKETING_OUTREACH_POLICY@3' as const;
export const MARKETING_FROM_ADDRESS = 'support@capital-ai.online' as const;

export type EmailMarketingPermission =
  | 'EXPLICIT_CONSENT'
  | 'EXISTING_CUSTOMER_EXCEPTION'
  | 'NONE';

export type GdprProcessingBasis =
  | 'CONSENT'
  | 'LEGITIMATE_INTERESTS'
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

  gdprProcessingBasis: GdprProcessingBasis;
  gdprBasisEvidenceRef?: string;

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
  emailPermission: EmailMarketingPermission;
  gdprProcessingBasis: GdprProcessingBasis;
  reasons: string[];
}

export interface MarketingOutreachPermit {
  policyVersion: typeof MARKETING_OUTREACH_POLICY_VERSION;
  from: typeof MARKETING_FROM_ADDRESS;
  emailPermission: Exclude<EmailMarketingPermission, 'NONE'>;
  gdprProcessingBasis: Exclude<GdprProcessingBasis, 'NONE'>;
  auditEvidenceRef: string;
}

export type MarketingOutreachRuntimeEnv = Record<string, string | undefined>;

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

export function determineEmailMarketingPermission(
  input: MarketingEmailEligibilityInput,
): EmailMarketingPermission {
  if (
    input.explicitConsent
    && input.consentEvidenceRef
    && !input.consentWithdrawn
  ) {
    return 'EXPLICIT_CONSENT';
  }

  if (
    input.existingCustomer
    && input.addressObtainedDuringSale
    && input.ownSimilarProductsOnly
    && input.optOutNoticeAtCollection
    && !input.objected
  ) {
    return 'EXISTING_CUSTOMER_EXCEPTION';
  }

  return 'NONE';
}

function isGdprBasisCompatible(
  permission: EmailMarketingPermission,
  input: MarketingEmailEligibilityInput,
): boolean {
  if (!input.gdprBasisEvidenceRef) return false;

  if (permission === 'EXPLICIT_CONSENT') {
    return input.gdprProcessingBasis === 'CONSENT';
  }

  if (permission === 'EXISTING_CUSTOMER_EXCEPTION') {
    return input.gdprProcessingBasis === 'LEGITIMATE_INTERESTS';
  }

  return false;
}

export function evaluateMarketingOutreach(
  input: MarketingEmailEligibilityInput,
): MarketingOutreachDecision {
  const reasons: string[] = [];
  const emailPermission = determineEmailMarketingPermission(input);

  if (emailPermission === 'NONE') reasons.push('NO_EMAIL_MARKETING_PERMISSION');
  if (!isGdprBasisCompatible(emailPermission, input)) reasons.push('GDPR_BASIS_NOT_ADMITTED');

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
    emailPermission,
    gdprProcessingBasis: input.gdprProcessingBasis,
    reasons,
  };
}

export function isMarketingEmailEligible(input: MarketingEmailEligibilityInput): boolean {
  return evaluateMarketingOutreach(input).allowed;
}

export function authorizeMarketingOutreach(
  input: MarketingEmailEligibilityInput,
  env: MarketingOutreachRuntimeEnv = process.env,
): MarketingOutreachPermit {
  if (env.GROWTH_OUTREACH_KILL_SWITCH === 'true') {
    throw new Error('MARKETING_OUTREACH_KILL_SWITCH');
  }
  if (env.GROWTH_OUTREACH_ENABLED !== 'true') {
    throw new Error('MARKETING_OUTREACH_DISABLED');
  }

  const decision = evaluateMarketingOutreach(input);
  if (!decision.allowed ||
      decision.emailPermission === 'NONE' ||
      decision.gdprProcessingBasis === 'NONE' ||
      !input.auditEvidenceRef) {
    throw new Error('MARKETING_OUTREACH_NOT_ELIGIBLE');
  }

  return {
    policyVersion: MARKETING_OUTREACH_POLICY_VERSION,
    from: MARKETING_FROM_ADDRESS,
    emailPermission: decision.emailPermission,
    gdprProcessingBasis: decision.gdprProcessingBasis,
    auditEvidenceRef: input.auditEvidenceRef,
  };
}
