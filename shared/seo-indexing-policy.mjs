export const SEO_INDEXING_STATES = Object.freeze({
  INDEX: 'INDEX',
  NOINDEX: 'NOINDEX',
  PRIVATE: 'PRIVATE',
  ARCHIVE: 'ARCHIVE',
  BLOCKED: 'BLOCKED',
});

const routes = [
  { path: '/', classification: 'INDEX', contentType: 'landing', reason: 'Öffentliche Startseite und kanonischer Marken-/Produkteinstieg.' },
  { path: '/learning', classification: 'INDEX', contentType: 'learning', reason: 'Öffentliches Learning Portal mit crawlbarer Fallback-Ausgabe.' },
  { path: '/vocabulary', classification: 'INDEX', contentType: 'vocabulary', reason: 'Kanonische Vocabulary-Landingpage mit serverseitiger SEO-Ausgabe.' },
  { path: '/vocabulary/:term', classification: 'INDEX', contentType: 'vocabulary-term', dynamic: true, reason: 'Nur tatsächlich vorhandene öffentliche Vocabulary-Terme; unbekannte Terme bleiben 404.' },
  { path: '/faq', classification: 'INDEX', contentType: 'trust', reason: 'Öffentliche FAQ-/Hilfeseite.' },
  { path: '/lizenz', classification: 'INDEX', contentType: 'trust', reason: 'Öffentliche Asset-/Design-Lizenzinformation.' },
  { path: '/datenprovider-lizenzen', classification: 'INDEX', contentType: 'trust', reason: 'Öffentliche Datenrechte-/Provider-Lizenzinformation.' },
  { path: '/opensource-lizenzen', classification: 'INDEX', contentType: 'trust', reason: 'Öffentliches Open-Source-Lizenzinventar.' },
  { path: '/impressum', classification: 'INDEX', contentType: 'legal', reason: 'Öffentliche Anbieterkennzeichnung.' },
  { path: '/datenschutz', classification: 'INDEX', contentType: 'legal', reason: 'Öffentliche Datenschutzerklärung.' },
  { path: '/agb', classification: 'INDEX', contentType: 'legal', reason: 'Öffentliche Nutzungsbedingungen.' },

  { path: '/.well-known/security.txt', classification: 'NOINDEX', contentType: 'security-disclosure', reason: 'RFC-9116-Kontaktdatei für Vulnerability Disclosure; öffentlich erreichbar, aber keine Search-Landingpage.' },
  { path: '/.well-known/change-password', classification: 'NOINDEX', contentType: 'account-security', reason: 'Temporärer Discovery-Redirect für Passwortmanager zur kanonischen Sicherheitsseite; keine Search-Landingpage.' },
  { path: '/.well-known/mta-sts.txt', classification: 'NOINDEX', contentType: 'mail-security', reason: 'MTA-STS Policy-Endpunkt; operativer Standardpfad, keine Search-Landingpage.' },

  { path: '/de', classification: 'NOINDEX', contentType: 'localized-landing-preview', reason: 'Sprachvorschau nicht vollständig serverseitig übersetzt; hreflang und Indexierung bis Content-/TRUST-Abnahme deaktiviert.' },
  { path: '/en', classification: 'NOINDEX', contentType: 'localized-landing-preview', reason: 'Sprachvorschau nicht vollständig serverseitig übersetzt; hreflang und Indexierung bis Content-/TRUST-Abnahme deaktiviert.' },
  { path: '/it', classification: 'NOINDEX', contentType: 'localized-landing-preview', reason: 'Sprachvorschau nicht vollständig serverseitig übersetzt; hreflang und Indexierung bis Content-/TRUST-Abnahme deaktiviert.' },
  { path: '/fr', classification: 'NOINDEX', contentType: 'localized-landing-preview', reason: 'Sprachvorschau nicht vollständig serverseitig übersetzt; hreflang und Indexierung bis Content-/TRUST-Abnahme deaktiviert.' },
  { path: '/pt', classification: 'NOINDEX', contentType: 'localized-landing-preview', reason: 'Sprachvorschau nicht vollständig serverseitig übersetzt; hreflang und Indexierung bis Content-/TRUST-Abnahme deaktiviert.' },
  { path: '/es', classification: 'NOINDEX', contentType: 'localized-landing-preview', reason: 'Sprachvorschau nicht vollständig serverseitig übersetzt; hreflang und Indexierung bis Content-/TRUST-Abnahme deaktiviert.' },

  { path: '/login', classification: 'NOINDEX', contentType: 'auth', reason: 'Öffentlicher Auth-Einstieg ohne eigenständigen Suchwert.' },
  { path: '/architecture', classification: 'NOINDEX', contentType: 'product-doc', reason: 'Öffentlich erreichbar, aber noch nicht gegen SEO-Manifest/Claim-Evidence gehärtet.' },
  { path: '/provider-status', classification: 'NOINDEX', contentType: 'operations', reason: 'Operative Statusansicht; keine Search-Landingpage.' },
  { path: '/pipeline-builder', classification: 'NOINDEX', contentType: 'product-tool', reason: 'Interaktives Tool; erst nach SEO-/Claim-/State-Prüfung indexierbar.' },
  { path: '/studio', classification: 'NOINDEX', contentType: 'product-tool', reason: 'Interaktiver Studio-Hub; kein freigegebener SEO-Landingpage-Contract.' },
  { path: '/marketscreener', classification: 'NOINDEX', contentType: 'product-tool', reason: 'Interaktiver Screener; Datenrechte, Crawl-Fallback und Metadata werden separat gehärtet.' },
  { path: '/marketscreener/dokumentation', classification: 'NOINDEX', contentType: 'documentation', reason: 'Öffentliche Blueprint-Dokumentation; Promotion erst nach SEO-02/03 und Claim-/License-Review.' },
  { path: '/dokumentation', classification: 'NOINDEX', contentType: 'documentation', reason: 'Öffentlicher Dokumentations-Hub; Promotion erst nach eigenständiger crawlbarer Metadata/Canonical-Abnahme.' },
  { path: '/pricing', classification: 'NOINDEX', contentType: 'product-state', reason: 'Der Pfad ist derzeit Produkt-/UI-State, keine eigenständige serverseitige Landingpage.' },

  { path: '/documentation/byok.html', classification: 'NOINDEX', contentType: 'documentation-static', reason: 'Öffentliche statische Präsentation; noch nicht in den kanonischen SEO-Contract aufgenommen.' },
  { path: '/documentation/pipeline-architectures.html', classification: 'NOINDEX', contentType: 'documentation-static', reason: 'Öffentliche statische Präsentation; noch nicht in den kanonischen SEO-Contract aufgenommen.' },
  { path: '/documentation/pricing-models.html', classification: 'NOINDEX', contentType: 'documentation-static', reason: 'Preis-/Produktdarstellung benötigt Claim-/Preisautoritäts- und Drift-Prüfung vor Indexierung.' },
  { path: '/documentation/domains.html', classification: 'NOINDEX', contentType: 'documentation-static', reason: 'Öffentliche statische Präsentation; noch nicht in den kanonischen SEO-Contract aufgenommen.' },

  { path: '/profile', classification: 'PRIVATE', contentType: 'account', reason: 'Personenbezogener Kontobereich.' },
  { path: '/profile/security', classification: 'PRIVATE', contentType: 'account-security', reason: 'Personenbezogene Sicherheits-, MFA- und Recovery-Einstellungen.' },
  { path: '/profile/key-vault', classification: 'PRIVATE', contentType: 'credential-vault', reason: 'Personenbezogener Provider-Credential-Vault; niemals Search-Inhalt.' },
  { path: '/profile/workspace', classification: 'PRIVATE', contentType: 'analysis-workspace', reason: 'Nutzereigene API-/Modellzuordnungen und Analyse-Einstellungen.' },
  { path: '/profile/render-dashboard', classification: 'PRIVATE', contentType: 'owner-private-dashboard', reason: 'Render-Provider-Verbindungen nur für serverseitig verifizierten Owner.' },
  { path: '/control-center', classification: 'PRIVATE', contentType: 'management', reason: 'Management-, Evidence- und Control-Center-Inhalte sind nicht für Search bestimmt.' },

  { path: '/tokenomics', classification: 'BLOCKED', contentType: 'financial-claim', reason: 'Token-/Finanzclaims bleiben bis expliziter rechtlicher und Evidence-Prüfung von Search ausgeschlossen.' },
  { path: '/whale-radar', classification: 'BLOCKED', contentType: 'financial-signal', reason: 'Signal-/Whale-Radar-Inhalte bleiben bis Datenrechte-, Claim- und Produktfreigabe von Search ausgeschlossen.' },
];

export const SEO_ROUTE_POLICY = Object.freeze(routes.map((route) => Object.freeze(route)));

const exactRoutes = new Map(
  SEO_ROUTE_POLICY
    .filter((route) => !route.dynamic)
    .map((route) => [route.path, route]),
);

const DEFAULT_BLOCKED_POLICY = Object.freeze({
  path: '*',
  classification: SEO_INDEXING_STATES.BLOCKED,
  contentType: 'unknown',
  reason: 'Unbekannte oder nicht inventarisierte Route bleibt fail-closed von Search ausgeschlossen.',
});

const API_PRIVATE_POLICY = Object.freeze({
  path: '/api/*',
  classification: SEO_INDEXING_STATES.PRIVATE,
  contentType: 'api',
  reason: 'API-Endpunkte sind keine indexierbaren Webinhalte.',
});

const OPERATIONAL_NOINDEX_POLICY = Object.freeze({
  path: '/operational/*',
  classification: SEO_INDEXING_STATES.NOINDEX,
  contentType: 'operations',
  reason: 'Health-/Metrics-/Crawler-Control-Endpunkte sind keine Search-Landingpages.',
});

function normalize(pathname) {
  return String(pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
}

export function resolveSeoIndexingPolicy(pathname) {
  const normalized = normalize(pathname);

  if (normalized.startsWith('/api/')) return API_PRIVATE_POLICY;
  if (normalized.startsWith('/control-center/')) return exactRoutes.get('/control-center');
  if (normalized === '/healthz' || normalized === '/metrics' || normalized === '/robots.txt' || normalized === '/sitemap.xml' || normalized === '/llms.txt' || normalized === '/sitemap.md') {
    return OPERATIONAL_NOINDEX_POLICY;
  }
  if (/^\/vocabulary\/[a-z0-9][a-z0-9_-]*$/.test(normalized)) {
    return SEO_ROUTE_POLICY.find((route) => route.path === '/vocabulary/:term');
  }
  return exactRoutes.get(normalized) || DEFAULT_BLOCKED_POLICY;
}

export function seoIndexableStaticPaths() {
  return SEO_ROUTE_POLICY
    .filter((route) => route.classification === SEO_INDEXING_STATES.INDEX && !route.dynamic)
    .map((route) => route.path);
}

export function isSeoIndexable(pathname) {
  return resolveSeoIndexingPolicy(pathname).classification === SEO_INDEXING_STATES.INDEX;
}

export function robotsDirectiveFor(pathname) {
  return isSeoIndexable(pathname)
    ? 'index, follow, max-snippet:-1, max-image-preview:large'
    : 'noindex, nofollow';
}
