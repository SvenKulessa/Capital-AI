// Presentation preference only; never use as an authorization, billing or legal signal.
export const SUPPORTED_LOCALES = Object.freeze(['de', 'en', 'it', 'fr', 'pt', 'es']);
const COUNTRY_LANGUAGES = Object.freeze({
  DE:'de', AT:'de', LI:'de', IT:'it', SM:'it', VA:'it', FR:'fr', MC:'fr',
  PT:'pt', BR:'pt', AO:'pt', MZ:'pt', CV:'pt', GW:'pt', ST:'pt', TL:'pt',
  ES:'es', MX:'es', AR:'es', BO:'es', CL:'es', CO:'es', CR:'es', CU:'es',
  DO:'es', EC:'es', SV:'es', GT:'es', GQ:'es', HN:'es', NI:'es', PA:'es',
  PY:'es', PE:'es', UY:'es', VE:'es'
});
export function normalizeLocale(value) {
  const code = typeof value === 'string' ? value.toLowerCase().trim().split(/[-_]/)[0] : '';
  return SUPPORTED_LOCALES.includes(code) ? code : null;
}
export function localeFromCountry(country) {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  return COUNTRY_LANGUAGES[code] || 'en';
}
export function localeFromAcceptLanguage(value) {
  if (typeof value !== 'string') return 'en';
  const ordered = value.split(',').map((part, index) => {
    const [code, ...params] = part.trim().split(';');
    const qText = params.find(param => param.trim().startsWith('q='));
    const q = qText ? Number(qText.trim().slice(2)) : 1;
    return { code, index, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 };
  }).filter(x => x.q > 0).sort((a,b) => b.q-a.q || a.index-b.index);
  for (const item of ordered) {
    const locale = normalizeLocale(item.code);
    if (locale) return locale;
  }
  return 'en';
}
export function localeFromCookie(header) {
  if (typeof header !== 'string') return null;
  const found = header.match(/(?:^|;\s*)capital_ai_locale=([^;]+)/);
  return found && SUPPORTED_LOCALES.includes(found[1]) ? found[1] : null;
}
export function resolveLocale({cookieHeader, countryHeader, acceptLanguage} = {}) {
  const selected = localeFromCookie(cookieHeader);
  if (selected) return {locale:selected, source:'manual'};
  if (typeof countryHeader === 'string' && /^[A-Z]{2}$/i.test(countryHeader)) {
    return {locale:localeFromCountry(countryHeader), source:'country'};
  }
  return {locale:localeFromAcceptLanguage(acceptLanguage), source:'browser'};
}
