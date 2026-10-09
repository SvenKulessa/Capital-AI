import {
  FinalRankResultSchema,
  type FinalRankResult,
} from '../../contracts/canonicalContracts';
import type { DataProvenanceMode } from '../../contracts/analysisComponentRegistry';

/** UI publication is rechecked at render time; a formerly live snapshot can become stale. */
export function safeScorePresentation(
  input: unknown,
  now: number,
  maxAgeMs = 30_000,
) {
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0)
    return {
      result: null,
      data: 'unavailable' as DataProvenanceMode,
      score: null,
      ranked: false,
      reason: 'Zeitbasis für die Frischeprüfung ungültig.',
    };
  const parsed = FinalRankResultSchema.safeParse(input);
  if (!parsed.success)
    return {
      result: null,
      data: 'unavailable' as DataProvenanceMode,
      score: null,
      ranked: false,
      reason: 'Ergebnisvertrag ungültig.',
    };
  const result = parsed.data;
  const age = now - result.computedAt;
  const future = age < 0;
  const stale = age > maxAgeMs;
  const degraded = result.dataAvailability === 'degraded';
  const hasEvidence = /^EVD-[a-f0-9]{64}$/.test(result.evidenceId);
  const blocked =
    future ||
    stale ||
    degraded ||
    !hasEvidence ||
    !result.scoreEligible ||
    !result.eligibility;
  return {
    result,
    data: result.isDemo
      ? ('simulated' as const)
      : future
        ? ('unavailable' as const)
        : stale
          ? ('degraded' as const)
          : result.dataAvailability,
    score: !blocked && !result.isDemo ? result.finalScore : null,
    ranked: !blocked && result.rankEligible && result.rank !== null,
    reason: future
      ? 'Zeitstempel liegt in der Zukunft.'
      : stale
        ? 'Berechnung veraltet.'
        : !hasEvidence
          ? 'Kein verifizierbarer Evidence-Verweis.'
          : blocked
            ? 'Bewertung nicht zur Veröffentlichung zugelassen.'
            : null,
  };
}
export function createUnavailableResult(
  asset: {
    assetId: string;
    symbol: string;
    assetClass: FinalRankResult['assetClass'];
  },
  modelVersion: string,
  now: number,
): FinalRankResult {
  return FinalRankResultSchema.parse({
    ...asset,
    rank: null,
    finalScore: null,
    resultStatus: 'insufficient_data',
    dataAvailability: 'unavailable',
    scoreEligible: false,
    rankEligible: false,
    alertEligible: false,
    decisionEligible: false,
    eligibility: false,
    confidence: 0,
    riskPenalty: 0,
    subScores: {
      momentumScore: null,
      technicalScore: null,
      fundamentalScore: null,
      sentimentScore: null,
      eventScore: null,
      positioningScore: null,
    },
    weightsApplied: {
      weightMomentum: 0.2,
      weightTechnical: 0.25,
      weightFundamental: 0.2,
      weightSentiment: 0.15,
      weightEvent: 0.1,
      weightPositioning: 0.1,
    },
    topPositiveDrivers: [],
    topNegativeDrivers: [],
    reasonCodes: ['PROVIDER_RESULT_UNAVAILABLE', 'EVIDENCE_REPLAY_UNAVAILABLE'],
    eligibilityReason: 'Pflichtdaten und Quellen fehlen.',
    modelVersion,
    evidenceId: `UNVERIFIED-${asset.assetId}`,
    computedAt: now,
    isDemo: false,
    regulatoryDisclaimer:
      'Ein hoher Score beschreibt Modellausrichtung, keine garantierte Rendite. Keine Anlageberatung.',
  });
}
