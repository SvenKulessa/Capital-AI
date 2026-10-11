import { useEffect, useState } from 'react';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsentReceipt,
} from './cookieConsentV3';

/**
 * First-party v3 consent UI. Neither accepting nor configuring a preference
 * activates scripts: GA4 and ads remain disabled in src/utils/analytics.ts.
 */
export function CookieConsentV3() {
  const [decision, setDecision] = useState<CookieConsentReceipt | null>(() => readCookieConsent());
  const [open, setOpen] = useState(() => readCookieConsent() === null);
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
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, []);

  const store = (nextAnalytics: boolean, nextMarketing: boolean) => {
    const saved = saveCookieConsent({ analytics: nextAnalytics, marketing: nextMarketing });
    if (!saved) {
      setError('Die Auswahl konnte nicht gespeichert werden. Optionale Dienste bleiben deaktiviert; Sie können die Website weiterhin nutzen.');
      return;
    }
    setDecision(saved);
    setAnalytics(saved.analytics);
    setMarketing(saved.marketing);
    setDetails(false);
    setError('');
    setOpen(false);
  };

  if (!open && decision) {
    return (
      <button
        type="button"
        onClick={() => { setDetails(true); setOpen(true); }}
        className="fixed bottom-3 left-3 z-[70] min-h-11 rounded-xl border border-slate-600 bg-slate-950/95 px-4 py-2 text-xs font-semibold text-slate-100 shadow-lg hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        aria-label="Cookie-Einstellungen erneut öffnen und Einwilligung widerrufen"
      >
        Cookie-Einstellungen
      </button>
    );
  }

  return (
    <section
      aria-labelledby="cookie-consent-v3-title"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-amber-400/50 bg-[#071426] p-4 text-slate-100 shadow-2xl sm:p-5"
      role="region"
    >
      <h2 id="cookie-consent-v3-title" className="text-base font-bold text-white">
        Cookies &amp; Datenschutz · Version 3
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">
        Notwendige Session-Cookies ermöglichen Anmeldung und Sicherheit. Die Auswahl für optionale
        Reichweitenmessung und Marketing speichern wir für höchstens 180 Tage in Ihrem Browser
        (lokaler Speicher, ohne personenbezogene Kennung). Derzeit sind weder GA4-Browsertracking
        noch Marketing-Tags aktiv – auch eine Zustimmung schaltet diese Dienste nicht ein.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        Ablehnen beeinträchtigt die Website oder den Kaufweg nicht. Entscheidungen können jederzeit
        geändert und Einwilligungen widerrufen werden. <a href="/datenschutz" className="text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-200">Datenschutzhinweise lesen</a>
      </p>
      {details && (
        <fieldset className="mt-3 space-y-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <legend className="px-2 text-sm font-semibold text-white">Verwendungszwecke</legend>
          <p className="text-xs text-slate-300">Notwendig: Anmeldung und Sicherheit (immer aktiv, keine Auswahl).</p>
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
            <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={analytics} onChange={event => setAnalytics(event.target.checked)} />
            Reichweitenmessung erlauben (derzeit nicht aktiviert)
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
            <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={marketing} onChange={event => setMarketing(event.target.checked)} />
            Marketing-Dienste erlauben (derzeit nicht aktiviert)
          </label>
        </fieldset>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => store(false, false)}
          className="min-h-11 flex-1 rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold text-white hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          Nur notwendige
        </button>
        {details ? (
          <button type="button" onClick={() => store(analytics, marketing)}
            className="min-h-11 flex-1 rounded-xl border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            Auswahl speichern
          </button>
        ) : (
          <button type="button" aria-expanded={details} aria-controls="cookie-consent-v3-title" onClick={() => setDetails(true)}
            className="min-h-11 flex-1 rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold text-white hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            Anpassen
          </button>
        )}
        <button type="button" onClick={() => store(true, true)}
          className="min-h-11 flex-1 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
          Alle erlauben
        </button>
      </div>
      {decision && <p className="mt-2 text-xs text-slate-400">Bisherige Entscheidung kann hier unmittelbar widerrufen werden: „Nur notwendige“ wählen.</p>}
    </section>
  );
}
