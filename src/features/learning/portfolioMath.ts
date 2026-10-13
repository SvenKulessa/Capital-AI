/**
 * Deterministic educational portfolio model (synthetic annualized decimal inputs).
 * Covariance Sigma_ij = sigma_i * sigma_j * rho_ij; volatility = sqrt(w' Sigma w).
 * Invalid inputs are rejected, never silently defaulted or converted into a result.
 */
export const WEIGHT_SUM_TOLERANCE = 1e-4;
export const VARIANCE_ROUNDING_TOLERANCE = 1e-10;
export const MAX_VOLATILITY = 2;
export const MIN_VOLATILITY = 0;

export interface AssetParams {
  id: string;
  name: string;
  volatility: number;
}

export interface CorrelationMatrix {
  [row: string]: { [col: string]: number };
}

function validAssetIds(ids: string[]): boolean {
  return Array.isArray(ids) && ids.length >= 1 && ids.length <= 3 &&
    new Set(ids).size === ids.length && ids.every(id => typeof id === 'string' && id.length > 0);
}

export function validateWeights(weights: Record<string, number>, assetIds: string[]): string | null {
  if (!validAssetIds(assetIds) || !weights || typeof weights !== 'object') return 'Ungültige Assetliste oder Gewichte.';
  for (const id of assetIds) {
    const w = weights[id];
    if (!Number.isFinite(w) || w < 0 || w > 1) return `Gewicht für ${id} muss zwischen 0 und 1 liegen.`;
  }
  const sum = assetIds.reduce((acc, id) => acc + weights[id], 0);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    return `Gewichtssumme ${(sum * 100).toFixed(2)} % weicht von 100 % ab (Toleranz ±0,01 %).`;
  }
  return null;
}

export function validateVolatilities(vols: Record<string, number>, assetIds: string[]): string | null {
  if (!validAssetIds(assetIds) || !vols || typeof vols !== 'object') return 'Ungültige Assetliste oder Volatilitäten.';
  for (const id of assetIds) {
    const v = vols[id];
    if (!Number.isFinite(v) || v < MIN_VOLATILITY || v > MAX_VOLATILITY) {
      return `Volatilität für ${id} muss zwischen 0 und ${MAX_VOLATILITY * 100} % liegen.`;
    }
  }
  return null;
}

/** Principal minors are necessary and sufficient for PSD on symmetric 1-3 matrices. */
export function validateCorrelationMatrix(matrix: CorrelationMatrix, assetIds: string[]): string | null {
  if (!validAssetIds(assetIds) || !matrix || typeof matrix !== 'object') return 'Ungültige Korrelationsmatrix.';
  for (const i of assetIds) {
    if (!matrix[i] || typeof matrix[i] !== 'object') return `Korrelationszeile für ${i} fehlt.`;
    for (const j of assetIds) {
      const r = matrix[i][j];
      if (!Number.isFinite(r) || r < -1 || r > 1) return `Korrelation ${i}-${j} muss zwischen -1 und 1 liegen.`;
      if (i === j && Math.abs(r - 1) > 1e-10) return `Diagonale muss 1 sein (${i}).`;
      if (!matrix[j] || !Number.isFinite(matrix[j][i]) || Math.abs(matrix[j][i] - r) > 1e-10) {
        return `Matrix muss symmetrisch sein (${i}-${j}).`;
      }
    }
  }
  for (let i = 0; i < assetIds.length; i++) {
    for (let j = i + 1; j < assetIds.length; j++) {
      const r = matrix[assetIds[i]][assetIds[j]];
      if (1 - r * r < -VARIANCE_ROUNDING_TOLERANCE) return 'Korrelationsmatrix ist nicht positiv semidefinit.';
    }
  }
  if (assetIds.length === 3) {
    const [a, b, c] = assetIds;
    const x = matrix[a][b], y = matrix[a][c], z = matrix[b][c];
    const det = 1 + 2 * x * y * z - x*x - y*y - z*z;
    if (det < -VARIANCE_ROUNDING_TOLERANCE) return 'Korrelationsmatrix ist nicht positiv semidefinit.';
  }
  return null;
}

export function portfolioVariance(weights: number[], covariance: number[][]): number {
  if (!Array.isArray(weights) || weights.length === 0 ||
    covariance.length !== weights.length || weights.some(w => !Number.isFinite(w)) ||
    covariance.some(row => !Array.isArray(row) || row.length !== weights.length ||
      row.some(value => !Number.isFinite(value)))) throw new RangeError('Ungültige Kovarianzdaten.');
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) sum += weights[i] * weights[j] * covariance[i][j];
  }
  if (sum < -VARIANCE_ROUNDING_TOLERANCE) throw new RangeError('Negative Portfoliovarianz.');
  return sum < 0 ? 0 : sum;
}

export function portfolioVolatility(
  weights: Record<string, number>, vols: Record<string, number>,
  corrs: CorrelationMatrix, assetIds: string[],
): number {
  const validation = validateWeights(weights, assetIds) ||
    validateVolatilities(vols, assetIds) || validateCorrelationMatrix(corrs, assetIds);
  if (validation) throw new RangeError(validation);
  const w = assetIds.map(id => weights[id]);
  const covariance = assetIds.map(i => assetIds.map(j => vols[i] * vols[j] * corrs[i][j]));
  return Math.sqrt(portfolioVariance(w, covariance));
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
  risingCorrelations: {
    equity: { equity: 1, bonds: 0.7, cash: 0.3 },
    bonds: { equity: 0.7, bonds: 1, cash: 0.4 },
    cash: { equity: 0.3, bonds: 0.4, cash: 1 },
  },
  diversificationVsConcentration: {
    equal: { equity: 1/3, bonds: 1/3, cash: 1/3 },
    concentrated: { equity: 0.9, bonds: 0.05, cash: 0.05 },
  },
};
