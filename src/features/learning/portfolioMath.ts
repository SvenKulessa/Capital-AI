/**
 * Deterministic educational portfolio volatility model.
 * All inputs are synthetic. No market data, forecasts or recommendations.
 * Weights as decimals (0..1), volatilities annualized decimals, correlations -1..1.
 */

export const WEIGHT_SUM_TOLERANCE = 1e-4;
export const VARIANCE_ROUNDING_TOLERANCE = 1e-10;
export const MAX_VOLATILITY = 2.0; // 200 %
export const MIN_VOLATILITY = 0;

export interface AssetParams {
  id: string;
  name: string;
  volatility: number; // decimal, e.g. 0.20 for 20 %
}

export interface CorrelationMatrix {
  [row: string]: { [col: string]: number };
}

export function validateWeights(weights: Record<string, number>, assetIds: string[]): string | null {
  for (const id of assetIds) {
    const w = weights[id];
    if (!Number.isFinite(w) || w < 0 || w > 1) return `Gewicht für ${id} muss zwischen 0 und 1 liegen.`;
  }
  const sum = assetIds.reduce((s, id) => s + (weights[id] ?? 0), 0);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) return `Gewichtssumme ${ (sum * 100).toFixed(2) } % weicht von 100 % ab (Toleranz ±0,01 %).`;
  return null;
}

export function validateVolatilities(vols: Record<string, number>, assetIds: string[]): string | null {
  for (const id of assetIds) {
    const v = vols[id];
    if (!Number.isFinite(v) || v < MIN_VOLATILITY || v > MAX_VOLATILITY) return `Volatilität für ${id} muss zwischen 0 und ${MAX_VOLATILITY * 100} % liegen.`;
  }
  return null;
}

export function validateCorrelationMatrix(matrix: CorrelationMatrix, assetIds: string[]): string | null {
  for (const i of assetIds) {
    if (!matrix[i]) return `Korrelationszeile für ${i} fehlt.`;
    for (const j of assetIds) {
      const rho = matrix[i][j];
      if (!Number.isFinite(rho) || rho < -1 || rho > 1) return `Korrelation ${i}-${j} muss zwischen -1 und 1 liegen.`;
      if (i === j && Math.abs(rho - 1) > 1e-6) return `Diagonale muss 1 sein (${i}).`;
      if (matrix[j]?.[i] !== undefined && Math.abs(matrix[j][i] - rho) > 1e-6) return `Matrix muss symmetrisch sein (${i}-${j}).`;
    }
  }
  // Positive semi-definite check via eigenvalues (simple Cholesky attempt or spectral)
  try {
    const n = assetIds.length;
    const cov = Array.from({ length: n }, () => Array(n).fill(0));
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) cov[a][b] = matrix[assetIds[a]][assetIds[b]];
    // Simple eigenvalue check via QR or power iteration is heavy; for n<=3 use determinant and principal minors
    if (n === 3) {
      const d = cov[0][0] * (cov[1][1] * cov[2][2] - cov[1][2] * cov[2][1]) - cov[0][1] * (cov[1][0] * cov[2][2] - cov[1][2] * cov[2][0]) + cov[0][2] * (cov[1][0] * cov[2][1] - cov[1][1] * cov[2][0]);
      if (d < -VARIANCE_ROUNDING_TOLERANCE) return 'Korrelationsmatrix ist nicht positiv semidefinit.';
    }
  } catch { return 'Korrelationsmatrix ist ungültig.'; }
  return null;
}

export function portfolioVariance(weights: number[], cov: number[][]): number {
  let varSum = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      varSum += weights[i] * weights[j] * cov[i][j];
    }
  }
  if (varSum < 0 && Math.abs(varSum) <= VARIANCE_ROUNDING_TOLERANCE) return 0;
  return varSum;
}

export function portfolioVolatility(weights: Record<string, number>, vols: Record<string, number>, corrs: CorrelationMatrix, assetIds: string[]): number {
  const w = assetIds.map(id => weights[id] ?? 0);
  const n = assetIds.length;
  const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const rho = corrs[assetIds[i]][assetIds[j]] ?? (i === j ? 1 : 0);
      cov[i][j] = vols[assetIds[i]] * vols[assetIds[j]] * rho;
    }
  }
  const variance = portfolioVariance(w, cov);
  return Math.sqrt(Math.max(0, variance));
}

export const BASE_ASSETS: AssetParams[] = [
  { id: 'equity', name: 'Aktien', volatility: 0.18 },
  { id: 'bonds', name: 'Anleihen', volatility: 0.06 },
  { id: 'cash', name: 'Liquidität', volatility: 0.005 },
];

export const BASE_CORRELATIONS: CorrelationMatrix = {
  equity: { equity: 1, bonds: 0.2, cash: 0.05 },
  bonds: { equity: 0.2, bonds: 1, cash: 0.1 },
  cash: { equity: 0.05, bonds: 0.1, cash: 1 },
};

export const LEARNING_CASES = {
  highSingleVol: { equity: 0.35, bonds: 0.06, cash: 0.005 },
  risingCorrelations: { equity: { equity: 1, bonds: 0.7, cash: 0.3 }, bonds: { equity: 0.7, bonds: 1, cash: 0.4 }, cash: { equity: 0.3, bonds: 0.4, cash: 1 } },
  diversificationVsConcentration: { equal: { equity: 1/3, bonds: 1/3, cash: 1/3 }, concentrated: { equity: 0.9, bonds: 0.05, cash: 0.05 } },
};
