import type { MarketRegime, PatternSignalResolution } from './sourceCryptoTypes';
import {
  evaluateDefiResearchScore,
  evaluateMemeResearchScore,
  type CryptoCategoryResearchAssessment,
  type DefiResearchScoringInput,
  type MemeResearchScoringInput,
} from './CryptoCategoryResearchScoring';

export const CRYPTO_ORCHESTRATOR_RESEARCH_MODELS_VERSION =
  'crypto-orchestrator-research-models/0.1.0' as const;
export const CRYPTO_SENTIMENT_RESEARCH_MODEL_VERSION =
  'crypto-sentiment-research/0.1.0' as const;
export const CRYPTO_MOMENTUM_RESEARCH_MODEL_VERSION =
  'crypto-momentum-research/0.1.0' as const;
export const CRYPTO_REGIME_RESEARCH_MODEL_VERSION =
  'crypto-regime-research/0.1.0' as const;
export const CRYPTO_PATTERN_CONFLUENCE_RESEARCH_VERSION =
  'crypto-pattern-confluence-research/0.1.0' as const;
export const CRYPTO_SIGNAL_FUSION_RESEARCH_VERSION =
  'crypto-signal-fusion-research/0.1.0' as const;
export const CRYPTO_KILL_SWITCH_RESEARCH_VERSION =
  'crypto-kill-switch-telemetry/0.1.0' as const;

export type ResearchAvailability = 'READY' | 'NOT_COMPUTABLE';

export interface SentimentResearchItem {
  readonly polarity: number;
  readonly intensity: number;
  readonly novelty: number;
  readonly credibility: number;
  readonly botProbability: number;
  readonly ageHours: number;
  /** Source-trust projection from the governed evidence layer; 0..1. */
  readonly sourceWeight: number;
  /** Mention/activity intensity projection; 0..1. */
  readonly mentionIntensity: number;
  /** Research-only regime compatibility supplied by a governed caller; 0..1. */
  readonly regimeAdjustment: number;
  readonly evidenceRefs: readonly string[];
}

export interface SentimentResearchAssessment {
  readonly modelVersion: typeof CRYPTO_SENTIMENT_RESEARCH_MODEL_VERSION;
  readonly status: ResearchAvailability;
  readonly score: number | null;
  readonly signedPolarity: number | null;
  readonly evidenceCount: number;
  readonly missingFields: readonly string[];
  readonly warnings: readonly string[];
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_CONTEXT_ONLY';
}

export interface MomentumResearchInput {
  readonly returns: {
    readonly h1: number;
    readonly h4: number;
    readonly d1: number;
    readonly m5?: number;
    readonly m15?: number;
    readonly d7?: number;
  };
  readonly volumeRatio: number;
  readonly volumeAcceleration: number;
  readonly rsi14: number;
  readonly trendStrength: number;
  readonly relativeStrength: number;
  readonly liquidityChange: number;
  readonly fundingRate?: number;
  readonly openInterestChange?: number;
  /** Added-kit features are inventoried now but remain unweighted until a model revision governs them. */
  readonly extendedFeatures?: {
    readonly macdHistogram?: number;
    readonly adx?: number;
    readonly trendSlope?: number;
    readonly atrPercent?: number;
    readonly volumeExpansion?: number;
  };
}

export interface MomentumResearchAssessment {
  readonly modelVersion: typeof CRYPTO_MOMENTUM_RESEARCH_MODEL_VERSION;
  readonly status: ResearchAvailability;
  readonly score: number | null;
  readonly trendComponent: number | null;
  readonly flowComponent: number | null;
  readonly overheatPenalty: number | null;
  readonly effectiveFlowWeights: Readonly<Record<string, number>>;
  readonly missingFields: readonly string[];
  readonly extendedFeatures: Readonly<Record<string, number>>;
  readonly extendedFeatureCoverage: number;
  readonly warnings: readonly string[];
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_CONTEXT_ONLY';
}

export type SourceRegimePhase =
  | 'TREND_UP'
  | 'TREND_DOWN'
  | 'ACCUMULATION'
  | 'DISTRIBUTION'
  | 'PANIC'
  | 'ILLIQUID'
  | 'NEUTRAL'
  | 'VOLATILE';

export interface RegimeResearchInput {
  readonly momentumScore: number;
  readonly sentimentScore: number;
  readonly volumeRatio: number;
  readonly liquidityChange: number;
  readonly whaleExchangeFlow: number;
  readonly volatility: number;
  /** Optional governed threshold; without it, volatility alone does not invent HIGH_VOLATILITY. */
  readonly highVolatilityThreshold?: number;
  readonly confidence?: number;
}

export interface RegimeResearchAssessment {
  readonly modelVersion: typeof CRYPTO_REGIME_RESEARCH_MODEL_VERSION;
  readonly status: ResearchAvailability;
  readonly regime: MarketRegime;
  readonly sourcePhase: SourceRegimePhase | null;
  readonly transition: boolean;
  readonly confidence: number | null;
  readonly reasons: readonly string[];
  readonly missingFields: readonly string[];
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_CONTEXT_ONLY';
}

export interface PatternConfluenceResearchAssessment {
  readonly modelVersion: typeof CRYPTO_PATTERN_CONFLUENCE_RESEARCH_VERSION;
  readonly status: ResearchAvailability;
  readonly direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  readonly confluenceCount: number;
  readonly higherTimeframeConfirmed: boolean;
  readonly meanPatternQuality: number | null;
  readonly timeframes: readonly string[];
  readonly reasons: readonly string[];
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_CONTEXT_ONLY';
}

export interface SignalFusionResearchInput {
  readonly regimeFit: number;
  readonly momentumScore: number;
  readonly patternQuality: number;
  readonly sentimentScore: number;
  readonly executionQuality: number;
}

export interface SignalFusionResearchAssessment {
  readonly modelVersion: typeof CRYPTO_SIGNAL_FUSION_RESEARCH_VERSION;
  readonly status: ResearchAvailability;
  readonly researchTradeScore: number | null;
  readonly regimeFit: number | null;
  readonly sourceThresholdsMet: boolean;
  readonly reasons: readonly string[];
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_CONTEXT_ONLY_NOT_TRADE_AUTHORIZATION';
}

export type KillSwitchResearchLevel = 'NONE' | 'L1_SOFT_PAUSE' | 'L2_SESSION_HALT' | 'L3_BROKER_DISCONNECT' | 'L4_HARD_KILL';

export interface KillSwitchResearchInput {
  readonly slippageBps?: number;
  readonly rejectRateSpikeSoft?: boolean;
  readonly consecutiveLosses?: number;
  readonly modelDrift?: boolean;
  readonly regimeShock?: boolean;
  readonly dailyLossPct?: number;
  readonly sessionLossPct?: number;
  readonly apiInstability?: boolean;
  readonly orderRejectRatePct?: number;
  readonly venueDislocation?: boolean;
  readonly configMismatch?: boolean;
  readonly wrongSymbolRouting?: boolean;
  readonly dataIntegrityFailure?: boolean;
  readonly unknownBehavior?: boolean;
}

export interface KillSwitchResearchAssessment {
  readonly modelVersion: typeof CRYPTO_KILL_SWITCH_RESEARCH_VERSION;
  readonly level: KillSwitchResearchLevel;
  readonly triggers: readonly string[];
  readonly recommendedActions: readonly string[];
  readonly manualUnlockRequired: boolean;
  readonly researchDefaults: {
    readonly maxDailyLossPct: 2;
    readonly maxSessionLossPct: 1.25;
    readonly maxConsecutiveLosses: 3;
    readonly maxOrderRejectRatePct: 5;
    readonly maxSlippageBps: 12;
    readonly authority: 'RESEARCH_DEFAULT_NOT_PRODUCTION_POLICY';
  };
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_RISK_TELEMETRY_ONLY';
}

export type CryptoOrchestratorCategoryResearchInput =
  | { readonly category: 'meme'; readonly scoring: MemeResearchScoringInput }
  | { readonly category: 'defi'; readonly scoring: DefiResearchScoringInput };

export interface CryptoOrchestratorResearchModelRequest {
  readonly categoryModel: CryptoOrchestratorCategoryResearchInput;
  readonly sentiment?: readonly SentimentResearchItem[];
  readonly momentum?: MomentumResearchInput;
  readonly regimeContext?: Omit<RegimeResearchInput, 'momentumScore' | 'sentimentScore'>;
  readonly patternResolution?: PatternSignalResolution;
  readonly signalFusion?: {
    readonly regimeFit: number;
    readonly executionQuality: number;
  };
  readonly killSwitchTelemetry?: KillSwitchResearchInput;
}

export interface CryptoOrchestratorResearchModelAssessment {
  readonly orchestratorModelVersion: typeof CRYPTO_ORCHESTRATOR_RESEARCH_MODELS_VERSION;
  readonly category: 'meme' | 'defi';
  readonly categoryAssessment: CryptoCategoryResearchAssessment;
  readonly sentiment: SentimentResearchAssessment | null;
  readonly momentum: MomentumResearchAssessment | null;
  readonly regime: RegimeResearchAssessment | null;
  readonly pattern: PatternConfluenceResearchAssessment | null;
  readonly signalFusion: SignalFusionResearchAssessment | null;
  readonly killSwitch: KillSwitchResearchAssessment | null;
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'CRYPTO_ORCHESTRATOR_RESEARCH_ENRICHMENT_ONLY';
}

const RESEARCH_KILL_SWITCH_DEFAULTS = Object.freeze({
  maxDailyLossPct: 2 as const,
  maxSessionLossPct: 1.25 as const,
  maxConsecutiveLosses: 3 as const,
  maxOrderRejectRatePct: 5 as const,
  maxSlippageBps: 12 as const,
  authority: 'RESEARCH_DEFAULT_NOT_PRODUCTION_POLICY' as const,
});

function finiteBetween(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseTimeframeMinutes(timeframe: string): number | null {
  const match = /^(\d+)(m|h|d)$/i.exec(timeframe.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  const unit = match[2].toLowerCase();
  return amount * (unit === 'm' ? 1 : unit === 'h' ? 60 : 1_440);
}

export function evaluateSentimentResearch(items: readonly SentimentResearchItem[]): SentimentResearchAssessment {
  const invalid: string[] = [];
  let numerator = 0;
  let denominator = 0;
  let signedWeight = 0;

  items.forEach((item, index) => {
    const prefix = `items[${index}]`;
    if (!finiteBetween(item.polarity, -1, 1)) invalid.push(`${prefix}.polarity`);
    for (const [key, value] of [
      ['intensity', item.intensity],
      ['novelty', item.novelty],
      ['credibility', item.credibility],
      ['botProbability', item.botProbability],
      ['sourceWeight', item.sourceWeight],
      ['mentionIntensity', item.mentionIntensity],
      ['regimeAdjustment', item.regimeAdjustment],
    ] as const) {
      if (!finiteBetween(value, 0, 1)) invalid.push(`${prefix}.${key}`);
    }
    if (!Number.isFinite(item.ageHours) || item.ageHours < 0) invalid.push(`${prefix}.ageHours`);
    if (item.evidenceRefs.length === 0) invalid.push(`${prefix}.evidenceRefs`);
    if (invalid.some((field) => field.startsWith(prefix))) return;

    const decay = Math.exp(-0.045 * item.ageHours);
    const weight = item.intensity
      * item.novelty
      * item.credibility
      * (1 - item.botProbability)
      * item.sourceWeight
      * item.mentionIntensity
      * item.regimeAdjustment
      * decay;
    numerator += item.polarity * weight;
    denominator += Math.abs(item.polarity) * weight;
    signedWeight += weight;
  });

  if (items.length === 0) invalid.push('items');
  if (invalid.length > 0 || denominator <= 0 || signedWeight <= 0) {
    return Object.freeze({
      modelVersion: CRYPTO_SENTIMENT_RESEARCH_MODEL_VERSION,
      status: 'NOT_COMPUTABLE' as const,
      score: null,
      signedPolarity: null,
      evidenceCount: items.length,
      missingFields: Object.freeze([...new Set(invalid.length > 0 ? invalid : ['weightedSentimentEvidence'])].sort()),
      warnings: Object.freeze(['Neutral default 50 is forbidden when sentiment evidence is absent or non-informative.']),
      scoreEligible: false as const,
      executionEligible: false as const,
      authority: 'RESEARCH_CONTEXT_ONLY' as const,
    });
  }

  const signedPolarity = clamp(numerator / denominator, -1, 1);
  return Object.freeze({
    modelVersion: CRYPTO_SENTIMENT_RESEARCH_MODEL_VERSION,
    status: 'READY' as const,
    score: Number(clamp(50 + 50 * signedPolarity, 0, 100).toFixed(2)),
    signedPolarity: Number(signedPolarity.toFixed(6)),
    evidenceCount: items.length,
    missingFields: Object.freeze([]),
    warnings: Object.freeze([]),
    scoreEligible: false as const,
    executionEligible: false as const,
    authority: 'RESEARCH_CONTEXT_ONLY' as const,
  });
}

function normalizeAvailableWeights(
  values: Readonly<Record<string, number | undefined>>,
  nominalWeights: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const availableWeight = Object.entries(nominalWeights)
    .reduce((sum, [key, weight]) => values[key] === undefined ? sum : sum + weight, 0);
  return Object.freeze(Object.fromEntries(Object.entries(nominalWeights).map(([key, weight]) => [
    key,
    values[key] === undefined || availableWeight <= 0 ? 0 : Number((weight / availableWeight).toFixed(12)),
  ])));
}

export function evaluateMomentumResearch(input: MomentumResearchInput): MomentumResearchAssessment {
  const missing: string[] = [];
  for (const [key, value] of [
    ['returns.h1', input.returns.h1],
    ['returns.h4', input.returns.h4],
    ['returns.d1', input.returns.d1],
    ['volumeRatio', input.volumeRatio],
    ['volumeAcceleration', input.volumeAcceleration],
    ['rsi14', input.rsi14],
    ['trendStrength', input.trendStrength],
    ['relativeStrength', input.relativeStrength],
    ['liquidityChange', input.liquidityChange],
  ] as const) {
    if (!Number.isFinite(value)) missing.push(key);
  }
  if (Number.isFinite(input.rsi14) && !finiteBetween(input.rsi14, 0, 100)) missing.push('rsi14');

  if (missing.length > 0) {
    return Object.freeze({
      modelVersion: CRYPTO_MOMENTUM_RESEARCH_MODEL_VERSION,
      status: 'NOT_COMPUTABLE' as const,
      score: null,
      trendComponent: null,
      flowComponent: null,
      overheatPenalty: null,
      effectiveFlowWeights: Object.freeze({}),
      missingFields: Object.freeze([...new Set(missing)].sort()),
      extendedFeatures: Object.freeze({}),
      extendedFeatureCoverage: 0,
      warnings: Object.freeze(['Required momentum inputs are missing or invalid; no zero/neutral substitution is applied.']),
      scoreEligible: false as const,
      executionEligible: false as const,
      authority: 'RESEARCH_CONTEXT_ONLY' as const,
    });
  }

  const trend = 0.25 * Math.tanh(input.returns.h1 * 20)
    + 0.20 * Math.tanh(input.returns.h4 * 12)
    + 0.20 * Math.tanh(input.returns.d1 * 8)
    + 0.20 * Math.tanh(input.trendStrength)
    + 0.15 * Math.tanh(input.relativeStrength);

  const flowValues: Readonly<Record<string, number | undefined>> = {
    volumeRatio: Math.tanh(input.volumeRatio - 1),
    volumeAcceleration: Math.tanh(input.volumeAcceleration),
    openInterestChange: input.openInterestChange === undefined ? undefined : Math.tanh(input.openInterestChange),
    liquidityChange: Math.tanh(input.liquidityChange),
  };
  const effectiveFlowWeights = normalizeAvailableWeights(flowValues, {
    volumeRatio: 0.35,
    volumeAcceleration: 0.25,
    openInterestChange: 0.20,
    liquidityChange: 0.20,
  });
  const flow = Object.entries(effectiveFlowWeights).reduce((sum, [key, weight]) => {
    const value = flowValues[key];
    return value === undefined ? sum : sum + value * weight;
  }, 0);

  const rsiPenalty = input.rsi14 > 82 ? 0.15 : input.rsi14 < 18 ? 0.10 : 0;
  const fundingPenalty = input.fundingRate !== undefined && Math.abs(input.fundingRate) > 0.001 ? 0.10 : 0;
  const liquidityPenalty = input.liquidityChange < -0.20 ? 0.25 : 0;
  const overheatPenalty = rsiPenalty + fundingPenalty + liquidityPenalty;
  const raw = 0.62 * trend + 0.38 * flow;
  const adjusted = raw - overheatPenalty;
  const logistic = 1 / (1 + Math.exp(-(adjusted * 4)));
  const score = clamp(50 + 50 * logistic - 25, 0, 100);

  const extendedEntries = Object.entries(input.extendedFeatures ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]));
  const extendedFeatureKeys = ['macdHistogram', 'adx', 'trendSlope', 'atrPercent', 'volumeExpansion'];
  const extendedFeatures = Object.freeze(Object.fromEntries(extendedEntries));
  const warnings: string[] = [];
  if (input.openInterestChange === undefined) {
    warnings.push('OPEN_INTEREST_MISSING: flow weights were deterministically renormalized; missing was not treated as zero.');
  }
  if (input.fundingRate === undefined) {
    warnings.push('FUNDING_RATE_MISSING: no funding penalty is asserted; this absence remains explicit research metadata.');
  }
  if (extendedEntries.length < extendedFeatureKeys.length) {
    warnings.push('ADDED_KIT_MOMENTUM_FEATURES_PARTIAL: MACD/ADX/trend-slope/ATR/volume-expansion are inventoried but remain unweighted until governed weights exist.');
  }

  return Object.freeze({
    modelVersion: CRYPTO_MOMENTUM_RESEARCH_MODEL_VERSION,
    status: 'READY' as const,
    score: Number(score.toFixed(2)),
    trendComponent: Number(trend.toFixed(6)),
    flowComponent: Number(flow.toFixed(6)),
    overheatPenalty: Number(overheatPenalty.toFixed(6)),
    effectiveFlowWeights,
    missingFields: Object.freeze([
      ...(input.openInterestChange === undefined ? ['openInterestChange'] : []),
      ...(input.fundingRate === undefined ? ['fundingRate'] : []),
    ]),
    extendedFeatures,
    extendedFeatureCoverage: Number((extendedEntries.length / extendedFeatureKeys.length).toFixed(2)),
    warnings: Object.freeze(warnings),
    scoreEligible: false as const,
    executionEligible: false as const,
    authority: 'RESEARCH_CONTEXT_ONLY' as const,
  });
}

export function evaluateRegimeResearch(input: RegimeResearchInput): RegimeResearchAssessment {
  const invalid: string[] = [];
  if (!finiteBetween(input.momentumScore, 0, 100)) invalid.push('momentumScore');
  if (!finiteBetween(input.sentimentScore, 0, 100)) invalid.push('sentimentScore');
  for (const [key, value] of [
    ['volumeRatio', input.volumeRatio],
    ['liquidityChange', input.liquidityChange],
    ['whaleExchangeFlow', input.whaleExchangeFlow],
    ['volatility', input.volatility],
  ] as const) if (!Number.isFinite(value)) invalid.push(key);
  if (input.highVolatilityThreshold !== undefined && (!Number.isFinite(input.highVolatilityThreshold) || input.highVolatilityThreshold <= 0)) {
    invalid.push('highVolatilityThreshold');
  }
  if (input.confidence !== undefined && !finiteBetween(input.confidence, 0, 1)) invalid.push('confidence');

  if (invalid.length > 0) {
    return Object.freeze({
      modelVersion: CRYPTO_REGIME_RESEARCH_MODEL_VERSION,
      status: 'NOT_COMPUTABLE' as const,
      regime: 'UNKNOWN' as const,
      sourcePhase: null,
      transition: false,
      confidence: null,
      reasons: Object.freeze(['Regime inputs are incomplete or invalid; UNKNOWN is returned instead of an inferred neutral regime.']),
      missingFields: Object.freeze([...new Set(invalid)].sort()),
      scoreEligible: false as const,
      executionEligible: false as const,
      authority: 'RESEARCH_CONTEXT_ONLY' as const,
    });
  }

  let regime: MarketRegime = 'RANGE';
  let sourcePhase: SourceRegimePhase = 'NEUTRAL';
  let transition = false;
  const reasons: string[] = [];

  if (input.liquidityChange < -0.30) {
    regime = 'STRESS';
    sourcePhase = 'ILLIQUID';
    reasons.push('Liquidity change is below the source-defined illiquidity threshold.');
  } else if (input.momentumScore > 70 && input.sentimentScore > 65 && input.volumeRatio > 1.5 && input.whaleExchangeFlow < 0) {
    regime = 'BULL';
    sourcePhase = 'TREND_UP';
    reasons.push('Momentum, sentiment, volume and exchange-flow conditions match the source trend-up regime.');
  } else if (input.momentumScore > 65 && input.sentimentScore > 75 && input.whaleExchangeFlow > 0) {
    regime = 'UNKNOWN';
    sourcePhase = 'DISTRIBUTION';
    transition = true;
    reasons.push('Distribution is retained as a transition annotation; it does not create a second canonical regime taxonomy.');
  } else if (input.momentumScore < 30 && input.liquidityChange < -0.15) {
    regime = 'STRESS';
    sourcePhase = 'PANIC';
    reasons.push('Low momentum plus material liquidity deterioration matches the source panic regime.');
  } else if (input.momentumScore < 35) {
    regime = 'BEAR';
    sourcePhase = 'TREND_DOWN';
    reasons.push('Momentum is below the source trend-down threshold.');
  } else if (input.highVolatilityThreshold !== undefined && input.volatility >= input.highVolatilityThreshold) {
    regime = 'HIGH_VOLATILITY';
    sourcePhase = 'VOLATILE';
    reasons.push('Caller supplied a governed high-volatility threshold and current volatility exceeds it.');
  } else if (input.volumeRatio < 0.8 && input.volatility < 0.03) {
    regime = 'RANGE';
    sourcePhase = 'ACCUMULATION';
    reasons.push('Low volume ratio and low volatility match the source accumulation condition.');
  } else {
    reasons.push('No stronger source condition matched; existing RANGE taxonomy carries neutral research context.');
  }

  return Object.freeze({
    modelVersion: CRYPTO_REGIME_RESEARCH_MODEL_VERSION,
    status: 'READY' as const,
    regime,
    sourcePhase,
    transition,
    confidence: input.confidence === undefined ? null : input.confidence,
    reasons: Object.freeze(reasons),
    missingFields: Object.freeze(input.confidence === undefined ? ['confidence'] : []),
    scoreEligible: false as const,
    executionEligible: false as const,
    authority: 'RESEARCH_CONTEXT_ONLY' as const,
  });
}

export function evaluatePatternConfluenceResearch(
  resolution: PatternSignalResolution,
): PatternConfluenceResearchAssessment {
  if (resolution.disposition !== 'SUPPORTED_CONTEXT' || !resolution.primary || !resolution.direction) {
    return Object.freeze({
      modelVersion: CRYPTO_PATTERN_CONFLUENCE_RESEARCH_VERSION,
      status: 'NOT_COMPUTABLE' as const,
      direction: null,
      confluenceCount: 0,
      higherTimeframeConfirmed: false,
      meanPatternQuality: null,
      timeframes: Object.freeze([]),
      reasons: Object.freeze([
        ...resolution.reasons,
        'Pattern confluence requires an existing PatternSignalResolver SUPPORTED_CONTEXT result.',
      ]),
      scoreEligible: false as const,
      executionEligible: false as const,
      authority: 'RESEARCH_CONTEXT_ONLY' as const,
    });
  }

  const sameDirection = [resolution.primary, ...resolution.supporting]
    .filter((candidate) => candidate.evidence.direction === resolution.direction);
  const timeframes = [...new Set(sameDirection.map((candidate) => candidate.evidence.timeframe))];
  const higherTimeframeConfirmed = timeframes.some((timeframe) => {
    const minutes = parseTimeframeMinutes(timeframe);
    return minutes !== null && minutes >= 240;
  });
  const meanPatternQuality = sameDirection.reduce((sum, candidate) => sum + candidate.evidence.patternQuality, 0)
    / sameDirection.length;
  const sourceConfluenceSatisfied = timeframes.length >= 2 && higherTimeframeConfirmed;

  return Object.freeze({
    modelVersion: CRYPTO_PATTERN_CONFLUENCE_RESEARCH_VERSION,
    status: sourceConfluenceSatisfied ? 'READY' as const : 'NOT_COMPUTABLE' as const,
    direction: sourceConfluenceSatisfied ? resolution.direction : null,
    confluenceCount: timeframes.length,
    higherTimeframeConfirmed,
    meanPatternQuality: sourceConfluenceSatisfied ? Number(meanPatternQuality.toFixed(6)) : null,
    timeframes: Object.freeze(timeframes),
    reasons: Object.freeze(sourceConfluenceSatisfied
      ? ['At least two same-direction timeframes plus >=4h confirmation satisfy the added-kit research confluence rule.']
      : ['Added-kit pattern confluence requires at least two same-direction timeframes and higher-timeframe (>=4h) confirmation.']),
    scoreEligible: false as const,
    executionEligible: false as const,
    authority: 'RESEARCH_CONTEXT_ONLY' as const,
  });
}

export function evaluateSignalFusionResearch(input: SignalFusionResearchInput): SignalFusionResearchAssessment {
  const invalid = Object.entries(input).filter(([, value]) => !finiteBetween(value, 0, 100)).map(([key]) => key);
  if (invalid.length > 0) {
    return Object.freeze({
      modelVersion: CRYPTO_SIGNAL_FUSION_RESEARCH_VERSION,
      status: 'NOT_COMPUTABLE' as const,
      researchTradeScore: null,
      regimeFit: null,
      sourceThresholdsMet: false,
      reasons: Object.freeze([`Signal-fusion inputs must be finite 0..100: ${invalid.join(', ')}.`]),
      scoreEligible: false as const,
      executionEligible: false as const,
      authority: 'RESEARCH_CONTEXT_ONLY_NOT_TRADE_AUTHORIZATION' as const,
    });
  }

  const researchTradeScore = 0.30 * input.regimeFit
    + 0.25 * input.momentumScore
    + 0.20 * input.patternQuality
    + 0.15 * input.sentimentScore
    + 0.10 * input.executionQuality;
  const sourceThresholdsMet = researchTradeScore >= 70 && input.regimeFit >= 60;

  return Object.freeze({
    modelVersion: CRYPTO_SIGNAL_FUSION_RESEARCH_VERSION,
    status: 'READY' as const,
    researchTradeScore: Number(researchTradeScore.toFixed(2)),
    regimeFit: input.regimeFit,
    sourceThresholdsMet,
    reasons: Object.freeze([
      sourceThresholdsMet
        ? 'Source research thresholds are met; this remains context only and does not authorize an order.'
        : 'Source research thresholds are not met; no trade authorization is produced in either case.',
    ]),
    scoreEligible: false as const,
    executionEligible: false as const,
    authority: 'RESEARCH_CONTEXT_ONLY_NOT_TRADE_AUTHORIZATION' as const,
  });
}

export function evaluateKillSwitchResearchTelemetry(input: KillSwitchResearchInput): KillSwitchResearchAssessment {
  const l4: string[] = [];
  if (input.configMismatch) l4.push('CONFIG_MISMATCH');
  if (input.wrongSymbolRouting) l4.push('WRONG_SYMBOL_ROUTING');
  if (input.dataIntegrityFailure) l4.push('DATA_INTEGRITY_FAILURE');
  if (input.unknownBehavior) l4.push('UNKNOWN_BEHAVIOR');

  const l3: string[] = [];
  if (input.apiInstability) l3.push('API_INSTABILITY');
  if (input.venueDislocation) l3.push('VENUE_DISLOCATION');
  if (input.orderRejectRatePct !== undefined && input.orderRejectRatePct > RESEARCH_KILL_SWITCH_DEFAULTS.maxOrderRejectRatePct) {
    l3.push('ORDER_REJECT_RATE_THRESHOLD');
  }

  const l2: string[] = [];
  if (input.consecutiveLosses !== undefined && input.consecutiveLosses >= RESEARCH_KILL_SWITCH_DEFAULTS.maxConsecutiveLosses) l2.push('CONSECUTIVE_LOSSES');
  if (input.modelDrift) l2.push('MODEL_DRIFT');
  if (input.regimeShock) l2.push('REGIME_SHOCK');
  if (input.dailyLossPct !== undefined && input.dailyLossPct >= RESEARCH_KILL_SWITCH_DEFAULTS.maxDailyLossPct) l2.push('DAILY_LOSS_THRESHOLD');
  if (input.sessionLossPct !== undefined && input.sessionLossPct >= RESEARCH_KILL_SWITCH_DEFAULTS.maxSessionLossPct) l2.push('SESSION_LOSS_THRESHOLD');

  const l1: string[] = [];
  if (input.slippageBps !== undefined && input.slippageBps > RESEARCH_KILL_SWITCH_DEFAULTS.maxSlippageBps) l1.push('SLIPPAGE_BREACH');
  if (input.rejectRateSpikeSoft) l1.push('REJECT_RATE_SPIKE_SOFT');

  let level: KillSwitchResearchLevel = 'NONE';
  let triggers: string[] = [];
  let recommendedActions: string[] = [];
  let manualUnlockRequired = false;
  if (l4.length > 0) {
    level = 'L4_HARD_KILL';
    triggers = l4;
    recommendedActions = ['kill_all_automation', 'preserve_evidence', 'block_restart', 'notify_risk_manager', 'write_audit_log', 'require_manual_unlock'];
    manualUnlockRequired = true;
  } else if (l3.length > 0) {
    level = 'L3_BROKER_DISCONNECT';
    triggers = l3;
    recommendedActions = ['cancel_pending_entries', 'disconnect_broker', 'allow_only_risk_reducing_orders', 'notify_risk_manager', 'write_audit_log', 'require_manual_unlock'];
    manualUnlockRequired = true;
  } else if (l2.length > 0) {
    level = 'L2_SESSION_HALT';
    triggers = l2;
    recommendedActions = ['disable_strategy_for_session', 'allow_only_risk_reducing_orders', 'notify_risk_manager', 'write_audit_log', 'require_manual_unlock'];
    manualUnlockRequired = true;
  } else if (l1.length > 0) {
    level = 'L1_SOFT_PAUSE';
    triggers = l1;
    recommendedActions = ['pause_new_entries', 'keep_exits_active', 'write_audit_log'];
  }

  return Object.freeze({
    modelVersion: CRYPTO_KILL_SWITCH_RESEARCH_VERSION,
    level,
    triggers: Object.freeze(triggers),
    recommendedActions: Object.freeze(recommendedActions),
    manualUnlockRequired,
    researchDefaults: RESEARCH_KILL_SWITCH_DEFAULTS,
    scoreEligible: false as const,
    executionEligible: false as const,
    authority: 'RESEARCH_RISK_TELEMETRY_ONLY' as const,
  });
}

export function evaluateCryptoOrchestratorResearchModels(
  input: CryptoOrchestratorResearchModelRequest,
): CryptoOrchestratorResearchModelAssessment {
  const categoryAssessment = input.categoryModel.category === 'meme'
    ? evaluateMemeResearchScore(input.categoryModel.scoring)
    : evaluateDefiResearchScore(input.categoryModel.scoring);
  const sentiment = input.sentiment ? evaluateSentimentResearch(input.sentiment) : null;
  const momentum = input.momentum ? evaluateMomentumResearch(input.momentum) : null;
  const regime = input.regimeContext && sentiment?.score !== null && sentiment?.score !== undefined
    && momentum?.score !== null && momentum?.score !== undefined
    ? evaluateRegimeResearch({
      ...input.regimeContext,
      sentimentScore: sentiment.score,
      momentumScore: momentum.score,
    })
    : null;
  const pattern = input.patternResolution ? evaluatePatternConfluenceResearch(input.patternResolution) : null;
  const signalFusion = input.signalFusion
    && sentiment?.score !== null && sentiment?.score !== undefined
    && momentum?.score !== null && momentum?.score !== undefined
    && pattern?.meanPatternQuality !== null && pattern?.meanPatternQuality !== undefined
    ? evaluateSignalFusionResearch({
      regimeFit: input.signalFusion.regimeFit,
      executionQuality: input.signalFusion.executionQuality,
      sentimentScore: sentiment.score,
      momentumScore: momentum.score,
      patternQuality: pattern.meanPatternQuality * 100,
    })
    : null;
  const killSwitch = input.killSwitchTelemetry
    ? evaluateKillSwitchResearchTelemetry(input.killSwitchTelemetry)
    : null;

  return Object.freeze({
    orchestratorModelVersion: CRYPTO_ORCHESTRATOR_RESEARCH_MODELS_VERSION,
    category: input.categoryModel.category,
    categoryAssessment,
    sentiment,
    momentum,
    regime,
    pattern,
    signalFusion,
    killSwitch,
    scoreEligible: false as const,
    executionEligible: false as const,
    authority: 'CRYPTO_ORCHESTRATOR_RESEARCH_ENRICHMENT_ONLY' as const,
  });
}
