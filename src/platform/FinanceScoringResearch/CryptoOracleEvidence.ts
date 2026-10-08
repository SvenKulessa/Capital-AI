export const CRYPTO_ORACLE_EVIDENCE_VERSION = 'crypto-oracle-evidence/0.1.0' as const;

export type CryptoOracleObservationRole = 'PRIMARY' | 'FALLBACK';
export type CryptoOracleAvailability = 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN';
export type CryptoOracleGateState = 'PASS' | 'BLOCKED' | 'NOT_COMPUTABLE';

export interface CryptoOracleFeedIdentity {
  readonly protocolId: string;
  readonly chainId: string;
  readonly oracleId: string;
  readonly feedId: string;
  readonly baseAssetId: string;
  readonly quoteAssetId: string;
}

export interface CryptoOracleObservation extends CryptoOracleFeedIdentity {
  readonly role: CryptoOracleObservationRole;
  readonly availability: CryptoOracleAvailability;
  readonly observedAtMs: number;
  readonly feedUpdatedAtMs: number;
  readonly providerId: string;
  readonly authorityId: string;
  readonly authorityVersion: string;
  readonly sourceAuthorityId: string;
  readonly sourceAuthorityVersion: string;
  readonly deviationBps: number | null;
  readonly confidenceBps: number | null;
  readonly evidenceRefs: readonly string[];
}

export interface CryptoOracleEvidencePolicy {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly maxObservationAgeMs: number;
  readonly maxFeedUpdateAgeMs: number;
  readonly maxDeviationBps: number;
  readonly maxConfidenceBps: number;
  readonly minIndependentSourceAuthorities: number;
  readonly fallbackRequirement: 'NOT_REQUIRED' | 'REQUIRED';
}

export interface CryptoOracleEvidenceEvaluation {
  readonly contractVersion: typeof CRYPTO_ORACLE_EVIDENCE_VERSION;
  readonly feed: CryptoOracleFeedIdentity;
  readonly state: CryptoOracleGateState;
  readonly oracleRiskWithinPolicy: boolean | null;
  readonly acceptedObservationCount: number;
  readonly independentSourceAuthorityCount: number;
  readonly authorityIds: readonly string[];
  readonly sourceAuthorityIds: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly reason: string;
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_EVIDENCE_ONLY';
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function sameRiskIdentity(feed: CryptoOracleFeedIdentity, observation: CryptoOracleObservation): boolean {
  const sameScope = (
    observation.protocolId === feed.protocolId &&
    observation.chainId === feed.chainId &&
    observation.baseAssetId === feed.baseAssetId &&
    observation.quoteAssetId === feed.quoteAssetId
  );
  if (!sameScope) return false;

  if (observation.role === 'PRIMARY') {
    return observation.oracleId === feed.oracleId && observation.feedId === feed.feedId;
  }

  return hasText(observation.oracleId) && hasText(observation.feedId);
}

function validNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function admissibleObservation(
  feed: CryptoOracleFeedIdentity,
  observation: CryptoOracleObservation,
  policy: CryptoOracleEvidencePolicy,
  evaluatedAtMs: number,
): boolean {
  if (!sameRiskIdentity(feed, observation)) return false;
  if (!Number.isFinite(observation.observedAtMs) || observation.observedAtMs <= 0) return false;
  if (!Number.isFinite(observation.feedUpdatedAtMs) || observation.feedUpdatedAtMs <= 0) return false;
  if (observation.observedAtMs > evaluatedAtMs || observation.feedUpdatedAtMs > evaluatedAtMs) return false;
  if (evaluatedAtMs - observation.observedAtMs > policy.maxObservationAgeMs) return false;
  if (!hasText(observation.providerId)) return false;
  if (!hasText(observation.authorityId) || !hasText(observation.authorityVersion)) return false;
  if (!hasText(observation.sourceAuthorityId) || !hasText(observation.sourceAuthorityVersion)) return false;
  if (observation.evidenceRefs.length === 0 || observation.evidenceRefs.some((ref) => !hasText(ref))) return false;
  if (observation.deviationBps !== null && !validNonNegative(observation.deviationBps)) return false;
  if (observation.confidenceBps !== null && !validNonNegative(observation.confidenceBps)) return false;
  return true;
}

function evaluation(
  feed: CryptoOracleFeedIdentity,
  state: CryptoOracleGateState,
  oracleRiskWithinPolicy: boolean | null,
  observations: readonly CryptoOracleObservation[],
  reason: string,
): CryptoOracleEvidenceEvaluation {
  const authorityIds = Object.freeze(
    [...new Set(observations.map((entry) => `${entry.authorityId}@${entry.authorityVersion}`))].sort(),
  );
  const sourceAuthorityIds = Object.freeze(
    [...new Set(observations.map((entry) => `${entry.sourceAuthorityId}@${entry.sourceAuthorityVersion}`))].sort(),
  );
  const evidenceRefs = Object.freeze(
    [...new Set(observations.flatMap((entry) => entry.evidenceRefs))].sort(),
  );

  return Object.freeze({
    contractVersion: CRYPTO_ORACLE_EVIDENCE_VERSION,
    feed: Object.freeze({ ...feed }),
    state,
    oracleRiskWithinPolicy,
    acceptedObservationCount: observations.length,
    independentSourceAuthorityCount: sourceAuthorityIds.length,
    authorityIds,
    sourceAuthorityIds,
    evidenceRefs,
    reason,
    scoreEligible: false,
    executionEligible: false,
    authority: 'RESEARCH_EVIDENCE_ONLY',
  });
}

function invalidFeedOrPolicy(
  feed: CryptoOracleFeedIdentity,
  policy: CryptoOracleEvidencePolicy,
  evaluatedAtMs: number,
): boolean {
  return (
    !hasText(feed.protocolId) ||
    !hasText(feed.chainId) ||
    !hasText(feed.oracleId) ||
    !hasText(feed.feedId) ||
    !hasText(feed.baseAssetId) ||
    !hasText(feed.quoteAssetId) ||
    !hasText(policy.policyId) ||
    !hasText(policy.policyVersion) ||
    !Number.isFinite(policy.maxObservationAgeMs) || policy.maxObservationAgeMs <= 0 ||
    !Number.isFinite(policy.maxFeedUpdateAgeMs) || policy.maxFeedUpdateAgeMs <= 0 ||
    !validNonNegative(policy.maxDeviationBps) ||
    !validNonNegative(policy.maxConfidenceBps) ||
    !Number.isInteger(policy.minIndependentSourceAuthorities) || policy.minIndependentSourceAuthorities <= 0 ||
    !Number.isFinite(evaluatedAtMs) || evaluatedAtMs <= 0
  );
}

export function evaluateCryptoOracleEvidence(
  feed: CryptoOracleFeedIdentity,
  observations: readonly CryptoOracleObservation[] | null | undefined,
  policy: CryptoOracleEvidencePolicy,
  evaluatedAtMs: number,
): CryptoOracleEvidenceEvaluation {
  if (invalidFeedOrPolicy(feed, policy, evaluatedAtMs)) {
    return evaluation(feed, 'NOT_COMPUTABLE', null, [], 'Oracle-Feed-Identität, Policy oder Evaluationszeit ist ungültig.');
  }

  const admitted = Object.freeze(
    (observations ?? []).filter((entry) => admissibleObservation(feed, entry, policy, evaluatedAtMs)),
  );

  if (admitted.length === 0) {
    return evaluation(feed, 'NOT_COMPUTABLE', null, admitted, 'Keine frische, identitätsgebundene Oracle-Evidence attestiert.');
  }

  const primary = admitted.filter((entry) => entry.role === 'PRIMARY');
  const fallback = admitted.filter((entry) => entry.role === 'FALLBACK');

  if (primary.length === 0) {
    return evaluation(feed, 'NOT_COMPUTABLE', null, admitted, 'Keine admissible PRIMARY-Oracle-Evidence vorhanden.');
  }

  if (policy.fallbackRequirement === 'REQUIRED' && fallback.length === 0) {
    return evaluation(feed, 'NOT_COMPUTABLE', null, primary, 'Die Oracle-Policy verlangt attestierte FALLBACK-Evidence.');
  }

  const gateRelevant = Object.freeze(
    policy.fallbackRequirement === 'REQUIRED' ? [...primary, ...fallback] : [...primary],
  );

  const hasUnknownAvailability = gateRelevant.some((entry) => entry.availability === 'UNKNOWN');
  if (hasUnknownAvailability) {
    return evaluation(feed, 'NOT_COMPUTABLE', null, gateRelevant, 'Mindestens eine gate-relevante Oracle-Observation hat unbekannte Availability.');
  }

  const unavailable = gateRelevant.find((entry) => entry.availability === 'UNAVAILABLE');
  if (unavailable) {
    return evaluation(feed, 'BLOCKED', false, gateRelevant, `${unavailable.role}-Oracle meldet UNAVAILABLE.`);
  }

  const staleFeed = gateRelevant.find((entry) => evaluatedAtMs - entry.feedUpdatedAtMs > policy.maxFeedUpdateAgeMs);
  if (staleFeed) {
    return evaluation(feed, 'BLOCKED', false, gateRelevant, `${staleFeed.role}-Oracle-Feed ist außerhalb der governten Feed-Freshness-Policy.`);
  }

  const missingDeviation = gateRelevant.some((entry) => entry.deviationBps === null);
  const missingConfidence = gateRelevant.some((entry) => entry.confidenceBps === null);
  if (missingDeviation || missingConfidence) {
    return evaluation(feed, 'NOT_COMPUTABLE', null, gateRelevant, 'Deviation- oder Confidence-Evidence ist unvollständig.');
  }

  const excessiveDeviation = gateRelevant.find((entry) => (entry.deviationBps ?? 0) > policy.maxDeviationBps);
  if (excessiveDeviation) {
    return evaluation(feed, 'BLOCKED', false, gateRelevant, `${excessiveDeviation.role}-Oracle überschreitet die governte Deviation-Grenze.`);
  }

  const excessiveConfidence = gateRelevant.find((entry) => (entry.confidenceBps ?? 0) > policy.maxConfidenceBps);
  if (excessiveConfidence) {
    return evaluation(feed, 'BLOCKED', false, gateRelevant, `${excessiveConfidence.role}-Oracle überschreitet die governte Confidence-/Uncertainty-Grenze.`);
  }

  const sourceAuthorities = new Set(
    gateRelevant.map((entry) => `${entry.sourceAuthorityId}@${entry.sourceAuthorityVersion}`),
  );
  if (sourceAuthorities.size < policy.minIndependentSourceAuthorities) {
    return evaluation(
      feed,
      'NOT_COMPUTABLE',
      null,
      gateRelevant,
      `Nur ${sourceAuthorities.size} unabhängige Source-Authority-Nachweise; mindestens ${policy.minIndependentSourceAuthorities} sind erforderlich.`,
    );
  }

  return evaluation(
    feed,
    'PASS',
    true,
    gateRelevant,
    'Oracle Availability, Feed-Freshness, Deviation, Confidence und Source-Diversity liegen innerhalb der governten Policy.',
  );
}
