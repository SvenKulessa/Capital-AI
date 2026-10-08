import type {
  CanonicalScoreResult,
  ScoringAvailabilityStatus,
  ScoringEvidenceRef,
  ScoringIntegrityMetadata,
} from './scoringIntegrityTypes';

export const FEATURE_VERSION = 'financial-features/1.0.0';
export const SCORING_INTEGRITY_VERSION = 'scoring-integrity/1.1.0';

export interface DataQualityGateInput {
  assetId: string;
  providers: string[];
  featureNames: string[];
  values: Record<string, number | undefined | null>;
  evidence?: ScoringEvidenceRef[];
  observedAt?: string;
  retrievedAt?: string;
  minimumCoverage?: number;
  requireEvidence?: boolean;
  minimumHistoryPoints?: number;
  historyPoints?: number;
  maxAgeMs?: number;
  nowMs?: number;
  scoringVersion?: string;
}

export interface DataQualityGateResult {
  ready: boolean;
  integrity: ScoringIntegrityMetadata;
}

function unavailable(
  input: DataQualityGateInput,
  status: Exclude<ScoringAvailabilityStatus, 'READY'>,
  coverage: number,
  missingFields: string[],
  reason: string,
): DataQualityGateResult {
  return {
    ready: false,
    integrity: {
      status,
      assetId: input.assetId,
      providers: input.providers,
      observedAt: input.observedAt,
      retrievedAt: input.retrievedAt ?? new Date().toISOString(),
      dataQuality: coverage > 0 ? 'low' : 'unknown',
      featureVersion: FEATURE_VERSION,
      scoringVersion: input.scoringVersion ?? SCORING_INTEGRITY_VERSION,
      coverage,
      evidence: input.evidence ?? [],
      missingFields,
      reason,
    },
  };
}

/**
 * P0 fail-closed gate for any externally visible financial score.
 * Numeric presence alone is not enough: provenance/evidence, provider identity,
 * completeness, history requirements and freshness are evaluated before scoring.
 */
export function evaluateDataQualityGate(input: DataQualityGateInput): DataQualityGateResult {
  const minimumCoverage = input.minimumCoverage ?? 0.5;
  const featureNames = [...new Set(input.featureNames)];
  const missingFields = featureNames.filter((name) => {
    const value = input.values[name];
    return typeof value !== 'number' || !Number.isFinite(value);
  });
  const coverage = featureNames.length === 0 ? 0 : (featureNames.length - missingFields.length) / featureNames.length;

  if (input.providers.length === 0) {
    return unavailable(input, 'SOURCE_UNAVAILABLE', coverage, missingFields, 'Keine verifizierte Provider-Identität vorhanden.');
  }

  if ((input.requireEvidence ?? true) && (!input.evidence || input.evidence.length === 0)) {
    return unavailable(input, 'SOURCE_UNAVAILABLE', coverage, missingFields, 'Keine belastbare Evidence/Provenance für die Score-Eingaben vorhanden.');
  }

  if (input.minimumHistoryPoints !== undefined && (input.historyPoints ?? 0) < input.minimumHistoryPoints) {
    return unavailable(input, 'INSUFFICIENT_HISTORY', coverage, missingFields, `Mindestens ${input.minimumHistoryPoints} reale Historienpunkte erforderlich.`);
  }

  if (input.maxAgeMs !== undefined) {
    if (!input.observedAt) {
      return unavailable(input, 'DATA_UNAVAILABLE', coverage, missingFields, 'Zeitstempel der Beobachtung fehlt.');
    }
    const observedMs = Date.parse(input.observedAt);
    const nowMs = input.nowMs ?? Date.now();
    if (!Number.isFinite(observedMs) || observedMs > nowMs + 60_000 || nowMs - observedMs > input.maxAgeMs) {
      return unavailable(input, 'STALE_DATA', coverage, missingFields, 'Marktdaten sind veraltet oder zeitlich ungültig.');
    }
  }

  if (coverage < minimumCoverage) {
    return unavailable(input, 'SCORE_NOT_COMPUTABLE', coverage, missingFields, `Datenabdeckung ${(coverage * 100).toFixed(0)}% liegt unter dem Minimum von ${(minimumCoverage * 100).toFixed(0)}%.`);
  }

  return {
    ready: true,
    integrity: {
      status: 'READY',
      assetId: input.assetId,
      providers: input.providers,
      observedAt: input.observedAt,
      retrievedAt: input.retrievedAt ?? new Date().toISOString(),
      dataQuality: coverage >= 0.8 ? 'high' : coverage >= 0.6 ? 'medium' : 'low',
      featureVersion: FEATURE_VERSION,
      scoringVersion: input.scoringVersion ?? SCORING_INTEGRITY_VERSION,
      coverage,
      evidence: input.evidence ?? [],
      missingFields,
    },
  };
}

export function buildUnavailableScore(gate: DataQualityGateResult): CanonicalScoreResult {
  if (gate.ready) {
    throw new Error('buildUnavailableScore darf nur für einen abgelehnten Data-Quality-Gate aufgerufen werden.');
  }
  return {
    status: gate.integrity.status as Exclude<ScoringAvailabilityStatus, 'READY'>,
    score: null,
    final_score: null,
    integrity: gate.integrity,
  };
}

export function buildReadyScore(score0to100: number, gate: DataQualityGateResult): CanonicalScoreResult {
  if (!gate.ready) return buildUnavailableScore(gate);
  if (!Number.isFinite(score0to100)) {
    return {
      status: 'SCORE_NOT_COMPUTABLE',
      score: null,
      final_score: null,
      integrity: {
        ...gate.integrity,
        status: 'SCORE_NOT_COMPUTABLE',
        dataQuality: 'unknown',
        reason: 'Scoring Engine lieferte keinen endlichen numerischen Wert.',
      },
    };
  }
  const finalScore = Math.max(0, Math.min(100, score0to100));
  return {
    status: 'READY',
    score: Number((finalScore / 10).toFixed(1)),
    final_score: Number(finalScore.toFixed(2)),
    integrity: gate.integrity,
  };
}