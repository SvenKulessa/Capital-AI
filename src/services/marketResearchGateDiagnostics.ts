import { z } from 'zod';
import { AssetIdentitySchema } from '../contracts/canonicalContracts';
import { DataProvenanceSchema } from '../contracts/canonicalContracts';
import {
  MarketDataRightsEvidenceSchema, evaluateMarketDataRights,
} from '../contracts/marketDataRightsEligibility';

/**
 * Three initial, source-aware research diagnostics. These are raw measured
 * indicators, NOT normalized ComponentRunner ScoreResults or active scorers.
 * In particular, a quote cannot prove true depth, realized slippage,
 * sequence continuity, or a calibrated data-quality confidence score.
 */
export const ResearchGateObservationSchema = z.strictObject({
  asset: AssetIdentitySchema,
  symbol: z.string().min(1),
  venue: z.string().min(1),
  quoteCurrency: z.string().regex(/^[A-Z0-9]{3,8}$/),
  liquidityCurrency: z.string().regex(/^[A-Z0-9]{3,8}$/),
  provenance: DataProvenanceSchema,
  timeSemantics: z.enum(['realtime', 'reference', 'daily', 'provider_snapshot']),
  bid: z.number().finite().positive().nullable(),
  ask: z.number().finite().positive().nullable(),
  sequenceContinuous: z.boolean().nullable(),
  timestampJitterMs: z.number().finite().nonnegative().nullable(),
  dailyTurnover: z.number().finite().nonnegative().nullable(),
  orderbookDepth2Pct: z.number().finite().nonnegative().nullable(),
  evaluatedAt: z.number().int().positive(),
  maxAgeMs: z.number().int().positive(),
  maxJitterMs: z.number().finite().nonnegative(),
  minimumTurnover: z.number().finite().positive(),
  minimumDepth2Pct: z.number().finite().positive(),
  mode: z.enum(['research_shadow', 'demo']),
  rights: MarketDataRightsEvidenceSchema.nullable(),
});
export type ResearchGateObservation = z.infer<typeof ResearchGateObservationSchema>;

type ResearchComponentId =
  'market_integrity_gate' | 'data_quality_scorer' | 'liquidity_eligibility_scorer';

export interface ResearchGateDiagnostic {
  componentId: ResearchComponentId;
  status: 'shadow_observed' | 'blocked';
  metric: number | null;
  metricUnit: 'bps' | 'ms' | 'ratio';
  reasonCodes: string[];
  modelScore: null;
  evidenceId: null;
  scoreEligible: false;
  rankEligible: false;
  alertEligible: false;
  decisionEligible: false;
}

export interface ResearchGateReport {
  schemaVersion: 'CAPITAL_AI_RAW_RESEARCH_GATES@1';
  mode: 'research_shadow' | 'demo';
  sourceReference: string;
  evaluatedAt: number;
  researchOnly: true;
  productionEligible: false;
  publicDisplayEligible: false;
  diagnostics: ResearchGateDiagnostic[];
}

function metric(
  componentId: ResearchComponentId,
  unit: ResearchGateDiagnostic['metricUnit'],
  value: number | null,
  reasons: string[],
): ResearchGateDiagnostic {
  return {
    componentId, status: reasons.length ? 'blocked' : 'shadow_observed',
    metric: reasons.length ? null : value, metricUnit: unit,
    reasonCodes: [...new Set(reasons)].sort(), modelScore: null,
    evidenceId: null, scoreEligible: false, rankEligible: false,
    alertEligible: false, decisionEligible: false,
  };
}

function inspectGlobalBoundary(input: ResearchGateObservation): string[] {
  const p = input.provenance, a = input.asset, reasons: string[] = [];
  if (a.status !== 'active') reasons.push('ASSET_NOT_ACTIVE');
  if (a.symbol !== input.symbol || a.venue !== input.venue) reasons.push('ASSET_VENUE_SYMBOL_MISMATCH');
  if (a.currency !== input.quoteCurrency || a.currency !== input.liquidityCurrency)
    reasons.push('OBSERVATION_CURRENCY_UNIT_MISMATCH');
  if (p.isDemo || input.mode === 'demo') reasons.push('DEMO_NOT_ACTIONABLE');
  if (p.isDemo !== (input.mode === 'demo')) reasons.push('DEMO_PROVENANCE_MISMATCH');
  if (p.licenseScope === 'unverified' || p.licenseScope === 'sandbox_demo') reasons.push('SOURCE_LICENSE_SCOPE_UNVERIFIED');
  if (input.timeSemantics !== 'realtime') reasons.push('NON_REALTIME_REFERENCE_NOT_A_SPOT_OBSERVATION');
  if (p.isDelayed) reasons.push('DELAYED_OBSERVATION_NOT_REALTIME');
  if (p.licenseScope === 'delayed_15m') reasons.push('DELAYED_DATASET_SCOPE_NOT_REALTIME');
  if ([p.observedAt, p.receivedAt, p.publishedAt].some(t => t > input.evaluatedAt) ||
      p.receivedAt < p.observedAt || p.publishedAt < p.receivedAt ||
      p.latencyMs !== p.receivedAt - p.observedAt) reasons.push('PROVENANCE_TIMESTAMP_INVALID');
  if (input.evaluatedAt - p.observedAt > input.maxAgeMs) reasons.push('OBSERVATION_STALE');
  if (!input.rights) reasons.push('SOURCE_RIGHTS_NOT_PROVEN');
  else {
    const rights = input.rights;
    const feedToken = `${p.providerDataset}:${a.symbol}:${a.venue}`;
    if (rights.providerId !== p.providerId ||
        !rights.feedsSymbolsAndVenues?.includes(feedToken) ||
        !rights.reviewedAt || Date.parse(rights.reviewedAt) > input.evaluatedAt) {
      reasons.push('PROVIDER_DATASET_INSTRUMENT_RIGHTS_MISMATCH');
    }
    const evaluated = evaluateMarketDataRights(rights,
      ['internal_analysis', 'derived_scoring_research', 'cache_retention'],
      new Date(input.evaluatedAt));
    if (evaluated.decision !== 'ALLOW') reasons.push('RESEARCH_RIGHTS_NOT_ADMITTED');
  }
  return reasons;
}

/**
 * Deterministic, offline, bounded diagnostics. No provider I/O, no cache write,
 * no NATS publish, no synthetic normalization, no runtime activation.
 */
export function inspectResearchGateCohort(raw: unknown): ResearchGateReport {
  const input = ResearchGateObservationSchema.parse(raw);
  const shared = inspectGlobalBoundary(input);

  const integrityReasons = [...shared];
  const hasBook = input.bid !== null && input.ask !== null;
  if (!hasBook) integrityReasons.push('L1_BOOK_MISSING');
  if (hasBook && input.ask! < input.bid!) integrityReasons.push('CROSSED_BOOK');
  if (input.sequenceContinuous !== true) integrityReasons.push('SEQUENCE_CONTINUITY_UNVERIFIED');
  if (input.timestampJitterMs === null) integrityReasons.push('TIMESTAMP_JITTER_UNVERIFIED');
  else if (input.timestampJitterMs > input.maxJitterMs) integrityReasons.push('TIMESTAMP_JITTER_EXCEEDED');
  const midpoint = hasBook ? input.bid! / 2 + input.ask! / 2 : null;
  const quotedSpreadBps = midpoint === null ? null : ((input.ask! - input.bid!) / midpoint) * 10_000;
  if (quotedSpreadBps !== null && !Number.isFinite(quotedSpreadBps)) integrityReasons.push('NUMERICAL_OVERFLOW');

  const qualityReasons = [...shared];
  if (!hasBook) qualityReasons.push('PRICE_OBSERVATION_MISSING');
  if (hasBook && input.ask! < input.bid!) qualityReasons.push('CROSSED_BOOK');
  if (input.sequenceContinuous !== true) qualityReasons.push('SEQUENCE_CONTINUITY_UNVERIFIED');
  if (input.timestampJitterMs === null || input.timestampJitterMs > input.maxJitterMs)
    qualityReasons.push('JITTER_QUALITY_UNVERIFIED');
  const freshnessAgeMs = input.evaluatedAt - input.provenance.observedAt;

  const liquidityReasons = [...shared];
  if (input.dailyTurnover === null || input.orderbookDepth2Pct === null)
    liquidityReasons.push('LIQUIDITY_DEPTH_OR_TURNOVER_MISSING');
  if (input.dailyTurnover !== null && input.dailyTurnover < input.minimumTurnover)
    liquidityReasons.push('TURNOVER_BELOW_POLICY');
  if (input.orderbookDepth2Pct !== null && input.orderbookDepth2Pct < input.minimumDepth2Pct)
    liquidityReasons.push('DEPTH_BELOW_POLICY');
  if (!hasBook || (hasBook && input.ask! < input.bid!)) liquidityReasons.push('VALID_L1_BOOK_REQUIRED');

  const ratio = input.dailyTurnover === null ? null : input.dailyTurnover / input.minimumTurnover;
  if (ratio !== null && !Number.isFinite(ratio)) liquidityReasons.push('NUMERICAL_OVERFLOW');

  return {
    schemaVersion: 'CAPITAL_AI_RAW_RESEARCH_GATES@1',
    mode: input.mode,
    sourceReference: input.provenance.sourceReference,
    evaluatedAt: input.evaluatedAt,
    researchOnly: true, productionEligible: false, publicDisplayEligible: false,
    diagnostics: [
      metric('market_integrity_gate', 'bps', quotedSpreadBps, integrityReasons),
      metric('data_quality_scorer', 'ms', freshnessAgeMs, qualityReasons),
      metric('liquidity_eligibility_scorer', 'ratio', ratio, liquidityReasons),
    ],
  };
}
