import {
  clamp,
  computeReturnStats,
  renormalizeAndScore,
  scoreBreakout,
  scoreMomentum,
  scoreTrend,
} from './realMarketSignals';
import { buildReadyScore, buildUnavailableScore, evaluateDataQualityGate } from './scoringIntegrity';
import type { CanonicalScoreResult, ScoringEvidenceRef } from './scoringIntegrityTypes';
import type { CommodityMarketEvidence } from './sourceMarketEvidenceTypes';

export const COMMODITY_EVIDENCE_SCORING_CONTRACT_VERSION = 'commodity-evidence-scoring/1.0.0' as const;

export const COMMODITY_EVIDENCE_SCORING_CONTRACT = {
  version: COMMODITY_EVIDENCE_SCORING_CONTRACT_VERSION,
  status: 'approved' as const,
  scoringEnabled: true as const,
  approvedBy: 'CAPITAL-AI Platform Governance / ADR-0033',
  approvedAt: '2026-08-02',
  semanticScope: 'Market-price technical evidence score for commodity benchmarks; not a geological, reserve, ESG or supply-chain score.',
  requiredProviderEvidence: true as const,
  minimumHistoryPoints: 20,
  maximumEvidenceAgeMs: 7 * 24 * 60 * 60 * 1000,
  weights: {
    trend: 0.30,
    momentum: 0.25,
    breakout_quality: 0.20,
    volatility_quality: 0.25,
  },
} as const;

export interface CommodityEvidenceScoringResult {
  contractVersion: typeof COMMODITY_EVIDENCE_SCORING_CONTRACT_VERSION;
  contractStatus: 'approved';
  scoreSemantic: 'commodity-market-evidence';
  canonical: CanonicalScoreResult;
  factors: Record<string, number | null>;
  usedFactors: string[];
  missingFactors: string[];
  providers: string[];
  evidenceIds: string[];
  reasoning: string[];
}

function evidenceRefs(evidence: CommodityMarketEvidence): ScoringEvidenceRef[] {
  return evidence.evidenceIds.map((id, index) => ({
    id,
    source: evidence.provider,
    observedAt: `${evidence.points[index]?.date ?? evidence.points[evidence.points.length - 1].date}T23:59:59.000Z`,
    retrievedAt: evidence.retrievedAt,
    kind: 'market-history' as const,
  }));
}

function volatilityQuality(dailyStdevPct: number): number {
  return clamp(100 - (dailyStdevPct / 5) * 100);
}

export function scoreCommodityMarketEvidence(
  evidence: CommodityMarketEvidence,
  nowMs = Date.now(),
): CommodityEvidenceScoringResult {
  const closes = evidence.points.map(point => point.close).filter(value => Number.isFinite(value) && value > 0);
  const stats = computeReturnStats(closes);
  const values: Record<string, number | undefined> = stats ? {
    trend: scoreTrend(stats.last, stats.sma),
    momentum: scoreMomentum(stats.rocPct),
    breakout_quality: scoreBreakout(stats.last, stats.high, stats.low),
    volatility_quality: volatilityQuality(stats.dailyStdevPct),
  } : {
    trend: undefined,
    momentum: undefined,
    breakout_quality: undefined,
    volatility_quality: undefined,
  };

  const refs = evidenceRefs(evidence);
  const gate = evaluateDataQualityGate({
    assetId: evidence.symbol,
    providers: [evidence.provider],
    featureNames: Object.keys(COMMODITY_EVIDENCE_SCORING_CONTRACT.weights),
    values,
    evidence: refs,
    observedAt: evidence.observedAt,
    retrievedAt: evidence.retrievedAt,
    minimumCoverage: 1,
    requireEvidence: true,
    minimumHistoryPoints: COMMODITY_EVIDENCE_SCORING_CONTRACT.minimumHistoryPoints,
    historyPoints: closes.length,
    maxAgeMs: COMMODITY_EVIDENCE_SCORING_CONTRACT.maximumEvidenceAgeMs,
    nowMs,
    scoringVersion: COMMODITY_EVIDENCE_SCORING_CONTRACT_VERSION,
  });

  if (!gate.ready) {
    return {
      contractVersion: COMMODITY_EVIDENCE_SCORING_CONTRACT_VERSION,
      contractStatus: 'approved',
      scoreSemantic: 'commodity-market-evidence',
      canonical: buildUnavailableScore(gate),
      factors: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ?? null])),
      usedFactors: [],
      missingFactors: gate.integrity.missingFields,
      providers: [evidence.provider],
      evidenceIds: evidence.evidenceIds,
      reasoning: [gate.integrity.reason ?? 'Commodity evidence gate rejected the observation set.'],
    };
  }

  const scored = renormalizeAndScore(values, COMMODITY_EVIDENCE_SCORING_CONTRACT.weights);
  const reasoning = [
    `Score uses ${closes.length} real daily observations from ${evidence.provider} (${evidence.providerSymbol}).`,
    'Only market-history factors are included; static registry/bootstrap commodity attributes have no score impact.',
  ];
  if (values.trend !== undefined && values.trend >= 60) reasoning.push('Verified price history indicates an above-average trend regime.');
  if (values.volatility_quality !== undefined && values.volatility_quality < 40) reasoning.push('Observed daily volatility materially reduces the market-evidence score.');

  return {
    contractVersion: COMMODITY_EVIDENCE_SCORING_CONTRACT_VERSION,
    contractStatus: 'approved',
    scoreSemantic: 'commodity-market-evidence',
    canonical: buildReadyScore(scored.score, gate),
    factors: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ?? null])),
    usedFactors: scored.usedFactors,
    missingFactors: scored.missingFactors,
    providers: [evidence.provider],
    evidenceIds: evidence.evidenceIds,
    reasoning,
  };
}
