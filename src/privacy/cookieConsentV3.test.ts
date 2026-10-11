import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COOKIE_CONSENT_V3, COOKIE_CONSENT_STORAGE_KEY, COOKIE_CONSENT_RETENTION_DAYS,
  optionalCookiePurposeAllowed, parseCookieConsent, readCookieConsent, saveCookieConsent,
} from './cookieConsentV3';
import { cookieCopy } from '../i18n/cookieCopy';
import { PRIVACY_NOTICE_VERSION } from '../../shared/legal-identity.mjs';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => { values.set(name, value); },
    removeItem: (name: string) => { values.delete(name); },
  };
}

const START = Date.UTC(2026, 9, 11, 10);

test('v3 denies optional categories by default and accepts only a valid explicit record', () => {
  const storage = memoryStorage();
  assert.equal(readCookieConsent(storage, START), null);
  assert.equal(optionalCookiePurposeAllowed('analytics', storage, START), false);
  assert.equal(optionalCookiePurposeAllowed('marketing', storage, START), false);
  assert.equal(optionalCookiePurposeAllowed('other' as never, storage, START), false);
  const record = saveCookieConsent({ analytics: false, marketing: false }, storage, START);
  assert.equal(record?.version, COOKIE_CONSENT_V3);
  assert.equal(record?.privacyNoticeVersion, PRIVACY_NOTICE_VERSION);
  assert.deepEqual(readCookieConsent(storage, START), record);
  assert.equal(optionalCookiePurposeAllowed('analytics', storage, START), false);
  assert.equal(COOKIE_CONSENT_STORAGE_KEY, 'capital-ai-cookie-consent-v3');
});

test('v3 stores granular accept and revocation without preserving old opt-ins', () => {
  const storage = memoryStorage();
  saveCookieConsent({ analytics: true, marketing: false }, storage, START);
  assert.equal(optionalCookiePurposeAllowed('analytics', storage, START), true);
  assert.equal(optionalCookiePurposeAllowed('marketing', storage, START), false);
  saveCookieConsent({ analytics: true, marketing: true }, storage, START + 100);
  assert.equal(optionalCookiePurposeAllowed('marketing', storage, START + 100), true);
  saveCookieConsent({ analytics: false, marketing: false }, storage, START + 200);
  assert.equal(optionalCookiePurposeAllowed('analytics', storage, START + 200), false);
  assert.equal(optionalCookiePurposeAllowed('marketing', storage, START + 200), false);
});

test('v3 fails closed on corrupt, expired, foreign-version, future and fabricated records', () => {
  const storage = memoryStorage();
  const record = saveCookieConsent({ analytics: true, marketing: true }, storage, START);
  assert.ok(record);
  assert.equal(readCookieConsent(storage, START + COOKIE_CONSENT_RETENTION_DAYS * 86_400_000), null);
  const base = { ...record };
  for (const variant of [
    { ...base, version: 'COOKIE_CONSENT_V2' },
    { ...base, privacyNoticeVersion: 'different-notice' },
    { ...base, analytics: 'true' },
    { ...base, savedAt: START + 300_000 },
    { ...base, uniqueVisitorId: 'not-allowed' },
  ]) {
    assert.equal(parseCookieConsent(variant, START), null);
  }
  storage.setItem(COOKIE_CONSENT_STORAGE_KEY, '{bad-json');
  assert.equal(readCookieConsent(storage, START), null);
  storage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ ...base, marketing: 1 }));
  assert.equal(optionalCookiePurposeAllowed('marketing', storage, START), false);
});

test('v3 handles denied browser storage without manufacturing a consent receipt', () => {
  const broken = {
    getItem() { throw new Error('storage-denied'); },
    setItem() { throw new Error('storage-denied'); },
  };
  assert.equal(readCookieConsent(broken), null);
  assert.equal(saveCookieConsent({ analytics: true, marketing: true }, broken, START), null);
  assert.equal(saveCookieConsent({ analytics: 1 as never, marketing: false }, memoryStorage(), START), null);
});

test('v3 does not close consent UI on non-durable browser storage', () => {
  const storage = {
    getItem() { return null; },
    setItem() { /* browser silently drops the attempted write */ },
  };
  assert.equal(saveCookieConsent({ analytics: true, marketing: true }, storage, START), null);
});

test('UI is mounted on every route and discloses inactive analytics and durable withdrawal', () => {
  const appShell = readFileSync(new URL('../app/AppShell.tsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('./CookieConsentV3.tsx', import.meta.url), 'utf8');
  const analytics = readFileSync(new URL('../utils/analytics.ts', import.meta.url), 'utf8');
  assert.match(appShell, /<CookieConsentV3\s*\/>/);
  assert.equal(cookieCopy.de.reject, 'Nur notwendige');
  assert.equal(cookieCopy.de.accept, 'Alle erlauben');
  assert.equal(cookieCopy.de.save, 'Auswahl speichern');
  assert.match(ui, /onClick=\{\(\) => store\(false, false\)\}/);
  assert.match(ui, /addEventListener\('storage', synchronize\)/);
  assert.equal(cookieCopy.de.privacy, 'Datenschutzhinweise lesen');
  assert.match(cookieCopy.de.body, /nur nach gültiger Zustimmung/);
  // Saved preferences leave no floating dialog/button but remain editable.
  assert.match(ui, /if \(!open && decision\) return null;/);
  assert.match(ui, /OPEN_COOKIE_PREFERENCES_EVENT/);
  assert.doesNotMatch(ui, /fixed bottom-3 left-3/);
  const footer = readFileSync(new URL('../components/Footer.tsx', import.meta.url), 'utf8');
  const account = readFileSync(new URL('../features/account/AccountPageShell.tsx', import.meta.url), 'utf8');
  assert.match(footer, /cookieSettingsLabel\[locale\]/);
  assert.match(account, /cookieCopy\[locale\].settings/);
  assert.doesNotMatch(account, /path: '\/profile\/key-vault' as const/);
  assert.match(analytics, /startConsentedAnalytics\(\)/);
  assert.match(analytics, /sendPageView\(_pagePath\)/);
});

 test('expired and notice-version-invalid choices are physically removed on next access', () => {
  const storage = memoryStorage();
  saveCookieConsent({ analytics: true, marketing: true }, storage, START);
  assert.equal(readCookieConsent(storage, START + 180 * 86_400_000), null);
  assert.equal(storage.getItem(COOKIE_CONSENT_STORAGE_KEY), null);
  storage.setItem(COOKIE_CONSENT_STORAGE_KEY, '{bad-json');
  assert.equal(readCookieConsent(storage, START), null);
  assert.equal(storage.getItem(COOKIE_CONSENT_STORAGE_KEY), null);
  const record = saveCookieConsent({ analytics: true, marketing: true }, storage, START);
  storage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ ...record, privacyNoticeVersion: 'old' }));
  assert.equal(optionalCookiePurposeAllowed('analytics', storage, START), false);
  assert.equal(storage.getItem(COOKIE_CONSENT_STORAGE_KEY), null);
});

test('every supported locale offers rejection, withdrawal and honest disabled tracking disclosure', () => {
  assert.deepEqual(Object.keys(cookieCopy).sort(), ['de', 'en', 'es', 'fr', 'it', 'pt']);
  for (const copy of Object.values(cookieCopy)) {
    for (const value of Object.values(copy)) assert.ok(value.trim().length > 0);
    assert.notEqual(copy.reject, copy.accept);
    assert.ok(copy.withdraw.length > 20);
    assert.match(copy.body, /180/);
    assert.match(copy.body, /GA4/);
  }
});

 test('a failed browser withdrawal cannot preserve an older optional grant in this document', () => {
  const previousWindow = globalThis.window;
  let stored = JSON.stringify({ version: COOKIE_CONSENT_V3, privacyNoticeVersion: PRIVACY_NOTICE_VERSION, savedAt: START, analytics: true, marketing: true });
  let broken = true, notifications = 0;
  globalThis.window = { localStorage: { getItem: () => stored, setItem(_key: string, value: string) { if (broken) throw Error('write-denied'); stored = value; }, removeItem() { throw Error('remove-denied'); } }, dispatchEvent() { notifications++; return true; } } as never;
  try {
    assert.equal(saveCookieConsent({ analytics: false, marketing: false }, undefined, START), null);
    assert.equal(optionalCookiePurposeAllowed('analytics', undefined, START), false);
    assert.equal(notifications, 1);
    broken = false;
    assert.ok(saveCookieConsent({ analytics: false, marketing: false }, undefined, START));
    assert.equal(readCookieConsent(undefined, START)?.analytics, false);
  } finally { globalThis.window = previousWindow; }
});
