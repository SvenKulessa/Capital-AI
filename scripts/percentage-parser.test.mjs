import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePercentage } from '../src/utils/parsePercentage.ts';

test('signed decimal percentages preserve ordering in both decimal formats', () => {
  assert.equal(parsePercentage(' +12,5% '), 12.5);
  assert.equal(parsePercentage('-0.25%'), -0.25);
  assert.equal(parsePercentage('3'), 3);
});

test('repeated symbols, trailing content and non-finite values are rejected', () => {
  for (const value of ['12%%', '1+2%', '++12%', '1,2,3%', '12%<script>', '', 'Infinity', '9'.repeat(400)]) {
    assert.equal(parsePercentage(value), 0, value);
  }
});
