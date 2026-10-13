/** Educational arithmetic only. Never a FinalRankResult or production score. */
export const METHODOLOGY_VERSION = 'finance-crypto-2026-08-16/demo-v1';
export const METHODOLOGY_SOURCE_SHA = 'c08a68bdfdeaa91cb8ba974b5a1829bf00fe61bb';
export const METHODOLOGY_FACTORS = [
  { id: 'trend', label: 'Trend', weight: .20, example: 82, inverted: false },
  { id: 'momentum', label: 'Momentum', weight: .16, example: 76, inverted: false },
  { id: 'volatility_quality', label: 'Volatilitätsqualität', weight: .12, example: 70, inverted: false },
  { id: 'breakout_quality', label: 'Ausbruchsqualität', weight: .10, example: 72, inverted: false },
  { id: 'relative_strength', label: 'RSI-Merkmal', weight: .12, example: 68, inverted: false },
  { id: 'avg_daily_volume', label: 'Durchschnittliches Tagesvolumen', weight: .08, example: 80, inverted: false },
  { id: 'exchange_liquidity', label: 'Exchange-Liquidität', weight: .04, example: 74, inverted: false },
  { id: 'supply_dynamics', label: 'Angebotsdynamik', weight: .08, example: 65, inverted: false },
  { id: 'regime_bonus', label: 'Marktregime', weight: .06, example: 60, inverted: false },
  { id: 'data_quality_risk', label: 'Datenrisiko', weight: .04, example: 10, inverted: true },
] as const;
export type MethodologyFactorId = typeof METHODOLOGY_FACTORS[number]['id'];
export type MethodologyValues = Partial<Record<MethodologyFactorId, number | null>>;
export const METHODOLOGY_EXAMPLE: MethodologyValues = Object.fromEntries(METHODOLOGY_FACTORS.map(f => [f.id, f.example]));
/** Single threshold contract for this historical learning model, without trading labels. */
export const METHODOLOGY_BANDS = [
  { min: 90, label: '90–100 Modellpunkte' },
  { min: 80, label: '80 bis unter 90 Modellpunkte' },
  { min: 70, label: '70 bis unter 80 Modellpunkte' },
  { min: 60, label: '60 bis unter 70 Modellpunkte' },
  { min: 0, label: 'Unter 60 Modellpunkte' },
] as const;
export function methodologyBand(score: number | null) {
  return score === null || !Number.isFinite(score) || score < 0 || score > 100
    ? 'Nicht verfügbar' : METHODOLOGY_BANDS.find(b => score >= b.min)!.label;
}
export function calculateMethodology(values: MethodologyValues) {
  if (Object.keys(values).some(key => !METHODOLOGY_FACTORS.some(f => f.id === key))) throw new Error('UNKNOWN_METHODOLOGY_FACTOR');
  const available = METHODOLOGY_FACTORS.filter(f => values[f.id] != null);
  for (const f of available) {
    const value = values[f.id];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw new Error('INVALID_METHODOLOGY_VALUE');
  }
  const weight = available.reduce((sum, f) => sum + f.weight, 0);
  const factors = METHODOLOGY_FACTORS.map(f => {
    const input = values[f.id] ?? null;
    const quality = input === null ? null : f.inverted ? 100 - input : input;
    const effectiveWeight = input === null || weight === 0 ? 0 : f.weight / weight;
    return { ...f, input, quality, effectiveWeight, contribution: quality === null ? null : quality * effectiveWeight };
  });
  const score = weight === 0 ? null : factors.reduce((sum, f) => sum + (f.contribution ?? 0), 0);
  return { version: METHODOLOGY_VERSION, mode: 'synthetic' as const, score,
    band: methodologyBand(score), factors, availableCount: available.length,
    weightCoverage: weight, complete: available.length === METHODOLOGY_FACTORS.length,
    scoreEligible: false as const, rankEligible: false as const, decisionEligible: false as const };
}
