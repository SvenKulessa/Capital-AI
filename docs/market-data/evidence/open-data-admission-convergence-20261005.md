# Open-Data Admission Convergence — 2026-10-05

## Scope

Repository: `SvenKulessa/Capital-AI`  
CURRENT_MAIN: `caa2c14fb4b317529f7a05385ca11eb7016b7f8a`  
Branch: `capital-ai-trust/open-data-admission-main-correlation-20261005`  
Root policy: `AGENTS.md@currentmain`

Ziel ist die Konvergenz der Open-Source-/Open-Data-Bereitstellung auf die aktuelle Main-Architektur. NATS JetStream bleibt Event-/Replay-Authority, Valkey/Redis Hot-State-Cache und Supabase/PostgreSQL persistente Daten-/Auth-Grenze. Kafka, NestJS, ClickHouse, Iceberg, Dagster, dbt Core, Keycloak und OpenTofu werden nicht als implementierte Current-Main-Authority behauptet; sie bleiben Benchmark-/CADS-Kandidaten.

## Re-korrelierte Evidence

- `source-rights-matrix-20261005.json` → sourceCommit auf CURRENT_MAIN aktualisiert.
- `open-data-rights-addendum-20261005.json` → sourceCommit auf CURRENT_MAIN aktualisiert und neue Research-Kandidaten fail-closed ergänzt.
- `instrument-manifest-20261005.json` → gegen CURRENT_MAIN regeneriert; keine nicht zugelassenen Instrumente hinzugefügt.
- Canonical SHA-256 Readback aller drei JSON-Artefakte: PASS.

## Rechteforschung

### Crypto

RepOD/Wątorek stellt einen historischen 1-Minuten-Datensatz mit 140 Krypto/USDT-Reihen unter CC0 1.0 bereit:
https://repod.icm.edu.pl/dataset.xhtml?persistentId=doi:10.18150/WPGY4R

Status: `REVIEW_REQUIRED_UPSTREAM_RIGHTS_CHAIN`.

Grund: Die Dataset-Lizenz ist offen, die Beobachtungen stammen jedoch aus Binance-Marktdaten. Vor Production Admission muss nachgewiesen werden, dass die Upstream-Rechtekette die erforderlichen kommerziellen Nutzungen einschließlich Display, Derived Scoring, Cache, JetStream Publication, Replay, Retention und Backup/Restore trägt. Der Snapshot ist außerdem kein Live-Freshness-Feed.

### Stocks

Zenodo veröffentlicht einen Snapshot mit täglichen OHLCV-Daten für 20 S&P-500-Aktien und VIX unter CC BY 4.0:
https://zenodo.org/records/20192822

Status: `REVIEW_REQUIRED_UPSTREAM_RIGHTS_CHAIN`.

Grund: Der kuratierte Datensatz ist offen lizenziert, die Werte wurden über Yahoo Finance bezogen. Die CC-BY-Lizenz der kuratorischen Veröffentlichung beweist nicht automatisch die kommerziellen Upstream-Market-Data-Rechte.

### Commodities

World Bank Commodity Markets Data bleibt eine belastbare Open-Data-Referenzquelle unter CC BY 4.0:
https://datacatalog.worldbank.org/search/dataset/0038238/commodity-prices-history-and-projections
https://datacatalog.worldbank.org/public-licenses

Status: Open-Data Reference Series PASS; kein Spot-Instrument-/Live-Scoring-Nachweis.

### Forex

ESCB/ECB erlaubt die freie kommerzielle und nichtkommerzielle Wiederverwendung öffentlich veröffentlichter Statistiken unter Quellenangabe und ohne Modifikation:
https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html

Status: Reuse PASS für Reference Rates; Scoring-Semantik und Adapter-Mapping bleiben separat zu prüfen. Reference Rate ist kein ausführbarer Spot-FX-Feed.

### Indices

OECD stellt Share-Price-Indikatoren bereit und erlaubt Daten grundsätzlich auch kommerziell wiederzuverwenden, weist aber ausdrücklich auf mögliche zusätzliche Einschränkungen und Drittanbieterrechte je Datensatz/Serie hin:
https://www.oecd.org/en/data/indicators/share-prices.html
https://www.oecd.org/en/about/terms-conditions.html

Status: `REVIEW_REQUIRED_SERIES_SOURCE_OWNERSHIP`; kein Satz von 20 zugelassenen Cash-Indizes nachgewiesen.

### Nicht als Zulassungsquelle verwendbar

FRED weist ausdrücklich darauf hin, dass einzelne Reihen Drittanbieterrechte besitzen können und kommerzielle Nutzung dieser Reihen zusätzliche Genehmigung erfordern kann:
https://fred.stlouisfed.org/docs/api/terms_of_use.html
https://fred.stlouisfed.org/legal/

FRED-Verfügbarkeit ist daher kein pauschaler OPEN_SOURCE_OPEN_DATA_ADMITTED-Nachweis.

## Runtime-Grenze

Keine neu recherchierte Quelle wurde auf `OPEN_SOURCE_OPEN_DATA_ADMITTED` gesetzt. Deshalb wurde kein produktiver Provider-Netzwerkpfad aktiviert und kein Provider → NATS → Replay → Valkey → API → Scoring → Browser-E2E behauptet.

Das bestehende Current-Main-Verhalten bleibt fail-closed:
- NATS JetStream: Authority für Event/Replay.
- Valkey/Redis: bounded Hot-State.
- Source-/Capability-Admission vor Netzwerk-I/O.
- Scoring nur mit explizit zugelassenem `scoringPriceInput`.
- Referenzdaten werden nicht als Spot-/Live-Quote umetikettiert.

## 3 VALIDATE

### Validate 1 — Current Main / Governance / Architektur
PASS.
- CURRENT_MAIN frisch gelesen.
- AGENTS.md@currentmain berücksichtigt.
- Branch basiert exakt auf CURRENT_MAIN.
- NATS/Valkey/Supabase-Authority beibehalten.
- Keine Kafka-/NestJS-/ClickHouse-/Iceberg-/Dagster-/Keycloak-/OpenTofu-Parallel-Authority eingeführt.

### Validate 2 — Evidence-Integrität / Rechteklassifikation
PASS für die Dokumentations- und Hash-Ebene.
- Drei Evidence-Artefakte neu korreliert.
- Canonical SHA-256 aller drei Readbacks stimmt.
- Offene Dataset-Kandidaten bleiben fail-closed.
- Dataset-Lizenz und Upstream-Market-Data-Rechte werden getrennt behandelt.

### Validate 3 — End-to-End Runtime / Production Data Path
BLOCKED.
- Keine neu zugelassene Quote-/Scoring-Quelle.
- Kein produktiver Provider-Publish-/Replay-/Scoring-/Browser-E2E auf neuem Dataset.
- Keine Production Data Admission.

Positive End-to-End-Zyklen für Self-Healing-Promotion: `0/3`.

## 5 APPROVE — fachliche Prüfperspektiven

1. MARKET — BLOCKED: keine vollständige Quote-/Scoring-Admission für die Ziel-Assetklassen.
2. TRUST — BLOCKED: Upstream-Rechtekette der neuen Crypto-/Stock-Snapshots nicht geschlossen.
3. PLATFORM — PENDING: Runtime-Pfad erst nach Dataset Admission ausführen; bestehende NATS-Authority bleibt gültig.
4. PRODUCT — PENDING: keine Live-/Score-Anzeige ohne zugelassenen Datenpfad.
5. RELEASE / PRODUCTION-HANDOFF — BLOCKED: Production Data Admission erst nach positivem Runtime-E2E und vollständiger Release-Evidence.

Diese fünf Perspektiven sind keine Behauptung unabhängiger Reviewer oder Owner-Freigaben.

## Production Status

`PRODUCTION_DATA_ADMISSION = BLOCKED`

Kleinster verifizierbarer nächster Schritt:
1. Für einen einzelnen Crypto- oder Stock-Dataset-Kandidaten die Upstream-Rechtekette bis zu den originalen Marktdatenbedingungen schließen.
2. Erst bei vollständigem PASS einen konkreten Dataset-/Instrument-Scope auf `OPEN_SOURCE_OPEN_DATA_ADMITTED` setzen.
3. Danach denselben Scope über Provider → canonical observation → NATS Publish ACK → Replay → Valkey → API → scoring eligibility → Browser Evidence testen.
