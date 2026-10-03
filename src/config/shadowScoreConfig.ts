import { CANONICAL_50_COMPONENTS } from '../contracts/analysisComponentRegistry';
import { ShadowPipelineConfigSchema, PIPELINE_STAGE_IDS } from '../contracts/pipelineExecution';

/** Versioned research baseline, not a calibrated or production-authorizing model. */
export const SHADOW_SCORE_CONFIG_V1 = ShadowPipelineConfigSchema.parse({
  configId: 'market-shadow-v1', version: '1.0.0', modelVersion: '1.0.0', weightVersion: '1.0.0',
  mode: 'shadow', productionApproved: false, stages: [...PIPELINE_STAGE_IDS], providers: [],
  profiles: [
    { assetClass: 'crypto', subclass: null, horizon: '1d', regime: 'baseline',
      weights: { momentum: .25, technical: .20, fundamental: .10, sentiment: .20, event: .10, positioning: .15 } },
    { assetClass: 'equity_us', subclass: null, horizon: '1d', regime: 'baseline',
      weights: { momentum: .15, technical: .20, fundamental: .35, sentiment: .10, event: .10, positioning: .10 } },
    { assetClass: 'equity_eu', subclass: null, horizon: '1d', regime: 'baseline',
      weights: { momentum: .15, technical: .20, fundamental: .35, sentiment: .10, event: .10, positioning: .10 } },
  ],
  featureIds: { momentum: 'rsi_14', technical: 'vwap_deviation_bps', fundamental: 'piotroski_f_score',
    sentiment: 'sentiment_polarity_gemini', event: 'event_impact_score', positioning: 'orderbook_imbalance_ratio_l2' },
  riskFeatureIds: { liquidity: 'liquidity_risk_index', spread: 'spread_slippage_risk_index',
    volatility: 'volatility_risk_index', event: 'event_risk_index', integrity: 'integrity_risk_index',
    manipulation: 'bot_manipulation_risk_index' },
  riskWeights: { liquidity: .2, spread: .2, volatility: .15, event: .15, integrity: .15, manipulation: .15 },
  hardGateFeatureIds: ['market_integrity_pass', 'liquidity_eligible', 'tradability_pass'],
  minimumConfidence: .9, minQualityScore: 90, minimumProvidersPerFeature: 2,
  maxNormalizedDisagreement: 10, maxRiskScore: 75, riskPenaltyCeiling: 40,
  componentIds: CANONICAL_50_COMPONENTS.map(c => c.componentId),
});

function freeze(value: object): void {
  Object.values(value).forEach(v => { if (v && typeof v === 'object') freeze(v); });
  Object.freeze(value);
}
freeze(SHADOW_SCORE_CONFIG_V1);
