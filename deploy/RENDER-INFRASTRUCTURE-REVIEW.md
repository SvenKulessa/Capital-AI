# Capital-AI: Infrastrukturstand und Bereitstellungsplan

Stand: 2026-09-30. Nur Workspace **AICapital** (`tea-d90o4rj7uimc739i86ug`) und Webservice **Capital-AI** (`srv-dau1rp893c1s73cdhm1g`). Keine Änderungen an Finance oder anderen Services.

## Verifizierter Stand

| Ressource | Nachweis | Zustand |
| --- | --- | --- |
| Webservice | Render-Metadaten: Repo SvenKulessa/Capital-AI, main, Frankfurt, Free, Auto-Deploy aus | Letzter Live-Deploy `dep-dau5oumgekts73d2rgk0`, Commit `d646a1bd7f9df9cac3fd921302c88e9651f899fe` (PR #17). PR #18 ist gemergt, aber dieser Deploy enthält ihn nicht. |
| HTTP-Liveness | GET /healthz: HTTP 200, ingress=fail_closed | Kein Nachweis für Infrastrukturverbindung, Providerdaten oder Image-Digest. |
| Cache | Render GET Key Value `red-dau61kvavr4c73fr1plg` | `capital-ai-market-cache`, available, Frankfurt, Free, Valkey 8.1.10, allkeys_lru, persistenceMode=off, ipAllowList=[]; noch nicht an den Webservice angeschlossen. |
| NATS | Workspace-Inventar und Key-Value-Inventar | Kein NATS-Dienst vorhanden. Blueprint vorbereitet; nicht bereitgestellt. |

Der kostenlose Cache ist flüchtig. Er darf keine alleinige Evidence-Aufbewahrung übernehmen. Render Valkey wurde auf Metadatenebene geprüft; die Verbindung des produktiven Node-Clients ist noch nicht getestet.

## Konkreter NATS-Plan

`render-nats.yaml` erzeugt ausschließlich einen privaten Docker-Service mit einem 5-GB-Datenträger in Frankfurt. Der vorhandene Cache und Capital-AI werden von diesem Blueprint nicht übernommen oder verändert. Bei der Einrichtung ausdrücklich AICapital auswählen. Vor Anwendung müssen diese Dateien auf main vorhanden und die freigegebenen Image-/Security-Gates erfolgreich sein. Blueprint-Erstellung startet die erste Bereitstellung auch bei `autoDeployTrigger: off`.

- Name: `capital-ai-market-events`; Plan `0.5c-512mb` (0,5 CPU, 512 MB); eine Instanz.
- NATS 2.15.0, offizielles Image per Digest gepinnt. Konfiguration in `nats-server.conf`.
- Nur privater TCP-Port 4222; Token aus `NATS_TOKEN`, kein Standardwert, keine öffentlichen Monitoring- oder WebSocket-Ports.
- JetStream-Dateispeicher unter `/var/data/jetstream`; persistenter Mount `/var/data`, 5 GB. Serverlimit 2 GB. Die Anwendung begrenzt CAPITAL_FACTS auf 1 GiB und verweigert Eviction, Delete und Purge.
- Kein Cluster und keine Hochverfügbarkeit. Ein Neustart-Replay-Test ersetzt keine Backup-/Restore-Abnahme oder Compliance-Zertifizierung.
- Kalkulation am 2026-09-30: Compute 7 USD/Monat + 5 × 0,25 USD Speicher = **8,25 USD/Monat zusätzlich**, vor Steuern, Build-/Traffic-Mehrverbrauch und möglichen Workspace-Gebühren. Vor Bestellung aktuellen Render-Preis prüfen.

Quellen: [Render Compute-Pläne](https://render.com/docs/compute-plans), [Preise](https://render.com/pricing), [Disks](https://render.com/docs/disks), [Blueprint-Spezifikation](https://render.com/docs/blueprint-spec), [NATS-Konfiguration](https://docs.nats.io/reference/config/).

## Lokale Validierung

- Blueprint gegen das am 2026-09-30 heruntergeladene offizielle Render-JSON-Schema validiert: bestanden. Keine serverseitige Blueprint-Anwendung ausgeführt.
- NATS-2.15.0-Konfigurationsprüfung mit zufälligem Test-Token: bestanden; ohne Token: Startkonfiguration wird abgewiesen.
- Neue Serverkonfiguration auf isoliertem Loopback-Listener und Test-Speicher mit echtem lokalem Redis 8.10.2 und NATS 2.15.0 geprüft. Falsches Token wird abgewiesen. Bestehender Infrastruktur-Integrationstest für PubAck, Hash-Replay, Deduplication, Reihenfolge, manipulierten Cache und Ausfall: bestanden.
- NATS-Prozess beendet und mit demselben Test-Speicher neu gestartet: gespeicherte Evidence mit identischem Payload erfolgreich wiedergegeben.
- Diese Tests enthalten ausschließlich explizite Test-Harness-Payloads. Sie verifizieren weder Render-Netzwerk/Disk noch Live-Providerdaten. Docker-Image-Build, SBOM und Image-Scan müssen noch über die freigegebenen Release-Gates erfolgen; keine GitHub-Workflows ausgelöst.

## Anschluss und Abnahme nach Freigabe

1. NATS-Service nach Kosten- und Ausführungsfreigabe erstellen. Token im Secret Store erzeugen und identisch für NATS und Capital-AI setzen; keine Secret-Werte in Git oder Logs. Interne DNS-Adresse aus dem erstellten Render-Service übernehmen, nicht aus dem Namen erraten.
2. Nur die folgenden Schlüssel am bestätigten Webservice ergänzen; bestehende Auth-/Telegram-/Provider-Secrets erhalten: `REDIS_URL` (von Render gelieferte interne Cache-Verbindung), `NATS_URL` (interner NATS-Host, Port 4222), `NATS_TOKEN`, `NATS_REPLICAS=1`, `MARKET_QUOTES_ENABLED=true`. Credentialhaltige URLs ausschließlich als Secret behandeln. Ein Env-Update kann einen Deploy auslösen und gehört deshalb zur freigegebenen Release-Ausführung.
3. Exakten Release-Commit, Container-Digest und erfolgreiche Release-Gates vor Deployment prüfen. Der bestehende Source-Docker-Deploy und ein hinterlegtes GHCR-Credential allein beweisen keine Bereitstellung des geprüften GHCR-Digests.
4. Nach Deploy `/api/market/status`: Redis und NATS connected, JetStream File-Speicher, replicas=1. Tatsächliche Providerantwort mit gültigem Beobachtungszeitpunkt, Provider, Symbol-Mapping, Payload-Hash und Evidence-Referenz prüfen; die zugehörige Evidence über `/api/market/evidence?id=<URL-kodierte Evidence-Referenz>` wiedergeben. Keine Test-Payloads in den Produktionsstream schreiben.
5. Isolierte Staging-Instanzen: falsches Token, Verbindungsabbruch, veraltete Daten, manipulierten Cache und Neustart-Replay testen. Produktionsdienste dafür nicht abschalten. Kapazitätsüberwachung und Backup-/Restore-Verfahren vor dauerhaftem Betrieb ergänzen.

Ohne Provider-Nutzungsrechte und vollständige Features bleiben die Eligibility-Gates gesperrt. Ein echter Quote schaltet keinen der 50 Scorer automatisch frei. Kein Ersatz fehlender Fundamentals, Dark-Pool-, Whale-, Social- oder On-Chain-Daten durch erfundene Werte.
