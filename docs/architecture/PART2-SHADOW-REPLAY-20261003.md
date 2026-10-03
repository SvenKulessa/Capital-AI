# MARKET Teil 2 — isolierter Shadow- und Replay-Pfad

Baseline: `main@fbb67ca0b3e08cdeeaf9835b09ca7af06b6230d7`.
Branch: `capital-ai-market/part2-shadow-replay-20261003`.
Owner-Scope: bestätigte nächste Schritte vom 03.10.2026; Erweiterung vorhandener Dienste, keine Produktionsaktivierung.
Root-Contract: `AGENTS.md@currentmain` gelesen und berücksichtigt.

## Teil-1-Abschluss und Voraussetzung

Der strukturelle Teil-1-Abschluss ist dokumentiert. Der Runtime-Handoff bleibt **BLOCKED**:

- Read-only `/healthz`: NATS, Redis/Valkey, Pub/Sub und Subscriber verbunden; 11.912 verifizierte Deliveries im gelesenen Snapshot.
- Historischer Render-Log-Readback bestätigt den Restore von 56.118 JetStream-Nachrichten in 11 ms am 30.09.2026. Diese Dauer ist eine Restore-Messung, keine End-to-End-Pipeline-Latenz.
- Render meldet den App-Deploy `dep-db03n4ad0e5s73a01b8g` als live und den aktuellen Main-SHA als Commit.
- Die App selbst meldet `buildIdentity.bound=false`, `sourceSha=null`. Render-Commitmetadaten ersetzen keine image-interne Runtime-Identity.
- Aktueller attestierter GHCR-Digest-Handoff und eine zeitlich korrelierte neue Delivery nach dem historischen Restart sind mit diesen Readbacks nicht geschlossen.

Sanitized Readback: `docs/security/evidence/part2-shadow-20261003/runtime-readback.json`.
Der Teil-2-Code ist deshalb eine isolierte, nicht aktivierte Implementierung zur Prüfung; er setzt den Runtime-Handoff nicht auf PASS und erfüllt noch keinen vollständigen Teil-2-Produktionsabschluss.

## Implementierung

| Pfad | Funktion |
| --- | --- |
| `src/contracts/pipelineExecution.ts` | Strikte Shadow-Konfiguration und Snapshot-Verträge, acht geordnete Stage-IDs, sechs Score- und sechs Risiko-Familien |
| `src/config/shadowScoreConfig.ts` | Tief eingefrorene, versionierte Research-Baseline; Provider standardmäßig leer/deaktiviert |
| `src/services/pipelineConfigurator.ts` | Isolierte Konfigurationskopien, unveränderliche Revisionen, Content-Fingerprint und Diff; keine automatische Produktionsfreigabe |
| `src/services/componentRunner.ts` | Typed Runner-Schnittstelle und exakte Korrelation mit der vorhandenen 50er-Registry |
| `src/services/scoringEngine.ts` | Additive Shadow-Methode; bestehender Live-/Demo-Pfad bleibt gesperrt wie bisher |
| `src/services/featureStore.ts` | Snapshot-Store-Interface und explizit flüchtiger isolierter Test-/Research-Store |
| `src/services/evidenceEngine.ts` | Kanonisches JSON und SHA-256-Fingerprints |
| `src/services/shadowPipeline.ts` | Offline-Snapshot-Auswertung, Component-Blocker, persistierter Readback und deterministischer Replay |
| `server/shadow-evidence-store.mjs` | Privater File-Store: SHA-256-Adresse, atomare Veröffentlichung, fsync, 0700/0600, kein Überschreiben, Größenlimit, keine Symlink-Reads |

Die Runner-Registry ist keine zweite Lifecycle-Authority. Alle 50 Einträge bleiben 45 planned / 5 blocked; keine Formel und kein Validierungsdatum wird erfunden. Fehlende Implementierungen und unresolved Contracts/Features werden als Blocker transportiert. Existierende `DataProvenance`-/`ScoreResult`-Schemas werden im bisherigen Registry-Resolver ergänzt.

## Berechnung und Grenzen

Die Shadow-Formel verwendet sechs gewichtete Teil-Scores, Confidence und sechs Risiko-Familien. Confidence ist konservativ das Minimum aus Vollständigkeit, Datenqualität, Frische und gemessener Provider-Übereinstimmung. Kein universell kalibriertes statistisches Konfidenzmaß wird behauptet.

- Profile werden exakt nach Asset-Klasse, Subklasse, Horizont und Regime ausgewählt; fehlende Profile erzeugen keinen Default-Score.
- Die mitgelieferten Baseline-Profile decken crypto/equity_us/equity_eu, Subklasse null, 1d, baseline ab. Sie sind noch nicht empirisch kalibriert.
- Gewichte müssen insgesamt eins ergeben; Version-Reuse mit anderem Inhalt wird abgewiesen.
- Zwei unterschiedliche Provider pro Pflicht-Feature, exakte Dataset/Symbol/Venue-Rechte, drei erforderliche Use Cases und konsistente Einheiten sind Voraussetzung für eine interne Berechnung.
- Offene Rechte oder noch nicht implementierte Lizenzobligationen blockieren. Lizenz-Enums allein gelten nicht als Rechtebeleg.
- Zukunftszeitstempel, Stale-/Mischdaten, Provider-Abweichung, falsche Asset-Zuordnung, ungültige Risiken oder ein fehlgeschlagenes Hard Gate blockieren.
- Ein interner Candidate wird auf den vorhandenen Bereich 0..100 begrenzt. Sobald die konfigurierte Component-Cohort blockiert ist, wird auch dieser Candidate null.
- `eligibility=false`, `rank=null`, `publishable=false` sind unveränderliche Shadow-Ausgaben. DEMO hat Confidence 0 und keinen Candidate. Keine Rankings, Alerts oder Empfehlungen werden ausgeliefert.
- Replay bindet vollständige Feature-Snapshots, Raw-Input-Referenzen, Asset, Rights-Snapshot, Config, Modell-/Gewichtsversion, Registry-Fingerprint, Auswertungszeit und Ergebnis. Änderungen am Registry-/Berechnungspfad führen zu Divergenz statt stiller Neuberechnung.
- SHA-256 belegt Content-Integrität, keine Signatur, Provider-Rechtefreigabe oder Compliance-Zertifizierung.

Optionale Stage-Telemetrie misst ausschließlich Offline-Validation, Scoring und Storage mit einer monotonen Uhr. Sie enthält keine Feature-Payloads und bleibt außerhalb des deterministischen Evidence-Bodys. Es werden keine Ingestion-/Netzwerk- oder Produktionslatenzen daraus abgeleitet.

## Migration und Rollback

1. Änderungen als Draft-PR prüfen; keine neue Dependency, kein Lockfile-/Provider-/Auth-/DB-/Secret-Update.
2. Offline-Snapshots aus bereits freigegebenen Quellen erst nach Rechteprüfung zuführen. Der neue Dienst ruft selbst keine Provider auf.
3. File-Store nur mit explizitem privaten Root betreiben. Er wird lediglich für Tests in den Docker-Build-Kontext aufgenommen; kein Import im Serverstart, kein Endpoint und keine Runtime-Aktivierung.
4. Vor einem echten Shadow-Runtime-Rollout persistente Ablage, Mandantentrennung, Retention, Restart/Restore und Berechtigungen durch PLATFORM/TRUST nachweisen. Der In-Memory-Feature-Store ist nicht durable.
5. Erst nach dem Teil-1-Runtime-Handoff dürfen reale Shadow-/Active-Benchmarks und Komponentenpromotion erfolgen. Produktionsaktivierung erfordert separate Owner-Freigabe und alle vorhandenen Gates.
6. Rollback des isolierten Pfads: Aufrufer/Opt-in zurücknehmen und Code über einen Revert-PR zurückrollen. Gespeicherte Evidence wird nicht gelöscht oder rückwirkend verändert. Alte Artefakte als NON-AUTHORIZING/SUPERSEDED kennzeichnen.

Bestehende Konfigurationsänderungen widerrufen jetzt stets die Produktionsfreigabe. Eine Rücknahme dieses Sicherheitsfixes darf die frühere automatische Freigabe nicht still reaktivieren.

## Verifikation

Lokale, isolierte Checks auf Node v24.19.0 mit dem vorhandenen Lockfile, Installation über `npm ci --ignore-scripts --no-audit --no-fund`:

- `npm test`: bestehende Suites plus neue Shadow-, Replay-, Persistenz- und Gate-Regressionen.
- `npm run lint`: TypeScript-Prüfung.
- `npm run test:security`: bestehende Server-/Frontend-Boundary-Regressionen.
- `npm run build` und `npm run verify:browser`: Build und Server/Browser-Grenze.
- `node scripts/preflight.mjs`: Docker-COPY-/Allowlist-, Lizenz-Evidence-, Handoff- und Governance-Regressionen.

Die Tests benutzen ausdrücklich erfundene, als TEST-FIXTURE-NON-PRODUCTION markierte Inputs und Rechte. Das ist ausschließlich Test-Evidence für Codeverhalten, niemals Produktiv-, Lizenz- oder Provider-Evidence. Store-Reinitialisierung belegt lokalen Replay über eine neue Store-Instanz im selben Prozess, keinen echten Prozess-Restart oder produktiven NATS-/Supabase-Restore.

Bestehende App-Chunk-Warnung >500 kB und offene Distribution-Lizenzprüfung bleiben sichtbar. Kein Docker-Image-/Trivy-/GHCR-/Render-Promotion-Nachweis wird aus lokalen Tests abgeleitet. Drei Testaufrufe sind keine drei unabhängigen Self-Healing-Validierungszyklen; keine automatische Promotion wurde aktiviert.

## Noch offen für den vollständigen Teil-2-Abschluss

- Teil-1-Runtime-Identity und Digest-Handoff schließen (PLATFORM/TRUST).
- Tatsächliche Feature-Formeln, Input-/Output-Schemas und Rechte der 50 Komponenten implementieren und validieren (MARKET/TRUST).
- Reale Polling-/WebSocket-, Normalisierungs- und Feature-Pfade mit der neuen Orchestrierung korrelieren; alle acht Stage-IDs sind kein Nachweis von acht ausführbaren Produktionsstufen.
- Persistenter Runtime-Feature-Store, Raw-Payload-Retention und Restore-Evidence.
- Empirische Kalibrierung, weitere Taxonomien/Profile, Quota-/Retry-/Fallback-Ausführung und Shadow-vs-Active-Benchmarks.
- Konfigurator-Ansichten, Sichtbarkeit von DEMO/DELAYED/LIVE/DEGRADED und Delivery-Integration (PRODUCT).
- Cross-sectional-/Peer-/Sector-/Watchlist-Ranking und Rank-Change-Evidence erst nach Admission.
- >=100 tatsächlich eligible Assets je Klasse und gemessene End-to-End-Latenz <200 ms; Test-Kapazität ersetzt diese Gates nicht.

PR #124 betrifft Auth/Billing/Prompt-Guard. Seine Package-, Serverstart-, Pricing- und Roadmap-Pfade werden in diesem MARKET-Slice nicht verändert. Docker-Kontext-Erweiterung ist PLATFORM-Mitwirkung, Admission und Rechte sind TRUST-Mitwirkung.

## Ergänzung: Rohformeln, Admission und CI-Readback

`src/contracts/rawFeatureCalculation.ts` und `src/services/rawFeatureCalculator.ts` ergänzen die vorhandene Feature-Store-Schnittstelle ohne Live-Aufrufer. Die Rohformel-DTOs akzeptieren ausdrücklich USD/EUR/GBP/CHF/JPY/CAD/AUD/NZD; andere Währungen bleiben bis zur Erweiterung gesperrt. Strikte DTOs verlangen finalisierte, positive Schlusskurse, lückenlose geordnete Intervalle, eine konsistente Asset-/Venue-/Currency-/Provider-Identität, Zeitstempel und gemessene Latency sowie freigegebene exakte Dataset/Symbol/Venue-Rechte für Analyse, abgeleitete Forschung und Retention. Nicht erfüllte Lizenzobligationen blockieren. DEMO ist ausdrücklich opt-in und verlangt einen nichtproduktiven Provider-Identifier.

| Rohformel | Konvention | Grenze |
| --- | --- | --- |
| `rsi_14` | Wilder-Smoothing aus allen gelieferten Bars; 14 initiale Differenzen, Flat-Konvention 50 | Kein `rsi_14_oversold`-Score |
| `sma_20_close` | Letzte 20 Schlusskurse | Perioden, keine unbelegte Tagesannahme |
| `z_score_vs_20_period_sma` | Population-Standardabweichung derselben 20 Kurse | Null bei Nullvarianz; kein automatisch registriertes `20d`-Feature |
| `bollinger_percent_b` | 20 Perioden, zwei Standardabweichungen | Verhältnis kann außerhalb 0..1 liegen; kein begrenzter Score |
| `quoted_spread_bps` | `(ask-bid)/midpoint*10000` | Kein effective spread, keine Slippage-/Market-Impact-Schätzung |

Inputs, Rights und Auswertungszeit bleiben im Calculation-Evidence-Body erhalten. Die Rohwerte haben `normalizedValue=null`, `qualityScore=null`, `scoreEligible=false` und können nicht als kanonische `FeatureValue` ausgegeben werden. Zehn neue Tests prüfen Handrechnung, Wilder-Smoothing, Replay-Fingerprint, Nullvarianz sowie negative Source-/Time-/Rights-/Admission-Fälle. Registry-Lifecycle bleibt 45 planned / 5 blocked. `admissionReport()` zeigt Implementierungsregistrierung und Blocker separat; Registrierung ist keine Zulassung.

Methodische Primärquelle für RSI: [TA-Lib RSI](https://github.com/TA-Lib/ta-lib/blob/main/ta_codegen/input/rsi/rsi.md), gelesener Git-Blob `e968997f0dc2a1b8f05b29263a73d175ee05f5dd`. Keine TA-Lib-Bibliothek installiert, kein Quellcode kopiert. Die eigene Flat-Konvention ist ausdrücklich versionsgebunden. Spread-Abgrenzung: [CME Liquidity Tool Methodology](https://www.cmegroup.com/education/articles-and-reports/understanding-the-cme-liquidity-tool-methodology).

Der Release-Readiness-Report verhindert jetzt, dass ein vom Aufrufer mitgeliefertes `pass:true` den berechneten Gate-Wert überschreibt. Doppelte Asset-Klassen, nicht-ganzzahlige/fehlende Counts und inkonsistente Gesamtzahlen blockieren ebenfalls. Drei zusätzliche Regressionen sichern diese Evidence-Integrität.

Docker Security Gate, CodeQL und Domain Governance waren für den vorherigen PR-Head `57777dd5c53dcdcec0855aed5dd7c40e4bc34794` erfolgreich. PR-Docker-Run `37087838806` testete Merge-SHA `97760ed49ef599124c92ed94ed4a2903068c722d`; Main-Run `37070353125` testete die Baseline. Beide Artifact-ZIP-Hashes wurden gegen GitHub geprüft. Publishing/Handoff waren übersprungen: lokale Docker-Image-ID und Artifact-ZIP-Hash sind kein attestierter GHCR-Digest. Die CI-Smoke-Identity ist gebunden, die vorher gelesene aktive App-Identity bleibt ungebunden. Ein späterer Proxy-Timeout liefert keine neue Runtime-Evidence.

Der NATS-Scannerfund `GO-2026-5932` bleibt erhalten; symbolgenaue Reachability/VEX ergibt NOT_AFFECTED ausschließlich für die exakt getestete CI-Binary. Keine pauschale Übertragung auf produktives NATS und keine Scanner-Suppression. Die CI-Kapazitätsmessung von 600 synthetischen Assets / 100 je sechs Klassen mit ca. 88 ms p95 ist ENGINE_CAPACITY_ONLY und productionEligible=false; sie schließt die realen Eligibility-/End-to-End-Gates nicht.

Readback: `docs/security/evidence/part2-shadow-20261003/ci-artifact-readback.json`. Neue Commits benötigen neue CI-Checks; alte PASS-Werte autorisieren sie nicht. Die vom Owner ergänzte Open-Source-Vorgabe und der lokale Bundle-Fix stehen in `docs/architecture/OSS-EVIDENCE-QUALITY-20261003.md`. Die frühere Chunk-Warnung ist lokal behoben; Distribution-Review bleibt offen.


## Rekorrelation vom 03.10.2026 nach currentmain

Dieser PR wurde gegen `main@d0334ac1426680ed82fe67c987a6ea49c8b6f83d` neu korreliert. `src/App.tsx` und `vite.config.ts` sind bereits identisch in main enthalten; sie erzeugen jetzt keinen PR-Diff. Der Dockerfile-Konflikt bewahrt Shadow-Store und alle Guard/Billing-Module. Der neue vollständige lokale Preflight besteht; drei npm-Scopes zeigen keinen Manifest-/Lock-/Installationsdrift und jeweils 0 bekannte npm-audit-Schwachstellen. Versionsabweichungen und ausstehende Container-/Review-/Production-Gates stehen in [PR125-CONVERGENCE-20261003](../security/PR125-CONVERGENCE-20261003.md). Historische Fehler-/Runtime-Evidence oben bleibt als historischer Snapshot erhalten und ist keine Freigabe für diesen neuen Stand.
