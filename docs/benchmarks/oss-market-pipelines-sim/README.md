# OSS Market Pipeline Simulation & Benchmark

Stand: 2026-10-02  
Primary Domain: CAPITAL-AI-MARKET · Cross-Domain: PRODUCT / TRUST / PLATFORM

## Scope

This slice registers open-source alternatives for market ingress and adjacent layers without creating a second provider authority. Existing NATS/JetStream and Valkey remain canonical transport/cache. The candidates are CCXT, Hummingbot, Cryptofeed, OpenBB, DefiLlama API SDK, yfinance and fdnpy/FinancialData.Net. Adjacent OSS candidates cover analytics (DuckDB/ClickHouse), observability (OpenTelemetry/Prometheus), vector retrieval (Qdrant) and license compliance (ORT/ScanCode).

## Rights boundary

Software licenses never grant market-data rights. Exchange/provider terms, display, redistribution, derived-data, retention and resale permissions remain evaluated by the existing market-data-rights contracts and LEGAL_POLICY@1. yfinance is explicitly research-only until Yahoo data rights are independently evidenced.

## Simulation engine

`src/services/openSourcePipelineSimulation.ts` enumerates every currently valid combination of:

- registered OSS ingress candidate with an explicit simulation profile;
- supported REST/WebSocket/hybrid mode;
- canonical NATS transport;
- canonical Valkey cache;
- DuckDB or ClickHouse analytics;
- OpenTelemetry/Prometheus observability.

The engine emits deterministic synthetic metrics and a DATA_PIPELINE@1-compatible CADS score. It intentionally marks every result `decisionEligible:false` because synthetic measurements are architecture evidence, not live provider SLAs. fdnpy/FinancialData.Net is deliberately listed as `unbenchmarkedIngress` until measured profile values exist; no latency, throughput, recovery or SLA values are invented for it.

## Validation

1. CURRENT_MAIN + AGENTS policy read before writes.
2. License/data-rights distinction encoded in registry.
3. Existing authority boundaries preserved: NATS, Valkey, provider-rights and CADS stay canonical.
4. Simulation outputs are explicitly synthetic and fail closed for production decisions.
5. UI exposure is additive under existing OSS/research surfaces; no production provider is silently activated.

## Next live benchmark gate

A later isolated run may replace synthetic latency/throughput with measured p50/p95/p99, message loss, reconnect time, CPU/RSS and NATS replay metrics. That run must use exact versions/digests, identical fixtures and provider rights that permit the tested workload.

## Owner-Update 2026-10-03: 1.300 Assets und zehn OSS-Kandidaten

CURRENT_MAIN: `54fb8c55c4f5562d977f1095db2c73877acdc270`; Root-`AGENTS.md@currentmain` gelesen.
Owner-Ziel: 500 Krypto, 300 Aktien, 100 Rohstoffe, 100 Forex, 300 Indizes.
Erster Versuch: 20 je Klasse (100 eindeutige Instrumentidentitäten je Kandidat).
Danach 24 Erweiterungen um insgesamt je 50 Assets bis 1.300; diese 50 gelten
über alle Klassen gemeinsam. Die manifestierte Aufteilung verteilt Restkapazität
proportional zum Klassenziel, ohne Zielüberschreitung. Alle Stufen bleiben PLANNED.

Maschinenlesbarer Prüfplan: `live-benchmark-plan.json`.
Prüfung ohne Providerzugriffe: `node scripts/validate-oss-multi-asset-plan.mjs`.

### Zehn Kandidaten, keine behauptete globale Top-10

GitHub-Sterne sind eine zeitgebundene Popularitätsmetrik innerhalb einer fachlichen
Shortlist, kein Qualitäts-, Security- oder Performance-Nachweis. Upstream-SHAs
bezeichnen einen Recherche-Snapshot, keine Freigabe zum Installieren eines
Development-HEADs. Installation erst nach stabiler Version, Original-Lizenz,
SBOM, Advisory-Review und unveränderlichem Image-Digest.

- ccxt/ccxt: 44239 Sterne; Rolle crypto-adapter; GitHub-Lizenzmetadaten MIT.
- openbq-org/OpenBB: 73807 Sterne; Rolle multi-asset-data-platform; GitHub-Lizenzmetadaten NOASSERTION.
- ranaroussi/yfinance: 25423 Sterne; Rolle research-data-client; GitHub-Lizenzmetadaten Apache-2.0.
- QuantConnect/Lean: 21852 Sterne; Rolle multi-asset-engine; GitHub-Lizenzmetadaten Apache-2.0.
- vnpy/vnpy: 45676 Sterne; Rolle multi-asset-engine; GitHub-Lizenzmetadaten MIT.
- mementum/backtrader: 23388 Sterne; Rolle historical-engine; GitHub-Lizenzmetadaten GPL-3.0.
- hummingbot/hummingbot: 20294 Sterne; Rolle crypto-engine; GitHub-Lizenzmetadaten Apache-2.0.
- bmoscon/cryptofeed: 2916 Sterne; Rolle crypto-feed-handler; GitHub-Lizenzmetadaten NOASSERTION.
- nautechsystems/nautilus_trader: 29592 Sterne; Rolle multi-asset-engine; GitHub-Lizenzmetadaten LGPL-3.0.
- pydata/pandas-datareader: 3271 Sterne; Rolle historical-data-client; GitHub-Lizenzmetadaten NOASSERTION.

OpenBB wurde laut offizieller Mitteilung vom 01.10.2026 an OpenBQ übertragen
(https://openbb.co/); der GitHub-API-Redirect und `openbq-org/OpenBB` wurden
gegengeprüft. Ownership- und Lizenzwechsel bleiben ein eigenes Trust-Gate.
NOASSERTION ist kein Lizenz-PASS. Bestehende historische Lizenzregister werden
durch diesen Recherche-Snapshot nicht nachträglich umgedeutet.

### Vergleichbarkeit und produktive Auswahl

Alle Kandidaten werden in einer Coverage-Matrix über dieselben fünf Klassen
geführt. Spezialisten dürfen NOT_SUPPORTED melden. Fehlende Unterstützung ist
sichtbar; kein ETF/CFD/Future wird stillschweigend als Cash-Index/Spot-Rohstoff
gezählt. Instrumente müssen Venue, Währung, Provideridentität und gegebenenfalls
Kontraktlaufzeit besitzen. FX-Paare und mehrere Notierungen desselben Instruments
werden nicht als zusätzliche unabhängige Assets hochgezählt.

Phase 1: funktionale Coverage, stabile Version, Lizenz, Security und Datenrechte.
Phase 2: identischer erlaubter Captured-Replay-Datensatz, gleiche Hardware,
NATS/JetStream/Valkey, drei Wiederholungen, Warmup sowie Recovery.
Phase 3: nur autorisierte Live-Feeds; Session-, Quota- und Provider-Unterschiede
separat messen. Providerlatenz und lokale Verarbeitungslatenz getrennt ausweisen.
Spezialisten nur auf gemeinsamer Coverage paarweise vergleichen. Historical/EOD
und Live-Streaming erhalten getrennte Auswertungen. Nicht passende Workloads
bleiben NON_COMPARABLE, keine künstliche Gesamtrangliste.

Messungen: p50/p95/p99, Durchsatz, Datenlücken, Duplikate, Schemafehler,
JetStream-ACK und Hash-Replay, Wiederanlauf, CPU/RSS, Netzwerk, Quota/429.
CADS-Gewichte sind vorgegeben; Bewertungsrubrik und operative Budgets sind
vor Ausführung festzulegen. Security-, Lizenz-, Rights- und Korrektheits-Gates
sind nicht kompensierbar. Ein Gesamtgewinner muss die Pflichtabdeckung erfüllen;
eine Kombination aus Spezialisten benötigt eine eigene Owner-Architekturfreigabe.

### Aktuelle Ausführungsgrenze

Dieser PR bereitet Konfiguration und Validator vor. Es wurden weder zehn
Laufzeiten installiert noch reale Providerbenchmarks ausgeführt. Kein Sieger,
kein Laufzeitwert und keine Datenrechte werden erfunden. Der bestehende
3-Symbol-Quote-Vertrag und Production-NATS bleiben unverändert.

Blocker: zugelassener 100-Instrument-Snapshot, erlaubte Referenzdaten/Livefeeds,
zehn isolierte Kandidatenlaufzeiten mit Version/Digest, kalibrierte
Bewertungsrubrik und Betriebsbudgets. Nach jeder freigegebenen Stufe erfolgt
Readback der aktiven Assetidentitäten; Rückweg ist die vorherige Universe-Version.
Brokerdaten werden beim Rollback nicht gelöscht. Automatische Promotion bleibt
aus; Supply-Chain-Self-Healing erst nach drei unabhängigen positiven Zyklen.

Bezug: Issue #105. Dieses Owner-Ziel erweitert den Plan; die historische
Issue-Evidence bleibt unverändert und nicht als 1.300-Asset-Nachweis nutzbar.

### Owner-Erweiterung: zusätzliche Perpetuals

Vorhandene Perpetuals für Krypto, Aktien und Rohstoffe werden zusätzlich in der
Benchmark-Coverage geführt. Basisziel bleibt 1.300 Assets; verfügbare zugelassene
Perps erhöhen die Zahl der Derivate-Instrumente separat. `targetCount:null`
und `firstTestCount:null` bedeuten ungeklärt, nicht null verfügbare Kontrakte.
Für Forex und Indizes wurde keine zusätzliche Perp-Erweiterung autorisiert.

Der erste Basisversuch bleibt bei 20 Assets je Klasse. Nur tatsächlich katalogisierte
und zugelassene Perps können ergänzend getestet werden; keine Pflicht, für jede
Klasse künstlich 20 Kontrakte zu erzeugen. Spot, Perpetual und datierter Future
werden niemals gegenseitig als Abdeckung oder Preisquelle substituiert.
Vorhandensein, Datenrechte und Provider-Unterstützung werden je Venue geprüft.
Fehlende Klassen werden NOT_SUPPORTED, ungeprüfte Verfügbarkeit UNVERIFIED.

Identität: Underlying, Klasse, Venue, Provider-Kontrakt-ID, Basis-/Quote-/Settlement-
Währung, Collateral, Kontraktmultiplikator/-einheit, linear/inverse und
`instrumentType:PERPETUAL` mit `expiry:null`.
Messdaten: Last/Mark/Index getrennt, Fundingrate samt Intervall und nächstem Termin,
Open Interest samt Einheit sowie Beobachtungs-/Empfangszeit. Providersemantik
und unterschiedliche Funding-Kadenzen werden nicht vereinheitlicht geraten.

Paarweise Vergleiche verwenden denselben Kontraktsatz; Spot- und Perp-Ergebnisse
erhalten getrennte Tabellen. Combined-Load-Tests zählen Basis plus Derivate.
Zusätzliche Perp-Schritte umfassen höchstens 50 Instrumente und benötigen dieselben
ACK-/Replay-/Quota-/Rights-/Recovery-Gates. Die konkrete Stufengröße folgt dem
verifizierten verfügbaren Katalog. Reiner Marktdatenzugriff, keine Orders,
Positionen, Leverage-Konfiguration oder produktive Aktivierung.
