import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CANONICAL_50_COMPONENTS } from '../../../contracts/analysisComponentRegistry';
import {
  ANALYSIS_FAMILIES,
  PRODUCT_CLASSES,
  componentName,
  filterAnalysisComponents,
  registrySummary,
} from '../analysisPresentation';
import {
  createUnavailableResult,
  safeScorePresentation,
} from '../scorePresentation';
import { parseAnalysisUiFlags } from '../analysisUiFlags';
import {
  numericFilter,
  projectScreenerRows,
  type ScreenerFilters,
  type ScreenerRowItem,
} from '../screenerProjection';
import { AnalysisComponentExplorer } from '../AnalysisComponentExplorer';
import { ScoreExplainabilityDrawer } from '../../screener/ScoreExplainabilityDrawer';
import {
  SentimentIntelligencePanel,
  WhaleIntelligencePanel,
} from '../MarketIntelligencePanels';
import { AnalysisShadowSession } from '../AnalysisShadowSession';
import { SHADOW_SCORE_CONFIG_V1 } from '../../../config/shadowScoreConfig';
const now = 1_791_000_000_000;
const asset = {
  assetId: 'test-only',
  symbol: 'TEST',
  assetClass: 'crypto' as const,
};
const filters: ScreenerFilters = {
  search: '',
  assetClass: 'all',
  market: '',
  sector: '',
  minScore: 0,
  maxScore: 100,
  minConfidence: 0,
  minLiquidity: 0,
  status: 'all',
  regime: '',
  sentiment: 'all',
  risk: 'all',
  sort: 'finalScore',
};
function admittedTestResult() {
  const result = createUnavailableResult(asset, '1.0.0', now);
  return {
    ...result,
    resultStatus: 'computed' as const,
    dataAvailability: 'live' as const,
    finalScore: 50,
    eligibility: true,
    scoreEligible: true,
    rankEligible: true,
    rank: 7,
    confidence: 0.95,
    evidenceId: 'EVD-' + 'a'.repeat(64),
    subScores: {
      momentumScore: 60,
      technicalScore: 60,
      fundamentalScore: 60,
      sentimentScore: 60,
      eventScore: 60,
      positioningScore: 60,
    },
    reasonCodes: [],
  };
}
function row(): ScreenerRowItem {
  return {
    ...asset,
    name: 'TEST ONLY',
    market: 'TEST',
    sector: 'TEST',
    regime: 'baseline',
    liquidity: null,
    scoreChange: null,
    sentimentVelocity: null,
    sentimentDirection: 'neutral',
    riskFlags: [],
    rawResult: admittedTestResult(),
  };
}

test('all 50 entries have a German name, one family and visible policy details', () => {
  assert.equal(CANONICAL_50_COMPONENTS.length, 50);
  assert.equal(new Set(CANONICAL_50_COMPONENTS.map(componentName)).size, 50);
  assert.equal(
    ANALYSIS_FAMILIES.reduce((n, f) => n + f.end - f.start, 0),
    50,
  );
  const summary = registrySummary();
  assert.equal(
    Object.values(summary.counts).reduce((n, count) => n + count, 0),
    summary.total,
  );
  const markup = renderToStaticMarkup(<AnalysisComponentExplorer />).replaceAll(
    '&amp;',
    '&',
  );
  for (const entry of CANONICAL_50_COMPONENTS)
    assert.ok(markup.includes(componentName(entry)), entry.componentId);
  for (const copy of [
    'UNAVAILABLE',
    'Mindest-Datenabdeckung',
    'Konfidenzverfall',
    'Abgeleitete Features',
    'Offene Abhängigkeiten',
  ])
    assert.ok(markup.includes(copy));
});
test('nine product classes are filters, never silently promoted to canonical scope', () => {
  assert.equal(PRODUCT_CLASSES.length, 9);
  const base = {
    search: '',
    family: 'all',
    assetClass: 'all',
    status: 'all',
    data: 'all',
  };
  assert.equal(filterAnalysisComponents(base).length, 50);
  assert.equal(
    filterAnalysisComponents({ ...base, assetClass: 'options' }).length,
    0,
  );
  assert.equal(
    filterAnalysisComponents({ ...base, assetClass: 'etfs' }).length,
    0,
  );
  assert.ok(
    filterAnalysisComponents({ ...base, assetClass: 'stocks' }).length > 0,
  );
  assert.equal(
    filterAnalysisComponents({ ...base, family: 'ranking' }).length,
    1,
  );
  assert.equal(
    filterAnalysisComponents({ ...base, search: 'Sektorrotation' })[0]
      .componentId,
    'sector_rotation_scorer',
  );
});
test('UI flags accept only known module IDs; no wildcard or runtime authority', () => {
  assert.equal(parseAnalysisUiFlags(undefined).length, 4);
  assert.deepEqual(parseAnalysisUiFlags(''), []);
  assert.deepEqual(parseAnalysisUiFlags('*,production,components,components'), [
    'components',
  ]);
});
test('unavailable, stale, future, demo, degraded and missing evidence never publish a score', () => {
  assert.equal(
    safeScorePresentation(createUnavailableResult(asset, '1.0.0', now), now)
      .score,
    null,
  );
  assert.equal(safeScorePresentation(admittedTestResult(), now).score, 50);
  const stale = safeScorePresentation(admittedTestResult(), now + 30001);
  assert.equal(stale.score, null);
  assert.equal(stale.data, 'degraded');
  assert.equal(stale.ranked, false);
  assert.equal(
    safeScorePresentation(admittedTestResult(), now - 1).data,
    'unavailable',
  );
  for (const override of [
    { evidenceId: '' },
    { evidenceId: 'UNVERIFIED-test' },
    { dataAvailability: 'degraded' },
    { confidence: 0.89 },
    { finalScore: 101 },
    { finalScore: -1 },
    { eligibility: false },
    { modelVersion: '' },
    { isDemo: true },
  ])
    assert.equal(
      safeScorePresentation({ ...admittedTestResult(), ...override }, now)
        .score,
      null,
    );
  const demo = {
    ...admittedTestResult(),
    isDemo: true,
    dataAvailability: 'simulated',
    resultStatus: 'demo_fallback',
    eligibility: false,
    scoreEligible: false,
    rankEligible: false,
    rank: null,
    finalScore: 99,
  };
  const presented = safeScorePresentation(demo, now);
  assert.equal(presented.data, 'simulated');
  assert.equal(presented.score, null);
  assert.equal(presented.ranked, false);
});
test('filtering and sorting operate on admitted results, retain original rank and reject mismatched identity', () => {
  const valid = row(),
    blocked = {
      ...row(),
      symbol: 'ZZZ',
      assetId: 'blocked',
      rawResult: createUnavailableResult(
        { ...asset, symbol: 'ZZZ', assetId: 'blocked' },
        '1.0.0',
        now,
      ),
    };
  const projected = projectScreenerRows([blocked, valid], filters, now);
  assert.equal(projected[0].item.symbol, 'TEST');
  assert.equal(projected[0].item.rawResult.rank, 7);
  assert.equal(
    projectScreenerRows([valid], { ...filters, minScore: 51 }, now).length,
    0,
  );
  assert.equal(
    projectScreenerRows([valid], { ...filters, minLiquidity: 1 }, now).length,
    0,
  );
  assert.equal(
    projectScreenerRows([valid], { ...filters, market: 'other' }, now).length,
    0,
  );
  assert.equal(
    projectScreenerRows(
      [valid],
      { ...filters, status: 'degraded' },
      now + 30001,
    ).length,
    1,
  );
  assert.equal(
    projectScreenerRows([{ ...valid, assetId: 'wrong' }], filters, now).length,
    0,
  );
  assert.equal(
    projectScreenerRows([valid], { ...filters, minConfidence: 96 }, now).length,
    0,
  );
  assert.equal(numericFilter('NaN', 0), 0);
  assert.equal(numericFilter('1000', 100), 100);
  assert.equal(numericFilter('', 100), 100);
});
test('explainability groups remain distinct and missing evidence has no fake feature values', () => {
  const markup = renderToStaticMarkup(
    <ScoreExplainabilityDrawer
      isOpen
      onClose={() => {}}
      result={createUnavailableResult(asset, '1.0.0', now)}
    />,
  );
  for (const copy of [
    'Fakten',
    'Abgeleitete Features',
    'Provider-Signale',
    'Modellinterpretation',
    'Reason-Codes',
    'Nicht verfügbar',
    'Evidence',
    'Replay',
  ])
    assert.ok(markup.includes(copy), copy);
  assert.match(markup, /<dialog/);
  assert.match(markup, /aria-labelledby/);
  assert.doesNotMatch(markup, /LIVE/);
});
test('sentiment and whale UI show provenance requirements without fake indices or transactions', () => {
  const sentiment = renderToStaticMarkup(<SentimentIntelligencePanel />);
  for (const copy of [
    'UNAVAILABLE',
    'Datenabdeckung',
    'Preisreaktion',
    'Sentiment-Geschwindigkeit',
    'Volatilitätsanpassung',
  ])
    assert.ok(sentiment.includes(copy), copy);
  const whale = renderToStaticMarkup(<WhaleIntelligencePanel />);
  for (const copy of [
    'UNAVAILABLE',
    'Wallet-Label-Konfidenz',
    'Keine belegten Flows',
    'Fakt / Interpretation',
    'Transaktions- / Provider-Referenz',
  ])
    assert.ok(whale.includes(copy), copy);
});
test('session diagnostics run all 50 gates and replay exactly without data publication', async () => {
  const session = new AnalysisShadowSession();
  const run = await session.pipeline.run(
    {
      runId: 'test-demo',
      evaluatedAt: now,
      horizon: '1d',
      regime: 'baseline',
      isDemo: true,
      asset: {
        ...asset,
        name: 'TEST',
        venue: 'DEMO',
        currency: 'USD',
        status: 'unverified',
      },
      features: [],
      rights: [],
      rawInputReferences: ['TEST-DEMO'],
    },
    SHADOW_SCORE_CONFIG_V1,
  );
  assert.equal(run.result.components.length, 50);
  assert.ok(
    run.result.components.every(
      (c) => c.score === null && c.status === 'blocked',
    ),
  );
  assert.equal(run.result.candidateScore, null);
  assert.equal(run.result.publishable, false);
  assert.deepEqual(await session.pipeline.replay(run.evidenceId), run);
  await assert.rejects(
    session.putImmutable(run.evidenceId, '{}'),
    /EVIDENCE_ID_REUSE/,
  );
  await assert.rejects(
    new AnalysisShadowSession().pipeline.replay(run.evidenceId),
    /EVIDENCE_UNAVAILABLE/,
  );
});
test('shadow edits produce immutable versioned fingerprints and never approve production', async () => {
  const session = new AnalysisShadowSession();
  const before = await session.history.append(SHADOW_SCORE_CONFIG_V1);
  const after = await session.history.append({
    ...SHADOW_SCORE_CONFIG_V1,
    version: '1.0.1',
    maxRiskScore: 70,
  });
  assert.notEqual(after.fingerprint, before.fingerprint);
  assert.deepEqual(session.history.diff(before, after), [
    'maxRiskScore',
    'version',
  ]);
  assert.equal(after.config.productionApproved, false);
  await assert.rejects(
    session.history.append({ ...after.config, productionApproved: true }),
  );
});
