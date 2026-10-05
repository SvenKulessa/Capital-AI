import test from 'node:test';
import assert from 'node:assert/strict';
import { readAndValidateFinanceSourceTargetManifest } from './validate-finance-source-target-manifest.mjs';

test('Finance → Capital-AI Source-to-Target-Manifest ist strukturell und gegen CURRENT_MAIN-Authorities konsistent', () => {
  const result = readAndValidateFinanceSourceTargetManifest();
  assert.equal(result.status, 'PASS');
  assert.equal(result.sourceCommit, 'dcef421fe6e350a3a2ade61d0299aad9ecca213c');
  assert.equal(result.targetMain, '96178b35db215754eb69785535f035b4fb4d96af');
  assert.equal(result.entries, 42);
  assert.equal(result.targetAuthorities, 16);
});
