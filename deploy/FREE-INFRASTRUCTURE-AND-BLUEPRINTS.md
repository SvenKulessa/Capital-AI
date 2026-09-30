# Kostenfreie Infrastruktur und Blueprint-Abgleich

Datum: 2026-09-30. Scope: SvenKulessa/Capital-AI, Render AICapital, Service Capital-AI. NATS-Kosten und -Konfiguration ausdrücklich nicht freigegeben. Keine neue Plattform, Datenbank, Queue oder kostenpflichtige Ressource eingerichtet.

## Valkey-Anschluss und Kosten

- `capital-ai-market-cache` (`red-dau61kvavr4c73fr1plg`): available, Free, Frankfurt, Valkey 8.1.10, allkeys_lru, persistence off, externe IP-Liste leer. Webservice `srv-dau1rp893c1s73cdhm1g`: Free, Frankfurt, Repo SvenKulessa/Capital-AI.
- `REDIS_URL` am bestätigten Webservice per Merge-Update gesetzt; vorhandene Secrets erhalten. Interne URL gemäß dokumentiertem Render-Format aus der bestätigten Instanz-ID abgeleitet. Keine Zugangsdaten veröffentlicht oder externe Cache-Zugriffe aktiviert. Die Connector-Antwort bestätigt die Änderung, bietet aber keinen Env-Readback.
- Env-Update hat einen API-Deploy ausgelöst (`dep-dau6euhsrm7s73avobk0`), der wie der manuelle Deploy davor (`dep-dau6e17avr4c73fsirb0`) scheiterte: `"/shared": not found`. Ursache: `.dockerignore` schloss benötigte Docker-COPY-Quellen aus. Die Allowlist-Korrektur wurde inzwischen separat durch PR #21 auf Main gemergt. Dieser Valkey-PR übernimmt den neuen Main unverändert und enthält keine weitere Docker-Kontextänderung.
- Das bisherige Backend öffnete ohne NATS auch Redis nicht. Die Änderung verbindet den Cache unabhängig: Status Redis connected / NATS unavailable / degraded. Wiederholte Versuche nutzen eine gesunde Cache-Verbindung weiter. Marktdatenaufnahme und Evidence-Ausgabe bleiben ohne dauerhaften Speicher gesperrt.
- Keine zusätzlichen Cache-Plan- oder privaten Transferkosten zwischen diesen Diensten in Frankfurt. Free Webservices verbrauchen jedoch Workspace-Kontingente für Betriebsstunden, Build-Minuten und öffentliche Bandbreite. Nach Verbrauch können Build-/Bandbreitenkosten bei hinterlegtem Zahlungsmittel entstehen. Aktueller Billing-Verbrauch, Spend-Limits und Zahlungsmittel sind durch die verfügbaren Connector-Operationen nicht belegt; eine gesamte Null-Euro-Rechnung ist damit nicht garantiert.
- Free Valkey kann bei Neustart Daten verlieren; 25 MB und 50 Verbindungen sind die dokumentierten Free-Grenzen. Cache ist weder Archiv noch alleiniger Queue-/Evidence-Speicher.

Die Änderung wurde mit echtem lokalem Redis geprüft: Cache-only-Verbindung, Wiederverwendung, persist/read/replay ohne NATS gesperrt. Der bestehende Redis-/JetStream-Integrationstest und Replay nach NATS-Prozessneustart bestehen weiterhin. Das ist kein Nachweis für die produktive Render-Verbindung. Nach Merge und dem vom Owner ausgeführten Deploy muss `/api/market/status` Redis connected zeigen; NATS unavailable bleibt erwartbar. Kein weiterer Deploy oder Workflow in diesem PR gestartet.

## Kostenfreie Alternativen zu einem gehosteten NATS-Dienst

| Alternative | Kostenloser Umfang | Eignung und Grenze |
| --- | --- | --- |
| Vorhandenes Valkey Pub/Sub | Innerhalb des bestehenden Free-Caches | Flüchtiger Fan-out. Keine Zustellung an abwesende Subscriber, kein dauerhaftes Journal. Redis Streams im selben flüchtigen Cache lösen den Datenverlust nicht. Kein Ersatz für die bisherige JetStream-Evidence. |
| Cloudflare Queues, Workers Free | 10.000 Operationen/Tag, 24 h Aufbewahrung | Asynchrone Jobs, News-/Filing-Batches. Üblicherweise drei Operationen pro Nachricht: ca. 3.333 kleine Nachrichten/Tag vor Retries, keine Tick-für-Tick-Archivierung. Keine langfristige Evidence-Aufbewahrung. Neuer Account und Adapter nötig. |
| PostgreSQL-Evidence + transaktionale Outbox, z. B. Neon Free | 0,5 GB Speicher/Projekt; weitere Compute-/Transferquoten beachten | Empfohlene Alternative für einen kleinen Pilot: validierte Facts und Outbox atomar committen, anschließend Cache aktualisieren; Worker quittiert idempotent. Kein NATS nötig. Separate Implementierung, Speicherbudget, Lösch-/Archivierungsstrategie und Restore-Test nötig. Kein WORM-/HA-Nachweis. |
| NATS lokal auf eigener vorhandener Hardware | Software ohne Lizenzgebühr | Dauerhafter Speicher selbst betreiben. Hardware, Strom, Erreichbarkeit, TLS, Backups und Betrieb sind nicht automatisch kostenlos. Kein kostenloser persistenter NATS Private Service auf Render. |

Empfehlung: Valkey als Cache behalten; für Pilot-Evidence einen kostenlosen PostgreSQL-Dienst mit Outbox evaluieren. Queue erst ergänzen, wenn unabhängige Jobs benötigt werden. Keinen zweiten Redis-Dienst für dieselbe Cache-Aufgabe einführen. Das aktuelle NATS-spezifische Evidence-ID-/Replay-Protokoll muss für einen PostgreSQL-Adapter explizit versioniert und getestet werden; bloßes Austauschen einer URL genügt nicht.

## Abgleich der sieben Blueprints

Quelle: `src/data/studioData.ts` (16 Datenkonzepte, sieben Blueprints), `src/components/ArchitecturePage.tsx`, ARCH-PIPE-0002 und aktueller Backend-Code. Die dortigen SLA-, Latenz-, Kosten- und Compliance-Angaben sind Plan-/Beispielwerte, keine Messung oder Zertifizierung. ARCH-PIPE-0001 ist historisch: Aussagen wie „kein Backend“, „kein NATS-Client“ und „kein render.yaml“ beschreiben den aktuellen Main nicht mehr.

| Blueprint | Weitere benötigte Anschlüsse | Priorität / vorhandene Grenze |
| --- | --- | --- |
| TIER_1_4_LIVE | Valkey, Provider-Quotes, dauerhafter Evidence-Writer; später SSE/WebSocket-Egress | Cache jetzt konfigurieren. Binance/Kraken-Ingress im Code; produktiver Lauf nicht verifiziert. Kein eigenständiger kostenpflichtiger Worker nötig für den ersten Pilot. |
| AUTHORITY_PLANE | Persistenter Evidence-/Konfigurationsspeicher, mindestens drei vergleichbare Provider-Facts | Höchste nächste Priorität: PostgreSQL + Outbox. Gleiche Instrument-/Venue-/Währungsidentität prüfen; BTCUSD und BTCUSDT nicht als homogene Konsensdaten behandeln. Keine automatische BaFin-/MiCA-Freigabe. |
| HYBRID | Persistente OHLCV-/Feature-Historie, Aggregation und versionierte Berechnungen | PostgreSQL reicht für kleine Pilotdaten; TimescaleDB nicht automatisch voraussetzen. Bestehende Quotes enthalten keine vollständige Historie. |
| MIXED_DOMAIN | Aktienprovider mit belegten Nutzungsrechten; FRED/ECB-Makroadapter; Asset-Master | Quotes optional Twelve Data/Polygon via Secrets; keine vollständige Multi-Asset-Versorgung. Makroadapter nicht produktiv implementiert. Jede Quota und Redistribution-Lizenz separat prüfen. |
| PARALLEL_HOMOGENEOUS | Zusätzlicher passender Coinbase-Adapter, gleiche Paare, Sequenz-/Zeit-/Outlier-Gates | Im aktuellen Backend nur Binance BTCUSDT und Kraken BTCUSD. Mehr Anbieter allein erzeugen weder korrekten Konsens noch Hochverfügbarkeit. |
| PARALLEL_MIXED | L2-Snapshot/Deltas, News/RSS, SEC-EDGAR-Companyfacts, versionierte Sentiment-Inferenz | Zunächst SEC + ausgewählte RSS-Quellen als Batch; Backend-Adapter und Evidence fehlen. Gemini optional und separat budgetiert; Inferenz ist keine Rohbeobachtung. |
| INDIVIDUAL_PACKAGE | SEC/Fundamentals, periodengenaue Restatements, Feature-Historie, Screener-Read-Model | Günstiger nächster fachlicher Slice: Fundamentals ohne Tickstream. SEC-Adapter ist derzeit explizit „not configured“. Moat-Rating bleibt Inferenz, keine SEC-Fact. |

## Zuordnung aller 16 Datenkonzepte

| Konzepte | Service-/Implementierungsbedarf |
| --- | --- |
| 1 Tiered Live Data; 4 Parallel Homogeneous; 10 Snapshot + Delta | Vorhandener BFF + Valkey; passende Provideradapter, L2-/Sequenzvalidierung und echte Egress-Strecke ergänzen. |
| 2 Authority & Evidence; 7 Event-Sourced Market Data; 8 Bitemporal Data; 13 CQRS / Projection; 14 Replay / Backtesting | Dauerhafte PostgreSQL-Facts, Evidence, Outbox, zeitliche Versionen und idempotente Projektionen. Separater Replay-Runner erst bei Bedarf. |
| 3 Hybrid Data Architecture; 9 Time-Series Architecture; 11 Feature Store | Online-Cache in Valkey, Offline-Historie in PostgreSQL; Berechnungsworker und Formeln versionieren. |
| 12 Historical/Lakehouse | Später Objektspeicher für Parquet, Rohdaten und Evidence-/Report-Artefakte. R2 hat ein kostenloses Kontingent, kann darüber Kosten verursachen; nicht automatisch anschließen. |
| 5 Parallel Mixed; 6 Individual Analysis Package | SEC/RSS/Makro-/Fundamentals-Adapter, später bedarfsbezogene Inferenz. Separate Quelle, Facts und Inferenz speichern. |
| 15 Reference / Master Data; 16 Data Mesh / Domain Contracts | Persistente Asset-/Symbol-/Provider-/Pipeline-Konfiguration im selben PostgreSQL-System. Domänen sind keine Pflicht, jeweils einen separaten Render-Service zu schaffen. |

Zusätzlich: bestehende OIDC-Konfiguration verifizieren, bevor geschützte Nutzer-/Pipeline-Aktionen freigegeben werden. Der Supabase-Zielschemaentwurf in ARCH-PIPE-0002 ist keine bestehende Supabase-Verbindung. Keine fremden Finance-Datenbank-Credentials übernehmen. News-/Social-, Options-, On-Chain- und Dark-Pool-Abdeckung ist weiterhin unbewiesen; kein pauschaler Gratisanbieter deckt die 50 Komponenten vollständig.

## Quellen und Grenzen

- [Render Free](https://render.com/docs/free), [Key Value](https://render.com/docs/key-value), [Private Netzwerk](https://render.com/articles/how-render-handles-private-networking), [interne URL-Formate](https://render.com/docs/blueprint-spec).
- [Cloudflare Queues Preis/Retention](https://developers.cloudflare.com/queues/platform/pricing/), [Neon Free-Quoten](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md), [R2-Preise](https://developers.cloudflare.com/r2/pricing/).
- [SEC EDGAR API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces): öffentliche Companyfacts ohne API-Key, nur serverseitig mit SEC-Zugriffsregeln; [FRED API-Key-Anforderungen](https://fred.stlouisfed.org/docs/api/api_key.html).

Keine externen Accounts oder Anbieter automatisch bestellt. Anschlussalternativen erfordern passende Accounts, Rechte und Zugangsdaten; die Tabellen sind die Architektur-/Kostenprüfung und keine behauptete Live-Anbindung.
