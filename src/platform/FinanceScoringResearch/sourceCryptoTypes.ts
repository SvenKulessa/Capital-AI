/**
 * Source-compatible subset of Finance pattern and regime types, not the legacy trading runtime.
 * Import type only; no broker/order capabilities are ported.
 */
export type MarketRegime = 'BULL' | 'BEAR' | 'RANGE' | 'HIGH_VOLATILITY' | 'STRESS' | 'UNKNOWN';
export type PatternDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type PatternSignalResolution = {
  readonly disposition: 'SUPPORTED_CONTEXT' | 'CONFLICTING_EVIDENCE' | 'NOT_COMPUTABLE';
  readonly direction: PatternDirection | null;
  readonly primary: { readonly evidence: { readonly direction: PatternDirection; readonly timeframe: string; readonly patternQuality: number } } | null;
  readonly supporting: readonly { readonly evidence: { readonly direction: PatternDirection; readonly timeframe: string; readonly patternQuality: number } }[];
  readonly reasons: readonly string[];
};