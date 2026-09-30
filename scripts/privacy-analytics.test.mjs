import test from 'node:test';
import assert from 'node:assert/strict';
import { initGoogleAnalytics, trackEvent, trackPageView, trackLoginClick } from '../src/utils/analytics.ts';

test('optional analytics stays off even with an ID or an existing tracker', () => {
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  let calls = 0;
  const dataLayer = [];
  globalThis.window = { gtag() { calls++; }, dataLayer };
  globalThis.document = { createElement() { calls++; }, head: { appendChild() { calls++; } } };
  try {
    initGoogleAnalytics('G-TEST');
    trackEvent('privacy-request', { details: 'must not be recorded' });
    trackPageView('/datenschutz', 'Datenschutz');
    trackLoginClick();
    assert.equal(calls, 0);
    assert.deepEqual(dataLayer, []);
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});
