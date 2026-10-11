import type { Locale } from './messages';
export const cookieSettingsLabel = {
  de: 'Cookie-Einstellungen ändern oder Einwilligung widerrufen',
  en: 'Change cookie settings or withdraw consent',
  it: 'Modifica i cookie o revoca il consenso',
  es: 'Cambiar cookies o retirar consentimiento',
  pt: 'Alterar cookies ou retirar consentimento',
  fr: 'Modifier les cookies ou retirer le consentement',
} as const satisfies Record<Locale, string>;
