// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectSyntheticPitUniverse, PIT_UNIVERSE_CONTROL_VERSION } from './market-pit-survivorship-control.mjs';

const fixture = JSON.parse(readFileSync(new URL(
  '../docs/evidence/skill-use/2026-10-12/synthetic-pit-universe-v1.json', import.meta.url,
), 'utf8'));
const fresh = () => structuredClone(fixture);
const inspect = x => inspectSyntheticPitUniverse(x.manifest, x.dataset);

test('versioned historical fixture has explicit delisted and newly listed instruments and never promotes results', () => {
  const x = fresh(), result = inspect(x);
  assert.equal(result.status, 'VALIDATED_SYNTHETIC_FIXTURE', result.reasons.join(','));
  assert.equal(result.version, PIT_UNIVERSE_CONTROL_VERSION);
  assert.equal(result.datasetVersion, 'fixture-v1.0.0');
  assert.equal(result.observedDecisionCount, 2);
  assert.equal(result.observedRecordCount, 4);
  assert.ok(x.manifest.snapshots[0].members.some(m => m.assetId === 'SYNTH:BETA-DELISTED'));
  assert.ok(!x.manifest.snapshots[1].members.some(m => m.assetId === 'SYNTH:BETA-DELISTED'));
  assert.equal(result.empiricalPerformanceProven, false);
  assert.equal(result.productionEligible, false);
  assert.equal(result.scoreEligible, false);
  assert.equal(result.redistributionAllowed, false);
  assert.ok(!Object.hasOwn(result, 'annualizedReturn'));
});

test('replay is stable across property ordering; an input edit changes the fingerprint', () => {
  const first = fresh(), reordered = fresh();
  reordered.dataset = Object.fromEntries(Object.entries(reordered.dataset).reverse());
  assert.equal(inspect(first).fingerprint, inspect(reordered).fingerprint);
  const changed = fresh();
  changed.dataset.observations[0].features[0].sourceVersion = 'fixture-feature-v2';
  assert.notEqual(inspect(first).fingerprint, inspect(changed).fingerprint);
});

const cases = [
  ['survivor-only selected observations', x => {
    x.dataset.observations = x.dataset.observations.filter(o => o.assetId !== 'SYNTH:BETA-DELISTED');
  }, 'PIT_SURVIVORSHIP_OBSERVATION_MISSING:'],
  ['survivor-only first snapshot', x => {
    x.manifest.snapshots[0].members = x.manifest.snapshots[0].members.filter(m => m.assetId !== 'SYNTH:BETA-DELISTED');
  }, 'PIT_SURVIVORSHIP_OR_UNIVERSE_COVERAGE:'],
  ['future snapshot capture', x => {
    x.manifest.snapshots[0].capturedAt = '2024-01-06T12:00:00.000Z';
  }, 'PIT_SNAPSHOT_LOOKAHEAD:'],
  ['future feature availability', x => {
    x.dataset.observations[0].features[0].availableAt = '2024-01-06T00:00:00.000Z';
  }, 'PIT_LOOKAHEAD_FEATURE:'],
  ['future membership availability', x => {
    x.manifest.snapshots[0].members[0].availableAt = '2024-01-06T00:00:00.000Z';
  }, 'PIT_MEMBERSHIP_LOOKAHEAD:'],
  ['membership evidence substitution', x => {
    x.dataset.observations[0].universeMembershipEvidenceId = 'fixture://wrong';
  }, 'PIT_MEMBERSHIP_EVIDENCE_MISMATCH:'],
  ['unrecognized asset injection', x => {
    x.dataset.observations[0].assetId = 'SYNTH:UNKNOWN';
  }, 'PIT_OBSERVATION_NOT_IN_HISTORICAL_UNIVERSE:'],
  ['duplicate observation at decision', x => {
    x.dataset.observations.push(structuredClone(x.dataset.observations[0]));
  }, 'PIT_OBSERVATION_DUPLICATE:'],
  ['mismatched dataset version', x => {
    x.dataset.datasetVersion = 'fixture-v0';
  }, 'PIT_IDENTITY_MISMATCH:datasetVersion'],
  ['mislabelled third-party dataset', x => {
    x.dataset.dataClass = 'LICENSED_MARKET_DATA';
  }, 'PIT_SYNTHETIC_SCOPE_REQUIRED'],
  ['disallowed production authority', x => {
    x.dataset.authority = 'PRODUCTION';
  }, 'PIT_RESEARCH_ONLY_REQUIRED'],
  ['realized outcome before decision', x => {
    x.dataset.observations[0].realizedAt = '2024-01-04T00:00:00.000Z';
  }, 'PIT_OUTCOME_TIME_INVALID:'],
  ['delisted instrument incorrectly admitted later', x => {
    x.manifest.snapshots[1].members.push(structuredClone(x.manifest.snapshots[0].members[1]));
  }, 'PIT_SURVIVORSHIP_OR_UNIVERSE_COVERAGE:'],
  ['newly listed instrument inserted too early', x => {
    x.manifest.snapshots[0].members.push(structuredClone(x.manifest.snapshots[1].members[1]));
  }, 'PIT_SURVIVORSHIP_OR_UNIVERSE_COVERAGE:'],
];
for (const [name, mutate, expected] of cases) {
  test('fail closed: ' + name, () => {
    const x = fresh(); mutate(x);
    const result = inspect(x);
    assert.equal(result.status, 'BLOCKED', result.reasons.join(','));
    assert.ok(result.reasons.some(reason => reason.startsWith(expected)), result.reasons.join(','));
    assert.equal(result.productionEligible, false);
    assert.equal(result.empiricalPerformanceProven, false);
  });
}
