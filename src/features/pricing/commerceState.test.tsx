import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readCommerceState } from './commerceState';
import { MonetizationModal } from './MonetizationModal';
import { CommerceEntryContent } from '../home/CommerceEntrySection';
import { LANGUAGES } from '../../i18n/messages';

const signal = new AbortController().signal;
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
  assert.match(html, /Gebühren sind nicht im Abo enthalten/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /Multi-Pillar Strategy|Business Model/);
  assert.equal((html.match(/disabled="" aria-busy="false"/g) || []).length, 3);
  assert.equal(renderToStaticMarkup(<MonetizationModal isOpen={false} onClose={() => {}} />), '');
});

test('all landing locales expose real learning, pricing and Vocabulary routes with catalog prices', () => {
  for (const { code } of LANGUAGES) {
    const html = renderToStaticMarkup(<CommerceEntryContent locale={code} onNavigate={() => {}} />);
    for (const path of ['/learning', '/pricing', '/vocabulary']) assert.ok(html.includes(`href="${path}"`));
    assert.match(html, /7,00/);
    assert.match(html, /19,00/);
    assert.match(html, /aria-labelledby="commerce-entry-title"/);
  }
});
