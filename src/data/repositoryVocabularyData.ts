/**
 * Repository-wide vocabulary projection for CAPITAL-AI.
 *
 * Scope: Finance canonical vocabulary, FRONTEND canonical analysis components,
 * and Capital-AI-Mobile runtime/release terminology. The existing Capital-AI
 * market vocabulary remains in vocabularyData.ts and is merged with this set.
 *
 * Deliberately contains no source-folder/document provenance for presentation.
 */

export type RepositoryVocabularyCategory =
  | 'AI_MODELS'
  | 'DATA_EVIDENCE'
  | 'PLATFORM_ARCHITECTURE'
  | 'SECURITY_COMPLIANCE'
  | 'PRODUCT_UX'
  | 'DELIVERY_GOVERNANCE'
  | 'MOBILE_RUNTIME';

type RepositoryVocabularySeed = readonly [
  id: string,
  term: string,
  englishEquivalent: string,
  canonicalCodeTerm: string,
  definition: string,
  category: RepositoryVocabularyCategory,
];

const CATEGORY_LABELS: Record<RepositoryVocabularyCategory, string> = {
  AI_MODELS: 'KI & Scoring-Modelle',
  DATA_EVIDENCE: 'Daten & Evidence',
  PLATFORM_ARCHITECTURE: 'Plattform & Architektur',
  SECURITY_COMPLIANCE: 'Security & Compliance',
  PRODUCT_UX: 'Produkt & UX',
  DELIVERY_GOVERNANCE: 'Delivery & Governance',
  MOBILE_RUNTIME: 'Mobile & Runtime',
};

const CAPITAL_AI_RUNTIME_TERMS: RepositoryVocabularySeed[] = [
  ["capital-market-fanout", "Market Event Fan-out", "Market event fan-out", "MarketEventFanout", "Verteilung eines autorisierten Marktereignisses an mehrere nachgelagerte Consumer ohne parallele fachliche Neuberechnung.", "DATA_EVIDENCE"],
  ["capital-canonical-snapshot", "Kanonischer Snapshot", "Canonical snapshot", "CanonicalSnapshot", "Unveränderlich identifizierter Daten- oder Zustandsausschnitt für Replay, Evidence und reproduzierbare Verarbeitung.", "DATA_EVIDENCE"],
  ["capital-real-data-ingress", "Real Data Ingress", "Echte Marktdatenaufnahme", "RealDataIngress", "Kontrollierter Eingang realer, autorisierter Marktdaten in die Verarbeitungspipeline.", "DATA_EVIDENCE"],
  ["capital-data-plausibility", "Daten-Plausibilitätsvalidierung", "Data plausibility validation", "DataPlausibilityValidation", "Validierung eingehender Daten auf fachliche Plausibilität, erwartete Wertebereiche und konsistente Zeitreihenmerkmale.", "DATA_EVIDENCE"],
  ["capital-shadow-replay", "Shadow Replay", "Shadow replay", "ShadowReplay", "Nicht-produktive Wiederholung realer oder gebundener Eingaben zur vergleichenden Verifikation einer Pipeline ohne produktive Mutation.", "DATA_EVIDENCE"],
];

const FINANCE_CANONICAL_CONCEPTS: RepositoryVocabularySeed[] = [
  ["finance-voc-billing-0101", "Berechtigungs- und Nutzungsprüfung", "Entitlement and usage gate", "EntitlementUsageGate", "Serverseitige Prüfung von Tarifberechtigung, Nutzung und Quota.", "PRODUCT_UX"],
  ["finance-voc-asset-0101", "Universelle Asset-Identität", "Universal asset identity", "UniversalAssetIdentity", "Kanonische, assetklassenübergreifende Identität eines Finanzinstruments.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0104", "Marktdaten- und Evidence-Erfassung", "Market-data and evidence acquisition", "MarketEvidenceAcquisition", "Erfassung realer Marktdaten und zugehöriger Evidence aus autorisierten Quellen.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0105", "Daten-Provenance", "Data provenance", "DataProvenance", "Nachvollziehbare Herkunft, Qualität und Validierung verwendeter Finanzdaten.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0106", "Feature-Klassifikation", "Feature classification", "FeatureClassification", "Kanonische Klassifikation fachlicher Features vor dem Scoring.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0107", "Scoring-Modellregister", "Scoring model registry", "ScoringModelRegistry", "Kanonisches Register verfügbarer und zulässiger Scoring-Modelle.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0108", "Kanonisches Scoring-Ergebnis", "Canonical scoring result", "CanonicalScoreResult", "Autoritativ erzeugtes Scoring-Ergebnis mit nachvollziehbarer Execution Lineage.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0109", "Score-Konfidenz", "Score confidence", "ScoreConfidence", "Evidenzbasierte Konfidenz eines Scoring-Ergebnisses unter Einbezug der Datenqualität.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0110", "Ranking-Vergleichbarkeit", "Ranking comparability", "RankingComparability", "Prüfung, ob Ergebnisse für ein gemeinsames Ranking fachlich vergleichbar sind.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0111", "Ranking-Berechtigung", "Ranking eligibility", "RankingEligibility", "Fail-closed Entscheidung, ob ein Ergebnis in ein Ranking aufgenommen werden darf.", "DATA_EVIDENCE"],
  ["finance-voc-billing-0001", "Abonnement", "Subscription", "Subscription", "Vertraglich definierter Nutzungszugang zu einem CAPITAL-AI Tarif.", "PRODUCT_UX"],
  ["finance-voc-billing-0002", "Tarifstufe", "Subscription tier", "SubscriptionTier", "Kanonische technische Einordnung eines Subscription-Leistungsumfangs.", "PRODUCT_UX"],
  ["finance-voc-billing-0003", "GitHub Advanced Security", "GitHub Advanced Security", "GitHubAdvancedSecurity", "GitHub-Sicherheitsprodukt mit getrennt abrechenbaren Lizenz-SKUs für GitHub Code Security und GitHub Secret Protection; bei nutzungsbasierter Abrechnung wird die Lizenznutzung anhand aktiver Committer in geschützten Repositorys gemessen.", "PRODUCT_UX"],
  ["finance-voc-billing-0004", "GitHub Enterprise Cloud", "GitHub Enterprise Cloud", "GitHubEnterpriseCloud", "GitHub-Enterprise-Cloud-Plan, dessen Lizenzkosten sich bei nutzungsbasierter Abrechnung nach den verwendeten eindeutigen Benutzerlizenzen richten.", "PRODUCT_UX"],
  ["finance-voc-analytics-0001", "Screening", "Screening", "Screening", "Systematische Analyse eines oder mehrerer Assets anhand definierter Kriterien.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0002", "Backtest", "Backtest", "Backtest", "Historische Simulation einer Strategie oder Regelmenge auf vergangenen Marktdaten.", "DATA_EVIDENCE"],
  ["finance-voc-analytics-0003", "Monte-Carlo-Simulation", "Monte Carlo simulation", "MonteCarlo", "Stochastische Simulation möglicher Ergebnisverteilungen auf Basis wiederholter Zufallsziehungen.", "DATA_EVIDENCE"],
  ["finance-voc-frontend-0001", "Anwendungsshell", "Application shell", "ApplicationShell", "Oberste fachneutrale Präsentationshülle, die globale Layout-, Navigations- und Inhaltsbereiche zusammensetzt.", "MOBILE_RUNTIME"],
  ["finance-voc-frontend-0002", "Seitencontainer", "Page container", "PageContainer", "Layout-Container, der Breite, Außenabstände und responsiven Inhaltsfluss einer Seite begrenzt.", "PRODUCT_UX"],
  ["finance-voc-frontend-0003", "Geräte-Vorschaurahmen", "Device preview frame", "DevicePreviewFrame", "Rein präsentative Rahmung zur Vorschau einer Oberfläche in einer definierten Gerätegeometrie; kein Bestandteil der produktiven Geräteerkennung.", "MOBILE_RUNTIME"],
  ["finance-voc-frontend-0004", "Webseitenkopf", "Site header", "SiteHeader", "Oberer Bereich einer öffentlichen Seite für Marke, primäre Navigation, Status und zentrale Aktionen.", "PRODUCT_UX"],
  ["finance-voc-frontend-0005", "Anwendungskopf", "Application header", "ApplicationHeader", "Oberer Bereich einer Anwendungsansicht für Kontext, Navigation, Status und anwendungsbezogene Aktionen.", "PRODUCT_UX"],
  ["finance-voc-frontend-0006", "Markenlogo", "Brand logo", "BrandLogo", "Kanonische visuelle Markenkennung aus Wort-/Bildmarke oder definierter Logo-Geometrie.", "PRODUCT_UX"],
  ["finance-voc-frontend-0007", "Primärnavigation", "Primary navigation", "PrimaryNavigation", "Hauptnavigation zur Orientierung zwischen den wichtigsten Bereichen einer Oberfläche.", "PRODUCT_UX"],
  ["finance-voc-frontend-0008", "Navigations-Drawer", "Navigation drawer", "NavigationDrawer", "Seitlich ein- und ausblendbares Navigationspanel, das primäre oder ergänzende Navigationsziele enthält.", "PRODUCT_UX"],
  ["finance-voc-frontend-0009", "Navigationseintrag", "Navigation item", "NavigationItem", "Ein einzelnes auswählbares Ziel innerhalb einer Navigation.", "PRODUCT_UX"],
  ["finance-voc-frontend-0010", "Hintergrund-Scrim", "Backdrop scrim", "BackdropScrim", "Flächige, meist halbtransparente Abdunklung hinter einem überlagernden Element zur visuellen Fokusführung.", "PRODUCT_UX"],
  ["finance-voc-frontend-0011", "Statusleiste", "Status bar", "StatusBar", "Kompakte horizontale Anzeige für System-, Geräte- oder Laufzeitstatus ohne eigene Domain-Entscheidungslogik.", "PRODUCT_UX"],
  ["finance-voc-frontend-0012", "Aktionsschaltfläche", "Action button", "ActionButton", "Interaktives Steuerelement zum Auslösen genau einer klar benannten Benutzeraktion.", "PRODUCT_UX"],
  ["finance-voc-frontend-0013", "Icon-Schaltfläche", "Icon button", "IconButton", "Aktionsschaltfläche, deren sichtbarer Inhalt primär aus einem Icon besteht und die eine zugängliche Bezeichnung benötigt.", "PRODUCT_UX"],
  ["finance-voc-frontend-0014", "Primäre Handlungsaufforderung", "Primary call to action", "PrimaryCallToAction", "Visuell hervorgehobene Hauptaktion eines Inhaltsbereichs oder einer Nutzeraufgabe.", "PRODUCT_UX"],
  ["finance-voc-frontend-0015", "Sekundäre Handlungsaufforderung", "Secondary call to action", "SecondaryCallToAction", "Nachgeordnete, visuell weniger dominante Alternative zur primären Handlungsaufforderung.", "PRODUCT_UX"],
  ["finance-voc-frontend-0016", "Inhaltskarte", "Content card", "ContentCard", "Abgegrenzter Container, der zusammengehörige Informationen und optionale Aktionen als eine visuelle Einheit gruppiert.", "PRODUCT_UX"],
  ["finance-voc-frontend-0017", "Texteingabefeld", "Text input", "TextInput", "Formularsteuerelement zur Eingabe oder Bearbeitung textueller Werte.", "PRODUCT_UX"],
  ["finance-voc-frontend-0018", "Tooltip", "Tooltip", "Tooltip", "Kurzzeitige kontextuelle Zusatzinformation, die einem fokussierten oder gezeigten Element zugeordnet ist.", "PRODUCT_UX"],
  ["finance-voc-frontend-0019", "Modaler Dialog", "Modal dialog", "ModalDialog", "Dialog, der den Interaktionsfokus vorübergehend bindet und vor Rückkehr zum Hintergrund geschlossen oder abgeschlossen werden muss.", "PRODUCT_UX"],
  ["finance-voc-frontend-0020", "Hero-Bereich", "Hero section", "HeroSection", "Prominenter Einstiegsbereich einer Seite mit zentraler Botschaft, visueller Leitkomponente und primären Aktionen.", "PRODUCT_UX"],
  ["finance-voc-frontend-0021", "Einordnungszeile", "Eyebrow text", "EyebrowText", "Kurze typografische Zeile oberhalb einer Überschrift zur Kategorie-, Status- oder Kontextkennzeichnung.", "PRODUCT_UX"],
  ["finance-voc-frontend-0022", "Hero-Visual", "Hero visual", "HeroVisual", "Dominante Illustration, Grafik oder Medienkomponente innerhalb des Hero-Bereichs.", "PRODUCT_UX"],
  ["finance-voc-frontend-0023", "Abschnittskopf", "Section header", "SectionHeader", "Überschriftsbereich, der einen Inhaltsabschnitt benennt und optional Kontext oder Aktionen ergänzt.", "PRODUCT_UX"],
  ["finance-voc-frontend-0024", "Funktionsraster", "Feature grid", "FeatureGrid", "Responsives Raster zur gleichrangigen Anordnung mehrerer Funktions- oder Nutzenkarten.", "PRODUCT_UX"],
  ["finance-voc-frontend-0025", "Funktionskarte", "Feature card", "FeatureCard", "Inhaltskarte zur kompakten Darstellung einer Produktfunktion, eines Nutzens oder einer Fähigkeit.", "PRODUCT_UX"],
  ["finance-voc-frontend-0026", "Marktübersicht", "Market overview", "MarketOverview", "Präsentationsbereich zur zusammengefassten Anzeige bereits autorisierter Markt- und Asset-Zustände.", "PRODUCT_UX"],
  ["finance-voc-frontend-0027", "Marktdatenkarte", "Market data card", "MarketDataCard", "Inhaltskarte zur Anzeige gelieferter Markt- oder Asset-Daten einschließlich ihrer vorhandenen Status- und Evidence-Metadaten.", "PRODUCT_UX"],
  ["finance-voc-frontend-0028", "Modulraster", "Module grid", "ModuleGrid", "Responsives Raster zur Anordnung mehrerer Produkt- oder Funktionsmodule.", "PRODUCT_UX"],
  ["finance-voc-frontend-0029", "Modulkarte", "Module card", "ModuleCard", "Inhaltskarte als Einstieg oder Zusammenfassung für ein klar abgegrenztes Produktmodul.", "PRODUCT_UX"],
  ["finance-voc-frontend-0030", "Seitenfuß", "Page footer", "PageFooter", "Unterer Seitenbereich für ergänzende Navigation, rechtliche Hinweise, Metadaten oder Markenabschluss.", "PRODUCT_UX"],
  ["finance-voc-frontend-0031", "Status-Chip", "Status chip", "StatusChip", "Kompakte pillenförmige Status- oder Kontextanzeige; Interaktivität muss explizit erkennbar sein.", "PRODUCT_UX"],
  ["finance-voc-frontend-0032", "Status-Badge", "Status badge", "StatusBadge", "Kompakte, grundsätzlich nicht-interaktive Kennzeichnung eines gelieferten Zustands mit Text oder Icon zusätzlich zu Farbe.", "PRODUCT_UX"],
  ["finance-voc-frontend-0033", "Authority-Badge", "Authority badge", "AuthorityBadge", "Präsentationskennzeichnung der gelieferten Herkunfts- oder Authority-Rolle ohne diese Authority selbst zu erzeugen.", "PRODUCT_UX"],
  ["finance-voc-frontend-0034", "Aktualitäts-Badge", "Freshness badge", "FreshnessBadge", "Präsentationskennzeichnung eines gelieferten Freshness- oder Zeitbezugs ohne clientseitig erfundene Aktualitätslogik.", "PRODUCT_UX"],
  ["finance-voc-frontend-0035", "Evidence-Statusanzeige", "Evidence state indicator", "EvidenceStateIndicator", "Visuelle und textuelle Anzeige eines gelieferten Evidence-Zustands ohne Evidence zu synthetisieren oder aufzuwerten.", "PRODUCT_UX"],
  ["finance-voc-frontend-0036", "Research-only-Hinweisbanner", "Research-only banner", "ResearchOnlyBanner", "Prominenter Hinweis, dass Inhalte ausschließlich Research-/Analysecharakter besitzen und keine kanonische Score- oder Execution-Authority darstellen.", "PRODUCT_UX"],
  ["finance-voc-frontend-0037", "Leerzustand", "Empty state", "EmptyState", "Definierter UI-Zustand für eine gültige Ansicht ohne darstellbare Inhalte, typischerweise mit Erklärung und möglicher nächster Aktion.", "PRODUCT_UX"],
  ["finance-voc-frontend-0038", "Lade-Skelett", "Loading skeleton", "LoadingSkeleton", "Temporärer Platzhalter, der die erwartete Inhaltsstruktur während eines Ladevorgangs andeutet.", "PRODUCT_UX"],
  ["finance-voc-frontend-0039", "Datenvisualisierung", "Data visualization", "DataVisualization", "Grafische Darstellung bereits gelieferter Daten oder Ergebnisse ohne eigene fachliche Neuberechnung.", "PRODUCT_UX"],
  ["finance-voc-frontend-0040", "Diagrammrahmen", "Chart frame", "ChartFrame", "Wiederverwendbare Präsentationshülle um ein Diagramm mit Titel, Status, Metadaten, Zustands- und Accessibility-Flächen.", "PRODUCT_UX"],
  ["finance-voc-frontend-0041", "Visualisierungslegende", "Visualization legend", "VisualizationLegend", "Zuordnung visueller Kodierungen wie Serien, Symbole oder Muster zu ihrer textlichen Bedeutung.", "PRODUCT_UX"],
  ["finance-voc-frontend-0042", "Dekorativer Hintergrund", "Decorative background", "DecorativeBackground", "Nicht-inhaltliche visuelle Ebene zur Atmosphäre und Markenwirkung, die keine Information allein tragen darf.", "PRODUCT_UX"],
  ["finance-voc-frontend-0043", "Neuronaler Hintergrund", "Neural background", "NeuralBackground", "Kanonisches dekoratives Neural-/Netzwerk-Hintergrundmuster als wiederverwendbare Visual-Identity-Komponente.", "PRODUCT_UX"],
];

const FRONTEND_ANALYSIS_COMPONENTS: RepositoryVocabularySeed[] = [
  ["frontend-market_integrity_gate", "Market Integrity Gate", "Market Integrity Gate", "market_integrity_gate", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „data-quality“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-data_quality_scorer", "Data Quality Scorer", "Data Quality Scorer", "data_quality_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „data-quality“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-liquidity_eligibility_scorer", "Liquidity Eligibility Scorer", "Liquidity Eligibility Scorer", "liquidity_eligibility_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-spread_slippage_risk_scorer", "Spread & Slippage Risk Scorer", "Spread & Slippage Risk Scorer", "spread_slippage_risk_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-tradability_gate", "Tradability Gate", "Tradability Gate", "tradability_gate", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-multi_timeframe_trend_regime_scorer", "Multi-Timeframe Trend Regime Scorer", "Multi-Timeframe Trend Regime Scorer", "multi_timeframe_trend_regime_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-relative_strength_scorer", "Relative Strength Scorer", "Relative Strength Scorer", "relative_strength_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-momentum_persistence_scorer", "Momentum Persistence Scorer", "Momentum Persistence Scorer", "momentum_persistence_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-breakout_quality_scorer", "Breakout Quality Scorer", "Breakout Quality Scorer", "breakout_quality_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-mean_reversion_opportunity_scorer", "Mean Reversion Opportunity Scorer", "Mean Reversion Opportunity Scorer", "mean_reversion_opportunity_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-volume_confirmation_scorer", "Volume Confirmation Scorer", "Volume Confirmation Scorer", "volume_confirmation_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-volatility_regime_scorer", "Volatility Regime Scorer", "Volatility Regime Scorer", "volatility_regime_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-support_resistance_proximity_scorer", "Support/Resistance Proximity Scorer", "Support/Resistance Proximity Scorer", "support_resistance_proximity_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-pattern_confidence_scorer", "Pattern Confidence Scorer", "Pattern Confidence Scorer", "pattern_confidence_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-vwap_location_scorer", "VWAP Location Scorer", "VWAP Location Scorer", "vwap_location_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-market_breadth_scorer", "Market Breadth Scorer", "Market Breadth Scorer", "market_breadth_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-sector_rotation_scorer", "Sector Rotation Scorer", "Sector Rotation Scorer", "sector_rotation_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-correlation_diversification_scorer", "Correlation & Diversification Scorer", "Correlation & Diversification Scorer", "correlation_diversification_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-cross_asset_regime_scorer", "Cross-Asset Regime Scorer", "Cross-Asset Regime Scorer", "cross_asset_regime_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-macro_surprise_scorer", "Macro Surprise Scorer", "Macro Surprise Scorer", "macro_surprise_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-economic_calendar_risk_scorer", "Economic Calendar Risk Scorer", "Economic Calendar Risk Scorer", "economic_calendar_risk_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-entity_resolution_engine", "Entity Resolution Engine", "Entity Resolution Engine", "entity_resolution_engine", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „asset-master“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-news_relevance_scorer", "News Relevance Scorer", "News Relevance Scorer", "news_relevance_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-financial_sentiment_scorer", "Financial Sentiment Scorer", "Financial Sentiment Scorer", "financial_sentiment_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-sentiment_velocity_scorer", "Sentiment Velocity Scorer", "Sentiment Velocity Scorer", "sentiment_velocity_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-sentiment_dispersion_scorer", "Sentiment Dispersion Scorer", "Sentiment Dispersion Scorer", "sentiment_dispersion_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-news_novelty_scorer", "News Novelty Scorer", "News Novelty Scorer", "news_novelty_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-source_authority_scorer", "Source Authority Scorer", "Source Authority Scorer", "source_authority_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „data-quality“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-event_detection_classification_engine", "Event Detection & Classification Engine", "Event Detection & Classification Engine", "event_detection_classification_engine", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-event_impact_scorer", "Event Impact Scorer", "Event Impact Scorer", "event_impact_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-catalyst_strength_scorer", "Catalyst Strength Scorer", "Catalyst Strength Scorer", "catalyst_strength_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-market_reaction_validator", "Market Reaction Validator", "Market Reaction Validator", "market_reaction_validator", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „data-quality“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-narrative_emergence_scorer", "Narrative Emergence Scorer", "Narrative Emergence Scorer", "narrative_emergence_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-narrative_saturation_scorer", "Narrative Saturation Scorer", "Narrative Saturation Scorer", "narrative_saturation_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-social_attention_velocity_scorer", "Social Attention Velocity Scorer", "Social Attention Velocity Scorer", "social_attention_velocity_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-social_engagement_quality_scorer", "Social Engagement Quality Scorer", "Social Engagement Quality Scorer", "social_engagement_quality_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „data-quality“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-bot_manipulation_risk_scorer", "Bot & Manipulation Risk Scorer", "Bot & Manipulation Risk Scorer", "bot_manipulation_risk_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-fundamental_quality_scorer", "Fundamental Quality Scorer", "Fundamental Quality Scorer", "fundamental_quality_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-growth_acceleration_scorer", "Growth Acceleration Scorer", "Growth Acceleration Scorer", "growth_acceleration_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-valuation_peer_comparison_scorer", "Valuation & Peer Comparison Scorer", "Valuation & Peer Comparison Scorer", "valuation_peer_comparison_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-earnings_revision_scorer", "Earnings Revision Scorer", "Earnings Revision Scorer", "earnings_revision_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-earnings_surprise_guidance_scorer", "Earnings Surprise & Guidance Scorer", "Earnings Surprise & Guidance Scorer", "earnings_surprise_guidance_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-financial_distress_scorer", "Financial Distress Scorer", "Financial Distress Scorer", "financial_distress_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „risk-controls“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-insider_institutional_flow_scorer", "Insider & Institutional Flow Scorer", "Insider & Institutional Flow Scorer", "insider_institutional_flow_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-options_positioning_gamma_scorer", "Options Positioning & Gamma Scorer", "Options Positioning & Gamma Scorer", "options_positioning_gamma_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-open_interest_funding_regime_scorer", "Open Interest & Funding Regime Scorer", "Open Interest & Funding Regime Scorer", "open_interest_funding_regime_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-orderflow_liquidity_imbalance_scorer", "Orderflow Liquidity Imbalance Scorer", "Orderflow Liquidity Imbalance Scorer", "orderflow_liquidity_imbalance_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-onchain_flow_holder_behavior_scorer", "On-Chain Flow & Holder Behavior Scorer", "On-Chain Flow & Holder Behavior Scorer", "onchain_flow_holder_behavior_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „market-intelligence“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-protocol_fundamentals_tokenomics_scorer", "Protocol Fundamentals & Tokenomics Scorer", "Protocol Fundamentals & Tokenomics Scorer", "protocol_fundamentals_tokenomics_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „scoring“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
  ["frontend-final_rank_confidence_evidence_scorer", "Final Rank, Confidence & Evidence Scorer", "Final Rank, Confidence & Evidence Scorer", "final_rank_confidence_evidence_scorer", "Kanonische Analyse- und Scoring-Komponente der Frontend-Domain „ranking“ mit vertraglich definierten Ein- und Ausgaben, Lifecycle-, Confidence- und Risk-Policies.", "AI_MODELS"],
];

const MOBILE_RUNTIME_TERMS: RepositoryVocabularySeed[] = [
];

function splitCodeTerm(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildThesaurus(
  term: string,
  englishEquivalent: string,
  canonicalCodeTerm: string,
): [string, string, string] {
  const spacedCanonical = splitCodeTerm(canonicalCodeTerm);
  const candidates = [
    englishEquivalent,
    canonicalCodeTerm,
    spacedCanonical,
    englishEquivalent.toLowerCase(),
    canonicalCodeTerm.toUpperCase(),
    term.replace(/-/g, ' '),
  ].filter(Boolean);

  const unique: string[] = [];
  for (const candidate of candidates) {
    if (!unique.includes(candidate)) unique.push(candidate);
    if (unique.length === 3) break;
  }

  while (unique.length < 3) {
    unique.push(term);
  }

  return [unique[0], unique[1], unique[2]];
}

function mapSeed(seed: RepositoryVocabularySeed) {
  const [id, term, englishEquivalent, canonicalCodeTerm, definition, category] = seed;
  const thesaurus = buildThesaurus(term, englishEquivalent, canonicalCodeTerm);

  return {
    id,
    term,
    abbreviation: englishEquivalent !== term ? englishEquivalent : canonicalCodeTerm,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    level: (category === 'PRODUCT_UX' || category === 'MOBILE_RUNTIME') ? 'Einsteiger' as const : category === 'AI_MODELS' || category === 'DATA_EVIDENCE' ? 'Fortgeschritten' as const : 'Quant / Pro' as const,
    shortDefinition: definition,
    detailedExplanation: `${definition} Englische Entsprechung: ${englishEquivalent}. Kanonischer Codebegriff: ${canonicalCodeTerm}.`,
    practicalExample: `„${term}“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.`,
    keyTakeaway: definition,
    searchTags: [term, englishEquivalent, canonicalCodeTerm, ...thesaurus],
    thesaurus,
  };
}

export const REPOSITORY_VOCABULARY_TERMS = [
  ...CAPITAL_AI_RUNTIME_TERMS,
  ...FINANCE_CANONICAL_CONCEPTS,
  ...FRONTEND_ANALYSIS_COMPONENTS,
  ...MOBILE_RUNTIME_TERMS,
].map(mapSeed);
