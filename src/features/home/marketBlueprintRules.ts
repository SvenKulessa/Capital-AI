/** Pure concept-only rule. No runtime alerts, provider data, clock or side effects. */
export function didSyntheticThresholdCross(series: readonly number[], threshold: number): boolean {
  if (!Number.isFinite(threshold) || series.some(value => !Number.isFinite(value))) {
    throw new Error('DEMO_THRESHOLD_INVALID');
  }
  // A newly crossed threshold requires a previous observation below it.
  return series.some((value, index) =>
    index > 0 && series[index - 1] < threshold && value >= threshold
  );
}
