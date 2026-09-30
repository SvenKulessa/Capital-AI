# Architektur- und Produktionsabgleich — 2026-09-30

Prüfzeit: circa 17:14 UTC (19:14 Europe/Berlin).
Repository: SvenKulessa/Capital-AI.
Referenz-Main: `67cdf660095c68238b2e20604b1cd87cc32d3464`.
Dieser Bericht ersetzt den Snapshot von 13:35 UTC. Historische Bestandsberichte bleiben historische Evidenz und sind keine Live-Statusquelle.

## Vier Validierungsschritte

1. **Main und parallele Arbeiten:** Die Branch-Liste enthält ausschließlich main; offene PR-Liste leer. Damit besteht beim Abgleich kein konkurrierender Arbeitsbranch. Referenz-Main enthält den gemergten Blank-Screen-Bootstrap-Fix aus PR #45.
2. **CI und Schutz:** [Docker-Sicherheitslauf 36747802046](https://github.com/SvenKulessa/Capital-AI/actions/runs/36747802046) auf genau Referenz-Main ist completed/success. Ruleset [main-production-protection](https://github.com/SvenKulessa/Capital-AI/rules/24259174), ID 24259174, ist active: Delete-/Non-fast-forward-Schutz, PR-Pflicht, strict required check Docker Security Gate und keine Bypass-Akteure. Pflichtanzahl genehmigender Reviews ist 0; dies belegt keine unabhängige menschliche Abnahme.
3. **Render und Produktionsumgebung:** Capital-AI, NATS und Valkey gehören im Workspace AICapital zur Umgebung Production (`evm-d90oshpkh4rs739l1fm0`). Capital-AI ist live auf Referenz-Main, Deploy `dep-daujvd3tqb8s73bltfk0`. NATS ist privat in Frankfurt, eine Starter-Instanz, Port 4222, 5-GB-Disk `dsk-dauhcp0jo6nc738eee20` unter /var/data. Valkey 8.1.10 ist available/Free, allkeys_lru, persistenceMode=off.
4. **Echte Daten und Evidence:** GET /api/market/status meldet infrastructure, redis, nats und pubsub connected; File-Speicher, eine konfigurierte Replik. Binance BTCUSDT und Kraken BTCUSD liefern echte WebSocket-Beobachtungen, isDemo=false, validated=true und Evidence-IDs. GET /api/market/evidence gibt jeweils dieselbe Beobachtung mit hashVerified=true zurück. Keine synthetischen Facts in den Produktionsstream geschrieben.

## Beobachtete Replay-Belege

| Provider / Instrument | Evidence-ID | Ergebnis |
| --- | --- | --- |
| Binance / BTCUSDT | CAPITAL_FACTS:25751:bf73a84ee83cae5a23f5ccbe948fe6dffdf5c8ee8aa02a02de8c94f64ba1f904 | Replay derselben Quote, hashVerified=true |
| Kraken / BTCUSD | CAPITAL_FACTS:25782:226e39ae38b749312a9dcd8a434c308542285f7e407cf3596797d0489c216fc5 | Replay derselben Quote, hashVerified=true |

Beobachtungen sind zeitgebundene Live-Nachweise, keine dauerhaft aktuellen Preise. Die API lieferte beide aus dem Cache, nachdem die Anwendung sie gegen das JetStream-Original geprüft hatte. Diese Prüfung belegt Replay im laufenden Dienst, **nicht** Datenbestand nach NATS-Neustart oder Backup-/Restore.

## Fortschritt

| Arbeitspaket | Aktueller Status |
| --- | --- |
| Valkey-Anschluss | VERIFIZIERT: produktiver Client connected; flüchtiger Cache |
| Privater NATS-Service | VERIFIZIERT: Service und persistenter Datenträger vorhanden; produktiver Client connected |
| Echtquote → dauerhafte Evidence → Replay | VERIFIZIERT für die beiden dokumentierten Beobachtungen im laufenden Dienst |
| Valkey Pub/Sub | Publisher-Verfügbarkeit VERIFIZIERT; produktive Subscriber-Zustellung und Wiederanlauf OFFEN |
| Neustart-Replay / Backup-Restore | OFFEN; keine Produktionsdienste für diesen Snapshot neu gestartet |
| Main-Sicherheitsgate | VERIFIZIERT: aktives Ruleset und erfolgreicher Sicherheitslauf auf Referenz-Main |
| Analyse-/Score-Freigabe | OFFEN: licenseScope=unverified, actionable=false, PROVIDER_RIGHTS_UNVERIFIED und ANALYSIS_INPUTS_INCOMPLETE |
| GHCR-Runtime-Identität | OFFEN: Render weiterhin Git-backed Docker; /healthz meldet buildIdentity.bound=false und sourceSha=null |
| Domain-/ZITADEL-Umschaltung | Durch diesen Snapshot nicht erneut geprüft; Finance im Inventar weiterhin not_suspended |

Production-Zuordnung ist eine Render-Umgebungszuordnung. Sie ersetzt weder Provider-Nutzungsrechte noch den Production-Handoff-Vertrag. Der Source-Commit im Render-Deploy ist belegt; ein identischer attestierter GHCR-Manifest-Digest ist nicht belegt.

## Nächster dependency-ready Arbeitsschritt

1. Echte Subscriber-Zustellung auf dem bestehenden Datenpfad prüfen, ohne öffentliches Debug-/Admin-Endpoint oder künstliche Produktions-Facts.
2. Kontrolliertes NATS-Neustart-Replay: vorhandene echte Evidence vor/nach Neustart vergleichen, erwartete Ausfallzeit und laufende Produktion berücksichtigen. Backup-/Restore gesondert prüfen.
3. GHCR-Handoff-Gates weiterhin fail closed halten. Ein image-backed Zielservice und die vollständige Lizenzfreigabe sind Voraussetzungen gemäß docs/security/PRODUCTION-HANDOFF.md; kein neuer kostenpflichtiger Service durch diesen Snapshot.
4. Fehlende reale Feature-Datasets, Verträge und Berechnungen einzeln verifizieren; Quotes allein aktivieren keine Scorer.

Keine Secrets gelesen oder verändert, keine Services/Disks erstellt, kein Deploy oder manueller Workflow ausgelöst. Es wurde ausschließlich gelesen und dieser Dokumentationsstand auf einem Arbeitsbranch aktualisiert.
