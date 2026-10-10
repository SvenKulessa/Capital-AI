import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_BUNDLE_DEMO_YAML, parseScreenerBundleDemoYaml } from '../src/features/documentation/screenerBlueprintDemo.ts';

const parse = parseScreenerBundleDemoYaml;
const change = (from, to) => SCREENER_BUNDLE_DEMO_YAML.replace(from, to);
const blocked = input => {
  const outcome = parse(input);
  assert.equal(outcome.ok, false);
  assert.ok(outcome.errors.length);
};

test('synthetic score is deterministic and never production-eligible', () => {
  const result = parse(SCREENER_BUNDLE_DEMO_YAML);
  assert.equal(result.ok, true);
  assert.equal(result.preview.total, 76.85);
  assert.equal(result.preview.status, 'DEMO_ONLY');
  assert.equal(result.preview.publishable, false);
  assert.equal(result.preview.rankEligible, false);
  assert.equal(result.preview.productionEligible, false);
  assert.equal(result.preview.contributions.length, 6);
  assert.equal(result.preview.contributions.find(x => x.factor === 'patterns')?.contribution, 12.75);
});
test('editing synthetic patterns affects only demo calculation', () => {
  const result = parse(change('  patterns: 85', '  patterns: 65'));
  assert.equal(result.ok, true);
  assert.equal(result.preview.total, 73.85);
  assert.equal(result.preview.productionEligible, false);
});
test('reject wrong weight sum', () => blocked(change('  patterns: 0.15', '  patterns: 0.16')));
test('reject unknown factor', () => blocked(change('  patterns: 0.15', '  api_key: 0.15')));
test('reject duplicate factor', () => blocked(change('  patterns: 0.15', '  patterns: 0.15\n  patterns: 0.15')));
test('reject repeated sections', () => blocked(change('weights:', 'weights:\nweights:')));
test('reject live mode', () => blocked(change('mode: demo', 'mode: live')));
test('reject URLs, custom YAML tags, anchors, aliases and objects', () => {
  for (const value of ['api_url: https://example.com', 'x: !secret', 'x: &anchor', 'x: *anchor', 'x: {key: true}']) {
    blocked(SCREENER_BUNDLE_DEMO_YAML + value + '\n');
  }
});
test('reject missing factors', () => blocked(change('  liquidity: 90\n', '')));
test('reject malformed, negative, non-finite and out-of-range signals', () => {
  for (const value of ['101', '-1', 'Infinity', 'NaN', '1e2', '0.0.0']) {
    blocked(change('  patterns: 85', '  patterns: ' + value));
  }
});
test('reject tab indentation', () => blocked(change('  patterns: 85', '\tpatterns: 85')));
test('bound input length', () => blocked('x'.repeat(2049)));
test('reject non-string input', () => blocked({password: 'not-a-yaml-string'}));
