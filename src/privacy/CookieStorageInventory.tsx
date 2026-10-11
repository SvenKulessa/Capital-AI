import { cookieStorageRows } from './cookieStorageInventory';
import { useLocale } from '../i18n/LocaleProvider';
import { cookieCopy } from '../i18n/cookieCopy';
import { OPEN_COOKIE_PREFERENCES_EVENT } from './cookieConsentEvents';

/** Public inventory includes local storage, not just HTTP cookies. No values or identifiers are displayed. */
export function CookieStorageInventory() {
  const { locale } = useLocale();
  const copy = cookieCopy[locale];
  const rows = cookieStorageRows(copy);
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
