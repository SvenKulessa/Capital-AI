import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import { LEARNING_TAB_SCENES, LearningUniverseTabScene } from './LearningUniverseTabScene';

const TABS = [
  'glossar', 'flashcards', 'guides', 'patterns', 'videos',
  'quiz', 'quizzes', 'news', 'kontakt', 'simulator',
] as const;

test('ten existing Learning subpages have distinct, first-party tab illustration contracts', () => {
  assert.deepEqual(new Set(Object.keys(LEARNING_TAB_SCENES)), new Set(TABS));
  const palette = new Set<string>(Object.values(BRAND_COLORS));
  const descriptions = new Set<string>();
  for (const tab of TABS) {
    const scene = LEARNING_TAB_SCENES[tab];
    assert.ok(scene.title.length > 4, tab);
    assert.ok(scene.detail.length > 20, tab);
    assert.ok(palette.has(scene.accent), tab);
    assert.ok(!descriptions.has(scene.art), tab);
    descriptions.add(scene.art);
  }
});

test('all Learning tabs render semantic heading, original vector graphic and overview button', () => {
  for (const tab of TABS) {
    const html = renderToStaticMarkup(
      <LearningUniverseTabScene tab={tab} onOpen={() => {}} />,
    );
    assert.match(html, new RegExp('data-learning-universe-tab="' + tab + '"'));
    assert.match(html, /aria-labelledby="lhu-tab-scene-title"/);
    assert.match(html, /aria-label="Originalillustration:/);
    assert.match(html, /<svg[^>]+aria-hidden="true"/);
    assert.match(html, /<path /);
    assert.match(html, /<button[^>]+type="button"/);
    assert.match(html, /Zur Learning-Übersicht/);
    assert.doesNotMatch(html, /<img[^>]*src="https?:/);
  }
  assert.equal(renderToStaticMarkup(
    <LearningUniverseTabScene tab="overview" onOpen={() => {}} />,
  ), '');
});

test('new artwork is deterministic and isolated from entitlements, payments and analytics', () => {
  const source = readFileSync(new URL('./LearningUniverseTabScene.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|window\.|document\.|checkout|setEntitled|publish/i);
  assert.doesNotMatch(source, /https?:\/\/|<image\b|<foreignObject\b/);
  const page = readFileSync(new URL('./LearningPortalPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /<LearningUniverseTabScene tab=\{activeTab\} onOpen=\{setActiveTab\} \/>/);
  assert.match(page, /<LearningUniverseOverview onOpen=\{setActiveTab\}/);
  assert.match(page, /<HubNavigationPanel hubId="learning"/);
});

test('Universe tab styles preserve 320/390/1440 widths, focus visibility and reduced motion', () => {
  const css = readFileSync(new URL('./learningUniverseTabScene.css', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
  assert.match(main, /import '\.\/features\/learning\/learningUniverseTabScene\.css'/);
  assert.match(css, /max-width: 1440px/);
  assert.match(css, /max-width: 740px/);
  assert.match(css, /max-width: 390px/);
  assert.match(css, /min-width: 0/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /aria-current="page"/);
});
