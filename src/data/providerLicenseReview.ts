/** Editorial research review; never used to grant provider entitlements. */
export const LICENSE_REVIEW_DATE = '2026-10-01';
export const LICENSE_ROUTES = ['/lizenz', '/datenprovider-lizenzen', '/opensource-lizenzen'] as const;
export type LicenseRoute = (typeof LICENSE_ROUTES)[number];
export { licenseMetadata } from '../../shared/license-metadata.mjs';
export const providerLicenseReviews = [
  {
    id: 'kraken', name: 'Kraken', status: 'OFFEN',
    rightsContext: 'Öffentliche Schnittstellen sind dokumentiert. Kommerzielle Anzeige und Weitergabe benötigen eine passende Vertragsgrundlage.',
    limits: 'Die EEA-Bedingungen erfassen auch Preisdaten. Nutzung außerhalb genehmigter Zwecke braucht vorherige Erlaubnis. Öffentlicher API-Zugriff ist keine pauschale Weitergabefreigabe.',
    sources: [{ label: 'EEA-Bedingungen, Abschnitt 11', url: 'https://www.kraken.com/legal/eea-terms' }, { label: 'API-Dokumentation', url: 'https://docs.kraken.com/' }],
  },
  {
    id: 'binance', name: 'Binance Vision · historische Datasets', status: 'BEDINGT',
    rightsContext: 'Die Vision Dataset Terms v1.0 nennen nichtkommerzielle akademische Forschung, offene Bildungsprojekte und bestimmte historische Backtests unter CC BY-NC-SA 4.0.',
    limits: 'Kommerzielle Verwendung benötigt eine separate schriftliche Lizenz. Weitergegebene abgeleitete Werke brauchen Attribution und dieselben Lizenzbedingungen. Keine automatische Übertragung auf Live-REST/WebSocket-Feeds; Sponsoring und Veröffentlichung sind gesondert zu prüfen.',
    sources: [{ label: 'Vision Dataset Terms v1.0, 26.08.2026', url: 'https://github.com/binance/binance-public-data/blob/master/TERMS_AND_CONDITIONS.md' }, { label: 'Binance Terms', url: 'https://www.binance.com/en/terms' }],
  },
  {
    id: 'twelvedata', name: 'Twelve Data', status: 'OFFEN',
    rightsContext: 'Ein Bildungsprogramm bietet berechtigten Studierenden und Lehrenden 20 % Rabatt für zwölf Monate. Die persönliche Berechtigung und der konkrete Tarif sind noch zu bestätigen.',
    limits: 'Abgeleitete Daten müssen nicht rekonstruierbar sein. Externe Anzeige und Weitergabe benötigen passende Tarif-/Add-on-Rechte oder eine Vereinbarung. Rabatte ersetzen diese Rechte nicht.',
    sources: [{ label: 'Bildungsprogramm', url: 'https://twelvedata.com/students' }, { label: 'Terms, Abschnitte 2–3', url: 'https://twelvedata.com/terms' }, { label: 'Non-Profit-Anträge', url: 'https://support.twelvedata.com/en/articles/11116616-non-profit-organisation-subscription' }],
  },
  {
    id: 'massive', name: 'Massive · ehemals Polygon.io', status: 'OFFEN',
    rightsContext: 'Die offizielle FAQ nennt Bildungsrabatte für Studierende und Lehrende mit Hochschulnachweis. Ein Student-Beans-Vertrag für Capital-AI ist nicht belegt.',
    limits: 'Die Standardbedingungen beschränken auch abgeleitete Analysen und Non-Display-Nutzung. Externe Anzeige und geschäftliche Nutzung brauchen geeignete Rechte. Keine pauschale Derived-Data-Ausnahme.',
    sources: [{ label: 'Bildungsprogramme / Account FAQ', url: 'https://massive.com/knowledge-base/categories/account' }, { label: 'Market Data Terms, Abschnitt 5', url: 'https://massive.com/legal/market-data-terms-of-service' }],
  },
] as const;
