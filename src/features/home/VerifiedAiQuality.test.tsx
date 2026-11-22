import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VerifiedAiQuality } from './VerifiedAiQuality';

test('homepage quality projection fails closed without publishable evidence', () => {
  const html = renderToStaticMarkup(React.createElement(VerifiedAiQuality, {}));
  assert.match(html, /NOT_PROVEN/);
  assert.match(html, /keine Beispielwerte oder Rankings/);
  assert.doesNotMatch(html, /Verifizierter Score/);
});

test('verified projection renders accessible meters and no private evidence refs', () => {
  const dimensions = Object.fromEntries(['taskCompletion','evidenceQuality','executionEfficiency','technicalQuality','trustAndSafety','communicationAndAccessibility'].map(id => [id, { score: 10, maxScore: 10, status: 'VERIFIED' }]));
  const html = renderToStaticMarkup(React.createElement(VerifiedAiQuality, { benchmark: { schemaVersion:'SOLO2_CHAT_BENCHMARK@1', evaluatedAt:'2026-11-20T06:00:00.000Z', taskClass:'PRODUCT', score:100, coverage:100, dimensions } }));
  assert.equal((html.match(/role="meter"/g) || []).length, 6);
  assert.match(html, /Evidence Coverage: 100%/);
  assert.doesNotMatch(html, /evidence:\/\//);
});
