import { test } from 'node:test';
import assert from 'node:assert/strict';
import { portfolioVolatility, validateWeights, BASE_ASSETS, BASE_CORRELATIONS } from './portfolioMath';;

const ids = BASE_ASSETS.map(a => a.id);

test('equal weight base portfolio volatility is finite and positive', () => {
  const w = { equity: 1/3, bonds: 1/3, cash: 1/3 };
  const vols = Object.fromEntries(BASE_ASSETS.map(a => [a.id, a.volatility]));
  const v = portfolioVolatility(w, vols, BASE_CORRELATIONS, ids);
  assert.ok(v > 0 && Number.isFinite(v));
});

test('100 % single asset equals its volatility when rho=1', () => {
  const w = { equity: 1, bonds: 0, cash: 0 };
  const vols = Object.fromEntries(BASE_ASSETS.map(a => [a.id, a.volatility]));
  const v = portfolioVolatility(w, vols, BASE_CORRELATIONS, ids);
  assert.ok(Math.abs(v - vols.equity) < 1e-6);
});

test('zero volatility asset contributes zero', () => {
  const w = { equity: 0.5, bonds: 0, cash: 0.5 };
  const vols = { equity: 0.2, bonds: 0, cash: 0 };
  const v = portfolioVolatility(w, vols, BASE_CORRELATIONS, ids);
  assert.ok(Math.abs(v - 0.1) < 1e-4); // 0.5 * 0.2
});

test('invalid weight sum is rejected', () => {
  assert.ok(validateWeights({ equity: 0.4, bonds: 0.3, cash: 0.2 }, ids));
});

test('NaN and negative weights rejected', () => {
  assert.ok(validateWeights({ equity: NaN, bonds: 0.5, cash: 0.5 }, ids));
  assert.ok(validateWeights({ equity: -0.1, bonds: 0.6, cash: 0.5 }, ids));
});
