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
  assert.match(html, /Kataloge &amp; Angebote/);
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

test('catalog deep link renders five public evidence docs with transparent paid access limits', () => {
  const before = globalThis.window;
  try {
    Object.defineProperty(globalThis, 'window', { value: { location: { search: '?tab=catalogs' } }, configurable: true });
    const html = renderToStaticMarkup(React.createElement(IntelligenceArchitectureHub));
    assert.match(html, /Fünf Evidence-Kataloge/);
    assert.match(html, /COMPONENT-CATALOG.md/);
    assert.match(html, /PROVIDER-CATALOG.md/);
    assert.match(html, /SCORING-CATALOG.md/);
    assert.match(html, /BLUEPRINT-CATALOG.md/);
    assert.match(html, /LEARNING-PATHS.md/);
    assert.match(html, /noopener noreferrer/);
    assert.match(html, /Blueprint-Commerce und private Downloads sind aktuell BLOCKED/);
    assert.match(html, /SERVER_ENTITLEMENT_REQUIRED|ZUGANGSPRÜFUNG/);
    assert.doesNotMatch(html, /jetzt Blueprint kaufen/i);
  } finally {
    if (before === undefined) Reflect.deleteProperty(globalThis, 'window');
    else Object.defineProperty(globalThis, 'window', { value: before, configurable: true });
  }
});
