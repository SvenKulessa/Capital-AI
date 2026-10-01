import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sanitizeAlertPreferences } from '../src/utils/alertPreferences.ts';
import { PipelineStorageService, getPresetPipelines } from '../src/services/pipelineStorage.ts';
import { AppErrorBoundary, BootstrapFailure } from '../src/components/AppErrorBoundary.tsx';
import { ResearchLicensePages, ResearchProjectSummary } from '../src/components/ResearchLicensePages.tsx';
import { RESEARCH_ROUTES, researchProviders } from '../src/data/researchLicenses.ts';

test('legacy Telegram credentials and unknown fields are discarded on reload and serialization', () => {
  const legacy = { inAppNotifications: true, autoCheckIntervalSec: 1, botToken: 'old-secret', telegram: { enabled: true, botToken: 'old-secret', chatId: '12345', unknown: 'old-secret' } };
  const clean = sanitizeAlertPreferences({ ...legacy, telegram: { ...legacy.telegram, connected: true } }, true);
  assert.equal(JSON.stringify(clean).includes('old-secret'), false);
  assert.equal('chatId' in clean.telegram, false);
  assert.equal(clean.autoCheckIntervalSec, 10);
  assert.equal(clean.telegram.enabled, true);
  assert.equal(clean.telegram.connected, false);
});

test('pipeline storage discards invalid rows while retaining schema-valid drafts', () => {
  const entries = new Map();
  globalThis.window = {};
  globalThis.localStorage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  try {
    const preset = getPresetPipelines()[0];
    entries.set('capital_ai_pipelines_v1', JSON.stringify([preset, { id: 'invalid', nodes: 'corrupt', edges: [] }]));
    const values = PipelineStorageService.listPipelines();
    assert.equal(values.length, 1); assert.equal(values[0].id, preset.id);
    assert.equal(PipelineStorageService.importFromJson('{"id":"invalid"}').success, false);
    assert.equal(PipelineStorageService.importFromJson(' '.repeat(262145)).success, false);
    assert.equal(PipelineStorageService.decodePipelineFromUrl('a'.repeat(1048577)), null);
    const oversized = { ...preset, nodes: Array.from({ length: 201 }, () => preset.nodes[0]) };
    assert.equal(PipelineStorageService.importFromJson(JSON.stringify(oversized)).success, false);
    const imported = PipelineStorageService.importFromJson(JSON.stringify(preset));
    assert.equal(imported.success, true);
    assert.match(imported.pipeline.id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    assert.equal(PipelineStorageService.listPipelines().length, 2);
    const originalWrite = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.equal(PipelineStorageService.importFromJson(JSON.stringify(preset)).success, false);
    globalThis.localStorage.setItem = originalWrite;
    assert.equal(PipelineStorageService.listPipelines().length, 2);
  } finally { delete globalThis.window; delete globalThis.localStorage; }
});

test('bootstrap fallback is visible without leaking exception details', () => {
  const markup = renderToStaticMarkup(React.createElement(BootstrapFailure));
  assert.match(markup, /Oberfläche konnte nicht sicher gestartet werden/);
  assert.match(markup, /Startseite neu laden/);
  assert.equal(markup.includes('super-secret-token'), false);
  assert.equal(markup.includes('stack'), false);
});

test('app error boundary fails closed to the bootstrap fallback', () => {
  assert.deepEqual(AppErrorBoundary.getDerivedStateFromError(), { failed: true });
});


test('index shell remains useful before JavaScript boots', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<div id="root">[\s\S]*<main/);
  assert.match(html, /Marktdaten verstehen\. Chancen besser erkennen\./);
  assert.match(html, /Falls JavaScript nicht gestartet werden kann/);
  assert.match(html, /<noscript>/);
});

test('research pages render source links and never grant project entitlements', () => {
  const markup = renderToStaticMarkup(React.createElement(ResearchLicensePages, { route: '/datenprovider-lizenzen', onNavigate() {} }));
  for (const provider of researchProviders) {
    assert.match(markup, new RegExp(provider.status));
    for (const source of provider.sources) assert.ok(markup.includes(source.url));
  }
  assert.match(markup, /ersetzen keine erforderliche Erlaubnis/);
  assert.match(markup, /bestätigt keine Provider-Lizenz/);
  assert.doesNotMatch(markup, /Academic Approved|100% Konform|Dr\. Maximilian|HRB 128490|CAI-MASTER/);
});

test('all four research routes render their own accessible page and preserve operator truth', () => {
  for (const route of RESEARCH_ROUTES) {
    const markup = renderToStaticMarkup(React.createElement(ResearchLicensePages, { route, onNavigate() {} }));
    assert.match(markup, /aria-labelledby="research-page-title"/);
    assert.ok(markup.includes('aria-current="page"'));
    assert.doesNotMatch(markup, /Capital-AI Technologies GmbH|rechtssichere Urkunde|vollständig zertifiziert/);
  }
  const summary = renderToStaticMarkup(React.createElement(ResearchProjectSummary, { onNavigate() {} }));
  assert.match(summary, /günstige gehostete Infrastruktur/);
  assert.match(summary, /sind geplant/);
  assert.match(summary, /Förderzusage/);
});
