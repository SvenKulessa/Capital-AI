import { AssetIdentity, AssetIdentitySchema, FeatureValue, FeatureValueSchema,
  FinalRankResult, FinalRankResultSchema } from '../contracts/canonicalContracts';
import { componentActivationReasons } from '../contracts/analysisComponentRegistryValidator';

export interface AssetClassWeightProfile {
  weightMomentum: number; weightTechnical: number; weightFundamental: number;
  weightSentiment: number; weightEvent: number; weightPositioning: number;
}
const SCORE_FEATURES = {
  momentumScore: 'rsi_14', technicalScore: 'vwap_deviation_bps', fundamentalScore: 'piotroski_f_score',
  sentimentScore: 'sentiment_polarity_gemini', eventScore: 'event_impact_score',
  positioningScore: 'orderbook_imbalance_ratio_l2',
} as const;
const GATE_FEATURES = ['market_integrity_pass', 'liquidity_eligible', 'tradability_pass',
  'spread_slippage_risk_index', 'bot_manipulation_risk_index'] as const;
const REQUIRED_COMPONENTS = ['market_integrity_gate', 'data_quality_scorer', 'liquidity_eligibility_scorer',
  'spread_slippage_risk_scorer', 'tradability_gate', 'bot_manipulation_risk_scorer',
  'final_rank_confidence_evidence_scorer'];

/** Foundation admission: no inference from quotes or ranking without a validated universe. */
export class ScoringEngineService {
  public static readonly MODEL_VERSION = '4.0.0';
  public static getWeightProfile(assetClass: string): AssetClassWeightProfile {
    if (assetClass === 'crypto') return { weightMomentum: .25, weightTechnical: .20, weightFundamental: .10,
      weightSentiment: .20, weightEvent: .10, weightPositioning: .15 };
    if (['equity_us', 'equity_eu'].includes(assetClass)) return { weightMomentum: .15, weightTechnical: .20,
      weightFundamental: .35, weightSentiment: .10, weightEvent: .10, weightPositioning: .10 };
    if (['forex', 'commodities'].includes(assetClass)) return { weightMomentum: .20, weightTechnical: .30,
      weightFundamental: .05, weightSentiment: .15, weightEvent: .20, weightPositioning: .10 };
    return { weightMomentum: .20, weightTechnical: .25, weightFundamental: .20,
      weightSentiment: .15, weightEvent: .10, weightPositioning: .10 };
  }

  public static async computeFinalScore(asset: AssetIdentity, features: Map<string, FeatureValue>,
    requestDemo = false): Promise<FinalRankResult> {
    AssetIdentitySchema.parse(asset);
    const now = Date.now(), reasons = new Set<string>();
    const validated = new Map<string, FeatureValue>();
    // Demo provenance is checked before parsing, so malformed simulated inputs cannot hide their mode.
    const containsDemo = [...features.values()].some(f => f?.provenance?.isDemo === true);
    const containsLive = [...features.values()].some(f => f?.provenance?.isDemo === false);
    for (const [key, value] of features) {
      const parsed = FeatureValueSchema.safeParse(value);
      if (!parsed.success || parsed.data.featureId !== key || parsed.data.assetId !== asset.assetId) {
        reasons.add('FEATURE_CONTRACT_INVALID'); continue;
      }
      const f = parsed.data, p = f.provenance;
      if (p.observedAt > now + 3000 || f.observedAt > now + 3000 || p.receivedAt > now + 3000 ||
          p.publishedAt > now + 3000 || p.receivedAt < p.observedAt || p.publishedAt < p.receivedAt ||
          p.latencyMs !== p.receivedAt - p.observedAt || now - f.observedAt > 30_000 ||
          now - p.observedAt > 30_000) {
        reasons.add('FEATURE_STALE_OR_TIMESTAMP_INVALID'); continue;
      }
      if ((p.isDemo && (p.providerId !== 'capital_ai_demo_engine' || p.licenseScope !== 'sandbox_demo')) ||
          (!p.isDemo && (p.providerId === 'capital_ai_demo_engine' || p.licenseScope === 'sandbox_demo'))) {
        reasons.add('DEMO_PROVENANCE_MISMATCH'); continue;
      }
      if (!p.isDemo && (p.licenseScope === 'unverified' || p.licenseScope === 'academic_research')) {
        reasons.add('PROVIDER_RIGHTS_UNVERIFIED'); continue;
      }
      validated.set(key, f);
    }
    const isDemo = requestDemo || containsDemo;
    if ((containsDemo && containsLive) || (containsDemo && !requestDemo) || (requestDemo && containsLive)) {
      reasons.add('DEMO_MODE_MISMATCH');
    }
    const subScores = Object.fromEntries(Object.entries(SCORE_FEATURES).map(([score, feature]) =>
      [score, validated.get(feature)?.normalizedValue ?? null])) as FinalRankResult['subScores'];
    const required = [...Object.values(SCORE_FEATURES), ...(isDemo ? [] : GATE_FEATURES)];
    for (const id of required) if (!validated.has(id)) reasons.add(`REQUIRED_INPUT_MISSING:${id}`);
    if (asset.status !== 'active') reasons.add('ASSET_NOT_TRADABLE');
    if (!isDemo) {
      for (const id of required) if ((validated.get(id)?.qualityScore ?? 0) < 90) reasons.add(`DATA_QUALITY_INSUFFICIENT:${id}`);
      for (const id of ['market_integrity_pass', 'liquidity_eligible', 'tradability_pass']) {
        if (validated.get(id)?.value !== 1) reasons.add(`HARD_GATE_FAILED:${id}`);
      }
      for (const id of REQUIRED_COMPONENTS) {
        for (const code of componentActivationReasons(id)) reasons.add(`${code}:${id}`);
      }
    }
    const botRisk = validated.get('bot_manipulation_risk_index')?.value;
    const spreadRisk = validated.get('spread_slippage_risk_index')?.value;
    if (botRisk !== undefined && (botRisk < 0 || botRisk > 100)) reasons.add('RISK_INPUT_INVALID');
    if (spreadRisk !== undefined && (spreadRisk < 0 || spreadRisk > 100)) reasons.add('RISK_INPUT_INVALID');
    if ((botRisk ?? 0) > 75 || (spreadRisk ?? 0) > 75) reasons.add('BLOCKED_BY_RISK');
    if (!isDemo) reasons.add('EVIDENCE_REPLAY_UNAVAILABLE');
    const validScores = Object.values(subScores).every(value => value !== null);
    const canCompute = reasons.size === 0 && validScores;
    const confidence = isDemo || !canCompute ? 0 : required.reduce((sum, id) => sum + (validated.get(id)?.qualityScore ?? 0), 0) / (required.length * 100);
    const weights = this.getWeightProfile(asset.assetClass);
    const riskPenalty = Math.min(40, Math.round(Math.max(0, (botRisk ?? 0) - 20) * .4 + Math.max(0, (spreadRisk ?? 0) - 20) * .4));
    const scoreWeights = [weights.weightMomentum, weights.weightTechnical, weights.weightFundamental,
      weights.weightSentiment, weights.weightEvent, weights.weightPositioning];
    const weighted = Object.values(subScores).reduce<number>((sum, score, i) => sum + (score ?? 0) * scoreWeights[i], 0);
    const finalScore = canCompute ? Math.max(0, Math.min(100, Math.round(weighted * (isDemo ? 1 : confidence) - riskPenalty))) : null;
    if (isDemo) reasons.add('DEMO_NOT_ACTIONABLE');
    // No replayable evidence repository or cross-sectional ranking is implemented in this slice.
    return FinalRankResultSchema.parse({
      assetId: asset.assetId, symbol: asset.symbol, assetClass: asset.assetClass, rank: null, finalScore,
      resultStatus: isDemo && canCompute ? 'demo_fallback' :
        reasons.has('ASSET_NOT_TRADABLE') || reasons.has('BLOCKED_BY_RISK') ? 'blocked_by_risk' : 'insufficient_data',
      dataAvailability: isDemo ? 'simulated' : 'unavailable',
      scoreEligible: false, rankEligible: false, alertEligible: false, eligibility: false,
      eligibilityReason: [...reasons].join(', '), confidence, riskPenalty, subScores, weightsApplied: weights,
      topPositiveDrivers: [], topNegativeDrivers: [], reasonCodes: [...reasons], modelVersion: this.MODEL_VERSION,
      evidenceId: `UNVERIFIED-${asset.assetId}`, computedAt: now, isDemo,
      regulatoryDisclaimer: 'Demo- oder unvollständige Analyse. Keine verifizierte Marktintelligenz oder Anlageberatung.',
    });
  }
}
