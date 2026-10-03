import { PriceHistoryCalculationSchema, QuotedSpreadCalculationSchema,
  type PriceHistoryCalculation, type QuotedSpreadCalculation, type RawCalculatedFeature,
  type RawFeatureCalculationEvidence } from '../contracts/rawFeatureCalculation';
import type { AssetIdentity, DataProvenance } from '../contracts/canonicalContracts';
import { evaluateMarketDataRights, type MarketDataRightsEvidence } from '../contracts/marketDataRightsEligibility';

const VERSION = '1.0.0' as const;
function validateSource(input: { asset: AssetIdentity; evaluatedAt: number; mode: string; rights: MarketDataRightsEvidence },
  sample: { assetId: string; venue: string; currency: string; provenance: DataProvenance }) {
  const { asset, evaluatedAt, rights } = input, p = sample.provenance;
  if (asset.status !== 'active' || sample.assetId !== asset.assetId || sample.venue !== asset.venue ||
      sample.currency !== asset.currency || !/^[A-Z]{3}$/.test(asset.currency)) throw new Error('FEATURE_ASSET_IDENTITY_MISMATCH');
  if (p.observedAt > evaluatedAt || p.receivedAt > evaluatedAt || p.publishedAt > evaluatedAt ||
      p.receivedAt < p.observedAt || p.publishedAt < p.receivedAt ||
      p.latencyMs !== p.receivedAt - p.observedAt) throw new Error('FEATURE_TIMESTAMP_INVALID');
  if (p.isDemo !== (input.mode === 'demo') || (p.isDemo && !/^(demo|test)[-_]/i.test(p.providerId)) ||
      (!p.isDemo && (/^(demo|test)[-_]/i.test(p.providerId) || p.licenseScope === 'sandbox_demo'))) throw new Error('FEATURE_DEMO_MODE_MISMATCH');
  if (rights.providerId !== p.providerId || !rights.feedsSymbolsAndVenues?.includes(`${p.providerDataset}:${asset.symbol}:${asset.venue}`) ||
      !rights.reviewedAt || Date.parse(rights.reviewedAt) > evaluatedAt) throw new Error('FEATURE_RIGHTS_SCOPE_MISMATCH');
  const decision = evaluateMarketDataRights(rights, ['internal_analysis', 'derived_scoring_research', 'cache_retention'], new Date(evaluatedAt));
  if (decision.decision !== 'ALLOW') throw new Error('FEATURE_RIGHTS_NOT_ADMITTED');
}
function feature(input: {asset: AssetIdentity; evaluatedAt: number; mode: string}, observedAt: number,
  featureId: string, value: number | null, unit: string): RawCalculatedFeature {
  if (value !== null && !Number.isFinite(value)) throw new Error('FEATURE_NUMERICAL_OVERFLOW');
  return { featureId, assetId: input.asset.assetId, value, unit, observedAt, evaluatedAt: input.evaluatedAt,
    calculationVersion: VERSION, normalizedValue: null, qualityScore: null, scoreEligible: false,
    isDemo: input.mode === 'demo', reasonCodes: ['RAW_FORMULA_ONLY', 'NORMALIZATION_CALIBRATION_REQUIRED',
      'COMPONENT_ADMISSION_REQUIRED', ...(value === null ? ['ZERO_VARIANCE'] : [])] };
}

/** Pure offline formulas. Complete parsed inputs accompany values for content-addressed replay. */
export function calculatePriceHistory(input: unknown): RawFeatureCalculationEvidence<PriceHistoryCalculation> {
  const context = PriceHistoryCalculationSchema.parse(input), { bars, intervalMs, evaluatedAt, maxStalenessMs } = context;
  const first = bars[0].provenance;
  bars.forEach((bar, i) => {
    validateSource(context, bar);
    if (bar.closeAt - bar.openAt !== intervalMs || bar.closeAt > evaluatedAt ||
        bar.provenance.observedAt < bar.closeAt || (i > 0 && bar.openAt !== bars[i - 1].closeAt)) throw new Error('FEATURE_BAR_SEQUENCE_INVALID');
    if (bar.provenance.providerId !== first.providerId || bar.provenance.providerDataset !== first.providerDataset ||
        bar.provenance.licenseScope !== first.licenseScope || bar.provenance.isDelayed !== first.isDelayed) throw new Error('FEATURE_MIXED_SOURCE');
  });
  const last = bars[bars.length - 1];
  if (evaluatedAt - last.closeAt > maxStalenessMs) throw new Error('FEATURE_HISTORY_STALE');
  // Wilder RSI14: seed from the first 14 deltas, then recurrent smoothing; flat series convention = 50.
  let gain = 0, loss = 0;
  for (let i = 1; i < bars.length; i++) {
    const delta = bars[i].close - bars[i - 1].close;
    if (i <= 14) { gain += Math.max(delta, 0) / 14; loss += Math.max(-delta, 0) / 14; }
    else { gain = gain * (13 / 14) + Math.max(delta, 0) / 14; loss = loss * (13 / 14) + Math.max(-delta, 0) / 14; }
  }
  const rsi = gain + loss === 0 ? 50 : 100 * (gain / (gain + loss));
  const closes = bars.slice(-20).map(bar => bar.close);
  const mean = closes.reduce((total, close) => total + close / 20, 0);
  const std = Math.sqrt(closes.reduce((total, close) => total + ((close - mean) ** 2) / 20, 0));
  if (![gain, loss, mean, std].every(Number.isFinite)) throw new Error('FEATURE_NUMERICAL_OVERFLOW');
  const z = std === 0 ? null : (last.close - mean) / std;
  return { schemaVersion: VERSION, input: context, features: [
    feature(context, last.closeAt, 'rsi_14', rsi, 'index'),
    feature(context, last.closeAt, 'sma_20_close', mean, context.asset.currency),
    feature(context, last.closeAt, 'z_score_vs_20_period_sma', z, 'standard_deviation'),
    feature(context, last.closeAt, 'bollinger_percent_b', z === null ? null : (z + 2) / 4, 'ratio'),
  ] };
}

/** Quoted spread uses the midpoint. This does not estimate execution/effective spread or market impact. */
export function calculateQuotedSpread(input: unknown): RawFeatureCalculationEvidence<QuotedSpreadCalculation> {
  const context = QuotedSpreadCalculationSchema.parse(input), { quote } = context;
  validateSource(context, quote);
  if (context.evaluatedAt - quote.provenance.observedAt > context.maxStalenessMs) throw new Error('FEATURE_QUOTE_STALE');
  if (quote.ask < quote.bid) throw new Error('FEATURE_CROSSED_BOOK');
  const midpoint = quote.bid / 2 + quote.ask / 2;
  return { schemaVersion: VERSION, input: context, features: [feature(context, quote.provenance.observedAt,
    'quoted_spread_bps', (quote.ask - quote.bid) / midpoint * 10000, 'bps')] };
}
