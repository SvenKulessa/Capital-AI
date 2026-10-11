import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCookieConsent } from '../privacy/cookieConsentV3';
import { PRIVACY_NOTICE_VERSION } from '../../shared/legal-identity.mjs';
import { startConsentedAnalytics, sendPageView, trackReceivedLearningInquiry, CONSENT_CHANGED_EVENT } from './consentedAnalytics';

test('basic consent mode loads only after opt-in, sanitizes public events and revokes without further events', async () => {
  const oldWindow = globalThis.window, oldDocument = globalThis.document, oldFetch = globalThis.fetch;
  const listeners = new Map<string, Function>();let stored: string | null = null, fetches = 0, scripts = 0, removed = 0, reloads = 0;
  const writes: string[] = [];
  const w: any = { location: { pathname: '/learning', reload() { reloads++; } },
    addEventListener(name: string, callback: Function) { listeners.set(name, callback); },
    localStorage: { getItem: () => stored, removeItem() { stored = null; } } };
  globalThis.window = w;
  globalThis.document = { referrer: 'https://www.google.de/search?q=private-search', get cookie() { return '_ga=test; _ga_0542DT2HCE=test'; }, set cookie(value: string) { writes.push(value); },
    createElement() { scripts++;return { remove() { removed++; } }; }, head: { appendChild() {} } } as any;
  globalThis.fetch = async () => { fetches++;return Response.json({ measurementId: 'G-0542DT2HCE' }); };
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  try {
    startConsentedAnalytics();sendPageView('/learning');trackReceivedLearningInquiry('5cf37f93-3eaf-4d6d-9c4c-4247d05a7d72');
    await settle();assert.equal(fetches, 0);assert.equal(scripts, 0);
    stored = JSON.stringify({ version: 'COOKIE_CONSENT_V3', privacyNoticeVersion: PRIVACY_NOTICE_VERSION, savedAt: Date.now(), analytics: true, marketing: false });
    listeners.get(CONSENT_CHANGED_EVENT)!();await settle();
    assert.equal(fetches, 1);assert.equal(scripts, 1);
    const commands = () => w.dataLayer.map((args: IArguments) => Array.from(args));
    const defaults = commands().find((c: any[]) => c[0] === 'consent')[2];
    assert.equal(defaults.ad_storage, 'denied');assert.equal(defaults.ad_user_data, 'denied');assert.equal(defaults.ad_personalization, 'denied');
    sendPageView('/learning?email=private@example.test#private');sendPageView('/blog?token=private-token');
    const receipt = '5cf37f93-3eaf-4d6d-9c4c-4247d05a7d72';trackReceivedLearningInquiry(receipt);trackReceivedLearningInquiry(receipt);
    const events = commands().filter((c: any[]) => c[0] === 'event');
    assert.equal(events.filter((c: any[]) => c[1] === 'generate_lead').length, 1);
    assert.equal(events.filter((c: any[]) => c[1] === 'page_view').length, 2);
    assert.equal(events.find((c: any[]) => c[1] === 'page_view')[2].page_referrer, 'https://www.google.de/');
    assert.doesNotMatch(JSON.stringify(events), /private@example|private-token|private-search|5cf37f93|value|currency/);
    stored = JSON.stringify({ version: 'COOKIE_CONSENT_V3', privacyNoticeVersion: PRIVACY_NOTICE_VERSION, savedAt: Date.now(), analytics: false, marketing: false });
    listeners.get(CONSENT_CHANGED_EVENT)!();await settle();const count = commands().length;
    sendPageView('/learning');trackReceivedLearningInquiry('b4f044bc-1103-467d-9810-ea98f93fdca3');
    assert.equal(commands().length, count);assert.equal(reloads, 1);assert.equal(removed, 1);
    assert.ok(writes.some(value => value.includes('Max-Age=0')));assert.equal(w['ga-disable-G-0542DT2HCE'], true);
    // A failed persistent revocation must not reload and immediately restore the old saved grant.
    stored = JSON.stringify({ version: 'COOKIE_CONSENT_V3', privacyNoticeVersion: PRIVACY_NOTICE_VERSION, savedAt: Date.now(), analytics: true, marketing: false });
    listeners.get(CONSENT_CHANGED_EVENT)!();await settle();assert.equal(scripts, 2);
    w.localStorage.setItem = () => { throw Error('write-denied'); };
    w.localStorage.removeItem = () => { throw Error('remove-denied'); };
    w.dispatchEvent = (event: Event) => { listeners.get(event.type)?.(event); return true; };
    assert.equal(saveCookieConsent({ analytics: false, marketing: false }), null);await settle();
    assert.equal(reloads, 1);assert.equal(w['ga-disable-G-0542DT2HCE'], true);
    const blockedCount = commands().length;sendPageView('/learning');assert.equal(commands().length, blockedCount);
    w.localStorage.setItem = (_key: string, value: string) => { stored = value; };
    w.localStorage.removeItem = () => { stored = null; };
    saveCookieConsent({ analytics: false, marketing: false });

  } finally { globalThis.window = oldWindow;globalThis.document = oldDocument;globalThis.fetch = oldFetch; }
});
