import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sanitizeAlertPreferences } from '../src/utils/alertPreferences.ts';
import { PipelineStorageService, getPresetPipelines } from '../src/services/pipelineStorage.ts';
import { AppErrorBoundary, BootstrapFailure } from '../src/components/AppErrorBoundary.tsx';
import { ResearchLicensePages } from '../src/components/ResearchLicensePages.tsx';
import { ResearchProjectSummary } from '../src/components/ResearchProjectSummary.tsx';
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


test('index loads the app directly and exposes the fail-closed shell only on a bootstrap error', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const bootstrap = await readFile(new URL('../public/bootstrap-failure.js', import.meta.url), 'utf8');
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /id="capital-ai-bootstrap-fallback"[\s\S]*hidden/);
  assert.match(html, /id="capital-ai-entry"[\s\S]*src="\/src\/main\.tsx"/);
  assert.doesNotMatch(html, /10 seconds|10 Sekunden|capitalAiBootstrapFallback|animation:/);
  assert.match(bootstrap, /target instanceof HTMLScriptElement/);
  assert.match(bootstrap, /target\.id === 'capital-ai-entry'/);
  assert.match(bootstrap, /fallback\.hidden = false/);
  assert.doesNotMatch(bootstrap, /setTimeout|setInterval|unhandledrejection/);
});

test('TOTP QR rendering preserves already encoded data URLs', async () => {
  const source = await readFile(new URL('../src/features/auth/AuthSecuritySettings.tsx', import.meta.url), 'utf8');
  assert.match(source, /enrollment\.qrCode\.startsWith\('data:'\)/);
  assert.match(source, /\? enrollment\.qrCode/);
  assert.match(source, /data:image\/svg\+xml;charset=utf-8/);
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


test('main entry statically imports App without a first-load chunk waterfall', async () => {
  const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.match(main, /import App from '.\/App\.tsx'/);
  assert.match(main, /root\.render\(/);
  assert.doesNotMatch(main, /import\(['"]\.\/App\.tsx['"]\)/);
});

test('commercial Blueprint artifacts remain absent from public client surfaces', async () => {
  const studio = await readFile(new URL('../src/features/studio/StudioPage.tsx', import.meta.url), 'utf8');
  const studioData = await readFile(new URL('../src/data/studioData.ts', import.meta.url), 'utf8');
  const builder = await readFile(new URL('../src/features/pipeline-builder/PipelineBuilder.tsx', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../src/features/documentation/BlueprintDocumentationPage.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(studio, /activeBlueprint\.codeSnippet|contractCodeSnippet/);
  assert.doesNotMatch(studioData, /\bcodeSnippet\b|\bcontractCodeSnippet\b|import WebSocket from|navigator\.clipboard/);
  assert.match(studio, /Blueprint-Artefakt geschützt/);
  assert.doesNotMatch(builder, /navigator\.clipboard\.writeText\(snippet\)/);
  assert.match(builder, /PRIVATE_TEST_OR_KEY_VAULT_EVIDENCE_REQUIRED/);
  assert.doesNotMatch(docs, /href=\{\x60\/downloads\/blueprints/);
  assert.match(docs, /Private Evidence prüfen/);
  assert.match(docs, /\/api\/profile\/provider-connections/);
});


test('landing page uses exactly three Vocabulary flashcards and keeps research in documentation', async () => {
  const home = await readFile(new URL('../src/features/home/HomePage.tsx', import.meta.url), 'utf8');
  const cards = await readFile(new URL('../src/components/VocabularyFlashcards.tsx', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../src/features/documentation/DocumentationHub.tsx', import.meta.url), 'utf8');

  assert.match(home, /VocabularyFlashcards/);
  assert.match(home, /const VocabularyFlashcards = lazy\(\(\) =>/);
  assert.match(home, /import\('\.\.\/\.\.\/components\/VocabularyFlashcards'\)/);
  assert.doesNotMatch(home, /import \{ VocabularyFlashcards \} from/);
  assert.doesNotMatch(home, /ResearchProjectSummary/);
  assert.match(cards, /VOCABULARY_TERMS\.slice\(0, 3\)/);
  assert.match(cards, /term\.shortDefinition/);
  assert.match(cards, /rotateY\(180deg\)/);
  assert.match(cards, /data-social-engine-generated="false"/);
  assert.match(docs, /FinTech Forschungsprojekt/);
  assert.match(docs, /href: '\/forschung'/);
});

test('footer uses locally bundled provider logos and consolidates license navigation into documentation', async () => {
  const footer = await readFile(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../src/features/documentation/DocumentationHub.tsx', import.meta.url), 'utf8');

  assert.match(footer, /\/branding\/social\/\$\{id\}\.svg/);
  assert.match(footer, /Dokumentation &amp; Lizenzen/);
  assert.doesNotMatch(footer, /footer-nav-forschung|footer-nav-oss-market-architecture|Schriftlizenz/);
  assert.match(docs, /OSS Market Architektur/);
  assert.match(docs, /market-screener-hub-open-source\.html/);
  assert.match(docs, /Datenprovider-Lizenzen/);
  assert.match(docs, /Open-Source-Lizenzen/);
});

test('architecture is removed from drawer footer and remains reachable from documentation', async () => {
  const header = await readFile(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../src/features/documentation/DocumentationHub.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(header, />\s*FinTech Architektur\s*</);
  assert.match(docs, /title: 'FinTech Architektur'/);
  assert.match(docs, /href: '\/architecture'/);
});

test('learning portal exposes architecture video previews without claiming completed renderer evidence', async () => {
  const learning = await readFile(new URL('../src/features/learning/LearningPortalPage.tsx', import.meta.url), 'utf8');

  assert.match(learning, /'glossar' \| 'guides' \| 'videos' \| 'quiz'/);
  assert.match(learning, /Architektur Videos/);
  assert.match(learning, /PREVIEW · VIDEO NOCH NICHT GERENDERT/);
  assert.match(learning, /BLOCKED_RUNTIME_NOT_MIGRATED/);
});

test('account security UI supports at most two Passkeys and two TOTP factors with numeric code sanitization', async () => {
  const security = await readFile(new URL('../src/features/auth/AuthSecuritySettings.tsx', import.meta.url), 'utf8');

  assert.match(security, /passkeys\.length >= 2/);
  assert.match(security, /verifiedFactors\.length >= 2/);
  assert.match(security, /Maximum 2 Passkeys erreicht/);
  assert.match(security, /Maximum 2 Authenticatoren erreicht/);
  assert.match(security, /replace\(\/\\D\/g, ''\)/);
  assert.match(security, /CAPITAL-AI Authenticator 2/);
});

test('key vault keeps Spot and Futures credential families separate and execution fail-closed', async () => {
  const vault = await readFile(new URL('../src/components/KeyVaultPage.tsx', import.meta.url), 'utf8');

  assert.match(vault, /Spot REST Auth/);
  assert.match(vault, /Spot WebSocket Token/);
  assert.match(vault, /Futures \/ Perpetuals/);
  assert.match(vault, /nicht als Spot-Key umgedeutet/);
  assert.match(vault, /Funding, Transfers und Withdrawals bleiben abgewiesen/);
  assert.match(vault, /Live-Execution ist bis zu separaten Risk-, Confirmation- und Production-Gates deaktiviert/);
});
