import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('deploy/npm-security-patches/package.json', 'utf8'));
const lock = JSON.parse(readFileSync('deploy/npm-security-patches/package-lock.json', 'utf8'));
const hardener = readFileSync('scripts/harden-npm-toolchain.mjs', 'utf8');

const fixed = '5.0.12';
const integrity = 'sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==';

test('brace-expansion donor is pinned above CVE-2026-102277 affected range', () => {
  assert.equal(packageJson.dependencies['brace-expansion'], fixed);
  assert.equal(lock.packages[''].dependencies['brace-expansion'], fixed);

  const entry = lock.packages['node_modules/brace-expansion'];
  assert.equal(entry.version, fixed);
  assert.equal(entry.resolved, 'https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.12.tgz');
  assert.equal(entry.integrity, integrity);
  assert.equal(entry.license, 'MIT');
  assert.equal(entry.dependencies['balanced-match'], '^4.0.2');
});

test('npm hardener cannot silently regress brace-expansion to 5.0.11', () => {
  assert.match(hardener, /\['brace-expansion', '5\.0\.9', '5\.0\.12'\]/);
  assert.doesNotMatch(hardener, /\['brace-expansion', '5\.0\.9', '5\.0\.11'\]/);
});
