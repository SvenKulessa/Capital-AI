import { AssetIdentity, AssetIdentitySchema, FeatureValue, FeatureValueSchema,
  FinalRankResult, FinalRankResultSchema } from '../contracts/canonicalContracts';
import { componentActivationReasons } from '../contracts/analysisComponentRegistryValidator';
import { PipelineSnapshotSchema, ShadowPipelineConfigSchema, SCORE_FAMILIES, RISK_FAMILIES,
  type ShadowPipelineConfig, type PipelineSnapshot, type ShadowScoreResult } from '../contracts/pipelineExecution';
import { MarketDataRightsEvidenceSchema, evaluateMarketDataRights } from '../contracts/marketDataRightsEligibility';
import { inspectFinanceFeatureMapping, type FinanceSourceFeature } from '../contracts/financeResearchFeatureBridge.ts';
import { composeFinanceAdmittedResearchFactors, type FinanceFactorEvaluationInput } from '../platform/FinanceScoringResearch/FinanceAdmittedFactorMapping.ts';
import { evaluateFinanceModelResearch, type FinanceResearchModelEvaluationRequest } from '../platform/FinanceScoringResearch/FinanceResearchModelEvaluation.ts';
import { projectFinanceValidatedDataToResearch, type FinanceValidatedDataInput } from '../platform/FinanceScoringResearch/FinanceValidatedDataHandoff.ts';

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
  public static readonly SHADOW_MODEL_VERSION = '1.0.0';
  /** Model + UAI + validated DATA + weights are correlated here, never in a Finance dispatcher. */
  public static inspectFinanceModelResearch(input: FinanceResearchModelEvaluationRequest) {
    return evaluateFinanceModelResearch(input);
  }

  /**
   * FIN-12 translated handoff: source DATA status + exact normalizer evidence
   * -> Capital-AI rights -> original Finance factor research. Single scoring authority.
   */
  public static inspectValidatedFinanceResearchFactors(input: {
    snapshot: PipelineSnapshot;
    source: FinanceValidatedDataInput;
    model: FinanceFactorEvaluationInput['model'];
    bindings: FinanceFactorEvaluationInput['bindings'];
  }) {
    const projected = projectFinanceValidatedDataToResearch({
      snapshot: input.snapshot, source: input.source,
    });
    if (projected.state === 'BLOCKED') {
      return Object.freeze({
        state: 'BLOCKED' as const,
        reasons: projected.reasons,
        research: null,
        scoreEligible: false as const, rankEligible: false as const,
        decisionEligible: false as const, productionEligible: false as const,
      });
    }
    return this.inspectFinanceResearchFactors({
      snapshot: input.snapshot, candidates: projected.candidates,
      model: input.model, bindings: input.bindings,
    });
  }

  /** Typed Finance source-weight evaluation after source/provider admission, not a public score. */
  public static inspectFinanceResearchFactors(input: FinanceFactorEvaluationInput) {
    return composeFinanceAdmittedResearchFactors(input);
  }

  /**
   * Finance source features enter ONLY through the canonical Capital-AI shadow-scoring boundary.
   * Never creates a second Finance dispatcher/registry or authorizes a public score.
   */
  public static inspectFinanceSourceForShadow(input: {
    snapshot: PipelineSnapshot;
    candidates: readonly FinanceSourceFeature[];
    config: ShadowPipelineConfig;
  }): {
    state: 'SOURCE_EVIDENCE_BLOCKED' | 'SHADOW_EVALUATED';
    reasonCodes: readonly string[];
    shadow: ShadowScoreResult | null;
    scoreEligible: false;
    rankEligible: false;
    decisionEligible: false;
    productionEligible: false;
  } {
    const mapping = inspectFinanceFeatureMapping({
      snapshot: input.snapshot, candidates: input.candidates,
    });
    if (mapping.state !== 'RESEARCH_MAPPABLE') {
      return {
        state: 'SOURCE_EVIDENCE_BLOCKED', reasonCodes: mapping.reasons,
        shadow: null, scoreEligible: false, rankEligible: false,
        decisionEligible: false, productionEligible: false,
      };
    }
    const snapshot = PipelineSnapshotSchema.parse(input.snapshot);
    const existingKeys = new Set(snapshot.features.map(f => f.featureId + ':' + f.provenance.providerId));
    if (mapping.features.some(f => existingKeys.has(f.featureId + ':' + f.provenance.providerId))) {
      return {
        state: 'SOURCE_EVIDENCE_BLOCKED',
        reasonCodes: ['FINANCE_DUPLICATE_CANONICAL_FEATURE_SOURCE'],
        shadow: null, scoreEligible: false, rankEligible: false,
        decisionEligible: false, productionEligible: false,
      };
    }
    const shadow = this.computeShadowScore({
      ...snapshot,
      features: [...snapshot.features, ...mapping.features],
    }, input.config);
    return {
      state: 'SHADOW_EVALUATED', reasonCodes: [],
      shadow, scoreEligible: false, rankEligible: false,
      decisionEligible: false, productionEligible: false,
    };
  }

  /** Offline shadow calculation uses the recorded evaluation time, never the wall clock. */
  public static computeShadowScore(input: PipelineSnapshot, policy: ShadowPipelineConfig): ShadowScoreResult {
    const snapshot = PipelineSnapshotSchema.parse(input), config = ShadowPipelineConfigSchema.parse(policy);
    if (config.modelVersion !== this.SHADOW_MODEL_VERSION) throw new Error('MODEL_VERSION_UNSUPPORTED');
    const reasons = new Set<string>();
    const profile = config.profiles.find(p => p.assetClass === snapshot.asset.assetClass &&
      p.subclass === (snapshot.asset.subclass ?? null) && p.horizon === snapshot.horizon && p.regime === snapshot.regime);
    if (!profile) reasons.add('WEIGHT_PROFILE_UNAVAILABLE');
    if (snapshot.asset.status !== 'active') reasons.add('ASSET_NOT_TRADABLE');
    if (!snapshot.rawInputReferences.length) reasons.add('RAW_INPUT_REFERENCES_MISSING');
    const features = new Map<string, FeatureValue[]>();
    const identities = new Set<string>();
    for (const f of snapshot.features) {
      const p = f.provenance, identity = JSON.stringify([f.featureId, p.providerId]);
      if (identities.has(identity)) reasons.add(`DUPLICATE_FEATURE_SOURCE:${f.featureId}`);
      identities.add(identity);
      if (f.assetId !== snapshot.asset.assetId) { reasons.add('ASSET_MAPPING_MISMATCH'); continue; }
      if (p.isDemo !== snapshot.isDemo || (p.isDemo && (p.providerId !== 'capital_ai_demo_engine' || p.licenseScope !== 'sandbox_demo')) ||
          (!p.isDemo && (p.providerId === 'capital_ai_demo_engine' || p.licenseScope === 'sandbox_demo'))) {
        reasons.add('DEMO_MODE_MISMATCH'); continue;
      }
      if ([f.observedAt, p.observedAt, p.receivedAt, p.publishedAt].some(t => t > snapshot.evaluatedAt) ||
          p.receivedAt < p.observedAt || p.publishedAt < p.receivedAt || p.latencyMs !== p.receivedAt - p.observedAt) {
        reasons.add('FEATURE_TIMESTAMP_INVALID'); continue;
      }
      const provider = config.providers.find(c => c.providerId === p.providerId && c.enabled);
      if (!snapshot.isDemo && !provider) { reasons.add(`PROVIDER_DISABLED:${p.providerId}`); continue; }
      const maxAge = provider?.maxStalenessMs ?? 30_000;
      if (snapshot.evaluatedAt - Math.min(f.observedAt, p.observedAt) > maxAge) { reasons.add(`FEATURE_STALE:${f.featureId}`); continue; }
      if (!snapshot.isDemo) {
        const rights = snapshot.rights.find(r => r.providerId === p.providerId);
        const decision = rights && evaluateMarketDataRights(MarketDataRightsEvidenceSchema.parse(rights),
          ['internal_analysis', 'derived_scoring_research', 'cache_retention'], new Date(snapshot.evaluatedAt));
        // This feed token is exact, not a fuzzy symbol or prose licence match.
        const feedToken = `${p.providerDataset}:${snapshot.asset.symbol}:${snapshot.asset.venue}`;
        if (!decision?.eligible || !rights?.feedsSymbolsAndVenues?.includes(feedToken) ||
            !rights.reviewedAt || Date.parse(rights.reviewedAt) > snapshot.evaluatedAt) {
          reasons.add(`PROVIDER_RIGHTS_UNVERIFIED:${p.providerId}`); continue;
        }
        if (decision.obligations.length) reasons.add('RIGHTS_OBLIGATIONS_NOT_IMPLEMENTED');
      }
      const existing = features.get(f.featureId) ?? [];
      existing.push(f); features.set(f.featureId, existing);
    }
    const required = [...new Set([...Object.values(config.featureIds), ...Object.values(config.riskFeatureIds), ...config.hardGateFeatureIds])];
    let present = 0, quality = 1, freshness = 1, agreement = 1;
    const selected = new Map<string, FeatureValue>();
    for (const id of required) {
      const values = features.get(id) ?? [];
      if (!values.length) { reasons.add(`REQUIRED_INPUT_MISSING:${id}`); continue; }
      present++;
      const family = SCORE_FAMILIES.find(f => config.featureIds[f] === id);
      if (!snapshot.isDemo && family && values.some(f => !config.providers.find(p => p.providerId === f.provenance.providerId)?.featureFamilies.includes(family)))
        reasons.add(`FEATURE_FAMILY_ROUTE_MISMATCH:${id}`);
      const units = new Set(values.map(f => f.unit));
      if (units.size !== 1) reasons.add(`FEATURE_UNIT_DISAGREEMENT:${id}`);
      const uniqueProviders = new Set(values.map(f => f.provenance.providerId)).size;
      if (!snapshot.isDemo && uniqueProviders < config.minimumProvidersPerFeature) reasons.add(`PROVIDER_AGREEMENT_UNAVAILABLE:${id}`);
      const spread = Math.max(...values.map(f => f.normalizedValue)) - Math.min(...values.map(f => f.normalizedValue));
      if (spread > config.maxNormalizedDisagreement) reasons.add(`PROVIDER_DISAGREEMENT:${id}`);
      agreement = Math.min(agreement, 1 - spread / 100);
      quality = Math.min(quality, ...values.map(f => f.qualityScore / 100));
      for (const f of values) {
        const maxAge = config.providers.find(p => p.providerId === f.provenance.providerId)?.maxStalenessMs ?? 30_000;
        freshness = Math.min(freshness, Math.max(0, 1 - (snapshot.evaluatedAt - Math.min(f.observedAt, f.provenance.observedAt)) / maxAge));
        if (!snapshot.isDemo && f.qualityScore < config.minQualityScore) reasons.add(`QUALITY_INSUFFICIENT:${id}`);
      }
      values.sort((a, b) => (config.providers.find(p => p.providerId === a.provenance.providerId)?.priority ?? 0) -
        (config.providers.find(p => p.providerId === b.provenance.providerId)?.priority ?? 0) || a.provenance.providerId.localeCompare(b.provenance.providerId));
      selected.set(id, values[0]);
    }
    for (const id of config.hardGateFeatureIds) if ((features.get(id) ?? []).some(f => f.value !== 1) || !selected.has(id)) reasons.add(`HARD_GATE_FAILED:${id}`);
    const subScores = Object.fromEntries(SCORE_FAMILIES.map(f => [f, selected.get(config.featureIds[f])?.normalizedValue ?? null])) as ShadowScoreResult['subScores'];
    let riskPenalty = 0;
    for (const family of RISK_FAMILIES) {
      const values = features.get(config.riskFeatureIds[family]) ?? [];
      if (values.some(f => f.value < 0 || f.value > 100)) reasons.add('RISK_INPUT_INVALID');
      const risk = values.length ? Math.max(...values.map(f => f.value)) : 0;
      if (risk > config.maxRiskScore) reasons.add(`RISK_VETO:${family}`);
      riskPenalty += risk * config.riskWeights[family];
    }
    riskPenalty = Math.min(config.riskPenaltyCeiling, riskPenalty);
    const confidence = snapshot.isDemo ? 0 : Math.min(present / required.length, quality, freshness, agreement);
    if (!snapshot.isDemo && confidence < config.minimumConfidence) reasons.add('CONFIDENCE_BELOW_POLICY');
    const drivers = profile ? SCORE_FAMILIES.map(family => ({ family,
      contribution: (subScores[family] ?? 0) * profile.weights[family] * confidence })) : [];
    const candidateScore = reasons.size || snapshot.isDemo ? null : Math.max(0, Math.min(100,
      drivers.reduce((sum, d) => sum + d.contribution, 0) - riskPenalty));
    if (snapshot.isDemo) reasons.add('DEMO_NOT_ACTIONABLE');
    return { assetId: snapshot.asset.assetId, computedAt: snapshot.evaluatedAt, modelVersion: config.modelVersion,
      weightVersion: config.weightVersion, mode: 'shadow', isDemo: snapshot.isDemo, eligibility: false, rank: null,
      publishable: false, candidateScore, confidence, riskPenalty, subScores, drivers,
      reasonCodes: [...reasons].sort(), components: [] };
  }
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
      if (p.observedAt > now || f.observedAt > now || p.receivedAt > now ||
          p.publishedAt > now || p.receivedAt < p.observedAt || p.publishedAt < p.receivedAt ||
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
      scoreEligible: false, rankEligible: false, alertEligible: false, decisionEligible: false, eligibility: false,
      eligibilityReason: [...reasons].join(', '), confidence, riskPenalty, subScores, weightsApplied: weights,
      topPositiveDrivers: [], topNegativeDrivers: [], reasonCodes: [...reasons], modelVersion: this.MODEL_VERSION,
      evidenceId: `UNVERIFIED-${asset.assetId}`, computedAt: now, isDemo,
      regulatoryDisclaimer: 'Demo- oder unvollständige Analyse. Keine verifizierte Marktintelligenz oder Anlageberatung.',
    });
  }
}
