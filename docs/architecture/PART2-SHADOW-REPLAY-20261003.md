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
