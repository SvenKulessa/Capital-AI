import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  portfolioVariance, portfolioVolatility, validateWeights, validateVolatilities,
  validateCorrelationMatrix, BASE_ASSETS, BASE_CORRELATIONS,
} from './portfolioMath';

const ids = BASE_ASSETS.map(asset => asset.id);
const vols = Object.fromEntries(BASE_ASSETS.map(asset => [asset.id, asset.volatility]));
const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `expected ${actual} ≈ ${expected}`);

test('independent hand-calculated base variance and volatility (50/30/20)', () => {
  const w = { equity: 0.5, bonds: 0.3, cash: 0.2 };
  close(portfolioVolatility(w, vols, BASE_CORRELATIONS, ids), Math.sqrt(0.0090856));
});

test('equal weight portfolio matches independent variance', () => {
  const w = { equity: 1/3, bonds: 1/3, cash: 1/3 };
  close(portfolioVolatility(w, vols, BASE_CORRELATIONS, ids), Math.sqrt(0.004499444444444444));
});

test('single asset volatility and zero-volatility cash', () => {
  close(portfolioVolatility({ equity: 1, bonds: 0, cash: 0 }, vols, BASE_CORRELATIONS, ids), 0.18);
  close(portfolioVolatility({ equity: 0.5, bonds: 0, cash: 0.5 },
    { equity: 0.2, bonds: 0, cash: 0 }, BASE_CORRELATIONS, ids), 0.1);
});

test('perfect positive and negative pair correlations', () => {
  const pair = ['equity','bonds'];
  const w = { equity: 0.5, bonds: 0.5 };
  const v = { equity: 0.2, bonds: 0.1 };
  close(portfolioVolatility(w,v,{ equity:{equity:1,bonds:1},bonds:{equity:1,bonds:1} },pair),0.15);
  close(portfolioVolatility(w,v,{ equity:{equity:1,bonds:-1},bonds:{equity:-1,bonds:1} },pair),0.05);
});

test('weight sum, negative, missing and nonfinite inputs fail closed', () => {
  assert.ok(validateWeights({ equity:0.4,bonds:0.3,cash:0.2 },ids));
  for (const bad of [
    { equity:NaN,bonds:0.5,cash:0.5 },
    { equity:-0.1,bonds:0.6,cash:0.5 },
    { equity:Infinity,bonds:0,cash:0 },
    { equity:1,bonds:0 },
  ]) {
    assert.ok(validateWeights(bad,ids));
    assert.throws(() => portfolioVolatility(bad,vols,BASE_CORRELATIONS,ids),RangeError);
  }
});

test('missing and nonfinite volatilities are rejected', () => {
  for (const bad of [
    { equity:NaN,bonds:0.06,cash:0.005 },
    { equity:3,bonds:0.06,cash:0.005 },
    { equity:0.18,bonds:0.06 },
  ]) {
    assert.ok(validateVolatilities(bad, ids));
    assert.throws(() => portfolioVolatility({ equity:1,bonds:0,cash:0 },bad,BASE_CORRELATIONS,ids),RangeError);
  }
});

test('correlations reject asymmetry, non-PSD, NaN and missing keys', () => {
  const invalid = [
    { equity:{equity:1,bonds:0.2,cash:0},bonds:{equity:0.5,bonds:1,cash:0},cash:{equity:0,bonds:0,cash:1} },
    { equity:{equity:1,bonds:0.9,cash:0.9},bonds:{equity:0.9,bonds:1,cash:-0.9},cash:{equity:0.9,bonds:-0.9,cash:1} },
    { equity:{equity:1,bonds:NaN,cash:0},bonds:{equity:NaN,bonds:1,cash:0},cash:{equity:0,bonds:0,cash:1} },
    { equity:{equity:1,bonds:0.1,cash:0},bonds:{equity:0.1,bonds:1,cash:0},cash:{equity:0,bonds:0} },
  ];
  for (const matrix of invalid) {
    assert.ok(validateCorrelationMatrix(matrix,ids));
    assert.throws(() => portfolioVolatility({equity:1,bonds:0,cash:0},vols,matrix,ids),RangeError);
  }
});

test('rounding tolerance applies only to tiny negative variance', () => {
  assert.equal(portfolioVariance([1], [[-1e-11]]), 0);
  assert.throws(() => portfolioVariance([1], [[-0.5]]), RangeError);
  assert.throws(() => portfolioVariance([1], [[NaN]]), RangeError);
});
