import { useEffect } from 'react';
import {
  RESEARCH_ROUTES,
  researchMetadata,
  type ResearchRoute,
} from '../../data/researchLicenses';
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
  title: 'Capital-AI | FinTech-Forschung & Market Intelligence',
  description:
    'Capital-AI erforscht günstige gehostete Infrastruktur, Datenintegrität und nachvollziehbares Multi-Asset-Scoring. Forschungsbedingungen und Datenrechte transparent prüfen.',
  canonicalPath: '/',
};

const STATIC_ROUTE_METADATA: Record<string, StaticRouteMetadata> = {
  '/login': {
    title: 'Capital-AI | Terminal Anmeldung & Login',
    description:
      'Sicherer Zugang zum Capital-AI Terminal: KI-gestützte Echtzeit-Marktdaten, automatisierte Portfolio-Analysen und institutionelles Scoring.',
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
    title: 'Capital-AI | Learning Portal: Market Vocabulary & Glossar',
    description:
      'Umfassendes Finanz- & Quant-Glossar von Capital-AI: Fachbegriffe verständlich erklärt mit Berechnungsformeln und Praxisbeispielen.',
    canonicalPath: '/learning',
  },
  '/vocabulary': {
    title: 'Capital-AI | Learning Portal: Market Vocabulary & Glossar',
    description:
      'Umfassendes Finanz- & Quant-Glossar von Capital-AI: Fachbegriffe verständlich erklärt mit Berechnungsformeln und Praxisbeispielen.',
    canonicalPath: '/learning',
    trackPath: '/learning',
  },
  '/control-center': {
    title: 'Capital-AI | Control Center: Roadmap & Governance Console',
    description:
      'Control Center von Capital-AI: Navigationsfreundliche v1.0 Roadmap nach 11 Projektownern, Executive Cockpit und Cost Center.',
    canonicalPath: '/control-center',
  },
  '/pricing': {
    title: 'Capital-AI | Preise, Tarife & Monetarisierungskonzept',
    description:
      'Capital-AI Business Model: Transparente B2C SaaS Tarife (Free, Pro, Alpha Elite), B2B Data APIs, Broker-Affiliates und interaktiver Ertrags-Simulator.',
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
    title: 'Capital-AI | $CPT Tokenomics, Staking & Deflations-Konzept',
    description:
      'Wirtschafts- und Token-Konzept von Capital-AI ($CPT): 100M Hard Cap, Staking-Tiers für Sub-45ms Latenz, 25% Revenue Buyback & Burn sowie dezentrale Kuration.',
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
      'Echtzeit-Überwachung aller autorisierten Data-Provider: Latenz, Jitter, Circuit-Breaker, AP-006 Budget (<40€) und Zod-Vertrags-Audits.',
    canonicalPath: '/provider-status',
  },
};

export function useRouteAnalytics(currentRoute: string) {
  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    if (RESEARCH_ROUTES.includes(currentRoute as ResearchRoute)) {
      const meta = researchMetadata[currentRoute as ResearchRoute];
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
