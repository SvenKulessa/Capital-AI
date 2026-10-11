import { readCookieConsent, COOKIE_CONSENT_STORAGE_KEY, browserConsentPersistenceFailed } from '../privacy/cookieConsentV3.ts';
import { isSeoIndexable } from '../../shared/seo-indexing-policy.mjs';

export const CONSENT_CHANGED_EVENT = 'capital-ai:consent-changed';
const EXPECTED_ID = 'G-0542DT2HCE';
type TagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; 'ga-disable-G-0542DT2HCE'?: boolean };
let initialized = false, active = false, script: HTMLScriptElement | null = null;
let loading: Promise<void> | null = null;
let lastPath = '', pendingPath = '';
const leads = new Set<string>();
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function permitted() { return readCookieConsent()?.analytics === true; }
function cleanPath(path: string) {
  try { const u = new URL(path, 'https://capital-ai.online');
    return u.origin === 'https://capital-ai.online' && isSeoIndexable(u.pathname) ? u.pathname : null;
  } catch { return null; }
}
function safeReferrer() {
  try {
    const referrer = new URL(document.referrer);
    const known = new Set(['www.google.com', 'www.google.de', 'www.google.it', 'www.google.es', 'www.google.pt', 'www.google.co.uk', 'www.bing.com', 'duckduckgo.com', 'www.linkedin.com', 't.co']);
    return referrer.protocol === 'https:' && known.has(referrer.hostname) ? referrer.origin + '/' : '';
  } catch { return ''; }
}
function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.trim().split('=')[0];
    if (!/^_ga(?:_|$)/.test(name)) continue;
    for (const domain of ['', '; Domain=capital-ai.online', '; Domain=.capital-ai.online']) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain}`;
    }
  }
}
function disable() {
  const w = window as TagWindow;
  w[`ga-disable-${EXPECTED_ID}`] = true;
  script?.remove(); script = null;
  clearTimeout(expiryTimer); clearCookies(); lastPath = '';
  // A new document removes Google's in-memory listeners as well as its script element.
  const reload = active && !browserConsentPersistenceFailed(); active = false;
  if (reload) window.location.reload();
}
async function synchronize() {
  if (!permitted()) { disable(); return; }
  if (!cleanPath(window.location.pathname)) { if (active) disable(); return; }
  if (active || loading) return;
  loading = (async () => {
    try {
      const response = await fetch('/api/public/learning-config', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return;
      const config = await response.json();
      if (config.measurementId !== EXPECTED_ID || !permitted()) return;
      const w = window as TagWindow;
      w[`ga-disable-${EXPECTED_ID}`] = false;
      w.dataLayer = [];
      w.gtag = function () { w.dataLayer!.push(arguments); };
      // Basic consent mode: this entire queue and tag exist only after explicit analytics opt-in.
      w.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      w.gtag('js', new Date());
      const receipt = readCookieConsent();
      if (!receipt?.analytics) { disable(); return; }
      const remaining = Math.max(1, Math.floor((receipt.savedAt + 180 * 86_400_000 - Date.now()) / 1000));
      w.gtag('config', EXPECTED_ID, { send_page_view: false, allow_google_signals: false,
        allow_ad_personalization_signals: false, cookie_expires: remaining, cookie_update: false,
        cookie_flags: 'SameSite=Lax;Secure', page_location: 'https://capital-ai.online' + (cleanPath(window.location.pathname) || '/'), page_referrer: safeReferrer() });
      script = document.createElement('script');script.id = 'capital-ai-ga4';script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + EXPECTED_ID;
      document.head.appendChild(script);active = true;
      // Recheck expiry while the tab stays open; each event checks independently too.
      const expire = () => { if (!permitted()) disable(); else expiryTimer = setTimeout(expire, 60_000); };
      expiryTimer = setTimeout(expire, Math.min(remaining * 1000, 60_000));
      sendPageView(pendingPath || window.location.pathname);
    } catch { /* Missing config or blocked tag must not break the application. */ }
    finally { loading = null; }
  })();
  await loading;
}
export function startConsentedAnalytics() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function' || initialized) return;
  initialized = true;
  window.addEventListener(CONSENT_CHANGED_EVENT, () => { void synchronize(); });
  window.addEventListener('storage', event => { if (!event.key || event.key === COOKIE_CONSENT_STORAGE_KEY) void synchronize(); });
  window.addEventListener('pageshow', () => { void synchronize(); });
  void synchronize();
}
export function sendPageView(path: string) {
  if (typeof window === 'undefined') return;
  if (!cleanPath(window.location.pathname)) { if (active) disable(); return; }
  const safe = cleanPath(path);pendingPath = safe || '';
  if (!permitted()) { if (initialized) disable(); return; }
  if (!safe) { if (active) disable(); return; }
  if (!active) { if (initialized) void synchronize(); return; }
  if (safe === lastPath) return;
  const referrer = lastPath ? 'https://capital-ai.online' + lastPath : safeReferrer();
  lastPath = safe;
  (window as TagWindow).gtag?.('event', 'page_view', { send_to: EXPECTED_ID,
    page_location: 'https://capital-ai.online' + safe, page_referrer: referrer, page_title: safe });
}
export function trackReceivedLearningInquiry(receipt: string) {
  if (!/^[0-9a-f-]{36}$/i.test(receipt) || leads.has(receipt) || !active || !permitted()) return;
  leads.add(receipt);
  // No email, message, request/receipt ID, user ID or fabricated monetary value leaves the browser.
  (window as TagWindow).gtag?.('event', 'generate_lead', { send_to: EXPECTED_ID,
    lead_type: 'learning_course_inquiry', page_location: 'https://capital-ai.online/learning', page_referrer: '' });
}
