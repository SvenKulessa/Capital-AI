// Server-only paid Vocabulary projection. Do not import from browser code.
export const QUANT_PRO_TERMS = Object.freeze([
  {
      id: 'vwap',
      term: 'VWAP',
      abbreviation: 'Volume-Weighted Average Price',
      category: 'TRADING_QUANT',
      categoryLabel: 'Trading & Quant',
      level: 'Quant / Pro',
      shortDefinition: 'Volumen-gewichteter Durchschnittspreis eines Handelsinstruments über einen definierten Zeitabschnitt (oft 1 Tag).',
      detailedExplanation:
        'Der VWAP ist der Goldstandard-Benchmark für institutionelle Händler und Pensionsfonds. Ein Kurs oberhalb des VWAP gilt als bullisch (Käufer dominieren mit hohem Volumen); Kurse unterhalb des VWAP signalisieren Bärenmarkt-Druck. Große Fonds streben an, Orders unterhalb des VWAP zu akkumulieren.',
      formulaOrRule: 'VWAP = ∑ (Preis × gehandeltes Volumen) / ∑ gehandeltes Gesamtvolumen',
      practicalExample:
        'Eine Aktie schließt bei 150 $, ihr Tages-VWAP liegt bei 147 $. Händler, die unter 147 $ gekauft haben, erzielten eine Outperformance gegenüber dem Gesamtmarkt.',
      relatedAssets: ['NVDA', 'SPX', 'BTC/USD'],
      keyTakeaway: 'VWAP filtert Kursspitzen mit geringem Volumen heraus und zeigt das echte institutionelle Preisniveau.',
      searchTags: ['vwap', 'volumen', 'durchschnitt', 'benchmark', 'quant', 'institutionell'],
      thesaurus: ['Volume-Weighted Average Price', 'volumengewichteter Durchschnittspreis', 'Volumen-Durchschnittskurs']
    },
  {
      id: 'latenz',
      term: 'Latenz & FIX-Protokoll',
      abbreviation: 'Latency (Sub-45ms)',
      category: 'TRADING_QUANT',
      categoryLabel: 'Trading & Quant',
      level: 'Quant / Pro',
      shortDefinition: 'Verzögerungszeit zwischen der Entstehung eines Börsenkurses und dessen Empfang im Terminal bzw. der Orderausführung.',
      detailedExplanation:
        'Im Hochfrequenz- und Quant-Trading entscheiden Millisekunden über Rendite oder Slippage. Standard-Broker weisen oft Verzögerungen von 200–800 ms auf. Institutionelle Terminals wie Capital-AI nutzen direkte WebSocket-Streams und FIX-Protokolle, um Latenzen auf unter 45 ms zu drücken.',
      formulaOrRule: 'Gesamtlatenz = Börsenserver-Verarbeitung + Netzwerklaufzeit (Ping) + Client-Rendering',
      practicalExample:
        'Bei Veröffentlichung der US-Arbeitsmarktdaten reagiert der S&P 500 in 15 ms. Mit Sub-45ms Latenz sieht der Händler die Kursbewegung nahezu in Echtzeit.',
      relatedAssets: ['SPX', 'NDX', 'EUR/USD'],
      keyTakeaway: 'Niedrige Latenz verhindert das Handeln zu veralteten Kursen („Stale Quotes“) und schützt vor Ausführungsverlusten.',
      searchTags: ['latenz', 'latency', 'ping', 'echtzeit', 'sub-45ms', 'websocket'],
      thesaurus: ['Latency', 'Verzögerungszeit', 'Übertragungslatenz']
    },
  {
      id: 'enterprise-scorer',
      term: 'Enterprise Scorer',
      abbreviation: 'Capital-AI Scorer (0–100)',
      category: 'AI_MODELS',
      categoryLabel: 'KI & Scoring-Modelle',
      level: 'Quant / Pro',
      shortDefinition: 'Proprietäres Multi-Faktor-KI-Bewertungsmodell von Capital-AI, das Momentum, Liquidität, Volatilität und Orderbuch-Metriken bündelt.',
      detailedExplanation:
        'Der Enterprise Scorer berechnet täglich aus 30 verifizierten 1D-Balken sowie Intraday-Orderbuchdaten einen objektiven Gesamtscore zwischen 0 und 100. Werte ab 70 gelten als stark bullisch mit solider Markttiefe, Werte unter 40 signalisieren erhöhtes Abwärtsrisiko oder mangelnde Liquidität.',
      formulaOrRule: 'Score = w₁·Trend + w₂·Momentum + w₃·Orderbuch-Tiefe + w₄·Volatilitäts-Qualität - w₅·Datenrisiko',
      practicalExample:
        'Bitcoin erreicht einen Enterprise Score von 94/100 durch anhaltendes Momentum, rekordhohe ETF-Nettozuflüsse und starke Bid-Wand-Unterstützung.',
      relatedAssets: ['BTC/USD', 'NVDA', 'SPX', 'Gold'],
      keyTakeaway: 'Ersetzt subjektives Bauchgefühl durch ein transparentes, datenbasiertes Multi-Faktor-Scoring.',
      searchTags: ['enterprise scorer', 'ki score', 'scoring', 'rating', 'multi-faktor', 'algorithmus'],
      thesaurus: ['Multi-Faktor-Scorer', 'KI-Scoringmodell', 'Capital-AI Scorer']
    },
  {
      id: 'on-chain-metriken',
      term: 'On-Chain-Metriken',
      abbreviation: 'Blockchain Analytics',
      category: 'CRYPTO_WEB3',
      categoryLabel: 'Krypto & Web3',
      level: 'Quant / Pro',
      shortDefinition: 'Quantitative Daten, die direkt aus der Blockchain ausgelesen werden (Wal-Bewegungen, Börsenzuflüsse, HODL-Wellen).',
      detailedExplanation:
        'Da alle Transaktionen öffentlich einsehbar sind, lassen sich Akkumulationsphasen institutioneller Großinvestoren („Whales“) in Echtzeit tracken. Hohe Zuflüsse auf Börsen deuten auf bevorstehenden Verkaufsdruck hin; Abflüsse in Cold-Storage-Wallets signalisieren langfristiges Vertrauen.',
      formulaOrRule: 'Exchange Netflow = Zuflüsse auf Börsen - Abflüsse in private Wallets (negativ = bullisch)',
      practicalExample:
        'Innerhalb von 24 Stunden verlassen 28.000 BTC die Börsenreserven in Richtung privater Verwahrung. Das verknappt das liquide Angebot an den Handelsplätzen.',
      relatedAssets: ['BTC/USD', 'ETH/USD'],
      keyTakeaway: 'On-Chain-Daten zeigen tatsächliche Kapitalströme ohne zeitliche Verzögerung von Zwischenberichten.',
      searchTags: ['on-chain', 'whales', 'netflow', 'blockchain daten', 'hodl', 'adressen'],
      thesaurus: ['Blockchain-Metriken', 'On-Chain Analytics', 'Blockchain-Kennzahlen']
    },
  {
    "id": "capital-eventmesh",
    "term": "EventMesh",
    "abbreviation": "Event Mesh",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Entkoppelte Ereignisarchitektur zur Verteilung und Nachverfolgung fachlicher Zustandsänderungen.",
    "detailedExplanation": "Entkoppelte Ereignisarchitektur zur Verteilung und Nachverfolgung fachlicher Zustandsänderungen. Englische Entsprechung: Event Mesh. Kanonischer Codebegriff: EventMesh.",
    "practicalExample": "„EventMesh“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Entkoppelte Ereignisarchitektur zur Verteilung und Nachverfolgung fachlicher Zustandsänderungen.",
    "searchTags": [
      "EventMesh",
      "Event Mesh",
      "EventMesh",
      "Event Mesh",
      "EventMesh",
      "event mesh"
    ],
    "thesaurus": [
      "Event Mesh",
      "EventMesh",
      "event mesh"
    ]
  },
  {
    "id": "capital-jetstream",
    "term": "NATS JetStream",
    "abbreviation": "JetStream",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Persistente NATS-Streaming-Schicht für bestätigte Zustellung, Replay und Recovery von Ereignissen.",
    "detailedExplanation": "Persistente NATS-Streaming-Schicht für bestätigte Zustellung, Replay und Recovery von Ereignissen. Englische Entsprechung: JetStream. Kanonischer Codebegriff: NATSJetStream.",
    "practicalExample": "„NATS JetStream“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Persistente NATS-Streaming-Schicht für bestätigte Zustellung, Replay und Recovery von Ereignissen.",
    "searchTags": [
      "NATS JetStream",
      "JetStream",
      "NATSJetStream",
      "JetStream",
      "NATSJetStream",
      "NATSJet Stream"
    ],
    "thesaurus": [
      "JetStream",
      "NATSJetStream",
      "NATSJet Stream"
    ]
  },
  {
    "id": "capital-valkey",
    "term": "Valkey / Redis",
    "abbreviation": "Valkey/Redis",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "In-Memory-Datenspeicher und Pub/Sub-Schicht für kurzlebige Cache- und Fan-out-Anwendungsfälle.",
    "detailedExplanation": "In-Memory-Datenspeicher und Pub/Sub-Schicht für kurzlebige Cache- und Fan-out-Anwendungsfälle. Englische Entsprechung: Valkey/Redis. Kanonischer Codebegriff: ValkeyRedis.",
    "practicalExample": "„Valkey / Redis“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "In-Memory-Datenspeicher und Pub/Sub-Schicht für kurzlebige Cache- und Fan-out-Anwendungsfälle.",
    "searchTags": [
      "Valkey / Redis",
      "Valkey/Redis",
      "ValkeyRedis",
      "Valkey/Redis",
      "ValkeyRedis",
      "Valkey Redis"
    ],
    "thesaurus": [
      "Valkey/Redis",
      "ValkeyRedis",
      "Valkey Redis"
    ]
  },
  {
    "id": "capital-sha256-digest",
    "term": "SHA-256 Digest",
    "abbreviation": "SHA-256 digest",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Kryptographischer Hash zur Integritäts- und Identitätsbindung von Artefakten, Snapshots und Evidence.",
    "detailedExplanation": "Kryptographischer Hash zur Integritäts- und Identitätsbindung von Artefakten, Snapshots und Evidence. Englische Entsprechung: SHA-256 digest. Kanonischer Codebegriff: Sha256Digest.",
    "practicalExample": "„SHA-256 Digest“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kryptographischer Hash zur Integritäts- und Identitätsbindung von Artefakten, Snapshots und Evidence.",
    "searchTags": [
      "SHA-256 Digest",
      "SHA-256 digest",
      "Sha256Digest",
      "SHA-256 digest",
      "Sha256Digest",
      "Sha256 Digest"
    ],
    "thesaurus": [
      "SHA-256 digest",
      "Sha256Digest",
      "Sha256 Digest"
    ]
  },
  {
    "id": "capital-container-evidence-identity",
    "term": "Container Evidence Identity",
    "abbreviation": "Container evidence identity",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Nachweisbare Identität eines Container-Artefakts einschließlich gebundener Build- und Digest-Metadaten.",
    "detailedExplanation": "Nachweisbare Identität eines Container-Artefakts einschließlich gebundener Build- und Digest-Metadaten. Englische Entsprechung: Container evidence identity. Kanonischer Codebegriff: ContainerEvidenceIdentity.",
    "practicalExample": "„Container Evidence Identity“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Nachweisbare Identität eines Container-Artefakts einschließlich gebundener Build- und Digest-Metadaten.",
    "searchTags": [
      "Container Evidence Identity",
      "Container evidence identity",
      "ContainerEvidenceIdentity",
      "Container evidence identity",
      "ContainerEvidenceIdentity",
      "Container Evidence Identity"
    ],
    "thesaurus": [
      "Container evidence identity",
      "ContainerEvidenceIdentity",
      "Container Evidence Identity"
    ]
  },
  {
    "id": "capital-sbom",
    "term": "SBOM",
    "abbreviation": "Software Bill of Materials",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Maschinenlesbares Inventar der Softwarekomponenten und Abhängigkeiten eines Artefakts.",
    "detailedExplanation": "Maschinenlesbares Inventar der Softwarekomponenten und Abhängigkeiten eines Artefakts. Englische Entsprechung: Software Bill of Materials. Kanonischer Codebegriff: SoftwareBillOfMaterials.",
    "practicalExample": "„SBOM“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Maschinenlesbares Inventar der Softwarekomponenten und Abhängigkeiten eines Artefakts.",
    "searchTags": [
      "SBOM",
      "Software Bill of Materials",
      "SoftwareBillOfMaterials",
      "Software Bill of Materials",
      "SoftwareBillOfMaterials",
      "Software Bill Of Materials"
    ],
    "thesaurus": [
      "Software Bill of Materials",
      "SoftwareBillOfMaterials",
      "Software Bill Of Materials"
    ]
  },
  {
    "id": "capital-vulnerability-reachability",
    "term": "Vulnerability Reachability",
    "abbreviation": "Schwachstellen-Erreichbarkeit",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Bewertung, ob eine bekannte Schwachstelle über den tatsächlich gebauten oder ausgeführten Codepfad erreichbar ist.",
    "detailedExplanation": "Bewertung, ob eine bekannte Schwachstelle über den tatsächlich gebauten oder ausgeführten Codepfad erreichbar ist. Englische Entsprechung: Schwachstellen-Erreichbarkeit. Kanonischer Codebegriff: VulnerabilityReachability.",
    "practicalExample": "„Vulnerability Reachability“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Bewertung, ob eine bekannte Schwachstelle über den tatsächlich gebauten oder ausgeführten Codepfad erreichbar ist.",
    "searchTags": [
      "Vulnerability Reachability",
      "Schwachstellen-Erreichbarkeit",
      "VulnerabilityReachability",
      "Schwachstellen-Erreichbarkeit",
      "VulnerabilityReachability",
      "Vulnerability Reachability"
    ],
    "thesaurus": [
      "Schwachstellen-Erreichbarkeit",
      "VulnerabilityReachability",
      "Vulnerability Reachability"
    ]
  },
  {
    "id": "capital-trivy",
    "term": "Trivy Scan",
    "abbreviation": "Trivy vulnerability scan",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Automatisierter Scan von Images, Paketen oder Artefakten auf bekannte Schwachstellen und Fehlkonfigurationen.",
    "detailedExplanation": "Automatisierter Scan von Images, Paketen oder Artefakten auf bekannte Schwachstellen und Fehlkonfigurationen. Englische Entsprechung: Trivy vulnerability scan. Kanonischer Codebegriff: TrivyScan.",
    "practicalExample": "„Trivy Scan“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Automatisierter Scan von Images, Paketen oder Artefakten auf bekannte Schwachstellen und Fehlkonfigurationen.",
    "searchTags": [
      "Trivy Scan",
      "Trivy vulnerability scan",
      "TrivyScan",
      "Trivy vulnerability scan",
      "TrivyScan",
      "Trivy Scan"
    ],
    "thesaurus": [
      "Trivy vulnerability scan",
      "TrivyScan",
      "Trivy Scan"
    ]
  },
  {
    "id": "capital-readonly-runtime",
    "term": "Read-only Runtime",
    "abbreviation": "Read-only runtime",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Gehärtete Laufzeit, in der das Dateisystem des Containers standardmäßig nicht beschreibbar ist.",
    "detailedExplanation": "Gehärtete Laufzeit, in der das Dateisystem des Containers standardmäßig nicht beschreibbar ist. Englische Entsprechung: Read-only runtime. Kanonischer Codebegriff: ReadOnlyRuntime.",
    "practicalExample": "„Read-only Runtime“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Gehärtete Laufzeit, in der das Dateisystem des Containers standardmäßig nicht beschreibbar ist.",
    "searchTags": [
      "Read-only Runtime",
      "Read-only runtime",
      "ReadOnlyRuntime",
      "Read-only runtime",
      "ReadOnlyRuntime",
      "Read Only Runtime"
    ],
    "thesaurus": [
      "Read-only runtime",
      "ReadOnlyRuntime",
      "Read Only Runtime"
    ]
  },
  {
    "id": "capital-no-new-privileges",
    "term": "No New Privileges",
    "abbreviation": "no-new-privileges",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Runtime-Sicherheitsgrenze, die verhindert, dass Prozesse zusätzliche Privilegien durch Ausführung erhalten.",
    "detailedExplanation": "Runtime-Sicherheitsgrenze, die verhindert, dass Prozesse zusätzliche Privilegien durch Ausführung erhalten. Englische Entsprechung: no-new-privileges. Kanonischer Codebegriff: NoNewPrivileges.",
    "practicalExample": "„No New Privileges“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Runtime-Sicherheitsgrenze, die verhindert, dass Prozesse zusätzliche Privilegien durch Ausführung erhalten.",
    "searchTags": [
      "No New Privileges",
      "no-new-privileges",
      "NoNewPrivileges",
      "no-new-privileges",
      "NoNewPrivileges",
      "No New Privileges"
    ],
    "thesaurus": [
      "no-new-privileges",
      "NoNewPrivileges",
      "No New Privileges"
    ]
  },
  {
    "id": "capital-capability-drop",
    "term": "Capability Drop",
    "abbreviation": "Linux capability drop",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Entfernung nicht benötigter Linux-Capabilities aus einem Container zur Reduzierung der Angriffsfläche.",
    "detailedExplanation": "Entfernung nicht benötigter Linux-Capabilities aus einem Container zur Reduzierung der Angriffsfläche. Englische Entsprechung: Linux capability drop. Kanonischer Codebegriff: CapabilityDrop.",
    "practicalExample": "„Capability Drop“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Entfernung nicht benötigter Linux-Capabilities aus einem Container zur Reduzierung der Angriffsfläche.",
    "searchTags": [
      "Capability Drop",
      "Linux capability drop",
      "CapabilityDrop",
      "Linux capability drop",
      "CapabilityDrop",
      "Capability Drop"
    ],
    "thesaurus": [
      "Linux capability drop",
      "CapabilityDrop",
      "Capability Drop"
    ]
  },
  {
    "id": "capital-liveness",
    "term": "Liveness Endpoint",
    "abbreviation": "Liveness probe",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Technischer Health-Endpunkt zur Feststellung, ob ein Dienstprozess grundsätzlich lebt.",
    "detailedExplanation": "Technischer Health-Endpunkt zur Feststellung, ob ein Dienstprozess grundsätzlich lebt. Englische Entsprechung: Liveness probe. Kanonischer Codebegriff: LivenessEndpoint.",
    "practicalExample": "„Liveness Endpoint“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Technischer Health-Endpunkt zur Feststellung, ob ein Dienstprozess grundsätzlich lebt.",
    "searchTags": [
      "Liveness Endpoint",
      "Liveness probe",
      "LivenessEndpoint",
      "Liveness probe",
      "LivenessEndpoint",
      "Liveness Endpoint"
    ],
    "thesaurus": [
      "Liveness probe",
      "LivenessEndpoint",
      "Liveness Endpoint"
    ]
  },
  {
    "id": "capital-readiness",
    "term": "Readiness Endpoint",
    "abbreviation": "Readiness probe",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Health-Endpunkt zur Feststellung, ob ein Dienst für produktiven Traffic bereit ist.",
    "detailedExplanation": "Health-Endpunkt zur Feststellung, ob ein Dienst für produktiven Traffic bereit ist. Englische Entsprechung: Readiness probe. Kanonischer Codebegriff: ReadinessEndpoint.",
    "practicalExample": "„Readiness Endpoint“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Health-Endpunkt zur Feststellung, ob ein Dienst für produktiven Traffic bereit ist.",
    "searchTags": [
      "Readiness Endpoint",
      "Readiness probe",
      "ReadinessEndpoint",
      "Readiness probe",
      "ReadinessEndpoint",
      "Readiness Endpoint"
    ],
    "thesaurus": [
      "Readiness probe",
      "ReadinessEndpoint",
      "Readiness Endpoint"
    ]
  },
  {
    "id": "capital-supabase-auth-readback",
    "term": "Supabase Auth Readback",
    "abbreviation": "Supabase auth readback",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Read-only Rücklesepfad für verifizierbare Supabase-Auth-, Session- und Provider-Konfiguration ohne Secret-Ausgabe.",
    "detailedExplanation": "Read-only Rücklesepfad für verifizierbare Supabase-Auth-, Session- und Provider-Konfiguration ohne Secret-Ausgabe. Englische Entsprechung: Supabase auth readback. Kanonischer Codebegriff: SupabaseAuthReadback.",
    "practicalExample": "„Supabase Auth Readback“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Read-only Rücklesepfad für verifizierbare Supabase-Auth-, Session- und Provider-Konfiguration ohne Secret-Ausgabe.",
    "searchTags": [
      "Supabase Auth Readback",
      "Supabase auth readback",
      "SupabaseAuthReadback",
      "Supabase auth readback",
      "SupabaseAuthReadback",
      "Supabase Auth Readback"
    ],
    "thesaurus": [
      "Supabase auth readback",
      "SupabaseAuthReadback",
      "Supabase Auth Readback"
    ]
  },
  {
    "id": "capital-supabase-hardening",
    "term": "Supabase Hardening",
    "abbreviation": "Supabase security hardening",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Absicherung der Supabase-Nutzung durch restriktive Auth-, Datenbank-, Secret- und Zugriffskontrollen.",
    "detailedExplanation": "Absicherung der Supabase-Nutzung durch restriktive Auth-, Datenbank-, Secret- und Zugriffskontrollen. Englische Entsprechung: Supabase security hardening. Kanonischer Codebegriff: SupabaseHardening.",
    "practicalExample": "„Supabase Hardening“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Absicherung der Supabase-Nutzung durch restriktive Auth-, Datenbank-, Secret- und Zugriffskontrollen.",
    "searchTags": [
      "Supabase Hardening",
      "Supabase security hardening",
      "SupabaseHardening",
      "Supabase security hardening",
      "SupabaseHardening",
      "Supabase Hardening"
    ],
    "thesaurus": [
      "Supabase security hardening",
      "SupabaseHardening",
      "Supabase Hardening"
    ]
  },
  {
    "id": "capital-provider-rights",
    "term": "Provider Rights Eligibility",
    "abbreviation": "Provider rights eligibility",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Fail-closed Prüfung, ob Software-, Daten-, Anzeige-, Weiterverarbeitungs- und Produktrechte für einen Provider-Nutzungspfad ausreichen.",
    "detailedExplanation": "Fail-closed Prüfung, ob Software-, Daten-, Anzeige-, Weiterverarbeitungs- und Produktrechte für einen Provider-Nutzungspfad ausreichen. Englische Entsprechung: Provider rights eligibility. Kanonischer Codebegriff: ProviderRightsEligibility.",
    "practicalExample": "„Provider Rights Eligibility“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Fail-closed Prüfung, ob Software-, Daten-, Anzeige-, Weiterverarbeitungs- und Produktrechte für einen Provider-Nutzungspfad ausreichen.",
    "searchTags": [
      "Provider Rights Eligibility",
      "Provider rights eligibility",
      "ProviderRightsEligibility",
      "Provider rights eligibility",
      "ProviderRightsEligibility",
      "Provider Rights Eligibility"
    ],
    "thesaurus": [
      "Provider rights eligibility",
      "ProviderRightsEligibility",
      "Provider Rights Eligibility"
    ]
  },
  {
    "id": "capital-documentary-evidence",
    "term": "Documentary Evidence",
    "abbreviation": "Dokumentarische Evidence",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Strukturierter dokumentarischer Nachweis eines verifizierten technischen, Governance- oder Release-Zustands.",
    "detailedExplanation": "Strukturierter dokumentarischer Nachweis eines verifizierten technischen, Governance- oder Release-Zustands. Englische Entsprechung: Dokumentarische Evidence. Kanonischer Codebegriff: DocumentaryEvidence.",
    "practicalExample": "„Documentary Evidence“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Strukturierter dokumentarischer Nachweis eines verifizierten technischen, Governance- oder Release-Zustands.",
    "searchTags": [
      "Documentary Evidence",
      "Dokumentarische Evidence",
      "DocumentaryEvidence",
      "Dokumentarische Evidence",
      "DocumentaryEvidence",
      "Documentary Evidence"
    ],
    "thesaurus": [
      "Dokumentarische Evidence",
      "DocumentaryEvidence",
      "Documentary Evidence"
    ]
  },
  {
    "id": "capital-claim-evidence",
    "term": "Claim-Evidence Binding",
    "abbreviation": "Claim evidence binding",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Verknüpfung einer öffentlichen oder internen Aussage mit dem konkreten Nachweis, der diese Aussage trägt.",
    "detailedExplanation": "Verknüpfung einer öffentlichen oder internen Aussage mit dem konkreten Nachweis, der diese Aussage trägt. Englische Entsprechung: Claim evidence binding. Kanonischer Codebegriff: ClaimEvidenceBinding.",
    "practicalExample": "„Claim-Evidence Binding“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Verknüpfung einer öffentlichen oder internen Aussage mit dem konkreten Nachweis, der diese Aussage trägt.",
    "searchTags": [
      "Claim-Evidence Binding",
      "Claim evidence binding",
      "ClaimEvidenceBinding",
      "Claim evidence binding",
      "ClaimEvidenceBinding",
      "Claim Evidence Binding"
    ],
    "thesaurus": [
      "Claim evidence binding",
      "ClaimEvidenceBinding",
      "Claim Evidence Binding"
    ]
  },
  {
    "id": "capital-cost-evidence",
    "term": "Cost Evidence",
    "abbreviation": "Kosten-Evidence",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Nachweisbare Kosten- und Budgetinformation zur Bewertung eines technischen oder produktiven Nutzungspfads.",
    "detailedExplanation": "Nachweisbare Kosten- und Budgetinformation zur Bewertung eines technischen oder produktiven Nutzungspfads. Englische Entsprechung: Kosten-Evidence. Kanonischer Codebegriff: CostEvidence.",
    "practicalExample": "„Cost Evidence“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Nachweisbare Kosten- und Budgetinformation zur Bewertung eines technischen oder produktiven Nutzungspfads.",
    "searchTags": [
      "Cost Evidence",
      "Kosten-Evidence",
      "CostEvidence",
      "Kosten-Evidence",
      "CostEvidence",
      "Cost Evidence"
    ],
    "thesaurus": [
      "Kosten-Evidence",
      "CostEvidence",
      "Cost Evidence"
    ]
  },
  {
    "id": "capital-change-propagation",
    "term": "Change Propagation",
    "abbreviation": "Änderungspropagierung",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Kontrollierte Weitergabe einer Änderung und ihrer Auswirkungen über betroffene Projekt-, Vertrags- und Dokumentationsgrenzen.",
    "detailedExplanation": "Kontrollierte Weitergabe einer Änderung und ihrer Auswirkungen über betroffene Projekt-, Vertrags- und Dokumentationsgrenzen. Englische Entsprechung: Änderungspropagierung. Kanonischer Codebegriff: ChangePropagation.",
    "practicalExample": "„Change Propagation“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kontrollierte Weitergabe einer Änderung und ihrer Auswirkungen über betroffene Projekt-, Vertrags- und Dokumentationsgrenzen.",
    "searchTags": [
      "Change Propagation",
      "Änderungspropagierung",
      "ChangePropagation",
      "Änderungspropagierung",
      "ChangePropagation",
      "Change Propagation"
    ],
    "thesaurus": [
      "Änderungspropagierung",
      "ChangePropagation",
      "Change Propagation"
    ]
  },
  {
    "id": "capital-release-candidate",
    "term": "Release Candidate",
    "abbreviation": "Freigabekandidat",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Gebundener Softwarestand, der alle vorgesehenen Prüfungen durchlaufen soll, aber noch nicht als Release freigegeben ist.",
    "detailedExplanation": "Gebundener Softwarestand, der alle vorgesehenen Prüfungen durchlaufen soll, aber noch nicht als Release freigegeben ist. Englische Entsprechung: Freigabekandidat. Kanonischer Codebegriff: ReleaseCandidate.",
    "practicalExample": "„Release Candidate“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Gebundener Softwarestand, der alle vorgesehenen Prüfungen durchlaufen soll, aber noch nicht als Release freigegeben ist.",
    "searchTags": [
      "Release Candidate",
      "Freigabekandidat",
      "ReleaseCandidate",
      "Freigabekandidat",
      "ReleaseCandidate",
      "Release Candidate"
    ],
    "thesaurus": [
      "Freigabekandidat",
      "ReleaseCandidate",
      "Release Candidate"
    ]
  },
  {
    "id": "capital-post-merge-correlation",
    "term": "Post-Merge Correlation",
    "abbreviation": "Post-merge correlation",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Abgleich nach einem Merge, ob Branch-, Runtime-, Evidence- und Dokumentationszustände weiterhin konsistent sind.",
    "detailedExplanation": "Abgleich nach einem Merge, ob Branch-, Runtime-, Evidence- und Dokumentationszustände weiterhin konsistent sind. Englische Entsprechung: Post-merge correlation. Kanonischer Codebegriff: PostMergeCorrelation.",
    "practicalExample": "„Post-Merge Correlation“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Abgleich nach einem Merge, ob Branch-, Runtime-, Evidence- und Dokumentationszustände weiterhin konsistent sind.",
    "searchTags": [
      "Post-Merge Correlation",
      "Post-merge correlation",
      "PostMergeCorrelation",
      "Post-merge correlation",
      "PostMergeCorrelation",
      "Post Merge Correlation"
    ],
    "thesaurus": [
      "Post-merge correlation",
      "PostMergeCorrelation",
      "Post Merge Correlation"
    ]
  },
  {
    "id": "capital-dependency-watch",
    "term": "Dependency Security Watch",
    "abbreviation": "Dependency security watch",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Wiederkehrende Prüfung von Abhängigkeiten auf neue Security-Findings und notwendige Remediation.",
    "detailedExplanation": "Wiederkehrende Prüfung von Abhängigkeiten auf neue Security-Findings und notwendige Remediation. Englische Entsprechung: Dependency security watch. Kanonischer Codebegriff: DependencySecurityWatch.",
    "practicalExample": "„Dependency Security Watch“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Wiederkehrende Prüfung von Abhängigkeiten auf neue Security-Findings und notwendige Remediation.",
    "searchTags": [
      "Dependency Security Watch",
      "Dependency security watch",
      "DependencySecurityWatch",
      "Dependency security watch",
      "DependencySecurityWatch",
      "Dependency Security Watch"
    ],
    "thesaurus": [
      "Dependency security watch",
      "DependencySecurityWatch",
      "Dependency Security Watch"
    ]
  },
  {
    "id": "capital-production-handoff",
    "term": "Production Handoff",
    "abbreviation": "Produktionsübergabe",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Kontrollierte Übergabe eines verifizierten Lieferstands an den zuständigen Produktions- oder Operations-Scope.",
    "detailedExplanation": "Kontrollierte Übergabe eines verifizierten Lieferstands an den zuständigen Produktions- oder Operations-Scope. Englische Entsprechung: Produktionsübergabe. Kanonischer Codebegriff: ProductionHandoff.",
    "practicalExample": "„Production Handoff“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kontrollierte Übergabe eines verifizierten Lieferstands an den zuständigen Produktions- oder Operations-Scope.",
    "searchTags": [
      "Production Handoff",
      "Produktionsübergabe",
      "ProductionHandoff",
      "Produktionsübergabe",
      "ProductionHandoff",
      "Production Handoff"
    ],
    "thesaurus": [
      "Produktionsübergabe",
      "ProductionHandoff",
      "Production Handoff"
    ]
  },
  {
    "id": "finance-voc-product-0101",
    "term": "Anfrageeingang",
    "abbreviation": "Request intake",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Kontrollierter Eingang einer Analyse- oder Produktanfrage.",
    "detailedExplanation": "Kontrollierter Eingang einer Analyse- oder Produktanfrage. Englische Entsprechung: Request intake. Kanonischer Codebegriff: RequestIntake.",
    "practicalExample": "„Anfrageeingang“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kontrollierter Eingang einer Analyse- oder Produktanfrage.",
    "searchTags": [
      "Anfrageeingang",
      "Request intake",
      "RequestIntake",
      "Request intake",
      "RequestIntake",
      "Request Intake"
    ],
    "thesaurus": [
      "Request intake",
      "RequestIntake",
      "Request Intake"
    ]
  },
  {
    "id": "finance-voc-iam-0101",
    "term": "Identität und Zugriff",
    "abbreviation": "Identity and access",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Authentifizierte Identität und autorisierter Zugriff auf CAPITAL-AI Funktionen.",
    "detailedExplanation": "Authentifizierte Identität und autorisierter Zugriff auf CAPITAL-AI Funktionen. Englische Entsprechung: Identity and access. Kanonischer Codebegriff: IdentityAccess.",
    "practicalExample": "„Identität und Zugriff“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Authentifizierte Identität und autorisierter Zugriff auf CAPITAL-AI Funktionen.",
    "searchTags": [
      "Identität und Zugriff",
      "Identity and access",
      "IdentityAccess",
      "Identity and access",
      "IdentityAccess",
      "Identity Access"
    ],
    "thesaurus": [
      "Identity and access",
      "IdentityAccess",
      "Identity Access"
    ]
  },
  {
    "id": "finance-voc-architecture-0101",
    "term": "Runtime Guard",
    "abbreviation": "Runtime guard",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Fail-closed Laufzeitgrenze vor der fachlichen Orchestrierung und Provider-Nutzung.",
    "detailedExplanation": "Fail-closed Laufzeitgrenze vor der fachlichen Orchestrierung und Provider-Nutzung. Englische Entsprechung: Runtime guard. Kanonischer Codebegriff: RuntimeGuard.",
    "practicalExample": "„Runtime Guard“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Fail-closed Laufzeitgrenze vor der fachlichen Orchestrierung und Provider-Nutzung.",
    "searchTags": [
      "Runtime Guard",
      "Runtime guard",
      "RuntimeGuard",
      "Runtime guard",
      "RuntimeGuard",
      "Runtime Guard"
    ],
    "thesaurus": [
      "Runtime guard",
      "RuntimeGuard",
      "Runtime Guard"
    ]
  },
  {
    "id": "finance-voc-product-0102",
    "term": "Verifizierte Research-Darstellung",
    "abbreviation": "Verified research display",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Read-only Darstellung bereits validierter Research- und Evidence-Zustände.",
    "detailedExplanation": "Read-only Darstellung bereits validierter Research- und Evidence-Zustände. Englische Entsprechung: Verified research display. Kanonischer Codebegriff: VerifiedResearchDisplay.",
    "practicalExample": "„Verifizierte Research-Darstellung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Read-only Darstellung bereits validierter Research- und Evidence-Zustände.",
    "searchTags": [
      "Verifizierte Research-Darstellung",
      "Verified research display",
      "VerifiedResearchDisplay",
      "Verified research display",
      "VerifiedResearchDisplay",
      "Verified Research Display"
    ],
    "thesaurus": [
      "Verified research display",
      "VerifiedResearchDisplay",
      "Verified Research Display"
    ]
  },
  {
    "id": "finance-voc-architecture-0102",
    "term": "Scoring Dispatcher",
    "abbreviation": "Scoring dispatcher",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Zentrale Dispatch-Grenze für die Auswahl des zulässigen Scoring-Ausführungspfads.",
    "detailedExplanation": "Zentrale Dispatch-Grenze für die Auswahl des zulässigen Scoring-Ausführungspfads. Englische Entsprechung: Scoring dispatcher. Kanonischer Codebegriff: ScoringDispatcher.",
    "practicalExample": "„Scoring Dispatcher“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Zentrale Dispatch-Grenze für die Auswahl des zulässigen Scoring-Ausführungspfads.",
    "searchTags": [
      "Scoring Dispatcher",
      "Scoring dispatcher",
      "ScoringDispatcher",
      "Scoring dispatcher",
      "ScoringDispatcher",
      "Scoring Dispatcher"
    ],
    "thesaurus": [
      "Scoring dispatcher",
      "ScoringDispatcher",
      "Scoring Dispatcher"
    ]
  },
  {
    "id": "finance-voc-architecture-0103",
    "term": "Domain-Executor-Adapter",
    "abbreviation": "Domain executor adapter",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Adaptergrenze zwischen Dispatcher und domänenspezifischer Scoring-Ausführung.",
    "detailedExplanation": "Adaptergrenze zwischen Dispatcher und domänenspezifischer Scoring-Ausführung. Englische Entsprechung: Domain executor adapter. Kanonischer Codebegriff: DomainExecutorAdapter.",
    "practicalExample": "„Domain-Executor-Adapter“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Adaptergrenze zwischen Dispatcher und domänenspezifischer Scoring-Ausführung.",
    "searchTags": [
      "Domain-Executor-Adapter",
      "Domain executor adapter",
      "DomainExecutorAdapter",
      "Domain executor adapter",
      "DomainExecutorAdapter",
      "Domain Executor Adapter"
    ],
    "thesaurus": [
      "Domain executor adapter",
      "DomainExecutorAdapter",
      "Domain Executor Adapter"
    ]
  },
  {
    "id": "finance-voc-platform-0101",
    "term": "Traceability und Supervisor",
    "abbreviation": "Traceability and supervisor",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Cross-cutting Evidence-, Traceability- und Supervisor-Kontext ohne fachliche Mutationsauthority.",
    "detailedExplanation": "Cross-cutting Evidence-, Traceability- und Supervisor-Kontext ohne fachliche Mutationsauthority. Englische Entsprechung: Traceability and supervisor. Kanonischer Codebegriff: TraceabilitySupervisor.",
    "practicalExample": "„Traceability und Supervisor“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Cross-cutting Evidence-, Traceability- und Supervisor-Kontext ohne fachliche Mutationsauthority.",
    "searchTags": [
      "Traceability und Supervisor",
      "Traceability and supervisor",
      "TraceabilitySupervisor",
      "Traceability and supervisor",
      "TraceabilitySupervisor",
      "Traceability Supervisor"
    ],
    "thesaurus": [
      "Traceability and supervisor",
      "TraceabilitySupervisor",
      "Traceability Supervisor"
    ]
  },
  {
    "id": "finance-voc-product-0103",
    "term": "Ausgabeoberfläche",
    "abbreviation": "Delivery surface",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Benutzer- oder systemseitige Ausgabeoberfläche für bereits autorisierte Ergebnisse.",
    "detailedExplanation": "Benutzer- oder systemseitige Ausgabeoberfläche für bereits autorisierte Ergebnisse. Englische Entsprechung: Delivery surface. Kanonischer Codebegriff: DeliverySurface.",
    "practicalExample": "„Ausgabeoberfläche“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Benutzer- oder systemseitige Ausgabeoberfläche für bereits autorisierte Ergebnisse.",
    "searchTags": [
      "Ausgabeoberfläche",
      "Delivery surface",
      "DeliverySurface",
      "Delivery surface",
      "DeliverySurface",
      "Delivery Surface"
    ],
    "thesaurus": [
      "Delivery surface",
      "DeliverySurface",
      "Delivery Surface"
    ]
  },
  {
    "id": "finance-voc-aidev-0001",
    "term": "Vorabprüfung",
    "abbreviation": "Pre-check",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Vor der Änderung ausgeführte Prüfung von Scope, Baseline, Sicherheit, Compliance, Reuse und relevanter Best Practice.",
    "detailedExplanation": "Vor der Änderung ausgeführte Prüfung von Scope, Baseline, Sicherheit, Compliance, Reuse und relevanter Best Practice. Englische Entsprechung: Pre-check. Kanonischer Codebegriff: PreCheck.",
    "practicalExample": "„Vorabprüfung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Vor der Änderung ausgeführte Prüfung von Scope, Baseline, Sicherheit, Compliance, Reuse und relevanter Best Practice.",
    "searchTags": [
      "Vorabprüfung",
      "Pre-check",
      "PreCheck",
      "Pre-check",
      "PreCheck",
      "Pre Check"
    ],
    "thesaurus": [
      "Pre-check",
      "PreCheck",
      "Pre Check"
    ]
  },
  {
    "id": "finance-voc-aidev-0002",
    "term": "Aktuelle Main-Baseline",
    "abbreviation": "Current main baseline",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Exakter aktueller Stand des Main-Branches, gegen den Arbeit korreliert und gestartet wird.",
    "detailedExplanation": "Exakter aktueller Stand des Main-Branches, gegen den Arbeit korreliert und gestartet wird. Englische Entsprechung: Current main baseline. Kanonischer Codebegriff: CurrentMainBaseline.",
    "practicalExample": "„Aktuelle Main-Baseline“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Exakter aktueller Stand des Main-Branches, gegen den Arbeit korreliert und gestartet wird.",
    "searchTags": [
      "Aktuelle Main-Baseline",
      "Current main baseline",
      "CurrentMainBaseline",
      "Current main baseline",
      "CurrentMainBaseline",
      "Current Main Baseline"
    ],
    "thesaurus": [
      "Current main baseline",
      "CurrentMainBaseline",
      "Current Main Baseline"
    ]
  },
  {
    "id": "finance-voc-aidev-0003",
    "term": "Korrelation",
    "abbreviation": "Correlation",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Abgleich eines Arbeitsstands mit Repository-, Authority-, Ownership- und Parallel-Writer-Zuständen.",
    "detailedExplanation": "Abgleich eines Arbeitsstands mit Repository-, Authority-, Ownership- und Parallel-Writer-Zuständen. Englische Entsprechung: Correlation. Kanonischer Codebegriff: Correlation.",
    "practicalExample": "„Korrelation“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Abgleich eines Arbeitsstands mit Repository-, Authority-, Ownership- und Parallel-Writer-Zuständen.",
    "searchTags": [
      "Korrelation",
      "Correlation",
      "Correlation",
      "Correlation",
      "correlation",
      "CORRELATION"
    ],
    "thesaurus": [
      "Correlation",
      "correlation",
      "CORRELATION"
    ]
  },
  {
    "id": "finance-voc-aidev-0004",
    "term": "Re-Korrelation",
    "abbreviation": "Re-correlation",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Erneuter vollständiger Correlation-Abgleich nach relevanter Zustandsänderung.",
    "detailedExplanation": "Erneuter vollständiger Correlation-Abgleich nach relevanter Zustandsänderung. Englische Entsprechung: Re-correlation. Kanonischer Codebegriff: ReCorrelation.",
    "practicalExample": "„Re-Korrelation“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Erneuter vollständiger Correlation-Abgleich nach relevanter Zustandsänderung.",
    "searchTags": [
      "Re-Korrelation",
      "Re-correlation",
      "ReCorrelation",
      "Re-correlation",
      "ReCorrelation",
      "Re Correlation"
    ],
    "thesaurus": [
      "Re-correlation",
      "ReCorrelation",
      "Re Correlation"
    ]
  },
  {
    "id": "finance-voc-aidev-0005",
    "term": "Main-Re-Sync",
    "abbreviation": "Main re-sync",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Synchronisierung eines Scoped Branch mit dem dann aktuellen Main vor einem Gate.",
    "detailedExplanation": "Synchronisierung eines Scoped Branch mit dem dann aktuellen Main vor einem Gate. Englische Entsprechung: Main re-sync. Kanonischer Codebegriff: MainResync.",
    "practicalExample": "„Main-Re-Sync“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Synchronisierung eines Scoped Branch mit dem dann aktuellen Main vor einem Gate.",
    "searchTags": [
      "Main-Re-Sync",
      "Main re-sync",
      "MainResync",
      "Main re-sync",
      "MainResync",
      "Main Resync"
    ],
    "thesaurus": [
      "Main re-sync",
      "MainResync",
      "Main Resync"
    ]
  },
  {
    "id": "finance-voc-aidev-0006",
    "term": "Scope-begrenzter Branch",
    "abbreviation": "Scoped branch",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Branch mit genau abgegrenztem Projekt- und Arbeitsumfang, erstellt aus current main.",
    "detailedExplanation": "Branch mit genau abgegrenztem Projekt- und Arbeitsumfang, erstellt aus current main. Englische Entsprechung: Scoped branch. Kanonischer Codebegriff: ScopedBranch.",
    "practicalExample": "„Scope-begrenzter Branch“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Branch mit genau abgegrenztem Projekt- und Arbeitsumfang, erstellt aus current main.",
    "searchTags": [
      "Scope-begrenzter Branch",
      "Scoped branch",
      "ScopedBranch",
      "Scoped branch",
      "ScopedBranch",
      "Scoped Branch"
    ],
    "thesaurus": [
      "Scoped branch",
      "ScopedBranch",
      "Scoped Branch"
    ]
  },
  {
    "id": "finance-voc-aidev-0007",
    "term": "Arbeitspaket",
    "abbreviation": "Work package",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Zusammengehöriger, klar abgegrenzter Lieferumfang mit definiertem Exit Gate.",
    "detailedExplanation": "Zusammengehöriger, klar abgegrenzter Lieferumfang mit definiertem Exit Gate. Englische Entsprechung: Work package. Kanonischer Codebegriff: WorkPackage.",
    "practicalExample": "„Arbeitspaket“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Zusammengehöriger, klar abgegrenzter Lieferumfang mit definiertem Exit Gate.",
    "searchTags": [
      "Arbeitspaket",
      "Work package",
      "WorkPackage",
      "Work package",
      "WorkPackage",
      "Work Package"
    ],
    "thesaurus": [
      "Work package",
      "WorkPackage",
      "Work Package"
    ]
  },
  {
    "id": "finance-voc-aidev-0008",
    "term": "Atomare Änderung",
    "abbreviation": "Atomic change",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Kleinste sinnvoll unabhängig prüfbare Änderung mit einem klaren Zweck.",
    "detailedExplanation": "Kleinste sinnvoll unabhängig prüfbare Änderung mit einem klaren Zweck. Englische Entsprechung: Atomic change. Kanonischer Codebegriff: AtomicChange.",
    "practicalExample": "„Atomare Änderung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kleinste sinnvoll unabhängig prüfbare Änderung mit einem klaren Zweck.",
    "searchTags": [
      "Atomare Änderung",
      "Atomic change",
      "AtomicChange",
      "Atomic change",
      "AtomicChange",
      "Atomic Change"
    ],
    "thesaurus": [
      "Atomic change",
      "AtomicChange",
      "Atomic Change"
    ]
  },
  {
    "id": "finance-voc-aidev-0009",
    "term": "Changed-File-Overlap",
    "abbreviation": "Changed-file overlap",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Überschneidung von geänderten Dateipfaden zwischen parallelen Arbeitsständen.",
    "detailedExplanation": "Überschneidung von geänderten Dateipfaden zwischen parallelen Arbeitsständen. Englische Entsprechung: Changed-file overlap. Kanonischer Codebegriff: ChangedFileOverlap.",
    "practicalExample": "„Changed-File-Overlap“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Überschneidung von geänderten Dateipfaden zwischen parallelen Arbeitsständen.",
    "searchTags": [
      "Changed-File-Overlap",
      "Changed-file overlap",
      "ChangedFileOverlap",
      "Changed-file overlap",
      "ChangedFileOverlap",
      "Changed File Overlap"
    ],
    "thesaurus": [
      "Changed-file overlap",
      "ChangedFileOverlap",
      "Changed File Overlap"
    ]
  },
  {
    "id": "finance-voc-aidev-0010",
    "term": "Semantische Überschneidung",
    "abbreviation": "Semantic overlap",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Inhaltliche Überschneidung von Änderungen auch ohne identische Dateipfade.",
    "detailedExplanation": "Inhaltliche Überschneidung von Änderungen auch ohne identische Dateipfade. Englische Entsprechung: Semantic overlap. Kanonischer Codebegriff: SemanticOverlap.",
    "practicalExample": "„Semantische Überschneidung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Inhaltliche Überschneidung von Änderungen auch ohne identische Dateipfade.",
    "searchTags": [
      "Semantische Überschneidung",
      "Semantic overlap",
      "SemanticOverlap",
      "Semantic overlap",
      "SemanticOverlap",
      "Semantic Overlap"
    ],
    "thesaurus": [
      "Semantic overlap",
      "SemanticOverlap",
      "Semantic Overlap"
    ]
  },
  {
    "id": "finance-voc-aidev-0011",
    "term": "Writer-Overlap",
    "abbreviation": "Writer overlap",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Gleichzeitige Schreibzuständigkeit mehrerer aktiver Arbeitsstände für denselben geschützten Namespace oder Scope.",
    "detailedExplanation": "Gleichzeitige Schreibzuständigkeit mehrerer aktiver Arbeitsstände für denselben geschützten Namespace oder Scope. Englische Entsprechung: Writer overlap. Kanonischer Codebegriff: WriterOverlap.",
    "practicalExample": "„Writer-Overlap“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Gleichzeitige Schreibzuständigkeit mehrerer aktiver Arbeitsstände für denselben geschützten Namespace oder Scope.",
    "searchTags": [
      "Writer-Overlap",
      "Writer overlap",
      "WriterOverlap",
      "Writer overlap",
      "WriterOverlap",
      "Writer Overlap"
    ],
    "thesaurus": [
      "Writer overlap",
      "WriterOverlap",
      "Writer Overlap"
    ]
  },
  {
    "id": "finance-voc-aidev-0012",
    "term": "Authority",
    "abbreviation": "Authority",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Normative Entscheidungs- oder Regelungszuständigkeit mit definierter Scope-Grenze.",
    "detailedExplanation": "Normative Entscheidungs- oder Regelungszuständigkeit mit definierter Scope-Grenze. Englische Entsprechung: Authority. Kanonischer Codebegriff: Authority.",
    "practicalExample": "„Authority“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Normative Entscheidungs- oder Regelungszuständigkeit mit definierter Scope-Grenze.",
    "searchTags": [
      "Authority",
      "Authority",
      "Authority",
      "Authority",
      "authority",
      "AUTHORITY"
    ],
    "thesaurus": [
      "Authority",
      "authority",
      "AUTHORITY"
    ]
  },
  {
    "id": "finance-voc-aidev-0013",
    "term": "Primärer Owner",
    "abbreviation": "Primary owner",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Projekt oder Rolle mit primärer Zuständigkeit für den betreffenden Scope.",
    "detailedExplanation": "Projekt oder Rolle mit primärer Zuständigkeit für den betreffenden Scope. Englische Entsprechung: Primary owner. Kanonischer Codebegriff: PrimaryOwner.",
    "practicalExample": "„Primärer Owner“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Projekt oder Rolle mit primärer Zuständigkeit für den betreffenden Scope.",
    "searchTags": [
      "Primärer Owner",
      "Primary owner",
      "PrimaryOwner",
      "Primary owner",
      "PrimaryOwner",
      "Primary Owner"
    ],
    "thesaurus": [
      "Primary owner",
      "PrimaryOwner",
      "Primary Owner"
    ]
  },
  {
    "id": "finance-voc-aidev-0014",
    "term": "Fremdprojekt-Arbeit",
    "abbreviation": "Foreign project work",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Arbeit in einem Scope, dessen Primary Owner ein anderes Projekt ist.",
    "detailedExplanation": "Arbeit in einem Scope, dessen Primary Owner ein anderes Projekt ist. Englische Entsprechung: Foreign project work. Kanonischer Codebegriff: ForeignProjectWork.",
    "practicalExample": "„Fremdprojekt-Arbeit“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Arbeit in einem Scope, dessen Primary Owner ein anderes Projekt ist.",
    "searchTags": [
      "Fremdprojekt-Arbeit",
      "Foreign project work",
      "ForeignProjectWork",
      "Foreign project work",
      "ForeignProjectWork",
      "Foreign Project Work"
    ],
    "thesaurus": [
      "Foreign project work",
      "ForeignProjectWork",
      "Foreign Project Work"
    ]
  },
  {
    "id": "finance-voc-aidev-0015",
    "term": "Übergabe",
    "abbreviation": "Handoff",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Explizite Übergabe von Kontext, Scope, Evidence und offenen Gates an den zuständigen Owner.",
    "detailedExplanation": "Explizite Übergabe von Kontext, Scope, Evidence und offenen Gates an den zuständigen Owner. Englische Entsprechung: Handoff. Kanonischer Codebegriff: Handoff.",
    "practicalExample": "„Übergabe“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Explizite Übergabe von Kontext, Scope, Evidence und offenen Gates an den zuständigen Owner.",
    "searchTags": [
      "Übergabe",
      "Handoff",
      "Handoff",
      "Handoff",
      "handoff",
      "HANDOFF"
    ],
    "thesaurus": [
      "Handoff",
      "handoff",
      "HANDOFF"
    ]
  },
  {
    "id": "finance-voc-aidev-0016",
    "term": "Wiederverwendung",
    "abbreviation": "Reuse",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Bevorzugte Nutzung bestehender geeigneter Repository-, Plattform-, Plugin- oder Open-Source-Fähigkeiten statt paralleler Eigenimplementierung.",
    "detailedExplanation": "Bevorzugte Nutzung bestehender geeigneter Repository-, Plattform-, Plugin- oder Open-Source-Fähigkeiten statt paralleler Eigenimplementierung. Englische Entsprechung: Reuse. Kanonischer Codebegriff: Reuse.",
    "practicalExample": "„Wiederverwendung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Bevorzugte Nutzung bestehender geeigneter Repository-, Plattform-, Plugin- oder Open-Source-Fähigkeiten statt paralleler Eigenimplementierung.",
    "searchTags": [
      "Wiederverwendung",
      "Reuse",
      "Reuse",
      "Reuse",
      "reuse",
      "REUSE"
    ],
    "thesaurus": [
      "Reuse",
      "reuse",
      "REUSE"
    ]
  },
  {
    "id": "finance-voc-aidev-0017",
    "term": "Parallele Architektur",
    "abbreviation": "Parallel architecture",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Zusätzliche Architektur, Registry, Control Plane oder Runtime, die eine bereits kanonisch vorhandene Funktion dupliziert.",
    "detailedExplanation": "Zusätzliche Architektur, Registry, Control Plane oder Runtime, die eine bereits kanonisch vorhandene Funktion dupliziert. Englische Entsprechung: Parallel architecture. Kanonischer Codebegriff: ParallelArchitecture.",
    "practicalExample": "„Parallele Architektur“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Zusätzliche Architektur, Registry, Control Plane oder Runtime, die eine bereits kanonisch vorhandene Funktion dupliziert.",
    "searchTags": [
      "Parallele Architektur",
      "Parallel architecture",
      "ParallelArchitecture",
      "Parallel architecture",
      "ParallelArchitecture",
      "Parallel Architecture"
    ],
    "thesaurus": [
      "Parallel architecture",
      "ParallelArchitecture",
      "Parallel Architecture"
    ]
  },
  {
    "id": "finance-voc-aidev-0018",
    "term": "Strangler Pattern",
    "abbreviation": "Strangler pattern",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Schrittweise Ablösung einer bestehenden Implementierung durch kontrolliertes Umleiten auf neue Komponenten.",
    "detailedExplanation": "Schrittweise Ablösung einer bestehenden Implementierung durch kontrolliertes Umleiten auf neue Komponenten. Englische Entsprechung: Strangler pattern. Kanonischer Codebegriff: StranglerPattern.",
    "practicalExample": "„Strangler Pattern“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Schrittweise Ablösung einer bestehenden Implementierung durch kontrolliertes Umleiten auf neue Komponenten.",
    "searchTags": [
      "Strangler Pattern",
      "Strangler pattern",
      "StranglerPattern",
      "Strangler pattern",
      "StranglerPattern",
      "Strangler Pattern"
    ],
    "thesaurus": [
      "Strangler pattern",
      "StranglerPattern",
      "Strangler Pattern"
    ]
  },
  {
    "id": "finance-voc-aidev-0019",
    "term": "Behebung",
    "abbreviation": "Remediation",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Gezielte Korrektur eines bestätigten technischen, Governance-, Security- oder Compliance-Findings.",
    "detailedExplanation": "Gezielte Korrektur eines bestätigten technischen, Governance-, Security- oder Compliance-Findings. Englische Entsprechung: Remediation. Kanonischer Codebegriff: Remediation.",
    "practicalExample": "„Behebung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Gezielte Korrektur eines bestätigten technischen, Governance-, Security- oder Compliance-Findings.",
    "searchTags": [
      "Behebung",
      "Remediation",
      "Remediation",
      "Remediation",
      "remediation",
      "REMEDIATION"
    ],
    "thesaurus": [
      "Remediation",
      "remediation",
      "REMEDIATION"
    ]
  },
  {
    "id": "finance-voc-aidev-0020",
    "term": "Drift",
    "abbreviation": "Drift",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Abweichung eines erwarteten oder gebundenen Zustands vom aktuellen überprüften Ist-Zustand.",
    "detailedExplanation": "Abweichung eines erwarteten oder gebundenen Zustands vom aktuellen überprüften Ist-Zustand. Englische Entsprechung: Drift. Kanonischer Codebegriff: Drift.",
    "practicalExample": "„Drift“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Abweichung eines erwarteten oder gebundenen Zustands vom aktuellen überprüften Ist-Zustand.",
    "searchTags": [
      "Drift",
      "Drift",
      "Drift",
      "Drift",
      "drift",
      "DRIFT"
    ],
    "thesaurus": [
      "Drift",
      "drift",
      "DRIFT"
    ]
  },
  {
    "id": "finance-voc-aidev-0021",
    "term": "Fail-Closed",
    "abbreviation": "Fail-closed",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Verhalten, bei dem fehlende oder ungültige Voraussetzungen eine geschützte Aktion blockieren statt implizit zu erlauben.",
    "detailedExplanation": "Verhalten, bei dem fehlende oder ungültige Voraussetzungen eine geschützte Aktion blockieren statt implizit zu erlauben. Englische Entsprechung: Fail-closed. Kanonischer Codebegriff: FailClosed.",
    "practicalExample": "„Fail-Closed“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Verhalten, bei dem fehlende oder ungültige Voraussetzungen eine geschützte Aktion blockieren statt implizit zu erlauben.",
    "searchTags": [
      "Fail-Closed",
      "Fail-closed",
      "FailClosed",
      "Fail-closed",
      "FailClosed",
      "Fail Closed"
    ],
    "thesaurus": [
      "Fail-closed",
      "FailClosed",
      "Fail Closed"
    ]
  },
  {
    "id": "finance-voc-aidev-0022",
    "term": "Gate",
    "abbreviation": "Gate",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Explizite Prüf- oder Freigabegrenze, die vor dem nächsten Lifecycle-Schritt erfüllt sein muss.",
    "detailedExplanation": "Explizite Prüf- oder Freigabegrenze, die vor dem nächsten Lifecycle-Schritt erfüllt sein muss. Englische Entsprechung: Gate. Kanonischer Codebegriff: Gate.",
    "practicalExample": "„Gate“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Explizite Prüf- oder Freigabegrenze, die vor dem nächsten Lifecycle-Schritt erfüllt sein muss.",
    "searchTags": [
      "Gate",
      "Gate",
      "Gate",
      "Gate",
      "gate",
      "GATE"
    ],
    "thesaurus": [
      "Gate",
      "gate",
      "GATE"
    ]
  },
  {
    "id": "finance-voc-aidev-0023",
    "term": "Validierungs-Evidence",
    "abbreviation": "Validation evidence",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Nachvollziehbare Evidence, die das Ergebnis einer definierten Validierung belegt.",
    "detailedExplanation": "Nachvollziehbare Evidence, die das Ergebnis einer definierten Validierung belegt. Englische Entsprechung: Validation evidence. Kanonischer Codebegriff: ValidationEvidence.",
    "practicalExample": "„Validierungs-Evidence“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Nachvollziehbare Evidence, die das Ergebnis einer definierten Validierung belegt.",
    "searchTags": [
      "Validierungs-Evidence",
      "Validation evidence",
      "ValidationEvidence",
      "Validation evidence",
      "ValidationEvidence",
      "Validation Evidence"
    ],
    "thesaurus": [
      "Validation evidence",
      "ValidationEvidence",
      "Validation Evidence"
    ]
  },
  {
    "id": "finance-voc-aidev-0024",
    "term": "Exakter Snapshot",
    "abbreviation": "Exact snapshot",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Unveränderlich identifizierter Arbeitsstand, typischerweise durch vollständige Commit-SHA gebunden.",
    "detailedExplanation": "Unveränderlich identifizierter Arbeitsstand, typischerweise durch vollständige Commit-SHA gebunden. Englische Entsprechung: Exact snapshot. Kanonischer Codebegriff: ExactSnapshot.",
    "practicalExample": "„Exakter Snapshot“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Unveränderlich identifizierter Arbeitsstand, typischerweise durch vollständige Commit-SHA gebunden.",
    "searchTags": [
      "Exakter Snapshot",
      "Exact snapshot",
      "ExactSnapshot",
      "Exact snapshot",
      "ExactSnapshot",
      "Exact Snapshot"
    ],
    "thesaurus": [
      "Exact snapshot",
      "ExactSnapshot",
      "Exact Snapshot"
    ]
  },
  {
    "id": "finance-voc-aidev-0025",
    "term": "Head-SHA",
    "abbreviation": "Head SHA",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Exakte Commit-SHA des aktuellen Branch- oder Pull-Request-Heads.",
    "detailedExplanation": "Exakte Commit-SHA des aktuellen Branch- oder Pull-Request-Heads. Englische Entsprechung: Head SHA. Kanonischer Codebegriff: HeadSha.",
    "practicalExample": "„Head-SHA“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Exakte Commit-SHA des aktuellen Branch- oder Pull-Request-Heads.",
    "searchTags": [
      "Head-SHA",
      "Head SHA",
      "HeadSha",
      "Head SHA",
      "HeadSha",
      "Head Sha"
    ],
    "thesaurus": [
      "Head SHA",
      "HeadSha",
      "Head Sha"
    ]
  },
  {
    "id": "finance-voc-aidev-0026",
    "term": "PR-Gate",
    "abbreviation": "Pull request gate",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Prüf- oder Freigabegrenze unmittelbar vor Erstellung oder Weiterführung eines Pull Requests.",
    "detailedExplanation": "Prüf- oder Freigabegrenze unmittelbar vor Erstellung oder Weiterführung eines Pull Requests. Englische Entsprechung: Pull request gate. Kanonischer Codebegriff: PullRequestGate.",
    "practicalExample": "„PR-Gate“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Prüf- oder Freigabegrenze unmittelbar vor Erstellung oder Weiterführung eines Pull Requests.",
    "searchTags": [
      "PR-Gate",
      "Pull request gate",
      "PullRequestGate",
      "Pull request gate",
      "PullRequestGate",
      "Pull Request Gate"
    ],
    "thesaurus": [
      "Pull request gate",
      "PullRequestGate",
      "Pull Request Gate"
    ]
  },
  {
    "id": "finance-voc-aidev-0027",
    "term": "Hosted CI",
    "abbreviation": "HostedCI",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Auf der Repository-Plattform ausgeführte Continuous-Integration-Prüfung eines gebundenen Commit-Stands.",
    "detailedExplanation": "Auf der Repository-Plattform ausgeführte Continuous-Integration-Prüfung eines gebundenen Commit-Stands. Englische Entsprechung: Hosted CI. Kanonischer Codebegriff: HostedCI.",
    "practicalExample": "„Hosted CI“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Auf der Repository-Plattform ausgeführte Continuous-Integration-Prüfung eines gebundenen Commit-Stands.",
    "searchTags": [
      "Hosted CI",
      "Hosted CI",
      "HostedCI",
      "Hosted CI",
      "HostedCI",
      "hosted ci"
    ],
    "thesaurus": [
      "Hosted CI",
      "HostedCI",
      "hosted ci"
    ]
  },
  {
    "id": "finance-voc-aidev-0028",
    "term": "Human Merge",
    "abbreviation": "Human merge",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Explizite Merge-Entscheidung und Merge-Aktion durch eine autorisierte Person oder CODEOWNER-Grenze.",
    "detailedExplanation": "Explizite Merge-Entscheidung und Merge-Aktion durch eine autorisierte Person oder CODEOWNER-Grenze. Englische Entsprechung: Human merge. Kanonischer Codebegriff: HumanMerge.",
    "practicalExample": "„Human Merge“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Explizite Merge-Entscheidung und Merge-Aktion durch eine autorisierte Person oder CODEOWNER-Grenze.",
    "searchTags": [
      "Human Merge",
      "Human merge",
      "HumanMerge",
      "Human merge",
      "HumanMerge",
      "Human Merge"
    ],
    "thesaurus": [
      "Human merge",
      "HumanMerge",
      "Human Merge"
    ]
  },
  {
    "id": "finance-voc-aidev-0029",
    "term": "Release-Gate",
    "abbreviation": "Release gate",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Kontrollgrenze vor Freigabe eines Artefakts oder Stands für einen Release-Schritt.",
    "detailedExplanation": "Kontrollgrenze vor Freigabe eines Artefakts oder Stands für einen Release-Schritt. Englische Entsprechung: Release gate. Kanonischer Codebegriff: ReleaseGate.",
    "practicalExample": "„Release-Gate“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kontrollgrenze vor Freigabe eines Artefakts oder Stands für einen Release-Schritt.",
    "searchTags": [
      "Release-Gate",
      "Release gate",
      "ReleaseGate",
      "Release gate",
      "ReleaseGate",
      "Release Gate"
    ],
    "thesaurus": [
      "Release gate",
      "ReleaseGate",
      "Release Gate"
    ]
  },
  {
    "id": "finance-voc-aidev-0030",
    "term": "Produktionsmutation",
    "abbreviation": "Production mutation",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Zustandsverändernde Aktion auf produktiven Systemen, Daten, Konfigurationen oder externen Ressourcen.",
    "detailedExplanation": "Zustandsverändernde Aktion auf produktiven Systemen, Daten, Konfigurationen oder externen Ressourcen. Englische Entsprechung: Production mutation. Kanonischer Codebegriff: ProductionMutation.",
    "practicalExample": "„Produktionsmutation“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Zustandsverändernde Aktion auf produktiven Systemen, Daten, Konfigurationen oder externen Ressourcen.",
    "searchTags": [
      "Produktionsmutation",
      "Production mutation",
      "ProductionMutation",
      "Production mutation",
      "ProductionMutation",
      "Production Mutation"
    ],
    "thesaurus": [
      "Production mutation",
      "ProductionMutation",
      "Production Mutation"
    ]
  },
  {
    "id": "finance-voc-aidev-0031",
    "term": "Supervisor",
    "abbreviation": "Supervisor",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Überwachende oder koordinierende Komponente, die Zustände beobachtet und zulässige Lifecycle-Schritte orchestriert, ohne fremde Domain Authority zu übernehmen.",
    "detailedExplanation": "Überwachende oder koordinierende Komponente, die Zustände beobachtet und zulässige Lifecycle-Schritte orchestriert, ohne fremde Domain Authority zu übernehmen. Englische Entsprechung: Supervisor. Kanonischer Codebegriff: Supervisor.",
    "practicalExample": "„Supervisor“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Überwachende oder koordinierende Komponente, die Zustände beobachtet und zulässige Lifecycle-Schritte orchestriert, ohne fremde Domain Authority zu übernehmen.",
    "searchTags": [
      "Supervisor",
      "Supervisor",
      "Supervisor",
      "Supervisor",
      "supervisor",
      "SUPERVISOR"
    ],
    "thesaurus": [
      "Supervisor",
      "supervisor",
      "SUPERVISOR"
    ]
  },
  {
    "id": "finance-voc-aidev-0032",
    "term": "EventMesh",
    "abbreviation": "EventMesh",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Kanonische Event-Transport- und Verteilungsstruktur für entkoppelte, nachvollziehbare Zustandsereignisse.",
    "detailedExplanation": "Kanonische Event-Transport- und Verteilungsstruktur für entkoppelte, nachvollziehbare Zustandsereignisse. Englische Entsprechung: EventMesh. Kanonischer Codebegriff: EventMesh.",
    "practicalExample": "„EventMesh“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kanonische Event-Transport- und Verteilungsstruktur für entkoppelte, nachvollziehbare Zustandsereignisse.",
    "searchTags": [
      "EventMesh",
      "EventMesh",
      "EventMesh",
      "EventMesh",
      "Event Mesh",
      "eventmesh"
    ],
    "thesaurus": [
      "EventMesh",
      "Event Mesh",
      "eventmesh"
    ]
  },
  {
    "id": "finance-voc-aidev-0033",
    "term": "Nachvollziehbarkeit",
    "abbreviation": "Traceability",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Nachweisbare Verknüpfung von Anforderungen, Entscheidungen, Änderungen, Validierungen und Ergebnissen.",
    "detailedExplanation": "Nachweisbare Verknüpfung von Anforderungen, Entscheidungen, Änderungen, Validierungen und Ergebnissen. Englische Entsprechung: Traceability. Kanonischer Codebegriff: Traceability.",
    "practicalExample": "„Nachvollziehbarkeit“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Nachweisbare Verknüpfung von Anforderungen, Entscheidungen, Änderungen, Validierungen und Ergebnissen.",
    "searchTags": [
      "Nachvollziehbarkeit",
      "Traceability",
      "Traceability",
      "Traceability",
      "traceability",
      "TRACEABILITY"
    ],
    "thesaurus": [
      "Traceability",
      "traceability",
      "TRACEABILITY"
    ]
  },
  {
    "id": "finance-voc-aidev-0034",
    "term": "Control Plane",
    "abbreviation": "Control plane",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Kanonische Steuerungs- und Policy-Ebene, die Regeln und zulässige Aktionen vorgibt, ohne unnötige parallele Runtime zu erzeugen.",
    "detailedExplanation": "Kanonische Steuerungs- und Policy-Ebene, die Regeln und zulässige Aktionen vorgibt, ohne unnötige parallele Runtime zu erzeugen. Englische Entsprechung: Control plane. Kanonischer Codebegriff: ControlPlane.",
    "practicalExample": "„Control Plane“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kanonische Steuerungs- und Policy-Ebene, die Regeln und zulässige Aktionen vorgibt, ohne unnötige parallele Runtime zu erzeugen.",
    "searchTags": [
      "Control Plane",
      "Control plane",
      "ControlPlane",
      "Control plane",
      "ControlPlane",
      "Control Plane"
    ],
    "thesaurus": [
      "Control plane",
      "ControlPlane",
      "Control Plane"
    ]
  },
  {
    "id": "finance-voc-aidev-0035",
    "term": "Stand der Technik",
    "abbreviation": "State of the art",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Aktuell etablierter fortgeschrittener Stand von Methoden, Architektur, Sicherheit oder Engineering in einem relevanten Fachgebiet.",
    "detailedExplanation": "Aktuell etablierter fortgeschrittener Stand von Methoden, Architektur, Sicherheit oder Engineering in einem relevanten Fachgebiet. Englische Entsprechung: State of the art. Kanonischer Codebegriff: StateOfTheArt.",
    "practicalExample": "„Stand der Technik“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Aktuell etablierter fortgeschrittener Stand von Methoden, Architektur, Sicherheit oder Engineering in einem relevanten Fachgebiet.",
    "searchTags": [
      "Stand der Technik",
      "State of the art",
      "StateOfTheArt",
      "State of the art",
      "StateOfTheArt",
      "State Of The Art"
    ],
    "thesaurus": [
      "State of the art",
      "StateOfTheArt",
      "State Of The Art"
    ]
  },
  {
    "id": "finance-voc-aidev-0036",
    "term": "Best Practice",
    "abbreviation": "Best practice",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Bewährte, allgemein anerkannte Vorgehensweise, die für den konkreten Kontext weiterhin auf Eignung geprüft werden muss.",
    "detailedExplanation": "Bewährte, allgemein anerkannte Vorgehensweise, die für den konkreten Kontext weiterhin auf Eignung geprüft werden muss. Englische Entsprechung: Best practice. Kanonischer Codebegriff: BestPractice.",
    "practicalExample": "„Best Practice“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Bewährte, allgemein anerkannte Vorgehensweise, die für den konkreten Kontext weiterhin auf Eignung geprüft werden muss.",
    "searchTags": [
      "Best Practice",
      "Best practice",
      "BestPractice",
      "Best practice",
      "BestPractice",
      "Best Practice"
    ],
    "thesaurus": [
      "Best practice",
      "BestPractice",
      "Best Practice"
    ]
  },
  {
    "id": "finance-voc-aidev-0037",
    "term": "Externe Recherche im Pre-Check",
    "abbreviation": "External research pre-check",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Optionale aktuelle externe Recherche zur Ergänzung eines Best-Practice- oder Current-State-Pre-Checks; sie ist vom eigentlichen PR-Erstellungsprozess getrennt und erzeugt keine Repository-Authority.",
    "detailedExplanation": "Optionale aktuelle externe Recherche zur Ergänzung eines Best-Practice- oder Current-State-Pre-Checks; sie ist vom eigentlichen PR-Erstellungsprozess getrennt und erzeugt keine Repository-Authority. Englische Entsprechung: External research pre-check. Kanonischer Codebegriff: ExternalResearchPreCheck.",
    "practicalExample": "„Externe Recherche im Pre-Check“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Optionale aktuelle externe Recherche zur Ergänzung eines Best-Practice- oder Current-State-Pre-Checks; sie ist vom eigentlichen PR-Erstellungsprozess getrennt und erzeugt keine Repository-Authority.",
    "searchTags": [
      "Externe Recherche im Pre-Check",
      "External research pre-check",
      "ExternalResearchPreCheck",
      "External research pre-check",
      "ExternalResearchPreCheck",
      "External Research Pre Check"
    ],
    "thesaurus": [
      "External research pre-check",
      "ExternalResearchPreCheck",
      "External Research Pre Check"
    ]
  },
  {
    "id": "finance-voc-aidev-0038",
    "term": "Produktions-Basis-URL",
    "abbreviation": "Production base URL",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Kanonische Root-URL der produktiven Anwendung für Benutzer- oder Root-Erreichbarkeit; sie ist nicht mit dem Repository-Branch main gleichzusetzen.",
    "detailedExplanation": "Kanonische Root-URL der produktiven Anwendung für Benutzer- oder Root-Erreichbarkeit; sie ist nicht mit dem Repository-Branch main gleichzusetzen. Englische Entsprechung: Production base URL. Kanonischer Codebegriff: ProductionBaseUrl.",
    "practicalExample": "„Produktions-Basis-URL“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kanonische Root-URL der produktiven Anwendung für Benutzer- oder Root-Erreichbarkeit; sie ist nicht mit dem Repository-Branch main gleichzusetzen.",
    "searchTags": [
      "Produktions-Basis-URL",
      "Production base URL",
      "ProductionBaseUrl",
      "Production base URL",
      "ProductionBaseUrl",
      "Production Base Url"
    ],
    "thesaurus": [
      "Production base URL",
      "ProductionBaseUrl",
      "Production Base Url"
    ]
  },
  {
    "id": "finance-voc-aidev-0039",
    "term": "Liveness-Endpunkt",
    "abbreviation": "Liveness endpoint",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Leichtgewichtiger Endpunkt zur Prüfung, ob der Anwendungsprozess läuft; in CAPITAL-AI ist dies /healthz und er bleibt bewusst von externen Provider-Abhängigkeiten unabhängig.",
    "detailedExplanation": "Leichtgewichtiger Endpunkt zur Prüfung, ob der Anwendungsprozess läuft; in CAPITAL-AI ist dies /healthz und er bleibt bewusst von externen Provider-Abhängigkeiten unabhängig. Englische Entsprechung: Liveness endpoint. Kanonischer Codebegriff: LivenessEndpoint.",
    "practicalExample": "„Liveness-Endpunkt“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Leichtgewichtiger Endpunkt zur Prüfung, ob der Anwendungsprozess läuft; in CAPITAL-AI ist dies /healthz und er bleibt bewusst von externen Provider-Abhängigkeiten unabhängig.",
    "searchTags": [
      "Liveness-Endpunkt",
      "Liveness endpoint",
      "LivenessEndpoint",
      "Liveness endpoint",
      "LivenessEndpoint",
      "Liveness Endpoint"
    ],
    "thesaurus": [
      "Liveness endpoint",
      "LivenessEndpoint",
      "Liveness Endpoint"
    ]
  },
  {
    "id": "finance-voc-aidev-0040",
    "term": "Readiness-Endpunkt",
    "abbreviation": "Readiness endpoint",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Strikter Endpunkt für betriebliche und fachliche Einsatzbereitschaft; in CAPITAL-AI liefert /readyz bei Readiness 200 und bei nicht erfüllten Voraussetzungen 503.",
    "detailedExplanation": "Strikter Endpunkt für betriebliche und fachliche Einsatzbereitschaft; in CAPITAL-AI liefert /readyz bei Readiness 200 und bei nicht erfüllten Voraussetzungen 503. Englische Entsprechung: Readiness endpoint. Kanonischer Codebegriff: ReadinessEndpoint.",
    "practicalExample": "„Readiness-Endpunkt“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Strikter Endpunkt für betriebliche und fachliche Einsatzbereitschaft; in CAPITAL-AI liefert /readyz bei Readiness 200 und bei nicht erfüllten Voraussetzungen 503.",
    "searchTags": [
      "Readiness-Endpunkt",
      "Readiness endpoint",
      "ReadinessEndpoint",
      "Readiness endpoint",
      "ReadinessEndpoint",
      "Readiness Endpoint"
    ],
    "thesaurus": [
      "Readiness endpoint",
      "ReadinessEndpoint",
      "Readiness Endpoint"
    ]
  },
  {
    "id": "finance-voc-aidev-0041",
    "term": "Readiness-Diagnoseprojektion",
    "abbreviation": "Readiness projection endpoint",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "Nicht-strikte Diagnoseprojektion der Readiness-Zustände; in CAPITAL-AI liefert /healthz/readiness auch bei Degradation 200, damit einzelne Blocker inspiziert werden können.",
    "detailedExplanation": "Nicht-strikte Diagnoseprojektion der Readiness-Zustände; in CAPITAL-AI liefert /healthz/readiness auch bei Degradation 200, damit einzelne Blocker inspiziert werden können. Englische Entsprechung: Readiness projection endpoint. Kanonischer Codebegriff: ReadinessProjectionEndpoint.",
    "practicalExample": "„Readiness-Diagnoseprojektion“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Nicht-strikte Diagnoseprojektion der Readiness-Zustände; in CAPITAL-AI liefert /healthz/readiness auch bei Degradation 200, damit einzelne Blocker inspiziert werden können.",
    "searchTags": [
      "Readiness-Diagnoseprojektion",
      "Readiness projection endpoint",
      "ReadinessProjectionEndpoint",
      "Readiness projection endpoint",
      "ReadinessProjectionEndpoint",
      "Readiness Projection Endpoint"
    ],
    "thesaurus": [
      "Readiness projection endpoint",
      "ReadinessProjectionEndpoint",
      "Readiness Projection Endpoint"
    ]
  },
  {
    "id": "finance-voc-platform-0001",
    "term": "Vocabulary Governance",
    "abbreviation": "VocabularyGovernance",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Kanonische Governance für Terminologie, Naming, Wording und deren Lebenszyklus in CAPITAL-AI.",
    "detailedExplanation": "Kanonische Governance für Terminologie, Naming, Wording und deren Lebenszyklus in CAPITAL-AI. Englische Entsprechung: Vocabulary Governance. Kanonischer Codebegriff: VocabularyGovernance.",
    "practicalExample": "„Vocabulary Governance“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kanonische Governance für Terminologie, Naming, Wording und deren Lebenszyklus in CAPITAL-AI.",
    "searchTags": [
      "Vocabulary Governance",
      "Vocabulary Governance",
      "VocabularyGovernance",
      "Vocabulary Governance",
      "VocabularyGovernance",
      "vocabulary governance"
    ],
    "thesaurus": [
      "Vocabulary Governance",
      "VocabularyGovernance",
      "vocabulary governance"
    ]
  },
  {
    "id": "finance-voc-docmin-0001",
    "term": "Idempotenz",
    "abbreviation": "Idempotency",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Eigenschaft einer Operation oder Ereignisverarbeitung, bei wiederholter Ausführung mit derselben Identität keinen zusätzlichen fachlichen Effekt zu erzeugen.",
    "detailedExplanation": "Eigenschaft einer Operation oder Ereignisverarbeitung, bei wiederholter Ausführung mit derselben Identität keinen zusätzlichen fachlichen Effekt zu erzeugen. Englische Entsprechung: Idempotency. Kanonischer Codebegriff: Idempotency.",
    "practicalExample": "„Idempotenz“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Eigenschaft einer Operation oder Ereignisverarbeitung, bei wiederholter Ausführung mit derselben Identität keinen zusätzlichen fachlichen Effekt zu erzeugen.",
    "searchTags": [
      "Idempotenz",
      "Idempotency",
      "Idempotency",
      "Idempotency",
      "idempotency",
      "IDEMPOTENCY"
    ],
    "thesaurus": [
      "Idempotency",
      "idempotency",
      "IDEMPOTENCY"
    ]
  },
  {
    "id": "finance-voc-docmin-0002",
    "term": "Ereignisreihenfolge",
    "abbreviation": "Event ordering",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Kontrollierte Reihenfolge zusammengehöriger Ereignisse, damit spätere oder veraltete Zustände nicht unbemerkt vor gültigen Vorgängern verarbeitet werden.",
    "detailedExplanation": "Kontrollierte Reihenfolge zusammengehöriger Ereignisse, damit spätere oder veraltete Zustände nicht unbemerkt vor gültigen Vorgängern verarbeitet werden. Englische Entsprechung: Event ordering. Kanonischer Codebegriff: EventOrdering.",
    "practicalExample": "„Ereignisreihenfolge“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kontrollierte Reihenfolge zusammengehöriger Ereignisse, damit spätere oder veraltete Zustände nicht unbemerkt vor gültigen Vorgängern verarbeitet werden.",
    "searchTags": [
      "Ereignisreihenfolge",
      "Event ordering",
      "EventOrdering",
      "Event ordering",
      "EventOrdering",
      "Event Ordering"
    ],
    "thesaurus": [
      "Event ordering",
      "EventOrdering",
      "Event Ordering"
    ]
  },
  {
    "id": "finance-voc-docmin-0003",
    "term": "Event-Replay",
    "abbreviation": "Event replay",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Kontrolliertes erneutes Verarbeiten bereits erfasster Ereignisse unter Replay-, Idempotenz- und Stale-State-Schutzregeln.",
    "detailedExplanation": "Kontrolliertes erneutes Verarbeiten bereits erfasster Ereignisse unter Replay-, Idempotenz- und Stale-State-Schutzregeln. Englische Entsprechung: Event replay. Kanonischer Codebegriff: EventReplay.",
    "practicalExample": "„Event-Replay“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kontrolliertes erneutes Verarbeiten bereits erfasster Ereignisse unter Replay-, Idempotenz- und Stale-State-Schutzregeln.",
    "searchTags": [
      "Event-Replay",
      "Event replay",
      "EventReplay",
      "Event replay",
      "EventReplay",
      "Event Replay"
    ],
    "thesaurus": [
      "Event replay",
      "EventReplay",
      "Event Replay"
    ]
  },
  {
    "id": "finance-voc-docmin-0004",
    "term": "Reliability Evidence",
    "abbreviation": "Reliability evidence",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Nachweisbare Betriebsdaten über Zuverlässigkeit und Verarbeitung einer technischen Komponente oder Ereigniskette.",
    "detailedExplanation": "Nachweisbare Betriebsdaten über Zuverlässigkeit und Verarbeitung einer technischen Komponente oder Ereigniskette. Englische Entsprechung: Reliability evidence. Kanonischer Codebegriff: ReliabilityEvidence.",
    "practicalExample": "„Reliability Evidence“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Nachweisbare Betriebsdaten über Zuverlässigkeit und Verarbeitung einer technischen Komponente oder Ereigniskette.",
    "searchTags": [
      "Reliability Evidence",
      "Reliability evidence",
      "ReliabilityEvidence",
      "Reliability evidence",
      "ReliabilityEvidence",
      "Reliability Evidence"
    ],
    "thesaurus": [
      "Reliability evidence",
      "ReliabilityEvidence",
      "Reliability Evidence"
    ]
  },
  {
    "id": "finance-voc-docmin-0005",
    "term": "Observability",
    "abbreviation": "Observability",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Beobachtbarkeit eines laufenden Systems über strukturierte Betriebsdaten wie Telemetrie, Logs, Metriken und Tracing-Signale, ohne fachliche Audit-Evidence zu ersetzen.",
    "detailedExplanation": "Beobachtbarkeit eines laufenden Systems über strukturierte Betriebsdaten wie Telemetrie, Logs, Metriken und Tracing-Signale, ohne fachliche Audit-Evidence zu ersetzen. Englische Entsprechung: Observability. Kanonischer Codebegriff: Observability.",
    "practicalExample": "„Observability“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Beobachtbarkeit eines laufenden Systems über strukturierte Betriebsdaten wie Telemetrie, Logs, Metriken und Tracing-Signale, ohne fachliche Audit-Evidence zu ersetzen.",
    "searchTags": [
      "Observability",
      "Observability",
      "Observability",
      "Observability",
      "observability",
      "OBSERVABILITY"
    ],
    "thesaurus": [
      "Observability",
      "observability",
      "OBSERVABILITY"
    ]
  },
  {
    "id": "finance-voc-docmin-0006",
    "term": "Operational Telemetry",
    "abbreviation": "Operational telemetry",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Vendor-neutrale Betriebs-Telemetrie für Laufzeit-, Request-, Trace-, Outcome- und Dauerinformationen; revisionsrelevante Audit-Evidence bleibt davon getrennt.",
    "detailedExplanation": "Vendor-neutrale Betriebs-Telemetrie für Laufzeit-, Request-, Trace-, Outcome- und Dauerinformationen; revisionsrelevante Audit-Evidence bleibt davon getrennt. Englische Entsprechung: Operational telemetry. Kanonischer Codebegriff: OperationalTelemetry.",
    "practicalExample": "„Operational Telemetry“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Vendor-neutrale Betriebs-Telemetrie für Laufzeit-, Request-, Trace-, Outcome- und Dauerinformationen; revisionsrelevante Audit-Evidence bleibt davon getrennt.",
    "searchTags": [
      "Operational Telemetry",
      "Operational telemetry",
      "OperationalTelemetry",
      "Operational telemetry",
      "OperationalTelemetry",
      "Operational Telemetry"
    ],
    "thesaurus": [
      "Operational telemetry",
      "OperationalTelemetry",
      "Operational Telemetry"
    ]
  },
  {
    "id": "finance-voc-docmin-0007",
    "term": "Edge Trust",
    "abbreviation": "Edge trust",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Vertrauensbewertung und Korrelation von Request-Signalen an der Edge-Grenze, bevor solche Signale als belastbarer Anwendungskontext verwendet werden.",
    "detailedExplanation": "Vertrauensbewertung und Korrelation von Request-Signalen an der Edge-Grenze, bevor solche Signale als belastbarer Anwendungskontext verwendet werden. Englische Entsprechung: Edge trust. Kanonischer Codebegriff: EdgeTrust.",
    "practicalExample": "„Edge Trust“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Vertrauensbewertung und Korrelation von Request-Signalen an der Edge-Grenze, bevor solche Signale als belastbarer Anwendungskontext verwendet werden.",
    "searchTags": [
      "Edge Trust",
      "Edge trust",
      "EdgeTrust",
      "Edge trust",
      "EdgeTrust",
      "Edge Trust"
    ],
    "thesaurus": [
      "Edge trust",
      "EdgeTrust",
      "Edge Trust"
    ]
  },
  {
    "id": "finance-voc-docmin-0008",
    "term": "Product Intelligence",
    "abbreviation": "Product intelligence",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Auswertung produktbezogener Telemetrie- und Nutzungssignale zur beobachtenden Produktanalyse, ohne fachliche Entscheidungs- oder Mutationsauthority.",
    "detailedExplanation": "Auswertung produktbezogener Telemetrie- und Nutzungssignale zur beobachtenden Produktanalyse, ohne fachliche Entscheidungs- oder Mutationsauthority. Englische Entsprechung: Product intelligence. Kanonischer Codebegriff: ProductIntelligence.",
    "practicalExample": "„Product Intelligence“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Auswertung produktbezogener Telemetrie- und Nutzungssignale zur beobachtenden Produktanalyse, ohne fachliche Entscheidungs- oder Mutationsauthority.",
    "searchTags": [
      "Product Intelligence",
      "Product intelligence",
      "ProductIntelligence",
      "Product intelligence",
      "ProductIntelligence",
      "Product Intelligence"
    ],
    "thesaurus": [
      "Product intelligence",
      "ProductIntelligence",
      "Product Intelligence"
    ]
  },
  {
    "id": "finance-voc-docmin-0009",
    "term": "Rate Limiting",
    "abbreviation": "Rate limiting",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Begrenzung der zulässigen Request- oder Aktionsfrequenz innerhalb eines definierten Zeitfensters zum Schutz von Ressourcen und Schnittstellen.",
    "detailedExplanation": "Begrenzung der zulässigen Request- oder Aktionsfrequenz innerhalb eines definierten Zeitfensters zum Schutz von Ressourcen und Schnittstellen. Englische Entsprechung: Rate limiting. Kanonischer Codebegriff: RateLimiting.",
    "practicalExample": "„Rate Limiting“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Begrenzung der zulässigen Request- oder Aktionsfrequenz innerhalb eines definierten Zeitfensters zum Schutz von Ressourcen und Schnittstellen.",
    "searchTags": [
      "Rate Limiting",
      "Rate limiting",
      "RateLimiting",
      "Rate limiting",
      "RateLimiting",
      "Rate Limiting"
    ],
    "thesaurus": [
      "Rate limiting",
      "RateLimiting",
      "Rate Limiting"
    ]
  },
  {
    "id": "finance-voc-docmin-0010",
    "term": "Bedrohungsmodell",
    "abbreviation": "Threat model",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Strukturierte Beschreibung relevanter Bedrohungen, Angriffsflächen, Vertrauensgrenzen und vorgesehener Gegenmaßnahmen für einen abgegrenzten Systembereich.",
    "detailedExplanation": "Strukturierte Beschreibung relevanter Bedrohungen, Angriffsflächen, Vertrauensgrenzen und vorgesehener Gegenmaßnahmen für einen abgegrenzten Systembereich. Englische Entsprechung: Threat model. Kanonischer Codebegriff: ThreatModel.",
    "practicalExample": "„Bedrohungsmodell“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Strukturierte Beschreibung relevanter Bedrohungen, Angriffsflächen, Vertrauensgrenzen und vorgesehener Gegenmaßnahmen für einen abgegrenzten Systembereich.",
    "searchTags": [
      "Bedrohungsmodell",
      "Threat model",
      "ThreatModel",
      "Threat model",
      "ThreatModel",
      "Threat Model"
    ],
    "thesaurus": [
      "Threat model",
      "ThreatModel",
      "Threat Model"
    ]
  },
  {
    "id": "finance-voc-docmin-0011",
    "term": "Security Hardening",
    "abbreviation": "Security hardening",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Gezielte Härtung von Code, Konfiguration und Laufzeitgrenzen zur Verringerung der Angriffsfläche und zur strengeren Durchsetzung bestehender Sicherheitskontrollen.",
    "detailedExplanation": "Gezielte Härtung von Code, Konfiguration und Laufzeitgrenzen zur Verringerung der Angriffsfläche und zur strengeren Durchsetzung bestehender Sicherheitskontrollen. Englische Entsprechung: Security hardening. Kanonischer Codebegriff: SecurityHardening.",
    "practicalExample": "„Security Hardening“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Gezielte Härtung von Code, Konfiguration und Laufzeitgrenzen zur Verringerung der Angriffsfläche und zur strengeren Durchsetzung bestehender Sicherheitskontrollen.",
    "searchTags": [
      "Security Hardening",
      "Security hardening",
      "SecurityHardening",
      "Security hardening",
      "SecurityHardening",
      "Security Hardening"
    ],
    "thesaurus": [
      "Security hardening",
      "SecurityHardening",
      "Security Hardening"
    ]
  },
  {
    "id": "finance-voc-docmin-0012",
    "term": "Authentifizierungs-Vertrauensniveau AAL2",
    "abbreviation": "Authentication Assurance Level 2",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Authentifizierungszustand mit erhöhtem Vertrauensniveau, der in der dokumentierten Supabase-MFA-Architektur einen verifizierten zweiten Faktor für privilegierte Aktionen voraussetzt.",
    "detailedExplanation": "Authentifizierungszustand mit erhöhtem Vertrauensniveau, der in der dokumentierten Supabase-MFA-Architektur einen verifizierten zweiten Faktor für privilegierte Aktionen voraussetzt. Englische Entsprechung: Authentication Assurance Level 2. Kanonischer Codebegriff: AuthenticationAssuranceLevel2.",
    "practicalExample": "„Authentifizierungs-Vertrauensniveau AAL2“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Authentifizierungszustand mit erhöhtem Vertrauensniveau, der in der dokumentierten Supabase-MFA-Architektur einen verifizierten zweiten Faktor für privilegierte Aktionen voraussetzt.",
    "searchTags": [
      "Authentifizierungs-Vertrauensniveau AAL2",
      "Authentication Assurance Level 2",
      "AuthenticationAssuranceLevel2",
      "Authentication Assurance Level 2",
      "AuthenticationAssuranceLevel2",
      "Authentication Assurance Level2"
    ],
    "thesaurus": [
      "Authentication Assurance Level 2",
      "AuthenticationAssuranceLevel2",
      "Authentication Assurance Level2"
    ]
  },
  {
    "id": "finance-voc-docmin-0013",
    "term": "Content Security Policy",
    "abbreviation": "ContentSecurityPolicy",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Browser-Sicherheitsrichtlinie, die zulässige Quellen und Ausführungsgrenzen für Inhalte wie Skripte, Styles und externe Ressourcen einschränkt.",
    "detailedExplanation": "Browser-Sicherheitsrichtlinie, die zulässige Quellen und Ausführungsgrenzen für Inhalte wie Skripte, Styles und externe Ressourcen einschränkt. Englische Entsprechung: Content Security Policy. Kanonischer Codebegriff: ContentSecurityPolicy.",
    "practicalExample": "„Content Security Policy“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Browser-Sicherheitsrichtlinie, die zulässige Quellen und Ausführungsgrenzen für Inhalte wie Skripte, Styles und externe Ressourcen einschränkt.",
    "searchTags": [
      "Content Security Policy",
      "Content Security Policy",
      "ContentSecurityPolicy",
      "Content Security Policy",
      "ContentSecurityPolicy",
      "content security policy"
    ],
    "thesaurus": [
      "Content Security Policy",
      "ContentSecurityPolicy",
      "content security policy"
    ]
  },
  {
    "id": "finance-voc-docmin-0014",
    "term": "Software-Supply-Chain-Attestierung",
    "abbreviation": "Software supply-chain attestation",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Kryptografisch oder signaturgestützt prüfbarer Nachweis, der Build- und Provenance-Evidence an exakte Source-, Dependency- und Artefaktidentitäten bindet.",
    "detailedExplanation": "Kryptografisch oder signaturgestützt prüfbarer Nachweis, der Build- und Provenance-Evidence an exakte Source-, Dependency- und Artefaktidentitäten bindet. Englische Entsprechung: Software supply-chain attestation. Kanonischer Codebegriff: SoftwareSupplyChainAttestation.",
    "practicalExample": "„Software-Supply-Chain-Attestierung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kryptografisch oder signaturgestützt prüfbarer Nachweis, der Build- und Provenance-Evidence an exakte Source-, Dependency- und Artefaktidentitäten bindet.",
    "searchTags": [
      "Software-Supply-Chain-Attestierung",
      "Software supply-chain attestation",
      "SoftwareSupplyChainAttestation",
      "Software supply-chain attestation",
      "SoftwareSupplyChainAttestation",
      "Software Supply Chain Attestation"
    ],
    "thesaurus": [
      "Software supply-chain attestation",
      "SoftwareSupplyChainAttestation",
      "Software Supply Chain Attestation"
    ]
  },
  {
    "id": "finance-voc-docmin-0015",
    "term": "Software Bill of Materials",
    "abbreviation": "SoftwareBillOfMaterials",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Maschinenlesbares Inventar der in einem Softwareartefakt enthaltenen Komponenten und Abhängigkeiten als Teil der dokumentierten Supply-Chain-Nachweiskette.",
    "detailedExplanation": "Maschinenlesbares Inventar der in einem Softwareartefakt enthaltenen Komponenten und Abhängigkeiten als Teil der dokumentierten Supply-Chain-Nachweiskette. Englische Entsprechung: Software Bill of Materials. Kanonischer Codebegriff: SoftwareBillOfMaterials.",
    "practicalExample": "„Software Bill of Materials“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Maschinenlesbares Inventar der in einem Softwareartefakt enthaltenen Komponenten und Abhängigkeiten als Teil der dokumentierten Supply-Chain-Nachweiskette.",
    "searchTags": [
      "Software Bill of Materials",
      "Software Bill of Materials",
      "SoftwareBillOfMaterials",
      "Software Bill of Materials",
      "SoftwareBillOfMaterials",
      "Software Bill Of Materials"
    ],
    "thesaurus": [
      "Software Bill of Materials",
      "SoftwareBillOfMaterials",
      "Software Bill Of Materials"
    ]
  },
  {
    "id": "finance-voc-docmin-0016",
    "term": "Durable Outbox",
    "abbreviation": "Durable outbox",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Persistente Outbox für ausstehende Arbeit oder Ereignisse, damit ein Prozessabbruch die noch nicht abgeschlossene Weiterverarbeitung nicht still verliert.",
    "detailedExplanation": "Persistente Outbox für ausstehende Arbeit oder Ereignisse, damit ein Prozessabbruch die noch nicht abgeschlossene Weiterverarbeitung nicht still verliert. Englische Entsprechung: Durable outbox. Kanonischer Codebegriff: DurableOutbox.",
    "practicalExample": "„Durable Outbox“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Persistente Outbox für ausstehende Arbeit oder Ereignisse, damit ein Prozessabbruch die noch nicht abgeschlossene Weiterverarbeitung nicht still verliert.",
    "searchTags": [
      "Durable Outbox",
      "Durable outbox",
      "DurableOutbox",
      "Durable outbox",
      "DurableOutbox",
      "Durable Outbox"
    ],
    "thesaurus": [
      "Durable outbox",
      "DurableOutbox",
      "Durable Outbox"
    ]
  },
  {
    "id": "finance-voc-docmin-0017",
    "term": "Durable Inbox",
    "abbreviation": "Durable inbox",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Persistente Inbox zur kontrollierten Aufnahme und Besitzzuordnung eingehender Ereignisse, bevor deren fachliche Verarbeitung abgeschlossen ist.",
    "detailedExplanation": "Persistente Inbox zur kontrollierten Aufnahme und Besitzzuordnung eingehender Ereignisse, bevor deren fachliche Verarbeitung abgeschlossen ist. Englische Entsprechung: Durable inbox. Kanonischer Codebegriff: DurableInbox.",
    "practicalExample": "„Durable Inbox“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Persistente Inbox zur kontrollierten Aufnahme und Besitzzuordnung eingehender Ereignisse, bevor deren fachliche Verarbeitung abgeschlossen ist.",
    "searchTags": [
      "Durable Inbox",
      "Durable inbox",
      "DurableInbox",
      "Durable inbox",
      "DurableInbox",
      "Durable Inbox"
    ],
    "thesaurus": [
      "Durable inbox",
      "DurableInbox",
      "Durable Inbox"
    ]
  },
  {
    "id": "finance-voc-docmin-0018",
    "term": "Provider-Routing",
    "abbreviation": "Provider routing",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Kontrollierte Auswahl und Ausweichlogik zwischen mehreren Datenprovidern unter Erhalt von Herkunft, Qualitäts- und Vertragsgrenzen.",
    "detailedExplanation": "Kontrollierte Auswahl und Ausweichlogik zwischen mehreren Datenprovidern unter Erhalt von Herkunft, Qualitäts- und Vertragsgrenzen. Englische Entsprechung: Provider routing. Kanonischer Codebegriff: ProviderRouting.",
    "practicalExample": "„Provider-Routing“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kontrollierte Auswahl und Ausweichlogik zwischen mehreren Datenprovidern unter Erhalt von Herkunft, Qualitäts- und Vertragsgrenzen.",
    "searchTags": [
      "Provider-Routing",
      "Provider routing",
      "ProviderRouting",
      "Provider routing",
      "ProviderRouting",
      "Provider Routing"
    ],
    "thesaurus": [
      "Provider routing",
      "ProviderRouting",
      "Provider Routing"
    ]
  },
  {
    "id": "finance-voc-docmin-0019",
    "term": "Screening Eligibility",
    "abbreviation": "Screening eligibility",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Separater Eignungsentscheid, der bestimmt, ob ein vorhandenes Ergebnis in Screening oder Ranking verwendet werden darf, ohne den zugrunde liegenden Score selbst zu verändern.",
    "detailedExplanation": "Separater Eignungsentscheid, der bestimmt, ob ein vorhandenes Ergebnis in Screening oder Ranking verwendet werden darf, ohne den zugrunde liegenden Score selbst zu verändern. Englische Entsprechung: Screening eligibility. Kanonischer Codebegriff: ScreeningEligibility.",
    "practicalExample": "„Screening Eligibility“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Separater Eignungsentscheid, der bestimmt, ob ein vorhandenes Ergebnis in Screening oder Ranking verwendet werden darf, ohne den zugrunde liegenden Score selbst zu verändern.",
    "searchTags": [
      "Screening Eligibility",
      "Screening eligibility",
      "ScreeningEligibility",
      "Screening eligibility",
      "ScreeningEligibility",
      "Screening Eligibility"
    ],
    "thesaurus": [
      "Screening eligibility",
      "ScreeningEligibility",
      "Screening Eligibility"
    ]
  },
  {
    "id": "finance-voc-docmin-0020",
    "term": "Datenschutz-Retention",
    "abbreviation": "Privacy retention",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Zeitlich und datenklassenspezifisch begrenzte Aufbewahrungs- und Löschlogik für operative Datenschutzdaten.",
    "detailedExplanation": "Zeitlich und datenklassenspezifisch begrenzte Aufbewahrungs- und Löschlogik für operative Datenschutzdaten. Englische Entsprechung: Privacy retention. Kanonischer Codebegriff: PrivacyRetention.",
    "practicalExample": "„Datenschutz-Retention“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Zeitlich und datenklassenspezifisch begrenzte Aufbewahrungs- und Löschlogik für operative Datenschutzdaten.",
    "searchTags": [
      "Datenschutz-Retention",
      "Privacy retention",
      "PrivacyRetention",
      "Privacy retention",
      "PrivacyRetention",
      "Privacy Retention"
    ],
    "thesaurus": [
      "Privacy retention",
      "PrivacyRetention",
      "Privacy Retention"
    ]
  },
  {
    "id": "finance-voc-docmin-0021",
    "term": "Retention Hold",
    "abbreviation": "Retention hold",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Explizite, begrenzte Ausnahme von generischer Löschautomation, um Daten für einen autorisierten Incident-, Accountability- oder Rechtsgrund vorübergehend zu erhalten.",
    "detailedExplanation": "Explizite, begrenzte Ausnahme von generischer Löschautomation, um Daten für einen autorisierten Incident-, Accountability- oder Rechtsgrund vorübergehend zu erhalten. Englische Entsprechung: Retention hold. Kanonischer Codebegriff: RetentionHold.",
    "practicalExample": "„Retention Hold“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Explizite, begrenzte Ausnahme von generischer Löschautomation, um Daten für einen autorisierten Incident-, Accountability- oder Rechtsgrund vorübergehend zu erhalten.",
    "searchTags": [
      "Retention Hold",
      "Retention hold",
      "RetentionHold",
      "Retention hold",
      "RetentionHold",
      "Retention Hold"
    ],
    "thesaurus": [
      "Retention hold",
      "RetentionHold",
      "Retention Hold"
    ]
  },
  {
    "id": "finance-voc-docmin-0022",
    "term": "Betroffenenanfrage",
    "abbreviation": "Data subject access request",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Datenschutzbezogene Anfrage einer betroffenen Person, deren dokumentierter Lifecycle Identitätsprüfung, Bearbeitung und terminale Abschluss- oder Ablehnungszustände umfasst.",
    "detailedExplanation": "Datenschutzbezogene Anfrage einer betroffenen Person, deren dokumentierter Lifecycle Identitätsprüfung, Bearbeitung und terminale Abschluss- oder Ablehnungszustände umfasst. Englische Entsprechung: Data subject access request. Kanonischer Codebegriff: DataSubjectAccessRequest.",
    "practicalExample": "„Betroffenenanfrage“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Datenschutzbezogene Anfrage einer betroffenen Person, deren dokumentierter Lifecycle Identitätsprüfung, Bearbeitung und terminale Abschluss- oder Ablehnungszustände umfasst.",
    "searchTags": [
      "Betroffenenanfrage",
      "Data subject access request",
      "DataSubjectAccessRequest",
      "Data subject access request",
      "DataSubjectAccessRequest",
      "Data Subject Access Request"
    ],
    "thesaurus": [
      "Data subject access request",
      "DataSubjectAccessRequest",
      "Data Subject Access Request"
    ]
  },
  {
    "id": "finance-voc-docmin-0023",
    "term": "Rollback",
    "abbreviation": "Rollback",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Kontrollierte Rückkehr eines Deployments oder Codes auf einen zuvor bekannten guten Zustand; ein Anwendungs-Rollback stellt Daten nicht automatisch wieder her.",
    "detailedExplanation": "Kontrollierte Rückkehr eines Deployments oder Codes auf einen zuvor bekannten guten Zustand; ein Anwendungs-Rollback stellt Daten nicht automatisch wieder her. Englische Entsprechung: Rollback. Kanonischer Codebegriff: Rollback.",
    "practicalExample": "„Rollback“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kontrollierte Rückkehr eines Deployments oder Codes auf einen zuvor bekannten guten Zustand; ein Anwendungs-Rollback stellt Daten nicht automatisch wieder her.",
    "searchTags": [
      "Rollback",
      "Rollback",
      "Rollback",
      "Rollback",
      "rollback",
      "ROLLBACK"
    ],
    "thesaurus": [
      "Rollback",
      "rollback",
      "ROLLBACK"
    ]
  },
  {
    "id": "finance-voc-docmin-0024",
    "term": "Recovery Point Objective",
    "abbreviation": "RecoveryPointObjective",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Zielgrenze für den maximal tolerierten Datenverlust zwischen dem letzten wiederherstellbaren Datenstand und einem Ausfallereignis.",
    "detailedExplanation": "Zielgrenze für den maximal tolerierten Datenverlust zwischen dem letzten wiederherstellbaren Datenstand und einem Ausfallereignis. Englische Entsprechung: Recovery Point Objective. Kanonischer Codebegriff: RecoveryPointObjective.",
    "practicalExample": "„Recovery Point Objective“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Zielgrenze für den maximal tolerierten Datenverlust zwischen dem letzten wiederherstellbaren Datenstand und einem Ausfallereignis.",
    "searchTags": [
      "Recovery Point Objective",
      "Recovery Point Objective",
      "RecoveryPointObjective",
      "Recovery Point Objective",
      "RecoveryPointObjective",
      "recovery point objective"
    ],
    "thesaurus": [
      "Recovery Point Objective",
      "RecoveryPointObjective",
      "recovery point objective"
    ]
  },
  {
    "id": "finance-voc-docmin-0025",
    "term": "Recovery Time Objective",
    "abbreviation": "RecoveryTimeObjective",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Zielgrenze für die Zeit, innerhalb derer ein definierter Dienst oder Datenbestand nach einem Ausfall wiederhergestellt werden soll.",
    "detailedExplanation": "Zielgrenze für die Zeit, innerhalb derer ein definierter Dienst oder Datenbestand nach einem Ausfall wiederhergestellt werden soll. Englische Entsprechung: Recovery Time Objective. Kanonischer Codebegriff: RecoveryTimeObjective.",
    "practicalExample": "„Recovery Time Objective“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Zielgrenze für die Zeit, innerhalb derer ein definierter Dienst oder Datenbestand nach einem Ausfall wiederhergestellt werden soll.",
    "searchTags": [
      "Recovery Time Objective",
      "Recovery Time Objective",
      "RecoveryTimeObjective",
      "Recovery Time Objective",
      "RecoveryTimeObjective",
      "recovery time objective"
    ],
    "thesaurus": [
      "Recovery Time Objective",
      "RecoveryTimeObjective",
      "recovery time objective"
    ]
  },
  {
    "id": "finance-voc-docmin-0026",
    "term": "Dokumentationshygiene",
    "abbreviation": "Documentation hygiene",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Prüfung und Pflege von Dokumentationsstruktur, Lifecycle, Referenzen und Konsistenz ohne die dokumentierten fachlichen Authorities neu zu definieren.",
    "detailedExplanation": "Prüfung und Pflege von Dokumentationsstruktur, Lifecycle, Referenzen und Konsistenz ohne die dokumentierten fachlichen Authorities neu zu definieren. Englische Entsprechung: Documentation hygiene. Kanonischer Codebegriff: DocumentationHygiene.",
    "practicalExample": "„Dokumentationshygiene“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Prüfung und Pflege von Dokumentationsstruktur, Lifecycle, Referenzen und Konsistenz ohne die dokumentierten fachlichen Authorities neu zu definieren.",
    "searchTags": [
      "Dokumentationshygiene",
      "Documentation hygiene",
      "DocumentationHygiene",
      "Documentation hygiene",
      "DocumentationHygiene",
      "Documentation Hygiene"
    ],
    "thesaurus": [
      "Documentation hygiene",
      "DocumentationHygiene",
      "Documentation Hygiene"
    ]
  },
  {
    "id": "finance-voc-docmin-0027",
    "term": "Semantische Aktualität",
    "abbreviation": "Semantic freshness",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Bewertung, ob die Bedeutung und Zustandsaussage eines Dokuments noch mit den relevanten aktuellen Quellen und Systemzuständen übereinstimmt.",
    "detailedExplanation": "Bewertung, ob die Bedeutung und Zustandsaussage eines Dokuments noch mit den relevanten aktuellen Quellen und Systemzuständen übereinstimmt. Englische Entsprechung: Semantic freshness. Kanonischer Codebegriff: SemanticFreshness.",
    "practicalExample": "„Semantische Aktualität“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Bewertung, ob die Bedeutung und Zustandsaussage eines Dokuments noch mit den relevanten aktuellen Quellen und Systemzuständen übereinstimmt.",
    "searchTags": [
      "Semantische Aktualität",
      "Semantic freshness",
      "SemanticFreshness",
      "Semantic freshness",
      "SemanticFreshness",
      "Semantic Freshness"
    ],
    "thesaurus": [
      "Semantic freshness",
      "SemanticFreshness",
      "Semantic Freshness"
    ]
  },
  {
    "id": "finance-voc-docmin-0028",
    "term": "Archiv-Retention",
    "abbreviation": "Archive retention",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Kontrollierte Aufbewahrungs- und Löschplanung für archivierte Dokumente und historische Evidence unter Erhalt notwendiger Provenance.",
    "detailedExplanation": "Kontrollierte Aufbewahrungs- und Löschplanung für archivierte Dokumente und historische Evidence unter Erhalt notwendiger Provenance. Englische Entsprechung: Archive retention. Kanonischer Codebegriff: ArchiveRetention.",
    "practicalExample": "„Archiv-Retention“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kontrollierte Aufbewahrungs- und Löschplanung für archivierte Dokumente und historische Evidence unter Erhalt notwendiger Provenance.",
    "searchTags": [
      "Archiv-Retention",
      "Archive retention",
      "ArchiveRetention",
      "Archive retention",
      "ArchiveRetention",
      "Archive Retention"
    ],
    "thesaurus": [
      "Archive retention",
      "ArchiveRetention",
      "Archive Retention"
    ]
  },
  {
    "id": "finance-voc-docmin-0029",
    "term": "Migrationsplanung",
    "abbreviation": "Migration planning",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Read-only Klassifikation und Planung von Migration, Redirect, Owner-Review oder Blockierung für Dokumente und Legacy-Oberflächen, bevor Dateien tatsächlich verändert werden.",
    "detailedExplanation": "Read-only Klassifikation und Planung von Migration, Redirect, Owner-Review oder Blockierung für Dokumente und Legacy-Oberflächen, bevor Dateien tatsächlich verändert werden. Englische Entsprechung: Migration planning. Kanonischer Codebegriff: MigrationPlanning.",
    "practicalExample": "„Migrationsplanung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Read-only Klassifikation und Planung von Migration, Redirect, Owner-Review oder Blockierung für Dokumente und Legacy-Oberflächen, bevor Dateien tatsächlich verändert werden.",
    "searchTags": [
      "Migrationsplanung",
      "Migration planning",
      "MigrationPlanning",
      "Migration planning",
      "MigrationPlanning",
      "Migration Planning"
    ],
    "thesaurus": [
      "Migration planning",
      "MigrationPlanning",
      "Migration Planning"
    ]
  },
  {
    "id": "finance-voc-docmin-0030",
    "term": "Technische Schuld",
    "abbreviation": "Technical debt",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Explizit erfasster technischer Verbesserungsbedarf, der Qualität, Wartbarkeit oder zukünftige Änderbarkeit beeinträchtigt, ohne unmittelbar einen Laufzeitfehler darstellen zu müssen.",
    "detailedExplanation": "Explizit erfasster technischer Verbesserungsbedarf, der Qualität, Wartbarkeit oder zukünftige Änderbarkeit beeinträchtigt, ohne unmittelbar einen Laufzeitfehler darstellen zu müssen. Englische Entsprechung: Technical debt. Kanonischer Codebegriff: TechnicalDebt.",
    "practicalExample": "„Technische Schuld“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Explizit erfasster technischer Verbesserungsbedarf, der Qualität, Wartbarkeit oder zukünftige Änderbarkeit beeinträchtigt, ohne unmittelbar einen Laufzeitfehler darstellen zu müssen.",
    "searchTags": [
      "Technische Schuld",
      "Technical debt",
      "TechnicalDebt",
      "Technical debt",
      "TechnicalDebt",
      "Technical Debt"
    ],
    "thesaurus": [
      "Technical debt",
      "TechnicalDebt",
      "Technical Debt"
    ]
  },
  {
    "id": "finance-voc-docmin-0031",
    "term": "Quality Gate",
    "abbreviation": "Quality gate",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Prüfgrenze, die Quality-Evidence nach definierten Regeln in Zustände wie PASS, FAIL oder NOT_AVAILABLE überführt.",
    "detailedExplanation": "Prüfgrenze, die Quality-Evidence nach definierten Regeln in Zustände wie PASS, FAIL oder NOT_AVAILABLE überführt. Englische Entsprechung: Quality gate. Kanonischer Codebegriff: QualityGate.",
    "practicalExample": "„Quality Gate“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Prüfgrenze, die Quality-Evidence nach definierten Regeln in Zustände wie PASS, FAIL oder NOT_AVAILABLE überführt.",
    "searchTags": [
      "Quality Gate",
      "Quality gate",
      "QualityGate",
      "Quality gate",
      "QualityGate",
      "Quality Gate"
    ],
    "thesaurus": [
      "Quality gate",
      "QualityGate",
      "Quality Gate"
    ]
  },
  {
    "id": "finance-voc-docmin-0032",
    "term": "Release-Kandidat",
    "abbreviation": "Release candidate",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Versionierter und evidenzgebundener Softwarestand oder Artefaktzustand, der für eine mögliche Release-Freigabe vorbereitet ist, aber noch nicht selbst den Release darstellt.",
    "detailedExplanation": "Versionierter und evidenzgebundener Softwarestand oder Artefaktzustand, der für eine mögliche Release-Freigabe vorbereitet ist, aber noch nicht selbst den Release darstellt. Englische Entsprechung: Release candidate. Kanonischer Codebegriff: ReleaseCandidate.",
    "practicalExample": "„Release-Kandidat“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Versionierter und evidenzgebundener Softwarestand oder Artefaktzustand, der für eine mögliche Release-Freigabe vorbereitet ist, aber noch nicht selbst den Release darstellt.",
    "searchTags": [
      "Release-Kandidat",
      "Release candidate",
      "ReleaseCandidate",
      "Release candidate",
      "ReleaseCandidate",
      "Release Candidate"
    ],
    "thesaurus": [
      "Release candidate",
      "ReleaseCandidate",
      "Release Candidate"
    ]
  },
  {
    "id": "finance-voc-docmin-0033",
    "term": "Deterministische Versionierung",
    "abbreviation": "Deterministic versioning",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Reproduzierbare Ableitung und Materialisierung einer Version aus gebundener Decision-Evidence und exakter Source-Identität.",
    "detailedExplanation": "Reproduzierbare Ableitung und Materialisierung einer Version aus gebundener Decision-Evidence und exakter Source-Identität. Englische Entsprechung: Deterministic versioning. Kanonischer Codebegriff: DeterministicVersioning.",
    "practicalExample": "„Deterministische Versionierung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Reproduzierbare Ableitung und Materialisierung einer Version aus gebundener Decision-Evidence und exakter Source-Identität.",
    "searchTags": [
      "Deterministische Versionierung",
      "Deterministic versioning",
      "DeterministicVersioning",
      "Deterministic versioning",
      "DeterministicVersioning",
      "Deterministic Versioning"
    ],
    "thesaurus": [
      "Deterministic versioning",
      "DeterministicVersioning",
      "Deterministic Versioning"
    ]
  },
  {
    "id": "finance-voc-docmin-0034",
    "term": "Reconciliation",
    "abbreviation": "Reconciliation",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Typisierter Abgleich zwischen erwartetem und beobachtetem Zustand, um Abweichungen explizit festzustellen und nachweisbar zu behandeln.",
    "detailedExplanation": "Typisierter Abgleich zwischen erwartetem und beobachtetem Zustand, um Abweichungen explizit festzustellen und nachweisbar zu behandeln. Englische Entsprechung: Reconciliation. Kanonischer Codebegriff: Reconciliation.",
    "practicalExample": "„Reconciliation“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Typisierter Abgleich zwischen erwartetem und beobachtetem Zustand, um Abweichungen explizit festzustellen und nachweisbar zu behandeln.",
    "searchTags": [
      "Reconciliation",
      "Reconciliation",
      "Reconciliation",
      "Reconciliation",
      "reconciliation",
      "RECONCILIATION"
    ],
    "thesaurus": [
      "Reconciliation",
      "reconciliation",
      "RECONCILIATION"
    ]
  },
  {
    "id": "finance-voc-docmin-0035",
    "term": "Order Intent",
    "abbreviation": "Order intent",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Kanonische typisierte Repräsentation einer beabsichtigten Order vor nachgelagerter Ausführung oder Persistenz.",
    "detailedExplanation": "Kanonische typisierte Repräsentation einer beabsichtigten Order vor nachgelagerter Ausführung oder Persistenz. Englische Entsprechung: Order intent. Kanonischer Codebegriff: OrderIntent.",
    "practicalExample": "„Order Intent“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kanonische typisierte Repräsentation einer beabsichtigten Order vor nachgelagerter Ausführung oder Persistenz.",
    "searchTags": [
      "Order Intent",
      "Order intent",
      "OrderIntent",
      "Order intent",
      "OrderIntent",
      "Order Intent"
    ],
    "thesaurus": [
      "Order intent",
      "OrderIntent",
      "Order Intent"
    ]
  },
  {
    "id": "finance-voc-docmin-0036",
    "term": "Positionsgrößenbestimmung",
    "abbreviation": "Position sizing",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Deterministische Bestimmung der Größe einer Position oder Allokation innerhalb definierter Portfolio- und Risikogrenzen.",
    "detailedExplanation": "Deterministische Bestimmung der Größe einer Position oder Allokation innerhalb definierter Portfolio- und Risikogrenzen. Englische Entsprechung: Position sizing. Kanonischer Codebegriff: PositionSizing.",
    "practicalExample": "„Positionsgrößenbestimmung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Deterministische Bestimmung der Größe einer Position oder Allokation innerhalb definierter Portfolio- und Risikogrenzen.",
    "searchTags": [
      "Positionsgrößenbestimmung",
      "Position sizing",
      "PositionSizing",
      "Position sizing",
      "PositionSizing",
      "Position Sizing"
    ],
    "thesaurus": [
      "Position sizing",
      "PositionSizing",
      "Position Sizing"
    ]
  },
  {
    "id": "finance-voc-docmin-0037",
    "term": "Portfolio-Risk-Evidence",
    "abbreviation": "Portfolio risk evidence",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Evidence-Projektion über Portfolio-Risikozustände, die Risiko nachvollziehbar macht, ohne eigenständig eine Ausführungsentscheidung zu autorisieren.",
    "detailedExplanation": "Evidence-Projektion über Portfolio-Risikozustände, die Risiko nachvollziehbar macht, ohne eigenständig eine Ausführungsentscheidung zu autorisieren. Englische Entsprechung: Portfolio risk evidence. Kanonischer Codebegriff: PortfolioRiskEvidence.",
    "practicalExample": "„Portfolio-Risk-Evidence“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Evidence-Projektion über Portfolio-Risikozustände, die Risiko nachvollziehbar macht, ohne eigenständig eine Ausführungsentscheidung zu autorisieren.",
    "searchTags": [
      "Portfolio-Risk-Evidence",
      "Portfolio risk evidence",
      "PortfolioRiskEvidence",
      "Portfolio risk evidence",
      "PortfolioRiskEvidence",
      "Portfolio Risk Evidence"
    ],
    "thesaurus": [
      "Portfolio risk evidence",
      "PortfolioRiskEvidence",
      "Portfolio Risk Evidence"
    ]
  },
  {
    "id": "finance-voc-docmin-0038",
    "term": "Quarantäne-Arbeitselement",
    "abbreviation": "Quarantine work item",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Supervisor-Zustand, der ein Arbeitselement von weiterer Ausführung zurückhält, bis der auslösende Risiko-, Dependency- oder Evidence-Zustand geklärt ist.",
    "detailedExplanation": "Supervisor-Zustand, der ein Arbeitselement von weiterer Ausführung zurückhält, bis der auslösende Risiko-, Dependency- oder Evidence-Zustand geklärt ist. Englische Entsprechung: Quarantine work item. Kanonischer Codebegriff: QuarantineWorkItem.",
    "practicalExample": "„Quarantäne-Arbeitselement“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Supervisor-Zustand, der ein Arbeitselement von weiterer Ausführung zurückhält, bis der auslösende Risiko-, Dependency- oder Evidence-Zustand geklärt ist.",
    "searchTags": [
      "Quarantäne-Arbeitselement",
      "Quarantine work item",
      "QuarantineWorkItem",
      "Quarantine work item",
      "QuarantineWorkItem",
      "Quarantine Work Item"
    ],
    "thesaurus": [
      "Quarantine work item",
      "QuarantineWorkItem",
      "Quarantine Work Item"
    ]
  },
  {
    "id": "finance-voc-docmin-0039",
    "term": "Retry-sichere Operation",
    "abbreviation": "Retry-safe operation",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Quant / Pro",
    "shortDefinition": "Operation, deren Vertrag eine kontrollierte Wiederholung erlaubt, ohne dadurch unzulässige doppelte Seiteneffekte zu erzeugen.",
    "detailedExplanation": "Operation, deren Vertrag eine kontrollierte Wiederholung erlaubt, ohne dadurch unzulässige doppelte Seiteneffekte zu erzeugen. Englische Entsprechung: Retry-safe operation. Kanonischer Codebegriff: RetrySafeOperation.",
    "practicalExample": "„Retry-sichere Operation“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Operation, deren Vertrag eine kontrollierte Wiederholung erlaubt, ohne dadurch unzulässige doppelte Seiteneffekte zu erzeugen.",
    "searchTags": [
      "Retry-sichere Operation",
      "Retry-safe operation",
      "RetrySafeOperation",
      "Retry-safe operation",
      "RetrySafeOperation",
      "Retry Safe Operation"
    ],
    "thesaurus": [
      "Retry-safe operation",
      "RetrySafeOperation",
      "Retry Safe Operation"
    ]
  },
  {
    "id": "finance-voc-aidev-0042",
    "term": "OWASP Application Security Verification Standard (ASVS)",
    "abbreviation": "OWASPASVS",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Externer, nicht repository-autorisierender OWASP-Standard mit prüfbaren Anforderungen zur Verifikation der Anwendungssicherheit; die aktuell stabile, für CAPITAL-AI referenzierte Version ist ASVS 5.0.0.",
    "detailedExplanation": "Externer, nicht repository-autorisierender OWASP-Standard mit prüfbaren Anforderungen zur Verifikation der Anwendungssicherheit; die aktuell stabile, für CAPITAL-AI referenzierte Version ist ASVS 5.0.0. Englische Entsprechung: OWASP Application Security Verification Standard (ASVS). Kanonischer Codebegriff: OWASPASVS.",
    "practicalExample": "„OWASP Application Security Verification Standard (ASVS)“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Externer, nicht repository-autorisierender OWASP-Standard mit prüfbaren Anforderungen zur Verifikation der Anwendungssicherheit; die aktuell stabile, für CAPITAL-AI referenzierte Version ist ASVS 5.0.0.",
    "searchTags": [
      "OWASP Application Security Verification Standard (ASVS)",
      "OWASP Application Security Verification Standard (ASVS)",
      "OWASPASVS",
      "OWASP Application Security Verification Standard (ASVS)",
      "OWASPASVS",
      "owasp application security verification standard (asvs)"
    ],
    "thesaurus": [
      "OWASP Application Security Verification Standard (ASVS)",
      "OWASPASVS",
      "owasp application security verification standard (asvs)"
    ]
  },
  {
    "id": "finance-voc-aidev-0043",
    "term": "ASVS-Verifikationsmatrix",
    "abbreviation": "ASVS verification matrix",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Quant / Pro",
    "shortDefinition": "Strukturierte, evidenzbasierte Zuordnung versionierter OWASP-ASVS-Anforderungen zu relevanten Security Controls, Implementierungen, Tests, Evidence, Verifikationsstatus und zuständigen Ownern; sie dient der Abdeckungs- und Gap-Analyse und ist weder ein eigener Sicherheitsstandard noch alleiniger Nachweis vollständiger ASVS-Konformität.",
    "detailedExplanation": "Strukturierte, evidenzbasierte Zuordnung versionierter OWASP-ASVS-Anforderungen zu relevanten Security Controls, Implementierungen, Tests, Evidence, Verifikationsstatus und zuständigen Ownern; sie dient der Abdeckungs- und Gap-Analyse und ist weder ein eigener Sicherheitsstandard noch alleiniger Nachweis vollständiger ASVS-Konformität. Englische Entsprechung: ASVS verification matrix. Kanonischer Codebegriff: ASVSVerificationMatrix.",
    "practicalExample": "„ASVS-Verifikationsmatrix“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Strukturierte, evidenzbasierte Zuordnung versionierter OWASP-ASVS-Anforderungen zu relevanten Security Controls, Implementierungen, Tests, Evidence, Verifikationsstatus und zuständigen Ownern; sie dient der Abdeckungs- und Gap-Analyse und ist weder ein eigener Sicherheitsstandard noch alleiniger Nachweis vollständiger ASVS-Konformität.",
    "searchTags": [
      "ASVS-Verifikationsmatrix",
      "ASVS verification matrix",
      "ASVSVerificationMatrix",
      "ASVS verification matrix",
      "ASVSVerificationMatrix",
      "ASVSVerification Matrix"
    ],
    "thesaurus": [
      "ASVS verification matrix",
      "ASVSVerificationMatrix",
      "ASVSVerification Matrix"
    ]
  },
  {
    "id": "finance-voc-pvc-0001",
    "term": "Agent Client",
    "abbreviation": "PvcAgentClient",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-01: Client- und Interaktionsgrenze für agentische Arbeit, Anfrageübergabe und nutzerseitige Steuerung.",
    "detailedExplanation": "PVC-01: Client- und Interaktionsgrenze für agentische Arbeit, Anfrageübergabe und nutzerseitige Steuerung. Englische Entsprechung: Agent Client. Kanonischer Codebegriff: PvcAgentClient.",
    "practicalExample": "„Agent Client“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-01: Client- und Interaktionsgrenze für agentische Arbeit, Anfrageübergabe und nutzerseitige Steuerung.",
    "searchTags": [
      "Agent Client",
      "Agent Client",
      "PvcAgentClient",
      "Agent Client",
      "PvcAgentClient",
      "Pvc Agent Client"
    ],
    "thesaurus": [
      "Agent Client",
      "PvcAgentClient",
      "Pvc Agent Client"
    ]
  },
  {
    "id": "finance-voc-pvc-0002",
    "term": "Kontrollierte Implementierung",
    "abbreviation": "Controlled Implementation",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-02: Scope-begrenzte Umsetzung von Änderungen unter Branch-, Validierungs-, Authority- und Gate-Regeln.",
    "detailedExplanation": "PVC-02: Scope-begrenzte Umsetzung von Änderungen unter Branch-, Validierungs-, Authority- und Gate-Regeln. Englische Entsprechung: Controlled Implementation. Kanonischer Codebegriff: PvcControlledImplementation.",
    "practicalExample": "„Kontrollierte Implementierung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-02: Scope-begrenzte Umsetzung von Änderungen unter Branch-, Validierungs-, Authority- und Gate-Regeln.",
    "searchTags": [
      "Kontrollierte Implementierung",
      "Controlled Implementation",
      "PvcControlledImplementation",
      "Controlled Implementation",
      "PvcControlledImplementation",
      "Pvc Controlled Implementation"
    ],
    "thesaurus": [
      "Controlled Implementation",
      "PvcControlledImplementation",
      "Pvc Controlled Implementation"
    ]
  },
  {
    "id": "finance-voc-pvc-0003",
    "term": "Dokumentations-Engine",
    "abbreviation": "Documentary Engine",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-03: Stufe für kontrollierte Dokumenterzeugung, Projektion und dokumentarische Nachweisführung.",
    "detailedExplanation": "PVC-03: Stufe für kontrollierte Dokumenterzeugung, Projektion und dokumentarische Nachweisführung. Englische Entsprechung: Documentary Engine. Kanonischer Codebegriff: PvcDocumentaryEngine.",
    "practicalExample": "„Dokumentations-Engine“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-03: Stufe für kontrollierte Dokumenterzeugung, Projektion und dokumentarische Nachweisführung.",
    "searchTags": [
      "Dokumentations-Engine",
      "Documentary Engine",
      "PvcDocumentaryEngine",
      "Documentary Engine",
      "PvcDocumentaryEngine",
      "Pvc Documentary Engine"
    ],
    "thesaurus": [
      "Documentary Engine",
      "PvcDocumentaryEngine",
      "Pvc Documentary Engine"
    ]
  },
  {
    "id": "finance-voc-pvc-0004",
    "term": "PVC-04 Supervisor",
    "abbreviation": "PvcSupervisor",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-04: Überwachende und koordinierende Projektstufe für zulässige Lifecycle- und Zustandsübergänge.",
    "detailedExplanation": "PVC-04: Überwachende und koordinierende Projektstufe für zulässige Lifecycle- und Zustandsübergänge. Englische Entsprechung: PVC-04 Supervisor. Kanonischer Codebegriff: PvcSupervisor.",
    "practicalExample": "„PVC-04 Supervisor“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-04: Überwachende und koordinierende Projektstufe für zulässige Lifecycle- und Zustandsübergänge.",
    "searchTags": [
      "PVC-04 Supervisor",
      "PVC-04 Supervisor",
      "PvcSupervisor",
      "PVC-04 Supervisor",
      "PvcSupervisor",
      "Pvc Supervisor"
    ],
    "thesaurus": [
      "PVC-04 Supervisor",
      "PvcSupervisor",
      "Pvc Supervisor"
    ]
  },
  {
    "id": "finance-voc-pvc-0005",
    "term": "Plattformdirektor",
    "abbreviation": "Platform Director",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-05: Governance- und Plattformsteuerungsstufe für projektübergreifende Richtungs-, Authority- und Konsistenzfragen.",
    "detailedExplanation": "PVC-05: Governance- und Plattformsteuerungsstufe für projektübergreifende Richtungs-, Authority- und Konsistenzfragen. Englische Entsprechung: Platform Director. Kanonischer Codebegriff: PvcPlatformDirector.",
    "practicalExample": "„Plattformdirektor“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-05: Governance- und Plattformsteuerungsstufe für projektübergreifende Richtungs-, Authority- und Konsistenzfragen.",
    "searchTags": [
      "Plattformdirektor",
      "Platform Director",
      "PvcPlatformDirector",
      "Platform Director",
      "PvcPlatformDirector",
      "Pvc Platform Director"
    ],
    "thesaurus": [
      "Platform Director",
      "PvcPlatformDirector",
      "Pvc Platform Director"
    ]
  },
  {
    "id": "finance-voc-pvc-0006",
    "term": "Versionsmanagement",
    "abbreviation": "Version Management",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-06: Stufe zur kontrollierten Verwaltung von Versionen, Identitäten und versionierten Zuständen.",
    "detailedExplanation": "PVC-06: Stufe zur kontrollierten Verwaltung von Versionen, Identitäten und versionierten Zuständen. Englische Entsprechung: Version Management. Kanonischer Codebegriff: PvcVersionManagement.",
    "practicalExample": "„Versionsmanagement“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-06: Stufe zur kontrollierten Verwaltung von Versionen, Identitäten und versionierten Zuständen.",
    "searchTags": [
      "Versionsmanagement",
      "Version Management",
      "PvcVersionManagement",
      "Version Management",
      "PvcVersionManagement",
      "Pvc Version Management"
    ],
    "thesaurus": [
      "Version Management",
      "PvcVersionManagement",
      "Pvc Version Management"
    ]
  },
  {
    "id": "finance-voc-pvc-0007",
    "term": "Release-Management",
    "abbreviation": "Release Management",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-07: Stufe zur kontrollierten Vorbereitung, Freigabe und Nachweisführung von Release-Kandidaten und Releases.",
    "detailedExplanation": "PVC-07: Stufe zur kontrollierten Vorbereitung, Freigabe und Nachweisführung von Release-Kandidaten und Releases. Englische Entsprechung: Release Management. Kanonischer Codebegriff: PvcReleaseManagement.",
    "practicalExample": "„Release-Management“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-07: Stufe zur kontrollierten Vorbereitung, Freigabe und Nachweisführung von Release-Kandidaten und Releases.",
    "searchTags": [
      "Release-Management",
      "Release Management",
      "PvcReleaseManagement",
      "Release Management",
      "PvcReleaseManagement",
      "Pvc Release Management"
    ],
    "thesaurus": [
      "Release Management",
      "PvcReleaseManagement",
      "Pvc Release Management"
    ]
  },
  {
    "id": "finance-voc-pvc-0008",
    "term": "Produktionsbetrieb",
    "abbreviation": "Production Operations",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-08: Stufe für kontrollierten produktiven Betrieb, Betriebsbereitschaft und zustandsverändernde Produktionsaktionen.",
    "detailedExplanation": "PVC-08: Stufe für kontrollierten produktiven Betrieb, Betriebsbereitschaft und zustandsverändernde Produktionsaktionen. Englische Entsprechung: Production Operations. Kanonischer Codebegriff: PvcProductionOperations.",
    "practicalExample": "„Produktionsbetrieb“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-08: Stufe für kontrollierten produktiven Betrieb, Betriebsbereitschaft und zustandsverändernde Produktionsaktionen.",
    "searchTags": [
      "Produktionsbetrieb",
      "Production Operations",
      "PvcProductionOperations",
      "Production Operations",
      "PvcProductionOperations",
      "Pvc Production Operations"
    ],
    "thesaurus": [
      "Production Operations",
      "PvcProductionOperations",
      "Pvc Production Operations"
    ]
  },
  {
    "id": "finance-voc-pvc-0009",
    "term": "UAI / Datenaufnahme",
    "abbreviation": "UAI / Data Ingestion",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-09: Stufe für universelle Asset-Identität und kontrollierte Aufnahme autorisierter Daten.",
    "detailedExplanation": "PVC-09: Stufe für universelle Asset-Identität und kontrollierte Aufnahme autorisierter Daten. Englische Entsprechung: UAI / Data Ingestion. Kanonischer Codebegriff: PvcUaiDataIngestion.",
    "practicalExample": "„UAI / Datenaufnahme“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-09: Stufe für universelle Asset-Identität und kontrollierte Aufnahme autorisierter Daten.",
    "searchTags": [
      "UAI / Datenaufnahme",
      "UAI / Data Ingestion",
      "PvcUaiDataIngestion",
      "UAI / Data Ingestion",
      "PvcUaiDataIngestion",
      "Pvc Uai Data Ingestion"
    ],
    "thesaurus": [
      "UAI / Data Ingestion",
      "PvcUaiDataIngestion",
      "Pvc Uai Data Ingestion"
    ]
  },
  {
    "id": "finance-voc-pvc-0010",
    "term": "Evidence-Management",
    "abbreviation": "Evidence Management",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-10: Stufe zur Erfassung, Bindung, Aufbewahrung und nachvollziehbaren Bereitstellung von Evidence.",
    "detailedExplanation": "PVC-10: Stufe zur Erfassung, Bindung, Aufbewahrung und nachvollziehbaren Bereitstellung von Evidence. Englische Entsprechung: Evidence Management. Kanonischer Codebegriff: PvcEvidenceManagement.",
    "practicalExample": "„Evidence-Management“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-10: Stufe zur Erfassung, Bindung, Aufbewahrung und nachvollziehbaren Bereitstellung von Evidence.",
    "searchTags": [
      "Evidence-Management",
      "Evidence Management",
      "PvcEvidenceManagement",
      "Evidence Management",
      "PvcEvidenceManagement",
      "Pvc Evidence Management"
    ],
    "thesaurus": [
      "Evidence Management",
      "PvcEvidenceManagement",
      "Pvc Evidence Management"
    ]
  },
  {
    "id": "finance-voc-pvc-0011",
    "term": "Datenqualität",
    "abbreviation": "Data Quality",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-11: Stufe zur Prüfung, Bewertung und Absicherung der Qualität eingehender und verarbeiteter Daten.",
    "detailedExplanation": "PVC-11: Stufe zur Prüfung, Bewertung und Absicherung der Qualität eingehender und verarbeiteter Daten. Englische Entsprechung: Data Quality. Kanonischer Codebegriff: PvcDataQuality.",
    "practicalExample": "„Datenqualität“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-11: Stufe zur Prüfung, Bewertung und Absicherung der Qualität eingehender und verarbeiteter Daten.",
    "searchTags": [
      "Datenqualität",
      "Data Quality",
      "PvcDataQuality",
      "Data Quality",
      "PvcDataQuality",
      "Pvc Data Quality"
    ],
    "thesaurus": [
      "Data Quality",
      "PvcDataQuality",
      "Pvc Data Quality"
    ]
  },
  {
    "id": "finance-voc-pvc-0012",
    "term": "Feature Engineering",
    "abbreviation": "PvcFeatureEngineering",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-12: Stufe zur kontrollierten Ableitung, Transformation und Klassifikation fachlicher Analysemerkmale.",
    "detailedExplanation": "PVC-12: Stufe zur kontrollierten Ableitung, Transformation und Klassifikation fachlicher Analysemerkmale. Englische Entsprechung: Feature Engineering. Kanonischer Codebegriff: PvcFeatureEngineering.",
    "practicalExample": "„Feature Engineering“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-12: Stufe zur kontrollierten Ableitung, Transformation und Klassifikation fachlicher Analysemerkmale.",
    "searchTags": [
      "Feature Engineering",
      "Feature Engineering",
      "PvcFeatureEngineering",
      "Feature Engineering",
      "PvcFeatureEngineering",
      "Pvc Feature Engineering"
    ],
    "thesaurus": [
      "Feature Engineering",
      "PvcFeatureEngineering",
      "Pvc Feature Engineering"
    ]
  },
  {
    "id": "finance-voc-pvc-0013",
    "term": "Scoring-Modelle",
    "abbreviation": "Scoring Models",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-13: Stufe für registrierte, versionierte und zulässige Modelle zur Erzeugung fachlicher Scores.",
    "detailedExplanation": "PVC-13: Stufe für registrierte, versionierte und zulässige Modelle zur Erzeugung fachlicher Scores. Englische Entsprechung: Scoring Models. Kanonischer Codebegriff: PvcScoringModels.",
    "practicalExample": "„Scoring-Modelle“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-13: Stufe für registrierte, versionierte und zulässige Modelle zur Erzeugung fachlicher Scores.",
    "searchTags": [
      "Scoring-Modelle",
      "Scoring Models",
      "PvcScoringModels",
      "Scoring Models",
      "PvcScoringModels",
      "Pvc Scoring Models"
    ],
    "thesaurus": [
      "Scoring Models",
      "PvcScoringModels",
      "Pvc Scoring Models"
    ]
  },
  {
    "id": "finance-voc-pvc-0014",
    "term": "Scoring-Orchestrierung",
    "abbreviation": "Scoring Orchestration",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-14: Stufe zur Auswahl und Koordination des zulässigen Scoring-Ausführungspfads.",
    "detailedExplanation": "PVC-14: Stufe zur Auswahl und Koordination des zulässigen Scoring-Ausführungspfads. Englische Entsprechung: Scoring Orchestration. Kanonischer Codebegriff: PvcScoringOrchestration.",
    "practicalExample": "„Scoring-Orchestrierung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-14: Stufe zur Auswahl und Koordination des zulässigen Scoring-Ausführungspfads.",
    "searchTags": [
      "Scoring-Orchestrierung",
      "Scoring Orchestration",
      "PvcScoringOrchestration",
      "Scoring Orchestration",
      "PvcScoringOrchestration",
      "Pvc Scoring Orchestration"
    ],
    "thesaurus": [
      "Scoring Orchestration",
      "PvcScoringOrchestration",
      "Pvc Scoring Orchestration"
    ]
  },
  {
    "id": "finance-voc-pvc-0015",
    "term": "Domainanalyse / Executor",
    "abbreviation": "Domain Analysis / Executor",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-15: Stufe für domänenspezifische Analyseausführung hinter der kanonischen Orchestrierungsgrenze.",
    "detailedExplanation": "PVC-15: Stufe für domänenspezifische Analyseausführung hinter der kanonischen Orchestrierungsgrenze. Englische Entsprechung: Domain Analysis / Executor. Kanonischer Codebegriff: PvcDomainAnalysisExecutor.",
    "practicalExample": "„Domainanalyse / Executor“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-15: Stufe für domänenspezifische Analyseausführung hinter der kanonischen Orchestrierungsgrenze.",
    "searchTags": [
      "Domainanalyse / Executor",
      "Domain Analysis / Executor",
      "PvcDomainAnalysisExecutor",
      "Domain Analysis / Executor",
      "PvcDomainAnalysisExecutor",
      "Pvc Domain Analysis Executor"
    ],
    "thesaurus": [
      "Domain Analysis / Executor",
      "PvcDomainAnalysisExecutor",
      "Pvc Domain Analysis Executor"
    ]
  },
  {
    "id": "finance-voc-pvc-0016",
    "term": "Kanonisches Scoring",
    "abbreviation": "Canonical Scoring",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-16: Stufe zur Erzeugung eines kanonischen, nachvollziehbaren und vergleichsfähigen Scoring-Ergebnisses.",
    "detailedExplanation": "PVC-16: Stufe zur Erzeugung eines kanonischen, nachvollziehbaren und vergleichsfähigen Scoring-Ergebnisses. Englische Entsprechung: Canonical Scoring. Kanonischer Codebegriff: PvcCanonicalScoring.",
    "practicalExample": "„Kanonisches Scoring“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-16: Stufe zur Erzeugung eines kanonischen, nachvollziehbaren und vergleichsfähigen Scoring-Ergebnisses.",
    "searchTags": [
      "Kanonisches Scoring",
      "Canonical Scoring",
      "PvcCanonicalScoring",
      "Canonical Scoring",
      "PvcCanonicalScoring",
      "Pvc Canonical Scoring"
    ],
    "thesaurus": [
      "Canonical Scoring",
      "PvcCanonicalScoring",
      "Pvc Canonical Scoring"
    ]
  },
  {
    "id": "finance-voc-pvc-0017",
    "term": "Ranking / Entscheidungsunterstützung",
    "abbreviation": "Ranking / Decision Support",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-17: Stufe zur fail-closed Prüfung der Ranking-Fähigkeit und zur nachgelagerten Entscheidungsunterstützung.",
    "detailedExplanation": "PVC-17: Stufe zur fail-closed Prüfung der Ranking-Fähigkeit und zur nachgelagerten Entscheidungsunterstützung. Englische Entsprechung: Ranking / Decision Support. Kanonischer Codebegriff: PvcRankingDecisionSupport.",
    "practicalExample": "„Ranking / Entscheidungsunterstützung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-17: Stufe zur fail-closed Prüfung der Ranking-Fähigkeit und zur nachgelagerten Entscheidungsunterstützung.",
    "searchTags": [
      "Ranking / Entscheidungsunterstützung",
      "Ranking / Decision Support",
      "PvcRankingDecisionSupport",
      "Ranking / Decision Support",
      "PvcRankingDecisionSupport",
      "Pvc Ranking Decision Support"
    ],
    "thesaurus": [
      "Ranking / Decision Support",
      "PvcRankingDecisionSupport",
      "Pvc Ranking Decision Support"
    ]
  },
  {
    "id": "finance-voc-pvc-0018",
    "term": "EventMesh / Traceability",
    "abbreviation": "PvcEventMeshTraceability",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Quant / Pro",
    "shortDefinition": "PVC-18: Stufe für entkoppelten Ereignistransport und nachvollziehbare Verknüpfung von Zuständen, Evidence und Ergebnissen.",
    "detailedExplanation": "PVC-18: Stufe für entkoppelten Ereignistransport und nachvollziehbare Verknüpfung von Zuständen, Evidence und Ergebnissen. Englische Entsprechung: EventMesh / Traceability. Kanonischer Codebegriff: PvcEventMeshTraceability.",
    "practicalExample": "„EventMesh / Traceability“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "PVC-18: Stufe für entkoppelten Ereignistransport und nachvollziehbare Verknüpfung von Zuständen, Evidence und Ergebnissen.",
    "searchTags": [
      "EventMesh / Traceability",
      "EventMesh / Traceability",
      "PvcEventMeshTraceability",
      "EventMesh / Traceability",
      "PvcEventMeshTraceability",
      "Pvc Event Mesh Traceability"
    ],
    "thesaurus": [
      "EventMesh / Traceability",
      "PvcEventMeshTraceability",
      "Pvc Event Mesh Traceability"
    ]
  },
  {
    "id": "mobile-android-webview",
    "term": "Android WebView",
    "abbreviation": "WebView",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Eingebettete Android-Browserkomponente, die im Mobile-Repository ausschließlich das lokale App-Bundle lädt.",
    "detailedExplanation": "Eingebettete Android-Browserkomponente, die im Mobile-Repository ausschließlich das lokale App-Bundle lädt. Englische Entsprechung: WebView. Kanonischer Codebegriff: android-webview.",
    "practicalExample": "„Android WebView“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Eingebettete Android-Browserkomponente, die im Mobile-Repository ausschließlich das lokale App-Bundle lädt.",
    "searchTags": [
      "Android WebView",
      "WebView",
      "android-webview",
      "WebView",
      "android-webview",
      "android webview"
    ],
    "thesaurus": [
      "WebView",
      "android-webview",
      "android webview"
    ]
  },
  {
    "id": "mobile-local-app-bundle",
    "term": "Lokales App-Bundle",
    "abbreviation": "Local app bundle",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "In der APK enthaltenes Web-Bundle, das ohne Netzwerkzugriff aus der lokalen Mobile-Origin geladen wird.",
    "detailedExplanation": "In der APK enthaltenes Web-Bundle, das ohne Netzwerkzugriff aus der lokalen Mobile-Origin geladen wird. Englische Entsprechung: Local app bundle. Kanonischer Codebegriff: local-app-bundle.",
    "practicalExample": "„Lokales App-Bundle“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "In der APK enthaltenes Web-Bundle, das ohne Netzwerkzugriff aus der lokalen Mobile-Origin geladen wird.",
    "searchTags": [
      "Lokales App-Bundle",
      "Local app bundle",
      "local-app-bundle",
      "Local app bundle",
      "local-app-bundle",
      "local app bundle"
    ],
    "thesaurus": [
      "Local app bundle",
      "local-app-bundle",
      "local app bundle"
    ]
  },
  {
    "id": "mobile-apk",
    "term": "APK",
    "abbreviation": "Android Package Kit",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Installierbares Android-Anwendungsartefakt der privaten CAPITAL-AI-Mobile-App.",
    "detailedExplanation": "Installierbares Android-Anwendungsartefakt der privaten CAPITAL-AI-Mobile-App. Englische Entsprechung: Android Package Kit. Kanonischer Codebegriff: apk.",
    "practicalExample": "„APK“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Installierbares Android-Anwendungsartefakt der privaten CAPITAL-AI-Mobile-App.",
    "searchTags": [
      "APK",
      "Android Package Kit",
      "apk",
      "Android Package Kit",
      "apk",
      "android package kit"
    ],
    "thesaurus": [
      "Android Package Kit",
      "apk",
      "android package kit"
    ]
  },
  {
    "id": "mobile-oidc",
    "term": "OIDC",
    "abbreviation": "OpenID Connect",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Authentifizierungsprotokoll für den externen Mobile-Login-Transfer.",
    "detailedExplanation": "Authentifizierungsprotokoll für den externen Mobile-Login-Transfer. Englische Entsprechung: OpenID Connect. Kanonischer Codebegriff: oidc.",
    "practicalExample": "„OIDC“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Authentifizierungsprotokoll für den externen Mobile-Login-Transfer.",
    "searchTags": [
      "OIDC",
      "OpenID Connect",
      "oidc",
      "OpenID Connect",
      "oidc",
      "openid connect"
    ],
    "thesaurus": [
      "OpenID Connect",
      "oidc",
      "openid connect"
    ]
  },
  {
    "id": "mobile-pkce",
    "term": "PKCE",
    "abbreviation": "Proof Key for Code Exchange",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "OAuth/OIDC-Schutzmechanismus, der den Mobile-Login-Transfer gegen abgefangene Authorization Codes absichert.",
    "detailedExplanation": "OAuth/OIDC-Schutzmechanismus, der den Mobile-Login-Transfer gegen abgefangene Authorization Codes absichert. Englische Entsprechung: Proof Key for Code Exchange. Kanonischer Codebegriff: pkce.",
    "practicalExample": "„PKCE“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "OAuth/OIDC-Schutzmechanismus, der den Mobile-Login-Transfer gegen abgefangene Authorization Codes absichert.",
    "searchTags": [
      "PKCE",
      "Proof Key for Code Exchange",
      "pkce",
      "Proof Key for Code Exchange",
      "pkce",
      "proof key for code exchange"
    ],
    "thesaurus": [
      "Proof Key for Code Exchange",
      "pkce",
      "proof key for code exchange"
    ]
  },
  {
    "id": "mobile-no-store",
    "term": "No-Store",
    "abbreviation": "Cache-Control: no-store",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Cache-Richtlinie für Authentifizierungs- und API-Antworten, die eine persistente Zwischenspeicherung verhindert.",
    "detailedExplanation": "Cache-Richtlinie für Authentifizierungs- und API-Antworten, die eine persistente Zwischenspeicherung verhindert. Englische Entsprechung: Cache-Control: no-store. Kanonischer Codebegriff: no-store.",
    "practicalExample": "„No-Store“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Cache-Richtlinie für Authentifizierungs- und API-Antworten, die eine persistente Zwischenspeicherung verhindert.",
    "searchTags": [
      "No-Store",
      "Cache-Control: no-store",
      "no-store",
      "Cache-Control: no-store",
      "no-store",
      "no store"
    ],
    "thesaurus": [
      "Cache-Control: no-store",
      "no-store",
      "no store"
    ]
  },
  {
    "id": "mobile-dom-storage",
    "term": "DOM-Speicher",
    "abbreviation": "DOM Storage",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Browser-Speicheroberfläche, die in der Mobile-WebView deaktiviert bleibt.",
    "detailedExplanation": "Browser-Speicheroberfläche, die in der Mobile-WebView deaktiviert bleibt. Englische Entsprechung: DOM Storage. Kanonischer Codebegriff: dom-storage.",
    "practicalExample": "„DOM-Speicher“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Browser-Speicheroberfläche, die in der Mobile-WebView deaktiviert bleibt.",
    "searchTags": [
      "DOM-Speicher",
      "DOM Storage",
      "dom-storage",
      "DOM Storage",
      "dom-storage",
      "dom storage"
    ],
    "thesaurus": [
      "DOM Storage",
      "dom-storage",
      "dom storage"
    ]
  },
  {
    "id": "mobile-client-cache",
    "term": "Client-Caching",
    "abbreviation": "Client cache",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Lokales Caching freigegebener statischer Bundle-Dateien mit kontrollierter Invalidierung bei APK-Updates.",
    "detailedExplanation": "Lokales Caching freigegebener statischer Bundle-Dateien mit kontrollierter Invalidierung bei APK-Updates. Englische Entsprechung: Client cache. Kanonischer Codebegriff: client-cache.",
    "practicalExample": "„Client-Caching“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Lokales Caching freigegebener statischer Bundle-Dateien mit kontrollierter Invalidierung bei APK-Updates.",
    "searchTags": [
      "Client-Caching",
      "Client cache",
      "client-cache",
      "Client cache",
      "client-cache",
      "client cache"
    ],
    "thesaurus": [
      "Client cache",
      "client-cache",
      "client cache"
    ]
  },
  {
    "id": "mobile-oss-provider-admission",
    "term": "OSS-Provider-Admission",
    "abbreviation": "OSS source admission",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Fail-closed Zulassung einer Marktdatenquelle erst nach nachgewiesener Software- und Datenrechts-Evidence.",
    "detailedExplanation": "Fail-closed Zulassung einer Marktdatenquelle erst nach nachgewiesener Software- und Datenrechts-Evidence. Englische Entsprechung: OSS source admission. Kanonischer Codebegriff: oss-provider-admission.",
    "practicalExample": "„OSS-Provider-Admission“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Fail-closed Zulassung einer Marktdatenquelle erst nach nachgewiesener Software- und Datenrechts-Evidence.",
    "searchTags": [
      "OSS-Provider-Admission",
      "OSS source admission",
      "oss-provider-admission",
      "OSS source admission",
      "oss-provider-admission",
      "oss provider admission"
    ],
    "thesaurus": [
      "OSS source admission",
      "oss-provider-admission",
      "oss provider admission"
    ]
  },
  {
    "id": "mobile-open-data-rights",
    "term": "Open-Data-Rechte",
    "abbreviation": "Open data rights",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Nachgewiesene Nutzungs-, Anzeige-, Replay- und Weiterverarbeitungsrechte für eine konkrete Marktdatenquelle.",
    "detailedExplanation": "Nachgewiesene Nutzungs-, Anzeige-, Replay- und Weiterverarbeitungsrechte für eine konkrete Marktdatenquelle. Englische Entsprechung: Open data rights. Kanonischer Codebegriff: open-data-rights.",
    "practicalExample": "„Open-Data-Rechte“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Nachgewiesene Nutzungs-, Anzeige-, Replay- und Weiterverarbeitungsrechte für eine konkrete Marktdatenquelle.",
    "searchTags": [
      "Open-Data-Rechte",
      "Open data rights",
      "open-data-rights",
      "Open data rights",
      "open-data-rights",
      "open data rights"
    ],
    "thesaurus": [
      "Open data rights",
      "open-data-rights",
      "open data rights"
    ]
  },
  {
    "id": "mobile-market-adapter-boundary",
    "term": "Market-Adapter-Grenze",
    "abbreviation": "Market adapter boundary",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Validierende Adaptergrenze für Zeitraster, Duplikate, Lücken, Aktualität, OHLCV und Quellen-Evidence.",
    "detailedExplanation": "Validierende Adaptergrenze für Zeitraster, Duplikate, Lücken, Aktualität, OHLCV und Quellen-Evidence. Englische Entsprechung: Market adapter boundary. Kanonischer Codebegriff: market-adapter-boundary.",
    "practicalExample": "„Market-Adapter-Grenze“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Validierende Adaptergrenze für Zeitraster, Duplikate, Lücken, Aktualität, OHLCV und Quellen-Evidence.",
    "searchTags": [
      "Market-Adapter-Grenze",
      "Market adapter boundary",
      "market-adapter-boundary",
      "Market adapter boundary",
      "market-adapter-boundary",
      "market adapter boundary"
    ],
    "thesaurus": [
      "Market adapter boundary",
      "market-adapter-boundary",
      "market adapter boundary"
    ]
  },
  {
    "id": "mobile-local-scoring",
    "term": "Lokales Mobile-Scoring",
    "abbreviation": "Local mobile scoring",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Scoring-Ausführung direkt im Mobile-Bundle mit dem migrierten Crypto-Scoring-Kern statt über die Webanwendung.",
    "detailedExplanation": "Scoring-Ausführung direkt im Mobile-Bundle mit dem migrierten Crypto-Scoring-Kern statt über die Webanwendung. Englische Entsprechung: Local mobile scoring. Kanonischer Codebegriff: local-scoring.",
    "practicalExample": "„Lokales Mobile-Scoring“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Scoring-Ausführung direkt im Mobile-Bundle mit dem migrierten Crypto-Scoring-Kern statt über die Webanwendung.",
    "searchTags": [
      "Lokales Mobile-Scoring",
      "Local mobile scoring",
      "local-scoring",
      "Local mobile scoring",
      "local-scoring",
      "local scoring"
    ],
    "thesaurus": [
      "Local mobile scoring",
      "local-scoring",
      "local scoring"
    ]
  },
  {
    "id": "mobile-crypto-technical-provenance",
    "term": "Crypto Technical Provenance",
    "abbreviation": "crypto-technical-provenance",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Versionierte Provenance des aus Finance migrierten technischen Crypto-Scoring-Kerns.",
    "detailedExplanation": "Versionierte Provenance des aus Finance migrierten technischen Crypto-Scoring-Kerns. Englische Entsprechung: crypto-technical-provenance. Kanonischer Codebegriff: crypto-technical-provenance.",
    "practicalExample": "„Crypto Technical Provenance“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Versionierte Provenance des aus Finance migrierten technischen Crypto-Scoring-Kerns.",
    "searchTags": [
      "Crypto Technical Provenance",
      "crypto-technical-provenance",
      "crypto-technical-provenance",
      "crypto-technical-provenance",
      "crypto technical provenance",
      "CRYPTO-TECHNICAL-PROVENANCE"
    ],
    "thesaurus": [
      "crypto-technical-provenance",
      "crypto technical provenance",
      "CRYPTO-TECHNICAL-PROVENANCE"
    ]
  },
  {
    "id": "mobile-dynamic-weight-renormalization",
    "term": "Dynamische Gewichtsrenormalisierung",
    "abbreviation": "Dynamic weight renormalization",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Neunormierung der Scoring-Gewichte, wenn einzelne Faktoren keine ausreichende Evidence besitzen.",
    "detailedExplanation": "Neunormierung der Scoring-Gewichte, wenn einzelne Faktoren keine ausreichende Evidence besitzen. Englische Entsprechung: Dynamic weight renormalization. Kanonischer Codebegriff: dynamic-weight-renormalization.",
    "practicalExample": "„Dynamische Gewichtsrenormalisierung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Neunormierung der Scoring-Gewichte, wenn einzelne Faktoren keine ausreichende Evidence besitzen.",
    "searchTags": [
      "Dynamische Gewichtsrenormalisierung",
      "Dynamic weight renormalization",
      "dynamic-weight-renormalization",
      "Dynamic weight renormalization",
      "dynamic-weight-renormalization",
      "dynamic weight renormalization"
    ],
    "thesaurus": [
      "Dynamic weight renormalization",
      "dynamic-weight-renormalization",
      "dynamic weight renormalization"
    ]
  },
  {
    "id": "mobile-data-quality-risk",
    "term": "Data Quality Risk",
    "abbreviation": "data_quality_risk",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Invertierter Risikofaktor des Mobile-Scorers zur Berücksichtigung unzureichender Datenqualität.",
    "detailedExplanation": "Invertierter Risikofaktor des Mobile-Scorers zur Berücksichtigung unzureichender Datenqualität. Englische Entsprechung: data_quality_risk. Kanonischer Codebegriff: data-quality-risk.",
    "practicalExample": "„Data Quality Risk“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Invertierter Risikofaktor des Mobile-Scorers zur Berücksichtigung unzureichender Datenqualität.",
    "searchTags": [
      "Data Quality Risk",
      "data_quality_risk",
      "data-quality-risk",
      "data_quality_risk",
      "data-quality-risk",
      "data quality risk"
    ],
    "thesaurus": [
      "data_quality_risk",
      "data-quality-risk",
      "data quality risk"
    ]
  },
  {
    "id": "mobile-release-signing",
    "term": "Release-Signierung",
    "abbreviation": "Release signing",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Kryptographische Signierung der Release-APK mit der unveränderlichen bestehenden Signing-Identity.",
    "detailedExplanation": "Kryptographische Signierung der Release-APK mit der unveränderlichen bestehenden Signing-Identity. Englische Entsprechung: Release signing. Kanonischer Codebegriff: release-signing.",
    "practicalExample": "„Release-Signierung“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Kryptographische Signierung der Release-APK mit der unveränderlichen bestehenden Signing-Identity.",
    "searchTags": [
      "Release-Signierung",
      "Release signing",
      "release-signing",
      "Release signing",
      "release-signing",
      "release signing"
    ],
    "thesaurus": [
      "Release signing",
      "release-signing",
      "release signing"
    ]
  },
  {
    "id": "mobile-signing-identity",
    "term": "Signing-Identity",
    "abbreviation": "Release identity",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Stabile Kombination aus Package und Zertifikatsidentität, die für updatefähige Android-Releases erhalten bleiben muss.",
    "detailedExplanation": "Stabile Kombination aus Package und Zertifikatsidentität, die für updatefähige Android-Releases erhalten bleiben muss. Englische Entsprechung: Release identity. Kanonischer Codebegriff: signing-identity.",
    "practicalExample": "„Signing-Identity“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Stabile Kombination aus Package und Zertifikatsidentität, die für updatefähige Android-Releases erhalten bleiben muss.",
    "searchTags": [
      "Signing-Identity",
      "Release identity",
      "signing-identity",
      "Release identity",
      "signing-identity",
      "signing identity"
    ],
    "thesaurus": [
      "Release identity",
      "signing-identity",
      "signing identity"
    ]
  },
  {
    "id": "mobile-zipalign",
    "term": "zipalign",
    "abbreviation": "APK alignment",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Android-Build-Schritt zur vorgeschriebenen Ausrichtung des APK vor der Signierung.",
    "detailedExplanation": "Android-Build-Schritt zur vorgeschriebenen Ausrichtung des APK vor der Signierung. Englische Entsprechung: APK alignment. Kanonischer Codebegriff: zipalign.",
    "practicalExample": "„zipalign“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Android-Build-Schritt zur vorgeschriebenen Ausrichtung des APK vor der Signierung.",
    "searchTags": [
      "zipalign",
      "APK alignment",
      "zipalign",
      "APK alignment",
      "zipalign",
      "apk alignment"
    ],
    "thesaurus": [
      "APK alignment",
      "zipalign",
      "apk alignment"
    ]
  },
  {
    "id": "mobile-apksigner",
    "term": "apksigner",
    "abbreviation": "Android APK signer",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Android-Werkzeug zur Signierung und Verifikation der Release-APK und ihrer Signature Schemes.",
    "detailedExplanation": "Android-Werkzeug zur Signierung und Verifikation der Release-APK und ihrer Signature Schemes. Englische Entsprechung: Android APK signer. Kanonischer Codebegriff: apksigner.",
    "practicalExample": "„apksigner“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Android-Werkzeug zur Signierung und Verifikation der Release-APK und ihrer Signature Schemes.",
    "searchTags": [
      "apksigner",
      "Android APK signer",
      "apksigner",
      "Android APK signer",
      "apksigner",
      "android apk signer"
    ],
    "thesaurus": [
      "Android APK signer",
      "apksigner",
      "android apk signer"
    ]
  },
  {
    "id": "mobile-source-secret-scan",
    "term": "Source Secret Scan",
    "abbreviation": "Secret scanning",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Prüfung des Quellstands auf eingebettete Zugangsdaten oder andere Secrets vor einer Release-Freigabe.",
    "detailedExplanation": "Prüfung des Quellstands auf eingebettete Zugangsdaten oder andere Secrets vor einer Release-Freigabe. Englische Entsprechung: Secret scanning. Kanonischer Codebegriff: source-secret-scan.",
    "practicalExample": "„Source Secret Scan“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Prüfung des Quellstands auf eingebettete Zugangsdaten oder andere Secrets vor einer Release-Freigabe.",
    "searchTags": [
      "Source Secret Scan",
      "Secret scanning",
      "source-secret-scan",
      "Secret scanning",
      "source-secret-scan",
      "source secret scan"
    ],
    "thesaurus": [
      "Secret scanning",
      "source-secret-scan",
      "source secret scan"
    ]
  },
  {
    "id": "mobile-live-universe-gate",
    "term": "Live-Universe-Gate",
    "abbreviation": "Live universe gate",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Release-Gate, das reale zugelassene Asset- und Marktdatenabdeckung statt lokaler Fixtures verlangt.",
    "detailedExplanation": "Release-Gate, das reale zugelassene Asset- und Marktdatenabdeckung statt lokaler Fixtures verlangt. Englische Entsprechung: Live universe gate. Kanonischer Codebegriff: live-universe-gate.",
    "practicalExample": "„Live-Universe-Gate“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Release-Gate, das reale zugelassene Asset- und Marktdatenabdeckung statt lokaler Fixtures verlangt.",
    "searchTags": [
      "Live-Universe-Gate",
      "Live universe gate",
      "live-universe-gate",
      "Live universe gate",
      "live-universe-gate",
      "live universe gate"
    ],
    "thesaurus": [
      "Live universe gate",
      "live-universe-gate",
      "live universe gate"
    ]
  },
  {
    "id": "mobile-synthetic-fixture",
    "term": "Synthetische Fixture",
    "abbreviation": "Synthetic fixture",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Lokale Testdatenmenge für Browser- und Scoring-Prüfungen, die keine reale Produktionsabdeckung belegt.",
    "detailedExplanation": "Lokale Testdatenmenge für Browser- und Scoring-Prüfungen, die keine reale Produktionsabdeckung belegt. Englische Entsprechung: Synthetic fixture. Kanonischer Codebegriff: synthetic-fixture.",
    "practicalExample": "„Synthetische Fixture“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Lokale Testdatenmenge für Browser- und Scoring-Prüfungen, die keine reale Produktionsabdeckung belegt.",
    "searchTags": [
      "Synthetische Fixture",
      "Synthetic fixture",
      "synthetic-fixture",
      "Synthetic fixture",
      "synthetic-fixture",
      "synthetic fixture"
    ],
    "thesaurus": [
      "Synthetic fixture",
      "synthetic-fixture",
      "synthetic fixture"
    ]
  },
  {
    "id": "mobile-perpetual-instrument",
    "term": "Perpetual-Instrument",
    "abbreviation": "Perpetual contract",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Unbefristetes Derivateinstrument, das zusätzlich zu Basis-Assets geführt und nicht als Spot-Ersatz gezählt wird.",
    "detailedExplanation": "Unbefristetes Derivateinstrument, das zusätzlich zu Basis-Assets geführt und nicht als Spot-Ersatz gezählt wird. Englische Entsprechung: Perpetual contract. Kanonischer Codebegriff: perpetual-instrument.",
    "practicalExample": "„Perpetual-Instrument“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Unbefristetes Derivateinstrument, das zusätzlich zu Basis-Assets geführt und nicht als Spot-Ersatz gezählt wird.",
    "searchTags": [
      "Perpetual-Instrument",
      "Perpetual contract",
      "perpetual-instrument",
      "Perpetual contract",
      "perpetual-instrument",
      "perpetual instrument"
    ],
    "thesaurus": [
      "Perpetual contract",
      "perpetual-instrument",
      "perpetual instrument"
    ]
  },
  {
    "id": "mobile-mark-price",
    "term": "Mark Price",
    "abbreviation": "Mark price",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Referenzpreis eines Perpetual-Kontrakts für Bewertung und Risikologik, getrennt vom letzten gehandelten Preis.",
    "detailedExplanation": "Referenzpreis eines Perpetual-Kontrakts für Bewertung und Risikologik, getrennt vom letzten gehandelten Preis. Englische Entsprechung: Mark price. Kanonischer Codebegriff: mark-price.",
    "practicalExample": "„Mark Price“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Referenzpreis eines Perpetual-Kontrakts für Bewertung und Risikologik, getrennt vom letzten gehandelten Preis.",
    "searchTags": [
      "Mark Price",
      "Mark price",
      "mark-price",
      "Mark price",
      "mark-price",
      "mark price"
    ],
    "thesaurus": [
      "Mark price",
      "mark-price",
      "mark price"
    ]
  },
  {
    "id": "mobile-funding-rate",
    "term": "Funding Rate",
    "abbreviation": "Funding rate",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Periodische Finanzierungsrate eines Perpetual-Kontrakts zwischen Long- und Short-Seite.",
    "detailedExplanation": "Periodische Finanzierungsrate eines Perpetual-Kontrakts zwischen Long- und Short-Seite. Englische Entsprechung: Funding rate. Kanonischer Codebegriff: funding-rate.",
    "practicalExample": "„Funding Rate“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Periodische Finanzierungsrate eines Perpetual-Kontrakts zwischen Long- und Short-Seite.",
    "searchTags": [
      "Funding Rate",
      "Funding rate",
      "funding-rate",
      "Funding rate",
      "funding-rate",
      "funding rate"
    ],
    "thesaurus": [
      "Funding rate",
      "funding-rate",
      "funding rate"
    ]
  },
  {
    "id": "mobile-open-interest",
    "term": "Open Interest",
    "abbreviation": "Open interest",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Quant / Pro",
    "shortDefinition": "Summe der offenen Derivatepositionen eines Instruments zu einem Beobachtungszeitpunkt.",
    "detailedExplanation": "Summe der offenen Derivatepositionen eines Instruments zu einem Beobachtungszeitpunkt. Englische Entsprechung: Open interest. Kanonischer Codebegriff: open-interest.",
    "practicalExample": "„Open Interest“ wird in CAPITAL-AI als definierter Fachbegriff verwendet; konkrete Ausprägung und Ausführung bleiben an den jeweils validierten Produkt-, Runtime- und Governance-Zustand gebunden.",
    "keyTakeaway": "Summe der offenen Derivatepositionen eines Instruments zu einem Beobachtungszeitpunkt.",
    "searchTags": [
      "Open Interest",
      "Open interest",
      "open-interest",
      "Open interest",
      "open-interest",
      "open interest"
    ],
    "thesaurus": [
      "Open interest",
      "open-interest",
      "open interest"
    ]
  }
]);

export const QUANT_PRO_IDS = Object.freeze(new Set(QUANT_PRO_TERMS.map(term => term.id)));
