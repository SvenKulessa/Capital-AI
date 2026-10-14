import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MARKET_BLUEPRINTS,
  computeBlueprintDemoIndex,
} from '../src/features/home/marketBlueprintDemo.ts';
import { didSyntheticThresholdCross } from '../src/features/home/marketBlueprintRules.ts';

test('public blueprint portfolio retains four distinct, explicitly non-live products', () => {
  assert.deepEqual(MARKET_BLUEPRINTS.map(item => item.id), ['ingestion', 'evidence', 'scoring', 'alerts']);
  assert.ok(MARKET_BLUEPRINTS.every(item => item.dataConcept && item.formula && item.outputContract));
  assert.ok(MARKET_BLUEPRINTS.every(item => item.runtime === 'PAUSED' || item.runtime === 'CONCEPT'));
  assert.ok(MARKET_BLUEPRINTS.every(item => item.series.length >= 2 && item.series.every(
    n => Number.isFinite(n) && n >= 0 && n <= 100,
  )));
});

test('demo index is deterministic, normalized and rejects malformed input', () => {
  assert.equal(computeBlueprintDemoIndex(MARKET_BLUEPRINTS[0].factors), 82.7);
  assert.equal(computeBlueprintDemoIndex(MARKET_BLUEPRINTS[0].factors), 82.7);
  for (const blueprint of MARKET_BLUEPRINTS) {
    assert.ok(computeBlueprintDemoIndex(blueprint.factors) >= 0);
    assert.ok(computeBlueprintDemoIndex(blueprint.factors) <= 100);
  }
  assert.throws(() => computeBlueprintDemoIndex([]), /DEMO_FACTORS_MISSING/);
  assert.throws(() => computeBlueprintDemoIndex([{ id: 'x', label: 'x', value: 50, weight: 0.5 }]), /DEMO_WEIGHTS_NOT_NORMALIZED/);
  assert.throws(() => computeBlueprintDemoIndex([{ id: 'x', label: 'x', value: 101, weight: 1 }]), /DEMO_FACTOR_INVALID/);
});

test('synthetic threshold visualization is a pure calculation, not an operational alert', () => {
  const series = MARKET_BLUEPRINTS.find(item => item.id === 'alerts').series;
  assert.equal(didSyntheticThresholdCross(series, 70), true);
  assert.equal(didSyntheticThresholdCross(series, 95), false);
  assert.equal(didSyntheticThresholdCross([80, 85, 92], 70), false, 'already-above is not a crossing');
  assert.equal(didSyntheticThresholdCross([80, 68, 71], 70), true, 'a below-to-above transition crosses');
  assert.equal(didSyntheticThresholdCross([70], 70), false, 'one observation is not enough');
  assert.throws(() => didSyntheticThresholdCross(series, Number.NaN), /DEMO_THRESHOLD_INVALID/);
});

test('public blueprint UI remains in documentation while home focuses on the tour', () => {
  const root = new URL('../src/', import.meta.url);
  const home = readFileSync(new URL('features/home/HomePage.tsx', root), 'utf8');
  const documentation = readFileSync(new URL('features/documentation/BlueprintDocumentationPage.tsx', root), 'utf8');
  const card = readFileSync(new URL('features/home/MarketBlueprintShowcase.tsx', root), 'utf8');
  const fixtures = readFileSync(new URL('features/home/marketBlueprintDemo.ts', root), 'utf8');
  const rules = readFileSync(new URL('features/home/marketBlueprintRules.ts', root), 'utf8');

  assert.doesNotMatch(home, /<MarketBlueprintShowcase/);
  assert.match(home, /Produkt entdecken/);
  assert.match(documentation, /<MarketBlueprintShowcase variant="documentation"/);
  assert.match(card, /DEMO · Illustrativer Verlauf/);
  assert.match(card, /Synthetischer Index ohne Einheit/);
  assert.match(card, /Learn Portal entdecken/);
  assert.match(card, /href="\/learning"/);
  assert.match(card, /href="\/pricing"/);
  assert.match(card, /Bestehende Angebote vergleichen/);
  assert.match(card, /Mathematische Zusammensetzung/);
  assert.match(card, /factor.value \* factor.weight/);
  assert.match(card, /Σ \(Faktor × Gewicht\)/);
  assert.match(card, /LEARNING_ORDER = \['scoring', 'ingestion', 'evidence', 'alerts'\]/);
  assert.doesNotMatch(card, /Kraken/);
  assert.match(card, /verifizierten Markt-Score/);
  assert.match(card, /kein API-Key oder Live-Feed/i);
  for (const source of [card, fixtures, rules]) {
    assert.doesNotMatch(source, /\b(?:fetch|WebSocket|setInterval|EventSource)\s*\(/);
    assert.doesNotMatch(source, /\b(?:ScoringEngineService|PriceAlertsProvider|usePriceAlerts|dispatchTelegramPush)\b/);
  }
});


test('Studio exhibits fixture-only demo indices and both hubs use authoritative session for sign-in CTA', () => {
  const root = new URL('../src/', import.meta.url);
  const studio = readFileSync(new URL('features/studio/StudioPage.tsx', root), 'utf8');
  const learning = readFileSync(new URL('features/learning/LearningPortalPage.tsx', root), 'utf8');
  const session = readFileSync(new URL('hooks/useVerifiedSession.ts', root), 'utf8');
  assert.match(studio, /MARKET_BLUEPRINTS\.map/);
  assert.match(studio, /computeBlueprintDemoIndex\(example\.factors\)/);
  assert.match(studio, /DEMO \/ SYNTHETISCH/);
  assert.match(studio, /verifiedSession === 'anonymous'/);
  assert.match(learning, /verifiedSession === 'anonymous'/);
  assert.match(session, /fetch\('\/api\/auth\/session'/);
  assert.match(session, /cache: 'no-store'/);
  assert.match(session, /state, setState/);
  assert.doesNotMatch(session, /localStorage/);
});

test('Founder stays inquiry-only with gross request pricing and separate private PII endpoint', () => {
  const root = new URL('../src/', import.meta.url);
  const product = readFileSync(new URL('data/founderOffer.ts', root), 'utf8');
  const form = readFileSync(new URL('features/pricing/FounderInquiryForm.tsx', root), 'utf8');
  const modal = readFileSync(new URL('features/pricing/MonetizationModal.tsx', root), 'utf8');
  assert.match(product, /Bruttopreis auf Anfrage/);
  assert.match(product, /inquiry_only/);
  assert.match(product, /sven\.kulessa@capital-ai\.online/);
  assert.match(modal, /<FounderInquiryForm \/>/);
  assert.match(form, /\/api\/public\/founder-inquiry/);
  assert.match(form, /privacyAcknowledged/);
  assert.doesNotMatch(form, /(?:ga4|gtag|trackEvent|localStorage|sessionStorage|stripe\.com)/i);
});
