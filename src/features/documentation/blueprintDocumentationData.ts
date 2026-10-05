export type BlueprintDocDetail = {
  architecture: string;
  prerequisites: string[];
  trustBoundaries: string[];
  operations: string[];
  failureModes: string[];
  acceptanceCriteria: string[];
};

export const BLUEPRINT_DETAILS: Record<string, BlueprintDocDetail> = {
  TIER_1_4_LIVE: {
    architecture: 'Vier Verarbeitungsebenen führen Roh-Ticks über Conflation und Fan-out zu UI- und AI-Consumern. Provider-Latenz wird damit nicht ungefiltert an Browser-Clients weitergereicht.',
    prerequisites: ['zugelassener Quote-Provider pro Instrument und Capability', 'Valkey/Redis-kompatibler Fan-out oder gleichwertiger OSS-Bus', 'dauerhafter Evidence-Writer vor Production', 'SSE/WebSocket-Egress mit Backpressure'],
    trustBoundaries: ['Provider-Auswahl ist keine Datenrechte-Freigabe', 'keine ungeprüften Roh-Ticks als scorefähig markieren', 'Cache- und Streaming-Rechte separat je Quelle prüfen'],
    operations: ['Heartbeat, Reconnect und Backpressure messen', 'Conflation-Quote und verworfene Ticks beobachten', 'End-to-End-Latenz nur aus Runtime-Evidence ausweisen'],
    failureModes: ['Provider-Stall oder Sequenzlücke', 'Conflation verliert relevante Zustandsänderung', 'Fan-out-Consumer fällt zurück', 'Shared Cache verletzt Provider-Rechte'],
    acceptanceCriteria: ['reproduzierbarer Ingress → Gate → Fan-out → Client-Pfad', 'Freshness und Sequenzvalidierung nachgewiesen', 'keine Credentials im Stream', 'Rights Gate bleibt fail-closed'],
  },
  AUTHORITY_PLANE: {
    architecture: 'Vergleichbare Provider-Facts werden identitätsgleich normalisiert, im Consensus Gate geprüft und erst danach als kanonischer Snapshot mit Evidence-Fingerprint an das Scoring übergeben.',
    prerequisites: ['mindestens drei vergleichbare Provider-Facts', 'identische Instrument-/Venue-/Währungssemantik', 'persistenter Evidence- und Konfigurationsspeicher', 'Outbox/Replay-Pfad'],
    trustBoundaries: ['BTCUSD und BTCUSDT nicht als identische Konsensquelle behandeln', 'Fingerprint beweist Integrität, nicht Datenrechte oder Wahrheit', 'Compliance-Aussagen benötigen separate Evidence'],
    operations: ['Provider-Abweichung und Quorum protokollieren', 'Canonical Snapshot unveränderbar referenzieren', 'Replays gegen identische Konfiguration reproduzieren'],
    failureModes: ['falsche Symbolidentität', 'Quorum aus korrelierten Quellen', 'Outlier-Regel eliminiert echten Marktmove', 'Evidence und Score laufen auseinander'],
    acceptanceCriteria: ['identitätsgebundenes Quorum', 'deterministischer Canonical Snapshot', 'replayfähige Evidence-Kette', 'Scoring stoppt bei unzureichender Authority'],
  },
  HYBRID: {
    architecture: 'Live-Ereignisse, Hot-State und persistente Historie werden über eine gemeinsame Query-Grenze verbunden. Cache-Hits bleiben schnell, historische Antworten versionierbar und reproduzierbar.',
    prerequisites: ['persistente OHLCV-/Feature-Historie', 'versionierte Aggregationsregeln', 'Hot-State mit TTL/Retention-Vertrag', 'Query-Router mit Freshness-Semantik'],
    trustBoundaries: ['Cache erweitert keine Rechte', 'Historie behält Provider- und Berechnungsherkunft', 'TimescaleDB ist Option und keine automatische Production-Anforderung'],
    operations: ['Cache Hit/Miss und Staleness messen', 'Backfill/Restatement getrennt markieren', 'Aggregation und Feature-Version persistieren'],
    failureModes: ['staler Hot-State maskiert neuere Facts', 'History-Gaps werden als Nullwerte interpretiert', 'Formula-Drift bricht Replay'],
    acceptanceCriteria: ['Antwort enthält Source/Freshness', 'Backfill ist idempotent', 'Feature-Versionen nachvollziehbar', 'Retention entspricht Datenrechten'],
  },
  MIXED_DOMAIN: {
    architecture: 'Assetklassen werden über Domain Contracts, Master Data und einen harmonisierten Bus verbunden, ohne Einheiten, Handelszeiten oder Quellenherkunft zu verlieren.',
    prerequisites: ['Asset-Master und Symbologie', 'zugelassene Equity-/Crypto-/Macro-Quellen', 'ECB/FRED- oder gleichwertige Makroadapter', 'Normalisierungsvertrag für Währung, Einheit und Timestamp'],
    trustBoundaries: ['Software-OSS und Datenrechte getrennt bewerten', 'Referenzserien nicht als Live Spot ausgeben', 'jede Assetklasse behält eigene Freshness-/Eligibility-Regeln'],
    operations: ['Cross-asset Mapping-Fehler beobachten', 'Calendar/Timezone korrekt behandeln', 'Quota und Rechte je Capability ausweisen'],
    failureModes: ['falsche Währungsnormalisierung', '24/7-Krypto mit Börsenhandelszeiten vermischt', 'Makroserie als handelbarer Spot dargestellt'],
    acceptanceCriteria: ['kanonische Asset-ID pro Observation', 'Einheiten/Währungen explizit', 'Source Admission je Dataset', 'keine semantische Substitution'],
  },
  PARALLEL_HOMOGENEOUS: {
    architecture: 'Mehrere Feed-Kanäle für dasselbe Instrument laufen parallel. Ein Resolver entscheidet anhand von Freshness und Gesundheit, ohne Provider-Vielfalt mit identischer Marktmikrostruktur gleichzusetzen.',
    prerequisites: ['mindestens zwei unabhängige zugelassene Feeds', 'identisches Instrument-/Venue-Mapping', 'Heartbeat- und Circuit-Breaker-Regeln', 'Sequenz- und Timestamp-Normalisierung'],
    trustBoundaries: ['Fastest-Wins ist keine Wahrheitsgarantie', 'Failover umgeht kein Rights Gate', 'Venue-Unterschiede bleiben sichtbar'],
    operations: ['Provider-Latenz und Failover-Häufigkeit messen', 'Resolver-Entscheidung als Evidence protokollieren', 'degradierte Quoren explizit signalisieren'],
    failureModes: ['schnellster Feed ist falsch oder stale', 'Clock Skew verzerrt Resolver', 'Feeds teilen denselben upstream-Ausfall'],
    acceptanceCriteria: ['deterministisches Failover', 'keine doppelte Tick-Publikation', 'degraded state sichtbar', 'Provider-/Venue-Herkunft erhalten'],
  },
  PARALLEL_MIXED: {
    architecture: 'Preis, Orderbook, News und Fundamentals werden als getrennte Evidence-Familien parallel geladen und erst in einer versionierten Feature-/Context-Schicht zusammengeführt.',
    prerequisites: ['L2 Snapshot/Delta-Vertrag', 'lizenzierte News/RSS-Quellen', 'SEC-EDGAR- oder gleichwertige Fundamentals', 'versionierte Sentiment-/Feature-Inferenz'],
    trustBoundaries: ['LLM-Ausgabe ist keine Rohbeobachtung', 'Prompt/Model-Version gehört in Evidence', 'Datenrechte je Modalität separat prüfen'],
    operations: ['Partial-Failure je Modalität anzeigen', 'Context Freshness pro Quelle führen', 'Model-/Prompt-Version pinnen und replaybar halten'],
    failureModes: ['alte Fundamentals mit Live-Preis vermischt', 'News-Duplikate dominieren Sentiment', 'Inferenz wird als Provider-Fact gespeichert'],
    acceptanceCriteria: ['jede Modalität hat Provenienz', 'Inference/Observation getrennt', 'fehlende Modalität senkt Confidence', 'replaybarer Context Snapshot'],
  },
  INDIVIDUAL_PACKAGE: {
    architecture: 'Ein Contract-First-Paket lädt nur Daten für den konkreten Screener. Für Buffett/Piotroski sind periodengenaue Fundamentals und Restatements wichtiger als Millisekunden-Ticks.',
    prerequisites: ['Fundamentals-Quelle mit Perioden-/Restatement-Semantik', 'Feature-Historie und versionierte Formeln', 'Screener Read Model', 'klarer Missing-Data-Vertrag'],
    trustBoundaries: ['Moat-Rating ist Inferenz, keine SEC-Fact', 'fehlende Fundamentals nicht durch Marktdaten ersetzen', 'Source Admission je Fundamental-Feld'],
    operations: ['Formelversion mit Ergebnis speichern', 'Restatements neu projizieren', 'Cache nur bei unverändertem Input-Fingerprint verwenden'],
    failureModes: ['Perioden falsch ausgerichtet', 'Restatement nicht invalidiert', 'abgeleitete Kennzahl verliert Quellenbezug'],
    acceptanceCriteria: ['minimaler Datenvertrag vollständig', 'Kennzahl auf Inputs zurückführbar', 'Restatement-Replay reproduzierbar', 'kein Tickstream-Zwang'],
  },
};

export const VERIFIED_COMMERCE_STATE = {
  checkedAt: '05.10.2026',
  standaloneProducts: 0,
  note: 'Im live gelesenen Stripe-Katalog war kein aktives eigenständiges Blueprint-Produkt bzw. kein aktiver Blueprint-Preis nachweisbar. Die sieben Einträge werden deshalb als kanonische Architektur-Spezifikationen dokumentiert und nicht als separat kaufbar behauptet.',
} as const;
