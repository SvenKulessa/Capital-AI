/** Accept a complete signed decimal percentage; malformed values sort as zero. */
export function parsePercentage(value: string): number {
  const match = /^([+-]?\d+(?:[.,]\d+)?)%?$/.exec(value.trim());
  if (!match) return 0;
  const result = Number(match[1].replaceAll(',', '.'));
  return Number.isFinite(result) ? result : 0;
}
