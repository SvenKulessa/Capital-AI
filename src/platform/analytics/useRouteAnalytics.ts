import { useEffect } from 'react';
import {
  LICENSE_ROUTES,
  licenseMetadata,
  type LicenseRoute,
} from '../../data/providerLicenseReview';
import {
  initGoogleAnalytics,
  trackPageView,
  updatePageSEO,
} from '../../utils/analytics';

type StaticRouteMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  trackPath?: string;
};

const DEFAULT_METADATA: StaticRouteMetadata = {
  title: 'Capital-AI | Market Intelligence & BYOK',
  description:
    'Capital-AI verbindet eigene Providerzugänge mit nachvollziehbarer Marktanalyse, BYOK und überprüfbaren Datenrechten.',
  canonicalPath: '/',
};

const STATIC_ROUTE_METADATA: Record<string, StaticRouteMetadata> = {
  '/login': {
    title: 'Capital-AI | Terminal Anmeldung & Login',
    description:
      'Sicherer Zugang zum Capital-AI Konto und zu freigeschalteten Produktfunktionen.',
    canonicalPath: '/login',
  },
  '/faq': {
    title: 'Capital-AI | Häufig gestellte Fragen (FAQ)',
    description:
      'Fragen und Antworten zu Capital-AI: Funktionsweise des KI-Scorings, Datenfeeds, Latenzen, unterstützte Assetklassen und Sicherheit.',
    canonicalPath: '/faq',
  },
  '/datenschutz': {
    title: 'Capital-AI | Datenschutzerklärung',
    description:
      'Datenschutzhinweise von CAPITAL-AI: Verantwortlicher, Verarbeitungstätigkeiten und Betroffenenrechte.',
    canonicalPath: '/datenschutz',
  },
  '/agb': {
    title: 'Capital-AI | Allgemeine Geschäftsbedingungen (AGB)',
    description:
      'Allgemeine Geschäftsbedingungen von CAPITAL-AI: Anbieter, Nutzungsrechte und Vertragsbedingungen.',
    canonicalPath: '/agb',
  },
  '/impressum': {
    title: 'Capital-AI | Impressum',
    description:
      'Impressum und Anbieterkennzeichnung gemäß § 5 DDG: CAPITAL-AI · Sven Michael Kulessa.',
    canonicalPath: '/impressum',
  },
  '/learning': {
    title: 'Capital-AI | Learning Portal & Fachbegriffe',
    description:
      'Learning Portal von Capital-AI mit 294 konsolidierten Fachbegriffen aus Marktanalyse, Scoring, Daten, Plattform, Security, Produkt, Governance und Mobile Runtime.',
    canonicalPath: '/learning',
  },
  '/vocabulary': {
    title: 'Capital-AI Vocabulary | 294 Fachbegriffe & Thesaurus',
    description:
      '294 konsolidierte Capital-AI Fachbegriffe mit Definitionen und jeweils drei Thesaurus-Begriffen aus Marktanalyse, Scoring, Daten, Plattform, Security, Produkt, Governance und Mobile Runtime.',
    canonicalPath: '/vocabulary',
  },
  '/control-center': {
    title: 'Capital-AI | Control Center: Roadmap & Governance Console',
    description:
      'Control Center von Capital-AI: Navigationsfreundliche v1.0 Roadmap nach 11 Projektownern, Executive Cockpit und Cost Center.',
    canonicalPath: '/control-center',
  },
  '/pricing': {
    title: 'Capital-AI | Preiskatalog',
    description:
      'Starter, Pro, Enterprise und eigenständige Zusatzprodukte aus dem aktuellen Billing-Katalog von Capital-AI.',
    canonicalPath: '/pricing',
  },
  '/whale-radar': {
    title: 'Capital-AI | Smart Money Flow & On-Chain Whale Radar',
    description:
      'Echtzeit-Tracking institutioneller On-Chain Großtransaktionen, Smart Money Flow Index (SMFI), Dark Pool ATS Blocks und Telegram Push-Benachrichtigungen.',
    canonicalPath: '/whale-radar',
  },
  '/pipeline-builder': {
    title: 'Capital-AI | Data Pipeline Builder & Concept Synthesizer',
    description:
      'Automatischer Pipeline Builder für Data Authority, Evidence, Tier 4, Hybrid & Individual Datenkonzepte für TradingView, Bloomberg, Python/Pandas & MetaTrader.',
    canonicalPath: '/pipeline-builder',
  },
  '/architecture': {
    title: 'Capital-AI | FinTech Architektur Konzepte & Low-Budget Pipeline',
    description:
      'Technische Spezifikation der Capital-AI Marktdaten-Pipeline: Sub-45ms Latenz, Multi-Provider Failover, Zero-Trust Proxy, In-Memory Caching & Low-Budget Blueprint (<35€/Mo).',
    canonicalPath: '/architecture',
  },
  '/tokenomics': {
    title: 'Capital-AI | Tokenomics, Privacy & Utility Research',
    description:
      'Research zu datenschutzorientierten Utility- und Entitlement-Modellen. Kein öffentlich freigegebener handelbarer Token, keine APY- oder Renditezusage.',
    canonicalPath: '/tokenomics',
  },
  '/studio': {
    title: 'Capital-AI | Studio Hub: Pipeline Architektur, Blueprints & Builder',
    description:
      'Studio Hub von Capital-AI: 16 kanonische Datenkonzepte, 7 Produktions-Blueprints, modularer Pipeline Builder, AI Kauf-Berater und Benchmark Lab.',
    canonicalPath: '/studio',
  },
  '/founder': {
    title: 'Capital-AI | Studio Hub: Pipeline Architektur, Blueprints & Builder',
    description:
      'Studio Hub von Capital-AI: 16 kanonische Datenkonzepte, 7 Produktions-Blueprints, modularer Pipeline Builder, AI Kauf-Berater und Benchmark Lab.',
    canonicalPath: '/studio',
    trackPath: '/studio',
  },
  '/provider-status': {
    title: 'Capital-AI | Data Provider Status Dashboard & Health Monitor',
    description:
      'Provider-Status wird nur bei freigegebener öffentlicher Runtime-, Rechte- und Health-Evidence dargestellt.',
    canonicalPath: '/provider-status',
  },
};

export function useRouteAnalytics(currentRoute: string) {
  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    if (currentRoute.startsWith('/vocabulary/')) {
      return;
    }

    if (LICENSE_ROUTES.includes(currentRoute as LicenseRoute)) {
      const meta = licenseMetadata[currentRoute as LicenseRoute];
      updatePageSEO({ ...meta, canonicalPath: currentRoute });
      trackPageView(currentRoute, meta.title);
      return;
    }

    const meta = STATIC_ROUTE_METADATA[currentRoute] ?? DEFAULT_METADATA;
    updatePageSEO({
      title: meta.title,
      description: meta.description,
      canonicalPath: meta.canonicalPath,
    });
    trackPageView(meta.trackPath ?? meta.canonicalPath, meta.title);
  }, [currentRoute]);
}
