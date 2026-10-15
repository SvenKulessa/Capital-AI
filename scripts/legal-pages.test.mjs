import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { CONTROLLER, PROCESSING_ACTIVITIES, PRIVACY_NOTICE_VERSION } from '../src/privacy/privacyPolicy.ts';
import { TERMS_VERSION, TERMS_EFFECTIVE_DATE } from '../src/content/legalDocumentVersions.ts';
import { resolveNavigationTarget } from '../src/utils/appNavigation.ts';

// Load through the application bundler so BrandLogo's image imports use the
// same asset handling as production instead of failing in Node's TS loader.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let LegalAndFaqPages, LocaleProvider;
try {
  ({ LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.tsx'));
  ({ LegalAndFaqPages } = await server.ssrLoadModule('/src/components/LegalAndFaqPages.tsx'));
} finally {
  await server.close();
}
const render = route => renderToStaticMarkup(React.createElement(LocaleProvider, null, React.createElement(LegalAndFaqPages, { route, onNavigate() {} })));

test('legal routes render real provider details without corporate sample data', () => {
  for (const route of ['/impressum', '/datenschutz', '/agb']) {
    const html = render(route);
    assert.ok(html.includes(CONTROLLER.name));
    assert.ok(html.includes(CONTROLLER.street));
    assert.ok(html.includes(CONTROLLER.email));
    assert.doesNotMatch(html, /Technologies GmbH|HRB 128490|DE348920194|Maximilian von Berg|capital-ai\.finance|99,5|Sub-45ms|MUSTER-VORLAGE/);
  }
});

test('privacy page renders every processing activity and a truthful email handoff', () => {
  const html = render('/datenschutz');
  assert.ok(html.includes(PRIVACY_NOTICE_VERSION));
  assert.ok(PROCESSING_ACTIVITIES.some(item => item.id === 'consented-ga4'));
  assert.ok(PROCESSING_ACTIVITIES.some(item => item.id === 'google-oauth'));
  assert.equal(PROCESSING_ACTIVITIES.some(item => item.id === 'zitadel-account'), false);
  for (const activity of PROCESSING_ACTIVITIES) assert.ok(html.includes(activity.title));
  assert.ok(html.includes('per E-Mail vorbereiten'));
  assert.ok(html.includes('erst durch Ihren Versand'));
  assert.doesNotMatch(html, /ZITADEL-Anmeldung/);
  assert.ok(html.includes('Eigenen Datenauszug herunterladen'));
  assert.ok(html.includes('kein vollständiger Auskunftsbescheid'));
  assert.ok(html.includes('serverseitig bestätigte Learning-Käufe'));
  assert.ok(html.includes('keine Stripe- oder Benutzerkennung'));
  assert.ok(html.includes('gültiger Analytics-Einwilligung'));
  assert.doesNotMatch(html, /Supabase als (?:Verantwortlicher|Anbieter von CAPITAL-AI)|Finance-Dokumentstand|Stripe, Supabase/);
  assert.doesNotMatch(html, /Self-Service-Datenauszug|Cookie- &amp; Analytics-Einstellungen/);
});

test('all eight terms sections and document version remain visible', () => {
  const html = render('/agb');
  assert.ok(html.includes(TERMS_VERSION));
  assert.ok(html.includes(TERMS_EFFECTIVE_DATE));
  for (let i = 1; i <= 8; i++) assert.ok(html.includes(`§ ${i} `));
});

test('legal direct links and aliases preserve query and hash', () => {
  for (const [alias, route] of [['/Impressum/', '/impressum'], ['/imprint', '/impressum'], ['/privacy', '/datenschutz'], ['/terms', '/agb']]) {
    assert.equal(resolveNavigationTarget(`${alias}?ref=footer#details`), `${route}?ref=footer#details`);
  }
});
