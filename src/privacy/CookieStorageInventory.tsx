import { useLocale } from '../i18n/LocaleProvider';
import { cookieCopy } from '../i18n/cookieCopy';
import { OPEN_COOKIE_PREFERENCES_EVENT } from './cookieConsentV3';

/** Public inventory includes local storage, not just HTTP cookies. No values or identifiers are displayed. */
export function CookieStorageInventory() {
  const { locale } = useLocale();
  const copy = cookieCopy[locale];
  const rows = [
    ['capital-ai-cookie-consent-v3', 'Local Storage', copy.preference, copy.validity],
    ['__Host-capital_session_count / __Host-capital_session_*', 'Cookie · HttpOnly · Secure · SameSite=Lax', copy.session, `7 ${copy.days}`],
    ['__Host-capital_pkce', 'Cookie · HttpOnly · Secure · SameSite=Lax', copy.login, `10 ${copy.minutes}`],
    ['capital_ai_locale', 'Cookie · Secure (HTTPS) · SameSite=Lax', copy.language, `1 ${copy.year}`],
    ['capital_ai_locale', 'Local Storage', copy.language, copy.untilDelete],
    ['capital_ai_whale_txs_v1 / capital_ai_sentiment_alerts_v2 / capital_ai_alert_prefs_v2', 'Local Storage', copy.functional, copy.untilDelete],
    ['capital_ai_price_alerts_v2 / capital_ai_pipelines_v1 / capital_ai_active_pipeline_id', 'Local Storage', `${copy.functional} · ${copy.onUse}`, copy.untilDelete],
    ['capital_ai_hero_buddy_hidden_v1 / capital_ai_hero_buddy_position_v1 / capital_ai_hero_buddy_floating_v1', 'Local Storage', `${copy.functional} · ${copy.onUse}`, copy.untilDelete],
    ['capital-ai-vocabulary-grant / capital_ai_telegram_logs_v1', 'Local Storage', `${copy.functional} · ${copy.onUse}`, copy.untilDelete],
  ];
  return <section id="cookie-storage" aria-labelledby="cookie-storage-title" className="space-y-4 rounded-2xl border border-slate-700 bg-slate-950 p-4 sm:p-6">
    <h2 id="cookie-storage-title" className="text-xl font-bold text-white">{copy.inventory}</h2>
    <p className="text-base text-slate-300">{copy.analyticsOff}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([name, storage, purpose, retention]) => <article key={name + storage} className="min-w-0 rounded-xl border border-slate-700 p-4">
        <h3 className="break-words text-base font-semibold text-amber-200">{name}</h3>
        <p className="mt-2 text-sm text-slate-300">{storage}</p>
        <dl className="mt-3 space-y-2 text-base text-slate-200">
          <div><dt className="font-semibold">{copy.purpose}</dt><dd>{purpose}</dd></div>
          <div><dt className="font-semibold">{copy.retention}</dt><dd>{retention}</dd></div>
        </dl>
      </article>)}
    </div>
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))}
      className="min-h-11 rounded-xl border border-amber-300 px-4 py-2 text-base font-semibold text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200">{copy.customize}</button>
  </section>;
}
