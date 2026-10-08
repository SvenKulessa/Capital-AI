import { clamp, renormalizeAndScore } from './realMarketSignals';
import { buildReadyScore, buildUnavailableScore, evaluateDataQualityGate } from './scoringIntegrity';
import type { CanonicalScoreResult, ScoringEvidenceRef } from './scoringIntegrityTypes';
import type { BondEvidenceResult } from './sourceMarketEvidenceTypes';

export const SOVEREIGN_BENCHMARK_SCORING_CONTRACT_VERSION = 'sovereign-benchmark-yield-scoring/1.0.0' as const;

export const SOVEREIGN_BENCHMARK_SCORING_CONTRACT = {
  version: SOVEREIGN_BENCHMARK_SCORING_CONTRACT_VERSION,
  status: 'approved' as const,
  scoringEnabled: true as const,
  approvedBy: 'CAPITAL-AI Platform Governance / ADR-0033',
  approvedAt: '2026-08-02',
  semanticScope: 'Yield-state sovereign benchmark score. It is not an individual-bond total-return, credit, duration, liquidity or recommendation score.',
  minimumHistoryPoints: 20,
  maximumEvidenceAgeMs: 7 * 24 * 60 * 60 * 1000,
  weights: {
    yield_level_percentile: 0.45,
    yield_trend: 0.30,
    yield_stability: 0.25,
  },
} as const;

export interface SovereignBenchmarkScoringResult {
  contractVersion: typeof SOVEREIGN_BENCHMARK_SCORING_CONTRACT_VERSION;
  contractStatus: 'approved';
  scoreSemantic: 'sovereign-benchmark-yield';
  canonical: CanonicalScoreResult;
  factors: Record<string, number | null>;
  usedFactors: string[];
  missingFactors: string[];
  providers: string[];
  evidenceIds: string[];
  reasoning: string[];
  individualBondScoringEligible: false;
}

function percentileRank(values: number[], current: number): number {
  if (values.length === 0) return 50;
  const lessOrEqual = values.filter(value => value <= current).length;
  return clamp((lessOrEqual / values.length) * 100);
}

function standardDeviation(values: number[]): number | undefined {
  if (values.length < 2) return undefined;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function dailyYieldChangeStdevBps(values: number[]): number | undefined {
  if (values.length < 3) return undefined;
  const changes: number[] = [];
  for (let i = 1; i < values.length; i++) changes.push((values[i] - values[i - 1]) * 100);
  return standardDeviation(changes);
}

function standardizedYieldTrend(values: number[], current: number): number | undefined {
  if (values.length < 3) return undefined;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const stdev = standardDeviation(values);
  if (stdev === undefined) return undefined;
  if (stdev < 1e-9) return 50;
  const z = (current - mean) / stdev;
  return clamp(50 + z * 15);
}

function evidenceRefs(evidence: BondEvidenceResult): ScoringEvidenceRef[] {
  return evidence.evidenceIds.map((id, index) => ({
    id,
    source: evidence.provider,
    observedAt: `${evidence.points[index]?.date ?? evidence.points[evidence.points.length - 1].date}T23:59:59.000Z`,
    retrievedAt: evidence.retrievedAt,
    kind: 'market-history' as const,
  }));
}

export function scoreSovereignBenchmarkEvidence(
  catalogSymbol: string,
  evidence: BondEvidenceResult,
  nowMs = Date.now(),
): SovereignBenchmarkScoringResult {
  const yields = evidence.points.map(point => point.value).filter(value => Number.isFinite(value));
  const current = yields[yields.length - 1];
  const stdevBps = dailyYieldChangeStdevBps(yields);
  const values: Record<string, number | undefined> = {
    yield_level_percentile: current !== undefined ? percentileRank(yields, current) : undefined,
    yield_trend: current !== undefined ? standardizedYieldTrend(yields, current) : undefined,
    yield_stability: stdevBps !== undefined ? clamp(100 - (stdevBps / 15) * 100) : undefined,
  };

  const lastPoint = evidence.points[evidence.points.length - 1];
  const observedAt = lastPoint ? `${lastPoint.date}T23:59:59.000Z` : undefined;
  const gate = evaluateDataQualityGate({
    assetId: catalogSymbol,
    providers: [evidence.provider],
    featureNames: Object.keys(SOVEREIGN_BENCHMARK_SCORING_CONTRACT.weights),
    values,
    evidence: evidenceRefs(evidence),
    observedAt,
    retrievedAt: evidence.retrievedAt,
    minimumCoverage: 1,
    requireEvidence: true,
    minimumHistoryPoints: SOVEREIGN_BENCHMARK_SCORING_CONTRACT.minimumHistoryPoints,
    historyPoints: yields.length,
    maxAgeMs: SOVEREIGN_BENCHMARK_SCORING_CONTRACT.maximumEvidenceAgeMs,
    nowMs,
    scoringVersion: SOVEREIGN_BENCHMARK_SCORING_CONTRACT_VERSION,
  });

  if (!gate.ready) {
    return {
      contractVersion: SOVEREIGN_BENCHMARK_SCORING_CONTRACT_VERSION,
      contractStatus: 'approved',
      scoreSemantic: 'sovereign-benchmark-yield',
      canonical: buildUnavailableScore(gate),
      factors: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ?? null])),
      usedFactors: [],
      missingFactors: gate.integrity.missingFields,
      providers: [evidence.provider],
      evidenceIds: evidence.evidenceIds,
      reasoning: [gate.integrity.reason ?? 'Sovereign benchmark evidence gate rejected the observation set.'],
      individualBondScoringEligible: false,
    };
  }

  const scored = renormalizeAndScore(values, SOVEREIGN_BENCHMARK_SCORING_CONTRACT.weights);
  const reasoning = [
    `Score uses ${yields.length} real sovereign-yield observations from ${evidence.provider} (${evidence.providerSymbol}).`,
    'The score describes the benchmark yield state only and must not be represented as an individual-bond credit, duration, liquidity, total-return or recommendation score.',
  ];
  if ((values.yield_level_percentile ?? 50) >= 70) reasoning.push('Current benchmark yield is high relative to its own observation window.');
  if ((values.yield_stability ?? 50) < 40) reasoning.push('Large observed daily yield changes reduce the stability factor.');

  return {
    contractVersion: SOVEREIGN_BENCHMARK_SCORING_CONTRACT_VERSION,
    contractStatus: 'approved',
    scoreSemantic: 'sovereign-benchmark-yield',
    canonical: buildReadyScore(scored.score, gate),
    factors: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ?? null])),
    usedFactors: scored.usedFactors,
    missingFactors: scored.missingFactors,
    providers: [evidence.provider],
    evidenceIds: evidence.evidenceIds,
    reasoning,
    individualBondScoringEligible: false,
  };
}
