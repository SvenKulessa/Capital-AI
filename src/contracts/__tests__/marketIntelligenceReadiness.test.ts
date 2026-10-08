import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_50_COMPONENTS } from '../analysisComponentRegistry';
import { buildStaticMarketReadinessReport } from '../../services/marketIntelligenceReadiness';

test('static enterprise inventory reuses the canonical registry, not a second catalogue', () => {
  const report = buildStaticMarketReadinessReport();
  assert.equal(report.schemaVersion, 'CAPITAL_AI_STATIC_MARKET_INTELLIGENCE_READINESS@1');
  assert.equal(report.registrySchemaValid, true);
  assert.equal(report.registryCount, 50);
  assert.equal(report.expectedRegistryCount, 50);
  assert.equal(report.domains.length, 13);
  assert.deepEqual(report.components.map(c => c.componentId), CANONICAL_50_COMPONENTS.map(c => c.componentId));
  assert.equal(new Set(report.components.map(c => c.componentId)).size, 50);
  assert.equal(Object.values(report.lifecycleCounts).reduce((sum, n) => sum + n, 0), 50);
  assert.equal(Object.values(report.provenanceCounts).reduce((sum, n) => sum + n, 0), 50);
});

test('static declarations never grant runtime, public scoring or ranking authority', () => {
  const report = buildStaticMarketReadinessReport();
  assert.equal(report.scope, 'REPOSITORY_STATIC_ONLY');
  assert.equal(report.runtimeEvidence, 'NOT_PROVEN');
  assert.equal(report.publicScoringEligible, false);
  assert.equal(report.publicRankingEligible, false);
  for (const row of report.components) {
    assert.equal(row.runtimeVerified, false);
    assert.equal(row.productionEligible, false);
    assert.ok(row.issueCodes.includes('RUNTIME_EVIDENCE_NOT_PROVEN'));
    assert.equal(typeof row.calculationVersion, 'string');
  }
});

test('current main lifecycle and unavailable data modes remain explicitly quarantined', () => {
  const report = buildStaticMarketReadinessReport();
  assert.equal(report.lifecycleCounts.planned, 45);
  assert.equal(report.lifecycleCounts.blocked, 5);
  assert.equal(report.lifecycleCounts.active, 0);
  assert.equal(report.provenanceCounts.unavailable, 50);
  for (const row of report.components) {
    assert.equal(row.lastValidatedAt, null);
    assert.ok(row.issueCodes.includes('COMPONENT_NOT_ACTIVE'));
    assert.ok(row.issueCodes.includes('COMPONENT_VALIDATION_NOT_PROVEN'));
    assert.ok(row.issueCodes.includes('PRODUCTION_DATA_MODE_UNAVAILABLE'));
  }
});
