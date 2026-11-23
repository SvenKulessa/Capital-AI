import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readCommerceState } from './commerceState';
import { MonetizationModal } from './MonetizationModal';
import { NewsDesignCatalog, LearningUniverseB2BInquirySection } from './NewsDesignCatalog';
import { CommerceEntryContent } from '../home/CommerceEntrySection';
import { LANGUAGES } from '../../i18n/messages';

const signal = new AbortController().signal;

test('news design catalog offers four selectable layouts through a price inquiry', () => {
  const html = renderToStaticMarkup(<NewsDesignCatalog />);
  for (const layout of ['Titelbild', 'Kurzbriefing', 'Zeitachse', 'Vergleich']) assert.match(html, new RegExp(layout));
  assert.match(html, /Preis auf Anfrage/);
  assert.match(html, /mailto:support@capital-ai.online/);
  assert.doesNotMatch(html, /checkout|price_[A-Za-z0-9]/i);
});
test('Learning Universe Phase A inquiry shows three concepts without live commerce or rights claims', () => {
  const html = renderToStaticMarkup(<LearningUniverseB2BInquirySection />);
  const full = renderToStaticMarkup(<NewsDesignCatalog />);
  assert.match(html, /Learning Universe für Unternehmen/);
  assert.match(html, /data-learning-universe-b2b-inquiry="DRAFT_ONLY"/);
  for (const key of ['PUBLISHER', 'STUDIO', 'RESELLER']) {
    assert.match(html, new RegExp('data-b2b-concept="' + key + '"'));
  }
  assert.equal((html.match(/Unverbindlich anfragen/g) || []).length, 3);
  assert.equal((html.match(/mailto:support@capital-ai.online/g) || []).length, 3);
  assert.match(full, /data-learning-universe-b2b-inquiry="DRAFT_ONLY"/);
  assert.match(html, /kein verbindliches Angebot/);
  assert.match(html, /keine bestätigte Drittvertriebslizenz/);
  assert.match(html, /keine sofortige Buchung oder Auslieferung/);
  assert.doesNotMatch(html, /99,00|290,00|74,25|217,50|69,30|203,00|25 %|30 %|Rabatt|Streichpreis/);
  assert.doesNotMatch(html, /stripe|checkout|subscribe|entitlement|price_[a-z0-9]|<form|<input|fetch\(/i);
  assert.doesNotMatch(html, /href="https?:\/\//);
});

test('Phase A inquiry does not expose customer PII, payment events or create license receipts', () => {
  const html = renderToStaticMarkup(<LearningUniverseB2BInquirySection />);
  assert.match(html, /Bitte zunächst keine vertraulichen Dokumente übermitteln/);
  assert.match(html, /Eine Anfrage begründet weder einen Vertrag/);
  assert.match(html, /href="\/datenschutz\/"/);
  assert.doesNotMatch(html, /name="email"|type="email"|data-customer|signedAgreement|ownerGrantId|paymentEvidenceRef/);
  assert.doesNotMatch(html, /€|EUR\s*\d|jetzt kaufen|Bestellen|Sofort kaufen/);
});

function response(authenticated: unknown, enabled: unknown): typeof fetch {
  return async input => Response.json(String(input).endsWith('/session') ? { authenticated } : { enabled });
}

test('billing failure preserves an authenticated session, without enabling checkout', async () => {
  const fetchImpl: typeof fetch = async input => {
    if (String(input).endsWith('/session')) return Response.json({ authenticated: true });
    throw new Error('billing offline');
  };
  assert.deepEqual(await readCommerceState(signal, fetchImpl), {
    authenticated: true, sessionError: false, checkout: 'error',
  });
});

test('unknown sessions are not presented as anonymous or authorized after HTTP and payload failures', async () => {
  for (const result of [new Response(null, { status: 503 }), Response.json({}), Response.json({ authenticated: 'true' })]) {
    const fetchImpl: typeof fetch = async input => String(input).endsWith('/session') ? result : Response.json({ enabled: true });
    assert.deepEqual(await readCommerceState(signal, fetchImpl), {
      authenticated: null, sessionError: true, checkout: 'ready',
    });
  }
});

test('anonymous, unavailable and malformed readiness stay distinct', async () => {
  assert.deepEqual(await readCommerceState(signal, response(false, true)), { authenticated: false, sessionError: false, checkout: 'ready' });
  assert.equal((await readCommerceState(signal, response(true, false))).checkout, 'unavailable');
  assert.equal((await readCommerceState(signal, response(true, 'true'))).checkout, 'error');
});

test('status requests carry no-store, same-origin credentials and the cancellation signal', async () => {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input, options) => {
    assert.equal(options?.signal, signal);
    assert.equal(options?.cache, 'no-store');
    assert.equal(options?.credentials, 'same-origin');
    urls.push(String(input));
    return Response.json({ authenticated: true, enabled: true });
  };
  await readCommerceState(signal, fetchImpl);
  assert.deepEqual(urls.sort(), ['/api/auth/session', '/api/billing/subscriptions/readiness']);
});

test('aborted status reads remain unknown and fail closed', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetchImpl: typeof fetch = async (_input, options) => {
    options?.signal?.throwIfAborted();
    throw new Error('unexpected');
  };
  assert.deepEqual(await readCommerceState(controller.signal, fetchImpl), { authenticated: null, sessionError: true, checkout: 'error' });
});

test('pricing initially exposes loading instead of active purchase controls', () => {
  const html = renderToStaticMarkup(<MonetizationModal isOpen onClose={() => {}} />);
  assert.match(html, /Checkout-Verfügbarkeit werden geprüft/);
  assert.match(html, /Jahresbetrag berechnet/);
  assert.match(html, /1280,00|1\.280,00/);
  assert.match(html, /Externe Daten und Modelle sind nicht im Abo enthalten/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /Multi-Pillar Strategy|Business Model/);
  assert.equal((html.match(/disabled="" aria-busy="false"/g) || []).length, 3);
  assert.equal(renderToStaticMarkup(<MonetizationModal isOpen={false} onClose={() => {}} />), '');
});

test('all landing locales expose learning and pricing routes with the current offer', () => {
  for (const { code } of LANGUAGES) {
    const html = renderToStaticMarkup(<CommerceEntryContent locale={code} onNavigate={() => {}} />);
    for (const path of ['/learning', '/pricing']) assert.ok(html.includes(`href="${path}"`));
    assert.match(html, /7,00/);
    assert.match(html, /25,00/);
    assert.match(html, /aria-labelledby="commerce-entry-title"/);
  }
});

test('pricing hides postponed CADS and trial advertising',()=>{
 const html=renderToStaticMarkup(<MonetizationModal isOpen onClose={()=>{}} />);
 assert.doesNotMatch(html,/CADS|3 Tage testen|Drei Tage vorausdenken/);
 assert.match(html,/aria-label="Vertragsinformationen"/);
 assert.match(html,/href="\/agb"/);
 assert.doesNotMatch(html,/Enterprise-Trial-Code|Trial-Code einsetzen/);
});

test('home learning price uses the current 25 EUR offer, preserving legacy receipt catalog separately', () => {
  const html = renderToStaticMarkup(<CommerceEntryContent locale="de" onNavigate={() => {}} />);
  assert.match(html, /Learning Portal/);
  assert.match(html, /25,00/);
  assert.doesNotMatch(html, /19,00/);
});
