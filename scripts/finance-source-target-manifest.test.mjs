import test from 'node:test';
import assert from 'node:assert/strict';
import { readAndValidateFinanceSourceTargetManifest } from './validate-finance-source-target-manifest.mjs';

test('Finance → Capital-AI Source-to-Target-Manifest ist strukturell und gegen CURRENT_MAIN-Authorities konsistent', () => {
  const result = readAndValidateFinanceSourceTargetManifest();
  assert.equal(result.status, 'PASS');
  assert.equal(result.sourceCommit, 'dcef421fe6e350a3a2ade61d0299aad9ecca213c');
  assert.equal(result.targetMain, '8244a411b3b5b691adbb78ffdc5880aadd267113');
  assert.equal(result.entries, 42);
  assert.equal(result.targetAuthorities, 16);
});
