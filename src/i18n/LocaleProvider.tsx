import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { isLocale, messages, type Locale, type MessageKey } from './messages';
import { sectionMessages, type SectionKey } from './landingSectionCopy';

type LocaleValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: MessageKey) => string; tSection: (key: SectionKey) => string };
const Context = createContext<LocaleValue | null>(null);
function initialLocale(): Locale {
  try {
    const persisted = localStorage.getItem('capital_ai_locale');
    if (persisted && isLocale(persisted)) return persisted;
  } catch { /* Browser may forbid local storage. */ }
  const serverLocale = document.documentElement.lang;
  return isLocale(serverLocale) ? serverLocale : 'en';
}
export function LocaleProvider({children}: PropsWithChildren) {
  const [locale, selectLocale] = useState<Locale>(initialLocale);
  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    selectLocale(next);
    try { localStorage.setItem('capital_ai_locale', next); } catch { /* Optional preference storage. */ }
    document.cookie = `capital_ai_locale=${next}; Path=/; SameSite=Lax; Max-Age=31536000${location.protocol === 'https:' ? '; Secure' : ''}`;
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const t = useCallback((key: MessageKey) => messages[locale][key], [locale]);
  const tSection = useCallback((key: SectionKey) => sectionMessages[locale][key], [locale]);
  const value = useMemo(() => ({locale,setLocale,t,tSection}), [locale,setLocale,t,tSection]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLocale() {
  const context = useContext(Context);
  if (!context) throw new Error('LOCALE_PROVIDER_MISSING');
  return context;
}
