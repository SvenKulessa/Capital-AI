export const ANALYSIS_UI_MODULES = [
  'components',
  'sentiment',
  'whales',
  'console',
] as const;
export type AnalysisUiModule = (typeof ANALYSIS_UI_MODULES)[number];
/** Presentation only. Never enables a runner, provider, API permission or production pipeline. */
export function parseAnalysisUiFlags(
  raw: string | undefined,
): AnalysisUiModule[] {
  if (raw === undefined) return [...ANALYSIS_UI_MODULES];
  const requested = new Set(raw.split(',').map((v) => v.trim()));
  return ANALYSIS_UI_MODULES.filter((id) => requested.has(id));
}
export function analysisUiEnabled(module: AnalysisUiModule) {
  return parseAnalysisUiFlags(
    import.meta.env?.VITE_CAPITAL_ANALYSIS_UI_MODULES,
  ).includes(module);
}
