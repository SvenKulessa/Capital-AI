import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import { LEARNING_ARTICLES } from '../../data/learningArticles';
import { LearningUniverseOverview } from './LearningUniverseOverview';
import { LearningSimulatorUniverseStage } from './LearningSimulatorUniverseStage';
import { LEARNING_EARTH_ATOMS, LEARNING_EARTH_LESSONS, learningEarthLesson, canStartLearningEarth } from './learningSimulatorUniverseModel.mjs';
import { LEARNING_UNIVERSE_ATOMS, filterLearningUniverseAtoms } from './learningUniverseModel.mjs';

test('seven Learning Hub atoms use the canonical seven-color Universe tokens exactly once', () => {
  const tokens = JSON.parse(readFileSync(new URL('../../../public/branding/asset-pack/meta/social-render-tokens.json', import.meta.url), 'utf8'));
  assert.equal(LEARNING_UNIVERSE_ATOMS.length, 7);
  assert.equal(new Set(LEARNING_UNIVERSE_ATOMS.map(atom => atom.id)).size, 7);
  assert.deepEqual(new Set(LEARNING_UNIVERSE_ATOMS.map(atom => atom.color)), new Set(Object.values(BRAND_COLORS)));
  for (const [key, value] of Object.entries(BRAND_COLORS)) {
    assert.equal(tokens.color.universe[key].$value, value);
  }
});

test('topic search is deterministic, case-insensitive and does not create unsourced results', () => {
  assert.equal(filterLearningUniverseAtoms(' CHARTS ')[0]?.id, 'charts');
  assert.equal(filterLearningUniverseAtoms('diversifikation')[0]?.id, 'portfolios');
  assert.equal(filterLearningUniverseAtoms('inflation')[0]?.id, 'makro');
  assert.equal(filterLearningUniverseAtoms('').length, 7);
  assert.equal(filterLearningUniverseAtoms('<script>alert(1)</script>').length, 0);
  assert.equal(filterLearningUniverseAtoms('unbekanntes Thema').length, 0);
  assert.equal(filterLearningUniverseAtoms(null).length, 7);
});

test('every atom routes only to an existing Learning Portal tab and never authorizes publish or checkout', () => {
  const allowed = new Set(['glossar', 'guides', 'quizzes', 'simulator', 'patterns', 'news']);
  for (const atom of LEARNING_UNIVERSE_ATOMS) assert.ok(allowed.has(atom.target), atom.id);
  const source = readFileSync(new URL('./LearningUniverseOverview.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\/api\/social\/publish|fetch\(|localStorage|checkout|setEntitled/);
  assert.match(source, /BRAND_GLOBE\.asset/);
  assert.match(source, /LEARNING_ARTICLES\.filter\(article => article\.hub === 'learning' && article\.status === 'PUBLISHED'\)/);
});

test('overview SSR provides native controls, public learning links and no synthetic progress', () => {
  const html = renderToStaticMarkup(<LearningUniverseOverview onOpen={() => {}} favoritesCount={null} favoritesAvailable={false} />);
  assert.match(html, /data-learning-overview="v1"/);
  assert.match(html, /Sieben interaktive Lernbereiche/);
  assert.match(html, /type="search"/);
  assert.match(html, /aria-labelledby="lhu-topics-title"/);
  assert.match(html, /Lernfeld/);
  assert.match(html, /Anmeldung/);
  assert.doesNotMatch(html, /68%|12 Tage|1\.248 angemeldet|24 Module/);
  assert.equal((html.match(/class="lhu-topic"/g) ?? []).length, 7);
  for (const article of LEARNING_ARTICLES.slice(0, 3)) assert.ok(html.includes(article.title));
});

test('responsive style contracts include narrow mobile, tablet, focus and reduced motion', () => {
  const css = readFileSync(new URL('./learningUniverseOverview.css', import.meta.url), 'utf8');
  for (const expected of ['max-width: 1199px', 'max-width: 860px', 'max-width: 560px', 'max-width: 360px', 'prefers-reduced-motion: reduce', ':focus-visible']) {
    assert.ok(css.includes(expected), expected);
  }
  assert.doesNotMatch(css, /overflow-x:\s*hidden\s*!important/);
});


test('Learning Simulator Universe SSR exposes accessible controls, fallback and canonical seven-color atoms', () => {
  const html = renderToStaticMarkup(<LearningSimulatorUniverseStage />);
  assert.match(html, /data-learning-universe-simulator="v1"/);
  assert.match(html, /JaJa Universe Buddy öffnen/);
  assert.match(html, /Zum Portfolio-Simulator/);
  assert.match(html, /hero-universe-globe\.webp/);
  assert.match(html, /Stilisierte CAPITAL-AI-Erde/);
  assert.match(html, /Keine Live-Marktdaten/);
  assert.equal((html.match(/data-universe-atom=/g) ?? []).length, 7);
  assert.doesNotMatch(html, /<canvas|jaja-figure\.glb|GA4_|GOOGLE_ANALYTICS_/);
  assert.equal(LEARNING_EARTH_ATOMS.length, 7);
  assert.deepEqual(new Set(LEARNING_EARTH_ATOMS.map(atom => atom.color)), new Set(Object.values(BRAND_COLORS)));
});

test('Universe learning prompts remain bounded, synthetic and read-only', () => {
  assert.equal(LEARNING_EARTH_LESSONS.length, 3);
  assert.deepEqual(new Set(LEARNING_EARTH_LESSONS.map(x => x.id)).size, 3);
  assert.equal(learningEarthLesson('untrusted').id, LEARNING_EARTH_LESSONS[0].id);
  assert.equal(canStartLearningEarth({ requested: true, reducedMotion: true }), false);
  assert.equal(canStartLearningEarth({ requested: false, reducedMotion: false }), false);
  assert.equal(canStartLearningEarth({ requested: true, reducedMotion: false }), true);
});

test('Universe stage CSS is responsive, keyboard-readable, reduced-motion-safe and uses seven brand colors', () => {
  const css = readFileSync(new URL('./learningSimulatorUniverse.css', import.meta.url), 'utf8');
  for (const [key, color] of Object.entries(BRAND_COLORS)) {
    assert.ok(css.includes('--u-' + key + ': ' + color), key);
    assert.ok(css.includes('.learning-sim-universe-atom--' + key), key);
  }
  for (const token of ['max-width: 860px', 'max-width: 390px', 'max-width: 320px', 'prefers-reduced-motion: reduce', ':focus-visible', 'min-height: 44px']) {
    assert.ok(css.includes(token), token);
  }
  assert.doesNotMatch(css, /overflow-x:\s*hidden\s*!important/);
});
