/** Shared, publicly readable learning definitions. No protected entitlement payload or live-provider state. */
// Domain taxonomy and skill tiers are projected by src/data/vocabularyData.ts.
export const ARCHITECTURE_GOVERNANCE_VOCABULARY = Object.freeze([
  {
    "id": "learning-governance-as-code",
    "term": "Governance as Code",
    "category": "DELIVERY_GOVERNANCE",
    "categoryLabel": "Delivery & Governance",
    "level": "Fortgeschritten",
    "shortDefinition": "Governance-Vorgaben werden als versionierte, prüfbare Regeln und automatisierte Entscheidungen in Entwicklungs- und Betriebsabläufe übertragen.",
    "detailedExplanation": "Umfasst mehr als einzelne Verbote: Zuständigkeiten, Nachweise, Risikoentscheidungen und nachvollziehbare Freigabegrenzen können technisch beschrieben und geprüft werden. Code ersetzt weder anwendbares Recht noch menschliche Verantwortung.",
    "formulaOrRule": "Governance-Regel + überprüfbarer Input → begründete Entscheidung und Evidence.",
    "practicalExample": "Eine CI-Prüfung meldet für eine geplante Veröffentlichung fehlende Nachweise, ohne zusätzliche Produktrechte zu erteilen.",
    "keyTakeaway": "Governance as Code macht Regeln reproduzierbar, nicht automatisch rechtlich verbindlich.",
    "searchTags": [
      "Governance as Code",
      "programmierbare Governance",
      "Governance-Automatisierung",
      "regelbasierte Steuerung",
      "gac",
      "governance"
    ],
    "thesaurus": [
      "programmierbare Governance",
      "Governance-Automatisierung",
      "regelbasierte Steuerung"
    ],
    "sources": [
      {
        "title": "HashiCorp – Policy as Code",
        "url": "https://developer.hashicorp.com/sentinel/docs/concepts/policy-as-code"
      }
    ]
  },
  {
    "id": "learning-policy-as-code",
    "term": "Policy as Code",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Fortgeschritten",
    "shortDefinition": "Sicherheits- oder Betriebsrichtlinien werden als maschinenlesbarer, versionierbarer und testbarer Code formuliert.",
    "detailedExplanation": "Deklarative Regeln können Eingaben wie Deployments, Berechtigungen oder Infrastrukturpläne bewerten. Eine Policy-Engine trifft Entscheidungen; die Anwendung muss die Ablehnung weiterhin zuverlässig durchsetzen.",
    "formulaOrRule": "Policy(Input) → allow / deny / begründetes Ergebnis.",
    "practicalExample": "Ein Deployment-Test blockiert eine Ressource mit unzulässiger öffentlicher Freigabe, bevor sie provisioniert wird.",
    "keyTakeaway": "Eine Policy-Entscheidung ist nur wirksam, wenn ihre Durchsetzung gesichert ist.",
    "searchTags": [
      "Policy as Code",
      "PaC",
      "Richtlinie als Code",
      "Policy-Automatisierung",
      "rego",
      "policy"
    ],
    "thesaurus": [
      "PaC",
      "Richtlinie als Code",
      "Policy-Automatisierung"
    ],
    "sources": [
      {
        "title": "Open Policy Agent",
        "url": "https://www.openpolicyagent.org/docs"
      }
    ]
  },
  {
    "id": "learning-rego",
    "term": "Rego",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Fortgeschritten",
    "shortDefinition": "Deklarative Policy-Sprache des Open Policy Agent (OPA) zur Auswertung strukturierter Eingaben.",
    "detailedExplanation": "Rego-Regeln beschreiben Bedingungen für Erlaubnis, Verbot oder Validierung über JSON-artige Daten. Die Sprache wird bei der Policy-Auswertung verwendet und ist kein universeller Authentifizierungsmechanismus.",
    "formulaOrRule": "Eingabedaten + Rego-Regel → Policy-Entscheidung.",
    "practicalExample": "Eine Rego-Regel erlaubt nur Deployments, deren Container-Images aus einer freigegebenen Registry stammen.",
    "keyTakeaway": "Rego beschreibt Entscheidungen; Integration und Enforcement bleiben gesonderte Aufgaben.",
    "searchTags": [
      "Rego",
      "OPA-Policy-Sprache",
      "Rego Policy Language",
      "regelbasierte Policy-Abfrage",
      "opa"
    ],
    "thesaurus": [
      "OPA-Policy-Sprache",
      "Rego Policy Language",
      "regelbasierte Policy-Abfrage"
    ],
    "sources": [
      {
        "title": "Open Policy Agent",
        "url": "https://www.openpolicyagent.org/docs"
      }
    ]
  },
  {
    "id": "learning-abac",
    "term": "Attribute-Based Access Control (ABAC)",
    "category": "SECURITY_COMPLIANCE",
    "categoryLabel": "Security & Compliance",
    "level": "Fortgeschritten",
    "shortDefinition": "Zugriffsentscheidungen beruhen auf Attributen von Subjekt, Ressource, Aktion und Umgebung.",
    "detailedExplanation": "Im Gegensatz zur ausschließlichen Rollenprüfung kann ABAC beispielsweise Tenant-ID, Ressourcenbesitz und Kontext gleichzeitig auswerten. Die Regeln müssen serverseitig durchgesetzt werden.",
    "formulaOrRule": "allow ⇔ Subjekt-, Ressourcen-, Aktions- und Kontextattribute erfüllen die Policy.",
    "practicalExample": "Eine Notiz darf nur gelesen werden, wenn die authentifizierte Tenant-ID mit der Ressource übereinstimmt.",
    "keyTakeaway": "ABAC ist feingranular, verlangt aber klare Attributherkunft und sichere Durchsetzung.",
    "searchTags": [
      "Attribute-Based Access Control (ABAC)",
      "attributbasierte Zugriffskontrolle",
      "Attribute-Based Authorization",
      "kontextbasierte Autorisierung",
      "tenant",
      "authz"
    ],
    "thesaurus": [
      "attributbasierte Zugriffskontrolle",
      "Attribute-Based Authorization",
      "kontextbasierte Autorisierung"
    ],
    "sources": [
      {
        "title": "Open Policy Agent",
        "url": "https://www.openpolicyagent.org/docs"
      }
    ]
  },
  {
    "id": "learning-kappa-architecture",
    "term": "Kappa-Architektur",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Fortgeschritten",
    "shortDefinition": "Datenarchitektur mit einem einheitlichen Stream-Verarbeitungspfad über ein dauerhaftes, wiederabspielbares Ereignisprotokoll.",
    "detailedExplanation": "Historische Neubewertungen erfolgen durch Replay des unveränderlichen Logs statt durch eine zweite Batch-Codebasis. Das setzt ausreichend lange Aufbewahrung, geordnete Events und replayfähige Verarbeiter voraus.",
    "formulaOrRule": "Event-Log → Stream-Verarbeitung → materialisierte Sicht; Neuberechnung durch Replay.",
    "practicalExample": "Eine synthetische Kursereignisfolge wird mit einer korrigierten Transformationsregel erneut eingespielt und eine neue Auswertung erzeugt.",
    "keyTakeaway": "Kappa reduziert doppelte Batch-/Stream-Logik, benötigt aber verlässliches Replay.",
    "searchTags": [
      "Kappa-Architektur",
      "Kappa Architecture",
      "Stream-only Architecture",
      "Single-Stream-Architektur",
      "stream",
      "replay"
    ],
    "thesaurus": [
      "Kappa Architecture",
      "Stream-only Architecture",
      "Single-Stream-Architektur"
    ],
    "sources": [
      {
        "title": "Microsoft Architecture Center – Kappa",
        "url": "https://github.com/microsoftdocs/architecture-center/blob/main/docs/databases/guide/big-data-architectures.md"
      }
    ]
  },
  {
    "id": "learning-lambda-architecture",
    "term": "Lambda-Architektur",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Fortgeschritten",
    "shortDefinition": "Big-Data-Architektur, die historische Batch-Berechnung und schnelle Stream-Verarbeitung getrennt kombiniert.",
    "detailedExplanation": "Ein Batch-Layer erzeugt umfassende historische Sichtweisen; ein Speed-Layer ergänzt zeitnahe Daten. Das kann Flexibilität schaffen, aber doppelte fachliche Logik und Wartungskosten verursachen.",
    "formulaOrRule": "Batch-Layer + Speed-Layer → zusammengeführte Abfrageansicht.",
    "practicalExample": "Ein Bericht kombiniert nächtlich gerechnete Historie mit den seitdem eintreffenden synthetischen Ereignissen.",
    "keyTakeaway": "Lambda und Kappa sind alternative Verarbeitungsmuster, keine KI-Agentenframeworks.",
    "searchTags": [
      "Lambda-Architektur",
      "Lambda Architecture",
      "Batch-and-Speed-Architektur",
      "Dual-Path-Processing",
      "batch",
      "stream"
    ],
    "thesaurus": [
      "Lambda Architecture",
      "Batch-and-Speed-Architektur",
      "Dual-Path-Processing"
    ],
    "sources": [
      {
        "title": "Microsoft Architecture Center – Kappa",
        "url": "https://github.com/microsoftdocs/architecture-center/blob/main/docs/databases/guide/big-data-architectures.md"
      }
    ]
  },
  {
    "id": "learning-event-sourcing",
    "term": "Event Sourcing",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Fortgeschritten",
    "shortDefinition": "Anwendungszustand wird aus einer unveränderlichen Folge fachlicher Ereignisse rekonstruiert.",
    "detailedExplanation": "Statt ausschließlich den letzten Zustand zu speichern, werden Zustandsänderungen als Ereignisse festgehalten. Projektionen und Snapshots beschleunigen das Lesen; Löschung und Datenschutz erfordern ein geeignetes Konzept.",
    "formulaOrRule": "aktueller Zustand = fold(Ereignisse, Anfangszustand).",
    "practicalExample": "Ein hypothetisches Lernkonto rekonstruiert Fortschritt aus Ereignissen wie LektionGestartet und LektionAbgeschlossen.",
    "keyTakeaway": "Ein Ereignislog unterstützt Nachvollziehbarkeit, ist aber nicht automatisch ein Audit- oder Backup-Ersatz.",
    "searchTags": [
      "Event Sourcing",
      "ereignisbasierte Zustandsspeicherung",
      "Event-Log-Persistenz",
      "ereignisgetriebene Persistenz",
      "event log",
      "replay"
    ],
    "thesaurus": [
      "ereignisbasierte Zustandsspeicherung",
      "Event-Log-Persistenz",
      "ereignisgetriebene Persistenz"
    ],
    "sources": [
      {
        "title": "Microsoft Architecture Center – Kappa",
        "url": "https://github.com/microsoftdocs/architecture-center/blob/main/docs/databases/guide/big-data-architectures.md"
      }
    ]
  },
  {
    "id": "learning-change-data-capture",
    "term": "Change Data Capture (CDC)",
    "category": "DATA_EVIDENCE",
    "categoryLabel": "Daten & Evidence",
    "level": "Fortgeschritten",
    "shortDefinition": "Erfassung von Datenbankänderungen als Folge von Insert-, Update- oder Delete-Ereignissen.",
    "detailedExplanation": "CDC kann Änderungen aus Transaktionslogs oder vergleichbaren Quellen an nachgelagerte Verbraucher übertragen. Reihenfolge, Schemawechsel, Duplikate und Datenschutz müssen berücksichtigt werden.",
    "formulaOrRule": "Datenbankänderung → Änderungsereignis → berechtigte Downstream-Projektion.",
    "practicalExample": "Eine Kundenstatusänderung aktualisiert eine separate Reporting-Sicht, ohne Volltabellen ständig abzurufen.",
    "keyTakeaway": "CDC überträgt Änderungen, nicht automatisch deren fachliche Bedeutung oder Nutzungsrechte.",
    "searchTags": [
      "Change Data Capture (CDC)",
      "Änderungsdatenerfassung",
      "Database Change Feed",
      "Change Stream",
      "postgres",
      "data"
    ],
    "thesaurus": [
      "Änderungsdatenerfassung",
      "Database Change Feed",
      "Change Stream"
    ],
    "sources": [
      {
        "title": "Debezium – Change Data Capture",
        "url": "https://debezium.io/documentation/"
      }
    ]
  },
  {
    "id": "learning-materialized-view",
    "term": "Materialisierte Sicht",
    "category": "DATA_EVIDENCE",
    "categoryLabel": "Daten & Evidence",
    "level": "Fortgeschritten",
    "shortDefinition": "Gespeichertes Abfrageergebnis, das für schnelle Zugriffe berechnet und später aktualisiert wird.",
    "detailedExplanation": "Im Unterschied zu einer gewöhnlichen View werden Ergebnisse physisch vorgehalten. Bei Event-Streams entstehen solche Projektionen fortlaufend oder durch erneute Berechnung; ihre Aktualität muss kenntlich sein.",
    "formulaOrRule": "Quelle + Transformationsregel → persistierte Leseprojektion.",
    "practicalExample": "Ein Reporting-Dashboard liest vorberechnete Tagesaggregationen statt jede Transaktion neu zu summieren.",
    "keyTakeaway": "Schnelle Abfragen benötigen eine dokumentierte Aktualisierungs- und Konsistenzregel.",
    "searchTags": [
      "Materialisierte Sicht",
      "Materialized View",
      "vorberechnete Sicht",
      "persistierte Projektion",
      "projection",
      "analytics"
    ],
    "thesaurus": [
      "Materialized View",
      "vorberechnete Sicht",
      "persistierte Projektion"
    ],
    "sources": [
      {
        "title": "Microsoft Architecture Center – Kappa",
        "url": "https://github.com/microsoftdocs/architecture-center/blob/main/docs/databases/guide/big-data-architectures.md"
      }
    ]
  },
  {
    "id": "learning-backpressure",
    "term": "Backpressure",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Fortgeschritten",
    "shortDefinition": "Mechanismus, der Datenproduzenten bei überlasteten Verbrauchern drosselt oder die Annahme begrenzt.",
    "detailedExplanation": "Wenn Producer schneller liefern als Consumer verarbeiten können, wachsen Warteschlangen. Backpressure, begrenzte Puffer und klare Überlaststrategien verhindern unkontrollierte Ressourcenbindung.",
    "formulaOrRule": "Eingangsrate > Verarbeitungsrate → drosseln, puffern oder definiert zurückweisen.",
    "practicalExample": "Ein Import-Worker limitiert die Zahl zeitgleicher Aufgaben, während eine langsame Datenbank aufholt.",
    "keyTakeaway": "Ohne Überlastkontrolle wird ein schneller Stream zum Speicher- und Verfügbarkeitsrisiko.",
    "searchTags": [
      "Backpressure",
      "Rückstaukontrolle",
      "Flusskontrolle",
      "Überlaststeuerung",
      "queue",
      "stream"
    ],
    "thesaurus": [
      "Rückstaukontrolle",
      "Flusskontrolle",
      "Überlaststeuerung"
    ],
    "sources": [
      {
        "title": "Microsoft Architecture Center – Kappa",
        "url": "https://github.com/microsoftdocs/architecture-center/blob/main/docs/databases/guide/big-data-architectures.md"
      }
    ]
  },
  {
    "id": "learning-data-contract",
    "term": "Datenvertrag (Data Contract)",
    "category": "DATA_EVIDENCE",
    "categoryLabel": "Daten & Evidence",
    "level": "Fortgeschritten",
    "shortDefinition": "Verbindlich beschriebenes Schema samt Semantik, Qualität, Aktualität und Verantwortlichkeiten für ausgetauschte Daten.",
    "detailedExplanation": "Ein Datenvertrag spezifiziert unter anderem Feldtypen, Einheit, Zeitpunkt, Nullverhalten und gegebenenfalls Rechte. Änderungen sollten versioniert und gegen Consumer-Kompatibilität geprüft werden.",
    "formulaOrRule": "Schema + Semantik + Qualitätsregeln + Version → prüfbare Datenübergabe.",
    "practicalExample": "Ein synthetischer QuoteFact verlangt Symbol, Währung, Event-Zeit und dokumentierte Quellenberechtigung.",
    "keyTakeaway": "Ein gültiges JSON-Schema allein beweist noch keine Datenqualität oder Weitergaberechte.",
    "searchTags": [
      "Datenvertrag (Data Contract)",
      "Data Contract",
      "Schnittstellen-Datenvertrag",
      "Schema-Vertrag",
      "dq",
      "schema"
    ],
    "thesaurus": [
      "Data Contract",
      "Schnittstellen-Datenvertrag",
      "Schema-Vertrag"
    ],
    "sources": [
      {
        "title": "Microsoft Architecture Center – Kappa",
        "url": "https://github.com/microsoftdocs/architecture-center/blob/main/docs/databases/guide/big-data-architectures.md"
      }
    ]
  },
  {
    "id": "learning-data-lineage",
    "term": "Data Lineage",
    "category": "DATA_EVIDENCE",
    "categoryLabel": "Daten & Evidence",
    "level": "Fortgeschritten",
    "shortDefinition": "Nachvollziehbare Verarbeitungskette von einer Datenquelle über Transformationen bis zur Verwendung in einem Ergebnis.",
    "detailedExplanation": "Lineage dokumentiert Herkunft, Zeitbezug, Regeln und Verarbeitungsschritte. Für Scoring müssen tatsächliche Datenquellen von lediglich konfigurierten Provider-Abhängigkeiten getrennt werden.",
    "formulaOrRule": "Source → Transformation(en) → Feature → Ergebnis + Provenance.",
    "practicalExample": "Eine Demo-Score-Erklärung verknüpft einen Faktor mit der verwendeten synthetischen Beobachtung und Transformationsversion.",
    "keyTakeaway": "Lineage beschreibt tatsächliche Verarbeitung, nicht bloß eine geplante Datenpipeline.",
    "searchTags": [
      "Data Lineage",
      "Daten-Abstammung",
      "Datenverarbeitungskette",
      "Herkunftslinie",
      "provenance",
      "evidence"
    ],
    "thesaurus": [
      "Daten-Abstammung",
      "Datenverarbeitungskette",
      "Herkunftslinie"
    ],
    "sources": [
      {
        "title": "Microsoft Architecture Center – Kappa",
        "url": "https://github.com/microsoftdocs/architecture-center/blob/main/docs/databases/guide/big-data-architectures.md"
      }
    ]
  },
  {
    "id": "learning-langgraph-architecture",
    "term": "LangGraph-Architektur",
    "category": "AI_MODELS",
    "categoryLabel": "KI & Scoring-Modelle",
    "level": "Fortgeschritten",
    "shortDefinition": "Zustandsbasierte Orchestrierung von KI-Agenten als Graph aus State, Nodes und Edges.",
    "detailedExplanation": "LangGraph modelliert Aufgaben als Zustandsgraph; Knoten führen Logik aus, Kanten steuern Übergänge, bei Bedarf bedingt oder zyklisch. Optionales Checkpointing ermöglicht Unterbrechung und Wiederaufnahme. Es ist kein Ersatz für Zugriffsrechte oder Governance.",
    "formulaOrRule": "State + Nodes + Edges → kontrollierter Workflow.",
    "practicalExample": "Ein Content-Agent prüft einen Entwurf, fordert bei unklarem Rechtebeleg eine menschliche Entscheidung und führt danach nur zulässige Schritte aus.",
    "keyTakeaway": "LangGraph steuert Agentenabläufe; Kappa-Architektur verarbeitet Ereignisdatenströme.",
    "searchTags": [
      "LangGraph-Architektur",
      "LangGraph",
      "LangGraph Framework",
      "Stateful Agent Graph",
      "land graph",
      "agent orchestrierung"
    ],
    "thesaurus": [
      "LangGraph",
      "LangGraph Framework",
      "Stateful Agent Graph"
    ],
    "sources": [
      {
        "title": "LangGraph – Graph API",
        "url": "https://langchain-ai.github.io/langgraph/concepts/low_level/"
      }
    ]
  },
  {
    "id": "learning-stategraph",
    "term": "StateGraph",
    "category": "AI_MODELS",
    "categoryLabel": "KI & Scoring-Modelle",
    "level": "Fortgeschritten",
    "shortDefinition": "Graph-Modell, in dem Agentenknoten einen gemeinsamen typisierten Zustand lesen und aktualisieren.",
    "detailedExplanation": "Der Zustand bildet die gemeinsame Arbeitsgrundlage; Nodes berechnen Updates und bedingte Edges wählen Folgeknoten. Ein StateGraph ist eine Ablaufmodellierung, keine autonome Genehmigung für Tool-Aufrufe.",
    "formulaOrRule": "State(t+1) = Update(State(t), Node-Ausgabe).",
    "practicalExample": "Ein Recherche-Node schreibt geprüfte Quellen in den gemeinsamen Status; ein Review-Node wählt den nächsten Schritt.",
    "keyTakeaway": "Expliziter Zustand macht Agentenpfade prüfbarer und wiederholbar.",
    "searchTags": [
      "StateGraph",
      "State Graph",
      "Zustandsgraph",
      "Agenten-Zustandsmodell",
      "nodes",
      "edges"
    ],
    "thesaurus": [
      "State Graph",
      "Zustandsgraph",
      "Agenten-Zustandsmodell"
    ],
    "sources": [
      {
        "title": "LangGraph – Graph API",
        "url": "https://langchain-ai.github.io/langgraph/concepts/low_level/"
      }
    ]
  },
  {
    "id": "learning-checkpointing",
    "term": "Checkpointing",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Fortgeschritten",
    "shortDefinition": "Speichern eines konsistenten Zwischenzustands, damit eine Verarbeitung nach Unterbrechung fortgesetzt werden kann.",
    "detailedExplanation": "Ein Checkpoint hält z. B. Agent-State, Verarbeitungsschritt und Thread-Kontext fest. Er reduziert Wiederholungsaufwand, ersetzt aber keine Berechtigungsprüfung, vollständige Sicherung oder Idempotenz.",
    "formulaOrRule": "Checkpoint(State, Schritt) → persistierter Wiederaufnahmepunkt.",
    "practicalExample": "Nach einem unterbrochenen redaktionellen Review lädt ein Agent seinen gesicherten Stand und setzt den Workflow kontrolliert fort.",
    "keyTakeaway": "Checkpointing ist Wiederaufnahmefähigkeit, nicht automatische Fehlerfreiheit.",
    "searchTags": [
      "Checkpointing",
      "Zustandssicherung",
      "Wiederaufnahmepunkt",
      "Checkpoint-Persistenz",
      "resume",
      "thread"
    ],
    "thesaurus": [
      "Zustandssicherung",
      "Wiederaufnahmepunkt",
      "Checkpoint-Persistenz"
    ],
    "sources": [
      {
        "title": "LangGraph – Checkpointers",
        "url": "https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/checkpointers.mdx"
      }
    ]
  },
  {
    "id": "learning-human-in-the-loop",
    "term": "Human-in-the-Loop (HITL)",
    "category": "AI_MODELS",
    "categoryLabel": "KI & Scoring-Modelle",
    "level": "Fortgeschritten",
    "shortDefinition": "Workflow-Muster, in dem Menschen definierte Entscheidungen, Korrekturen oder Freigaben übernehmen.",
    "detailedExplanation": "Ein Prozess wird an einer fachlich begründeten Stelle unterbrochen und nach expliziter Rückmeldung fortgesetzt. HITL darf nicht als beliebiges zusätzliches Governance-Gate ohne Grund eingeführt werden.",
    "formulaOrRule": "Agentenvorschlag → menschliche Prüfung → autorisierte Fortsetzung.",
    "practicalExample": "Ein Entwurf mit unklaren Nutzungsrechten bleibt bis zur Prüfung unveröffentlicht.",
    "keyTakeaway": "Menschliche Kontrolle ist ein definierter Eingriffspunkt, keine pauschale Automatisierungssperre.",
    "searchTags": [
      "Human-in-the-Loop (HITL)",
      "Human Review",
      "Mensch-in-der-Schleife",
      "Human Oversight",
      "agent",
      "approval"
    ],
    "thesaurus": [
      "Human Review",
      "Mensch-in-der-Schleife",
      "Human Oversight"
    ],
    "sources": [
      {
        "title": "LangGraph – Checkpointers",
        "url": "https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/checkpointers.mdx"
      }
    ]
  },
  {
    "id": "learning-occ-v2",
    "term": "OCC v2 (Optimistic Concurrency Control)",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Fortgeschritten",
    "shortDefinition": "Versioniertes Verfahren für konfliktfreie konkurrierende Änderungen durch atomaren Vergleich einer erwarteten Revision.",
    "detailedExplanation": "Bei optimistischer Nebenläufigkeitskontrolle liest ein Client Zustand plus Revision. Ein Schreibvorgang ist nur erfolgreich, wenn die erwartete Revision noch aktuell ist. OCC v2 benennt hier den projektspezifischen Revisionsvertrag für private Notizen, keinen universellen Industriestandard; PR #548 ist gesondert zu verifizieren.",
    "formulaOrRule": "UPDATE nur wenn stored_revision = expected_revision; danach revision := revision + 1.",
    "practicalExample": "Zwei Geräte lesen Revision 7. Das erste schreibt Revision 8; das zweite erhält einen Konflikt statt die Änderung zu überschreiben.",
    "keyTakeaway": "OCC v2 verhindert Lost Updates nur bei serverseitig atomarem Vergleich und Update.",
    "searchTags": [
      "OCC v2 (Optimistic Concurrency Control)",
      "Optimistische Nebenläufigkeitskontrolle",
      "Optimistic Concurrency Control",
      "Revisionsbasierte Schreibkontrolle",
      "occ",
      "revision",
      "notes"
    ],
    "thesaurus": [
      "Optimistische Nebenläufigkeitskontrolle",
      "Optimistic Concurrency Control",
      "Revisionsbasierte Schreibkontrolle"
    ],
    "sources": [
      {
        "title": "Capital-AI – OCC-v2-Implementierung",
        "url": "https://github.com/SvenKulessa/Capital-AI/pull/548"
      }
    ]
  },
  {
    "id": "learning-compare-and-swap",
    "term": "Compare-and-Swap (CAS)",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Fortgeschritten",
    "shortDefinition": "Atomare Operation, die einen Wert nur ändert, wenn sein aktueller Zustand dem erwarteten Wert entspricht.",
    "detailedExplanation": "CAS vereint Vergleich und Schreiben ohne Zeitfenster dazwischen. Bei Versionsspalten wird dieselbe Idee als bedingtes Update genutzt; ein separates vorheriges Lesen reicht nicht.",
    "formulaOrRule": "CAS(expected, new) = Erfolg genau dann, wenn current = expected.",
    "practicalExample": "Ein privater Notizdatensatz wird nur bei Revision 12 aktualisiert; bei Revision 13 schlägt der Schreibversuch fehl.",
    "keyTakeaway": "Vergleich und Mutation müssen in einer atomaren Transaktion stattfinden.",
    "searchTags": [
      "Compare-and-Swap (CAS)",
      "CAS",
      "atomarer Vergleichstausch",
      "Compare and Set",
      "atomic update",
      "revision"
    ],
    "thesaurus": [
      "CAS",
      "atomarer Vergleichstausch",
      "Compare and Set"
    ],
    "sources": [
      {
        "title": "Capital-AI – OCC-v2-Implementierung",
        "url": "https://github.com/SvenKulessa/Capital-AI/pull/548"
      }
    ]
  },
  {
    "id": "learning-revision-token",
    "term": "Revisions-Token",
    "category": "PLATFORM_ARCHITECTURE",
    "categoryLabel": "Plattform & Architektur",
    "level": "Fortgeschritten",
    "shortDefinition": "Versionskennung einer Ressource, die Schreibvorbedingungen bei konkurrierenden Updates prüfbar macht.",
    "detailedExplanation": "Eine Revision kann als Zähler oder opaker Token übermittelt werden. Der Server vergleicht sie vor der Mutation. Fehlt eine verpflichtende Schreibvorbedingung, ist je nach API-Vertrag eine Ablehnung wie HTTP 428 sinnvoll.",
    "formulaOrRule": "If-Match / expectedRevision = aktuelle Version erforderlich.",
    "practicalExample": "Das Smartphone sendet beim Speichern expectedRevision=15; der Server lehnt ältere Versionsstände ab.",
    "keyTakeaway": "Ohne vertrauenswürdige serverseitige Revisionsprüfung schützt ein Token nicht vor Überschreiben.",
    "searchTags": [
      "Revisions-Token",
      "Versionstoken",
      "Concurrency Token",
      "Optimistic Lock Version",
      "etag",
      "if-match",
      "428"
    ],
    "thesaurus": [
      "Versionstoken",
      "Concurrency Token",
      "Optimistic Lock Version"
    ],
    "sources": [
      {
        "title": "MDN – HTTP 409 Conflict",
        "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/409"
      }
    ]
  },
  {
    "id": "learning-lost-update",
    "term": "Lost Update",
    "category": "DATA_EVIDENCE",
    "categoryLabel": "Daten & Evidence",
    "level": "Fortgeschritten",
    "shortDefinition": "Nebenläufigkeitsfehler, bei dem eine spätere Änderung eine zwischenzeitlich gespeicherte Änderung unbemerkt überschreibt.",
    "detailedExplanation": "Zwei Clients lesen denselben Ausgangszustand und speichern anschließend unterschiedliche Änderungen. Ohne Konflikterkennung geht eine Änderung verloren. Revision/CAS und eine geeignete Konfliktauflösung verhindern stille Datenverluste.",
    "formulaOrRule": "Zwei Writes auf gleicher Ausgangsrevision → Konflikt statt stilles Überschreiben.",
    "practicalExample": "Tablet und Smartphone ändern gleichzeitig denselben Notiztext. Das spätere Speichern muss einen Konflikt melden.",
    "keyTakeaway": "Konfliktmeldungen schützen nur, wenn der Client die Situation sauber auflöst.",
    "searchTags": [
      "Lost Update",
      "Verlorenes Update",
      "stilles Überschreiben",
      "Write-Write-Konflikt",
      "concurrency",
      "conflict"
    ],
    "thesaurus": [
      "Verlorenes Update",
      "stilles Überschreiben",
      "Write-Write-Konflikt"
    ],
    "sources": [
      {
        "title": "MDN – HTTP 409 Conflict",
        "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/409"
      }
    ]
  }
]);
