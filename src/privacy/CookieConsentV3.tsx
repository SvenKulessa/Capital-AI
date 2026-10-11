import { useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleProvider';
import { cookieCopy } from '../i18n/cookieCopy';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  OPEN_COOKIE_PREFERENCES_EVENT,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsentReceipt,
} from './cookieConsentV3';

/**
 * First-party v3 consent UI. Neither accepting nor configuring a preference
 * grants analytics only through the consented runtime; advertising remains disabled.
 */
export function CookieConsentV3() {
  const { locale } = useLocale();
  const copy = cookieCopy[locale];
  const [decision, setDecision] = useState<CookieConsentReceipt | null>(() => readCookieConsent());
  const [open, setOpen] = useState(() => readCookieConsent() === null || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('cookie-preferences') === '1'));
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(() => readCookieConsent()?.analytics ?? false);
  const [marketing, setMarketing] = useState(() => readCookieConsent()?.marketing ?? false);
  const [error, setError] = useState('');

  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key !== COOKIE_CONSENT_STORAGE_KEY && event.key !== null) return;
      const next = readCookieConsent();
      setDecision(next);
      setAnalytics(next?.analytics ?? false);
      setMarketing(next?.marketing ?? false);
      setOpen(next === null);
      setError('');
    };
    const reopen = () => {
      const stored = readCookieConsent();
      setDecision(stored);
      setAnalytics(stored?.analytics ?? false);
      setMarketing(stored?.marketing ?? false);
      setDetails(true);
      setError('');
      setOpen(true);
    };
    const preferenceUrl = new URL(window.location.href);
    if (preferenceUrl.searchParams.get('cookie-preferences') === '1') {
      reopen();
      preferenceUrl.searchParams.delete('cookie-preferences');
      window.history.replaceState(window.history.state, '', preferenceUrl.pathname + preferenceUrl.search + preferenceUrl.hash);
    }
    if (window.location.hash === '#cookie-preferences') reopen();
    window.addEventListener('storage', synchronize);
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, reopen);
    return () => {
      window.removeEventListener('storage', synchronize);
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, reopen);
    };
  }, []);

  const store = (nextAnalytics: boolean, nextMarketing: boolean) => {
    const saved = saveCookieConsent({ analytics: nextAnalytics, marketing: nextMarketing });
    if (!saved) {
      setError(copy.error);
      return;
    }
    setDecision(saved);
    setAnalytics(saved.analytics);
    setMarketing(saved.marketing);
    setDetails(false);
    setError('');
    setOpen(false);
  };

  // No floating cookie panel after a verified saved decision. The footer link reopens it.
  if (!open && decision) return null;

  return (
    <section
      aria-labelledby="cookie-consent-v3-title"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-amber-400/50 bg-[#071426] p-4 text-slate-100 shadow-2xl sm:p-5"
      role="region"
    >
      <h2 id="cookie-consent-v3-title" className="text-base font-bold text-white">
        {copy.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">
        {copy.body}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        {copy.rights} <a href="/datenschutz#cookie-storage" className="text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-200">{copy.privacy}</a>
      </p>
      {details && (
        <fieldset id="cookie-consent-v3-purposes" className="mt-3 space-y-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <legend className="px-2 text-sm font-semibold text-white">{copy.purposes}</legend>
          <p className="text-xs text-slate-300">{copy.necessary}</p>
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
            <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={analytics} onChange={event => setAnalytics(event.target.checked)} />
            {copy.analytics}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
            <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={marketing} onChange={event => setMarketing(event.target.checked)} />
            {copy.marketing}
          </label>
        </fieldset>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => store(false, false)}
          className="min-h-11 flex-1 rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold text-white hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          {copy.reject}
        </button>
        {details ? (
          <button type="button" onClick={() => store(analytics, marketing)}
            className="min-h-11 flex-1 rounded-xl border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            {copy.save}
          </button>
        ) : (
          <button type="button" aria-expanded={details} aria-controls="cookie-consent-v3-purposes" onClick={() => setDetails(true)}
            className="min-h-11 flex-1 rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold text-white hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            {copy.customize}
          </button>
        )}
        <button type="button" onClick={() => store(true, true)}
          className="min-h-11 flex-1 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
          {copy.accept}
        </button>
      </div>
      {decision && <p className="mt-2 text-xs text-slate-400">{copy.withdraw}</p>}
    </section>
  );
}
