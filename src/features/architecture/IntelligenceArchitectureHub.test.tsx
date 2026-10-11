import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntelligenceArchitectureHub } from './IntelligenceArchitectureHub';

test('public architecture hub renders responsive navigation and data lineage without runtime claims', () => {
  const html = renderToStaticMarkup(React.createElement(IntelligenceArchitectureHub, { onNavigate: () => undefined }));
  assert.match(html, /Architektur sichtbar machen/);
  assert.match(html, /Blueprint Explorer/);
  assert.match(html, /Komponentenbibliothek/);
  assert.match(html, /Learning Journey/);
  assert.match(html, /Explainability/);
  assert.match(html, /Datenfluss/);
  assert.match(html, /Provider/);
  assert.match(html, /Evidence Layer/);
  assert.match(html, /Konfiguration ≠ Runtime-Evidence/);
  assert.doesNotMatch(html, /Pipeline Status: LIVE/);
  assert.match(html, /aria-label="Bereiche im Architektur-Hub"/);
});

test('query deep links choose the requested tab while unknown tabs fail to overview', () => {
  const before = globalThis.window;
  try {
    Object.defineProperty(globalThis, 'window', { value: { location: { search: '?tab=blueprints' } }, configurable: true });
    assert.match(renderToStaticMarkup(React.createElement(IntelligenceArchitectureHub)), /Blueprint suchen/);
    Object.defineProperty(globalThis, 'window', { value: { location: { search: '?tab=unknown' } }, configurable: true });
    assert.match(renderToStaticMarkup(React.createElement(IntelligenceArchitectureHub)), /Source to Evidence/);
  } finally {
    if (before === undefined) Reflect.deleteProperty(globalThis, 'window');
    else Object.defineProperty(globalThis, 'window', { value: before, configurable: true });
  }
});
