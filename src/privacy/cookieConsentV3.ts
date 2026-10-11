import { PRIVACY_NOTICE_VERSION } from '../../shared/legal-identity.mjs';

/**
 * COOKIE_CONSENT_V3 is a first-party preference receipt, not a tracker/analytics SDK.
 * Only a valid, unexpired affirmative decision may authorize future optional purposes.
 */
export const COOKIE_CONSENT_V3 = 'COOKIE_CONSENT_V3' as const;
export const COOKIE_CONSENT_STORAGE_KEY = 'capital-ai-cookie-consent-v3';
export const OPEN_COOKIE_PREFERENCES_EVENT = 'capital-ai:open-cookie-preferences';
export const COOKIE_CONSENT_RETENTION_DAYS = 180;
const MAX_AGE_MS = COOKIE_CONSENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;
let browserStorageDenied = false;

export type OptionalCookiePurpose = 'analytics' | 'marketing';
export type CookieChoices = Readonly<Record<OptionalCookiePurpose, boolean>>;

export type CookieConsentReceipt = CookieChoices & Readonly<{
  version: typeof COOKIE_CONSENT_V3;
  privacyNoticeVersion: typeof PRIVACY_NOTICE_VERSION;
  savedAt: number;
}>;

type CookieStorage = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage, 'removeItem'>>;

function availableStorage(storage: CookieStorage | null | undefined): CookieStorage | null {
  try {
    if (storage !== undefined) return storage;
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function parseCookieConsent(value: unknown, now: number = Date.now()): CookieConsentReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).sort().join('|') !==
      ['analytics', 'marketing', 'privacyNoticeVersion', 'savedAt', 'version'].sort().join('|')) return null;
  if (input.version !== COOKIE_CONSENT_V3 || input.privacyNoticeVersion !== PRIVACY_NOTICE_VERSION ||
      typeof input.analytics !== 'boolean' || typeof input.marketing !== 'boolean' ||
      typeof input.savedAt !== 'number' || !Number.isSafeInteger(input.savedAt) ||
      input.savedAt > now + CLOCK_SKEW_MS || now - input.savedAt >= MAX_AGE_MS) return null;
  return Object.freeze({
    version: COOKIE_CONSENT_V3,
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    savedAt: input.savedAt,
    analytics: input.analytics,
    marketing: input.marketing,
  });
}

export function readCookieConsent(storage?: CookieStorage | null, now: number = Date.now()): CookieConsentReceipt | null {
  if (storage === undefined && browserStorageDenied) return null;
  try {
    const target = availableStorage(storage);
    const value = target?.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!value) return null;
    let receipt: CookieConsentReceipt | null = null;
    try { receipt = parseCookieConsent(JSON.parse(value), now); } catch { /* Invalid JSON is not consent. */ }
    if (!receipt) {
      try { target?.removeItem?.(COOKIE_CONSENT_STORAGE_KEY); } catch { /* Removal failure never authorizes optional services. */ }
    }
    return receipt;
  } catch {
    // Blocked storage, malformed JSON or denied access cannot turn into consent.
    return null;
  }
}

export function saveCookieConsent(
  choice: CookieChoices,
  storage?: CookieStorage | null,
  now: number = Date.now(),
): CookieConsentReceipt | null {
  const failClosed = () => {
    if (storage === undefined && typeof window !== 'undefined') {
      browserStorageDenied = true;
      try { availableStorage(storage)?.removeItem?.(COOKIE_CONSENT_STORAGE_KEY); } catch { /* Deny even if the old grant cannot be removed. */ }
      window.dispatchEvent(new Event('capital-ai:consent-changed'));
    }
    return null;
  };
  if (typeof choice?.analytics !== 'boolean' || typeof choice?.marketing !== 'boolean') return failClosed();
  const receipt = parseCookieConsent({
    version: COOKIE_CONSENT_V3,
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    savedAt: now,
    analytics: choice.analytics,
    marketing: choice.marketing,
  }, now);
  if (!receipt) return failClosed();
  try {
    const target = availableStorage(storage);
    if (!target) return failClosed();
    target.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(receipt));
    if (storage === undefined) browserStorageDenied = false;
    // Verify the exact durable receipt before removing the consent UI.
    // Some restricted browsers can appear to accept writes without persistence.
    const stored = readCookieConsent(target, now);
    return stored && stored.savedAt === receipt.savedAt &&
      stored.analytics === receipt.analytics &&
      stored.marketing === receipt.marketing ? (() => {
        if (storage === undefined && typeof window !== 'undefined') window.dispatchEvent(new Event('capital-ai:consent-changed'));
        return stored;
      })() : failClosed();
  } catch {
    return failClosed();
  }
}

export function optionalCookiePurposeAllowed(
  purpose: OptionalCookiePurpose,
  storage?: CookieStorage | null,
  now: number = Date.now(),
): boolean {
  // Unknown categories fail closed. Necessary login/session cookies are never managed here.
  if (purpose !== 'analytics' && purpose !== 'marketing') return false;
  return readCookieConsent(storage, now)?.[purpose] === true;
}
