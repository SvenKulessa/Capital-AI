import { Globe2 } from 'lucide-react';
import { LANGUAGES, type Locale } from '../i18n/messages';
import { useLocale } from '../i18n/LocaleProvider';

export function LanguageSwitcher() {
  const {locale, setLocale, t} = useLocale();
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-600/60 bg-slate-900/80 px-1.5 py-1 text-slate-200 focus-within:ring-2 focus-within:ring-amber-400/60">
      <Globe2 className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
      <label className="sr-only" htmlFor="header-language-switcher">{t('language')}</label>
      <select
        id="header-language-switcher"
        lang={locale}
        value={locale}
        title={t('language')}
        aria-label={t('language')}
        onChange={event => setLocale(event.target.value as Locale)}
        className="w-[46px] sm:w-[100px] cursor-pointer appearance-none bg-transparent py-1 text-[11px] font-semibold text-slate-100 outline-none"
      >
        {LANGUAGES.map(({code,name}) => (
          <option key={code} value={code} className="bg-slate-900 text-slate-100">{code.toUpperCase()} · {name}</option>
        ))}
      </select>
    </div>
  );
}
