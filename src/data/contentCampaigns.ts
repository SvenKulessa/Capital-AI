import type { ContentCampaignBrief } from '../contracts/contentEngine.ts';

export type SocialCampaignAsset = {
  id: string;
  channel: 'WEBSITE' | 'LINKEDIN' | 'YOUTUBE' | 'REDDIT' | 'PODCAST';
  format: string;
  hook: string;
  message: string;
  cta: string;
  modules: string[];
  state: 'DRAFT';
};

export type SocialCampaign = {
  brief: ContentCampaignBrief;
  name: string;
  positioning: string;
  pillars: string[];
  assets: SocialCampaignAsset[];
  measurement: string[];
};

export const CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007: SocialCampaign = {
  name: 'Build your own FinTech Score',
  positioning: 'CAPITAL-AI verbindet eigene Datenquellen und modulare Analysewerkzeuge zu nachvollziehbaren, reproduzierbaren Scores und Screenern.',
  brief: {
    campaignId: 'capital-ai-score-builder-20261007',
    productId: 'capital-ai-market-screener',
    sourceSha: '71881d789246f5d382643dce8cc7eaa6daec582f',
    canonicalUrl: 'https://capital-ai.online/',
    locale: 'de-DE',
    objective: 'CAPITAL-AI als modularen BYOK Scoring- und Screener-Baukasten positionieren, ohne noch nicht produktive Funktionen zu behaupten.',
    audience: [
      'FinTech- und Quant-Builder',
      'technisch versierte Anleger',
      'Research-Teams',
      'Entwickler eigener Analyse- und Scoring-Workflows',
    ],
    channels: ['WEBSITE', 'LINKEDIN', 'YOUTUBE', 'REDDIT', 'PODCAST'],
    outputs: ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'ANALYTICS'],
    sourceUrls: ['https://capital-ai.online/'],
  },
  pillars: [
    'Scoring first: Analysewerkzeuge und eigene Score-Komposition statt Infrastruktur als Selbstzweck.',
    'BYOK und Provider-Neutralität: Datenquellen austauschbar anbinden.',
    'Evidence und Replay: Scores nachvollziehbar und reproduzierbar entwickeln.',
    'Scale on demand: Valkey, NATS/JetStream und Supabase bilden die Startbasis; Storage wächst später mit realer Last.',
  ],
  assets: [
    {
      id: 'score-builder-launch',
      channel: 'LINKEDIN',
      format: 'Carousel / Text + Diagramm',
      hook: 'Was wäre, wenn dein Screener nicht einen fremden Score erklärt – sondern deinen eigenen baut?',
      message: 'CAPITAL-AI richtet den Kern auf modulare Datenquellen, Analysebausteine und reproduzierbare Score-Komposition aus.',
      cta: 'Architektur und Roadmap ansehen.',
      modules: ['COPY', 'IMAGE', 'ATTRIBUTION'],
      state: 'DRAFT',
    },
    {
      id: 'pipeline-explainer',
      channel: 'YOUTUBE',
      format: '60–90 s Architektur-Explainer',
      hook: 'Vom API-Key zum eigenen Score in einer nachvollziehbaren Pipeline.',
      message: 'BYOK Provider → Bridge → NATS/JetStream → Valkey → Features → Analysewerkzeuge → Score → Screener.',
      cta: 'Den Aufbau im Learning Portal verfolgen.',
      modules: ['COPY', 'IMAGE', 'TTS', 'VIDEO', 'ATTRIBUTION'],
      state: 'DRAFT',
    },
    {
      id: 'why-not-storage-first',
      channel: 'REDDIT',
      format: 'Engineering Post',
      hook: 'Why we are not building a giant market-data warehouse first.',
      message: 'Die Startarchitektur hält Storage bewusst klein und priorisiert Messbarkeit, Scoring und Analysequalität.',
      cta: 'Feedback zu modularen Scoring-Pipelines geben.',
      modules: ['COPY', 'ATTRIBUTION'],
      state: 'DRAFT',
    },
    {
      id: 'score-composition-demo',
      channel: 'WEBSITE',
      format: 'Landingpage / Interactive Concept',
      hook: 'Momentum 25 %, Trend 20 %, Volatilität 15 % – dein Score, deine Gewichtung.',
      message: 'Der Score Builder soll mehrere Analysewerkzeuge provider-neutral kombinieren und jede Version reproduzierbar machen.',
      cta: 'Score-Builder-Roadmap öffnen.',
      modules: ['COPY', 'IMAGE', 'ATTRIBUTION'],
      state: 'DRAFT',
    },
    {
      id: 'evidence-replay',
      channel: 'LINKEDIN',
      format: 'Technical Deep Dive',
      hook: 'Ein guter Score ist nicht nur eine Zahl. Er muss wiederholbar sein.',
      message: 'CAPITAL-AI koppelt Scoring an Zeitstempel, Datenherkunft, Replay und nachvollziehbare Subscores.',
      cta: 'Evidence-first Scoring kennenlernen.',
      modules: ['COPY', 'IMAGE', 'ATTRIBUTION'],
      state: 'DRAFT',
    },
    {
      id: 'content-engine-behind-scenes',
      channel: 'YOUTUBE',
      format: 'Behind-the-scenes Short',
      hook: 'Diese Kampagne wird selbst aus modularen CAPITAL-AI Growth Tools aufgebaut.',
      message: 'Copy, Bilder, Audio, Video und Attribution werden über eine gemeinsame Content Engine orchestriert; Publishing bleibt ein separater Adapter.',
      cta: 'Content-Engine-Entwicklung verfolgen.',
      modules: ['COPY', 'IMAGE', 'TTS', 'VIDEO', 'ATTRIBUTION'],
      state: 'DRAFT',
    },
    {
      id: 'architecture-podcast',
      channel: 'PODCAST',
      format: '8–12 min Deep Dive',
      hook: 'Warum Scoring vor Storage-Skalierung kommt.',
      message: 'Architekturgespräch über Valkey, NATS/JetStream, Supabase, BYOK, Analysebausteine und skalierbare Score-Komposition.',
      cta: 'Learning-Portal und Architektur-Roadmap besuchen.',
      modules: ['COPY', 'TTS', 'ATTRIBUTION'],
      state: 'DRAFT',
    },
  ],
  measurement: [
    'GSC: Impressions, Clicks, Position für scoring-/screener-nahe Inhalte.',
    'Website: Landingpage-Aufrufe, Score-Builder-CTA, Learning-Portal-Weiterklicks.',
    'Social: Impressions, View-Through, Saves, Comments und Link-Klicks providergetrennt.',
    'Content: Asset-ID, Campaign-ID und Canonical URL über GrowthAttribution korrelieren.',
  ],
};


/**
 * Product copy / channel concepts from the newer private Drive owner brief.
 * The complete customer PDF is never shipped from this public marketing contract.
 */
export const CAPITAL_AI_SCREENER_BUNDLE_CAMPAIGN_20261009: SocialCampaign = {
  name: 'Screener Architecture Bundle · Evidence-first Preview',
  positioning: 'Datenquellen, Faktor-Tools, Chartmuster und Versionierung zu einem nachvollziehbaren Screener-Konzept verbinden.',
  brief: {
    campaignId: 'capital-ai-screener-bundle-20261009',
    productId: 'capital-ai-screener-blueprint-bundle',
    sourceSha: '3c2bf8f733c501e7fce00ffc30cd94189ab43149',
    canonicalUrl: 'https://capital-ai.online/marketscreener/dokumentation',
    locale: 'de-DE',
    objective: 'Erkläre das kombinierte Blueprint-Paket und seine Grenzen; keine nicht vorhandene kommerzielle Lieferung oder Live-Scoring behaupten.',
    audience: [
      'FinTech- und Quant-Builder',
      'Research- und Analyse-Teams',
      'Screener- und Trading-Dashboard-Entwickler',
      'Agenturen und Legacy-System-Integratoren',
    ],
    channels: ['WEBSITE','LINKEDIN','YOUTUBE','REDDIT'],
    outputs: ['TEXT','IMAGE','ANALYTICS'],
    sourceUrls: ['https://capital-ai.online/marketscreener/dokumentation'],
  },
  pillars: [
    'Data Blueprint: Datenverträge, Normalisierung, Rights und Quality Gates.',
    'Scoring Blueprint: Faktoren, Chartmuster und Explainability mit reproduzierbaren Demo-Formeln.',
    'Shadow-first: Kein zweiter produktiver Scorer, keine Garantie für Trading-Ergebnisse.',
    'Studio als geplantes Upgrade: YAML-Editor und Diagramm sind gegenwärtig nur ein Demo-Konzept.',
  ],
  assets: [
    {
      id: 'screener-bundle-public-preview', channel: 'WEBSITE',
      format: 'Produktvorschau / Zielgruppen und YAML-Demo',
      hook: 'Baue einen Screener, der seine Bewertung erklären kann.',
      message: 'Ein kombiniertes Daten- und Scoring-Konzept mit Muster-Evidenz, Datenflüssen und einer lokalen YAML-Demovorschau. Kein verifiziertes Live-Scoring.',
      cta: 'YAML-Demo und Datenfluss ansehen.', modules: ['COPY','IMAGE','ATTRIBUTION'], state: 'DRAFT',
    },
    {
      id: 'screener-bundle-research-linkedin', channel: 'LINKEDIN',
      format: 'Fachbeitrag / Architekturkarte',
      hook: 'Ein Score ohne Quellenherkunft ist schwer zu prüfen.',
      message: 'Datenverträge, Quality Gates und versionierte Gewichte bringen nachvollziehbare Schritte in die Screener-Konzeption. Screenshot zeigt synthetische Faktoren.',
      cta: 'Technische Vorschau ansehen.', modules: ['COPY','IMAGE','ATTRIBUTION'], state: 'DRAFT',
    },
    {
      id: 'screener-bundle-pattern-short', channel: 'YOUTUBE',
      format: '30–45s Erklärvideo / ohne generierte Tonspur',
      hook: 'Von Datenströmen zu erklärbaren Scores – mit Chartmustern als eigener Faktorgruppe.',
      message: 'Storyboard: Ingestion, Data Quality, Factor Tools, Pattern Review und synthetischer Beispiel-Score 76,85/100; niemals als Live-Anlagesignal.',
      cta: 'YAML-Vorschau besuchen.', modules: ['COPY','IMAGE','VIDEO','ATTRIBUTION'], state: 'DRAFT',
    },
    {
      id: 'screener-bundle-builders-feedback', channel: 'REDDIT',
      format: 'Technischer Diskussionsentwurf (keine automatische Promotion)',
      hook: 'Welche Prüfungen fehlen euch bei YAML-konfigurierbaren Scoring-Pipelines?',
      message: 'Diskussion zu PIT-Replay, Dubletten, Pattern-Korrelation, Datenrechten und Shadow-Mode-Validierung; keine ungefragten Promotions.',
      cta: 'Technisches Feedback zur Architektur geben.', modules: ['COPY','ATTRIBUTION'], state: 'DRAFT',
    },
  ],
  measurement: [
    'Website: CTA-Klicks nur nach rechtskonformer Consent-/Analytics-Evidence aggregiert.',
    'Social: nur tatsächlich verfügbare Provider-Saves und Klicks nach Plattformrechten auswerten.',
    'Feedback: nur opt-in, anonymisierte inhaltliche Hinweise in der Learning Candidate Pipeline.',
    'News: offizielle Quellen nur als Links / Citation, keine ungeprüften Texte als Anweisungen.',
  ],
};
