import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sanitizeAlertPreferences } from '../src/utils/alertPreferences.ts';
import { PipelineStorageService, getPresetPipelines } from '../src/services/pipelineStorage.ts';
import { AppErrorBoundary, BootstrapFailure } from '../src/components/AppErrorBoundary.tsx';
import { LicenseInformationPages } from '../src/components/LicenseInformationPages.tsx';
import { LICENSE_ROUTES, providerLicenseReviews } from '../src/data/providerLicenseReview.ts';

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

test('provider license pages expose rights sources without granting entitlements', () => {
  const markup = renderToStaticMarkup(React.createElement(LicenseInformationPages, { route: '/datenprovider-lizenzen', onNavigate() {} }));
  for (const provider of providerLicenseReviews) {
    assert.match(markup, new RegExp(provider.status));
    for (const source of provider.sources) assert.ok(markup.includes(source.url));
  }
  assert.match(markup, /ersetzen keine erforderliche Erlaubnis/);
  assert.match(markup, /bestätigt keine Provider-Lizenz/);
  assert.doesNotMatch(markup, /Academic Approved|100% Konform|HRB 128490/);
});

test('all three required license routes render without the deleted project page', () => {
  assert.equal(LICENSE_ROUTES.length, 3);
  for (const route of LICENSE_ROUTES) {
    const markup = renderToStaticMarkup(React.createElement(LicenseInformationPages, { route, onNavigate() {} }));
    assert.match(markup, /aria-labelledby="license-page-title"/);
    assert.ok(markup.includes('aria-current="page"'));
    assert.doesNotMatch(markup, /Capital-AI Technologies GmbH|rechtssichere Urkunde|vollständig zertifiziert/);
  }
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


test('Learning Portal owns three Vocabulary flashcards without a project page', async () => {
  const home = await readFile(new URL('../src/features/home/HomePage.tsx', import.meta.url), 'utf8');
  const learning = await readFile(new URL('../src/features/learning/LearningPortalPage.tsx', import.meta.url), 'utf8');
  const cards = await readFile(new URL('../src/components/VocabularyFlashcards.tsx', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../src/features/documentation/DocumentationHub.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(home, /VocabularyFlashcards/);
  assert.match(learning, /const VocabularyFlashcards = React\.lazy\(\(\) =>/);
  assert.match(learning, /import\('\.\.\/\.\.\/components\/VocabularyFlashcards'\)/);
  assert.match(learning, /'glossar' \| 'flashcards' \| 'guides' \| 'videos' \| 'quiz'/);
  assert.match(learning, /activeTab === 'flashcards'/);
  assert.doesNotMatch(learning, /SubpageSidebarNav/);
  assert.match(cards, /VOCABULARY_TERMS\.slice\(0, 3\)/);
  assert.match(cards, /term\.shortDefinition/);
  assert.match(cards, /rotateY\(180deg\)/);
  assert.match(cards, /data-social-engine-generated="false"/);
  assert.doesNotMatch(docs, /FinTech Forschungsprojekt/);
  assert.doesNotMatch(docs, /href: '\/forschung'/);
});

test('large optional navigation stays outside the initial landing bundle', async () => {
  const header = await readFile(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');

  assert.match(header, /const HubSidebarDrawer = lazy\(\(\) =>/);
  assert.match(header, /import\('\.\/HubSidebarDrawer'\)/);
  assert.match(header, /import type \{ MainHubId \} from '\.\/HubSidebarDrawer'/);
  assert.doesNotMatch(header, /import \{ HubSidebarDrawer,/);
  assert.match(header, /\{isSidebarOpen && \(/);
});

test('footer uses locally bundled provider logos and consolidates license navigation into documentation', async () => {
  const footer = await readFile(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../src/features/documentation/DocumentationHub.tsx', import.meta.url), 'utf8');

  assert.match(footer, /\/branding\/social\/\$\{id\}\.svg/);
  // Localized footer retains the German legally meaningful destination label.
  const dictionary = await readFile(new URL('../src/i18n/messages.ts', import.meta.url), 'utf8');
  assert.match(footer, /t\('docs'\)/);
  assert.match(dictionary, /'Dokumentation & Lizenzen'/);
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

  assert.match(learning, /'glossar' \| 'flashcards' \| 'guides' \| 'videos' \| 'quiz'/);
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

test('key vault clears browser credential state and exposes encryption evidence without returning secrets', async () => {
  const vault = await readFile(new URL('../src/components/KeyVaultPage.tsx', import.meta.url), 'utf8');

  assert.match(vault, /setApiKey\(''\)/);
  assert.match(vault, /setApiSecret\(''\)/);
  assert.match(vault, /setShowSecret\(false\)/);
  assert.match(vault, /Supabase Vault · verschlüsselt gespeichert/);
  assert.match(vault, /authentifiziert verschlüsselt \(AEAD\) at rest/);
  assert.match(vault, /weder Klartext noch Ciphertext zurück/);
  assert.match(vault, /Credential-Fingerprint/);
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


test('control center observability remains owner-projected without browser metrics token', async () => {
  const control = await readFile(new URL('../src/components/ControlCenterPage.tsx', import.meta.url), 'utf8');
  const dashboard = await readFile(new URL('../src/components/ObservabilityDashboard.tsx', import.meta.url), 'utf8');
  const server = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');

  assert.match(control, /observability: 'Observability'/);
  assert.match(control, /<ObservabilityDashboard \/>/);
  assert.match(dashboard, /\/api\/internal\/observability/);
  assert.doesNotMatch(dashboard, /OBSERVABILITY_TOKEN|Authorization:\s*['"]Bearer/);
  assert.match(server, /auth\.authorizeIamRole\(req, res, 'owner'\)/);
  assert.match(server, /operationalSnapshot\(\)/);
});


test('provider bridge readiness remains owner-only and probe-only', async () => {
  const server = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const bridge = await readFile(new URL('../server/private-provider-query.mjs', import.meta.url), 'utf8');

  assert.match(server, /\/api\/internal\/provider-bridge/);
  assert.match(server, /auth\.authorizeIamRole\(req, res, 'owner'\)/);
  assert.match(server, /CAPITAL_AI_PROVIDER_BRIDGE_READINESS@1/);
  assert.match(bridge, /proofScope: 'APP_NATS_RUST_BRIDGE_EXECUTOR_ONLY'/);
  assert.match(bridge, /PRIVATE_PROVIDER_BRIDGE_PROBE_ENABLED/);
  assert.match(bridge, /probeEnabled: probeEnabled\(\)/);
  assert.match(server, /PRIVATE_PROVIDER_BRIDGE_PROBE_ENABLED === 'true'/);
  assert.match(server, /status\.probeEnabled/);
  assert.match(bridge, /if \(!queryEnabled\(\)\)[\s\S]*private_provider_bridge_disabled/);
  assert.match(bridge, /stateIoProven: false/);
  assert.match(bridge, /vaultIoProven: false/);
  assert.match(bridge, /providerIoProven: false/);
});

test('registration mirrors the observed Supabase password classes before submit', async () => {
  const login = await readFile(new URL('../src/features/auth/LoginPage.tsx', import.meta.url), 'utf8');

  assert.match(login, /newPasswordMeetsObservedPolicy/);
  assert.match(login, /\[a-z\]/);
  assert.match(login, /\[A-Z\]/);
  assert.match(login, /\[0-9\]/);
  assert.match(login, /mindestens 14 Zeichen sowie Kleinbuchstaben, Großbuchstaben, Zahl und Sonderzeichen/);
  assert.match(login, /throw new Error\('weak_password'\)/);
});
