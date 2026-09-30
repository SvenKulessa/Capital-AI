# Architektur- und Produktionsabgleich — 2026-09-30

Prüfzeit: 2026-09-30, circa 13:35 UTC. Repository: SvenKulessa/Capital-AI.
Referenz-Main: `090b00bb432e329daf62129d10d2c5ca041662b6`.
Dieser Snapshot ergänzt historische Berichte, deren Bestandsaussagen nicht mehr aktuell sind.

## Vier Validierungsschritte

1. **Repository:** Main zweimal identisch gelesen; einzig offene PR #38 betrifft Social-/Branding-Dateien und bleibt unabhängig. Registry-Quelltext enthält 50 eindeutige Komponentenpositionen: 45 planned, 5 blocked, alle provenanceMode=unavailable und lastValidatedAt=null. Keine Aktivierung aus Konfigurationsmetadaten ableiten.
2. **CI/Supply Chain:** Docker-Sicherheitslauf [36715472658](https://github.com/SvenKulessa/Capital-AI/actions/runs/36715472658) auf `46ee077dea184a5defa84ef028fb93e3ac73fad5` erfolgreich. Validate und publish_candidate bestanden; Registry-Scan, SBOM und Attestation-Prüfungen grün laut Jobschritten. Das ist kein Sicherheitsnachweis für den späteren aktuellen Main. NATS-Sicherheitslauf 36713260016 und Render-CLI-Lauf 36713234942 ebenfalls erfolgreich.
3. **Render:** Workspace AICapital `tea-d90o4rj7uimc739i86ug`, Capital-AI `srv-dau1rp893c1s73cdhm1g`: eine Starter-Instanz, Frankfurt, Auto-Deploy aus. Live-Deploy `dep-daugip893c1s73e5rgug` enthält exakt Referenz-Main. Metadaten zeigen Source-Docker mit Dockerfile, nicht einen nachgewiesenen GHCR-Digest-Deploy. Ein Registry-Credential beweist diese Identität nicht.
4. **Laufzeit:** GET https://capital-ai-uvsl.onrender.com/api/market/status und /healthz: ingress=fail_closed, infrastructure=degraded, redis=connected, nats=unavailable, pubsub=connected. Pub/Sub bezeichnet Publisher-Verfügbarkeit und beweist keine Zustellung. GET https://capital-ai.online/healthz liefert einen anderen Health-Vertrag mit configured.supabase=true; damit ist die Produktionsdomain noch nicht als neuer Capital-AI-Service verifiziert. Auth-Login und Datenmigration wurden hier nicht getestet.

## Fortschritt und offene Gates

| Arbeitspaket | Nachweis / Zustand |
| --- | --- |
| Registry-Bereinigung | VERIFIZIERT auf Quelltextebene: 45 planned, 5 blocked, keine Live-Provenienz oder erfundene Validierungszeit |
| Redis/Valkey | VERIFIZIERT: Free, 8.1.10, Frankfurt, available; Runtime-Client connected; flüchtiger Cache, keine Evidence-Aufbewahrung |
| Pub/Sub-Implementierung | Quelltext vorhanden: Publish erst nach JetStream-Ack, Replay vor Callback, Schema-/Freshness-Gates und begrenzte Listener; produktive Delivery mangels NATS OFFEN |
| NATS/JetStream | Blueprint und Client vorhanden, Image-Sicherheitslauf grün; kein NATS-Service im Render-Inventar, dauerhafte Evidence und produktives Replay OFFEN |
| Scorer | 50 unfreigegeben; Datenverträge, reale Berechnungen, Pflichtinputs und Nutzungsrechte bleiben Aktivierungsvoraussetzungen |
| Starter-YAML | Bereits vorhanden: plan=0.5c-512mb und numInstances=1; keine erneute Implementierung erforderlich |
| GHCR-Produktionsidentität | OFFEN: geprüfter Kandidat stammt von älterem Commit; Live-Manifest-Digest nicht nachgewiesen |
| Domain/ZITADEL | Owner meldet erfolgreichen Login; eigener Login-Test und Domain-Umschaltung OFFEN. Finance weiterhin not_suspended im Inventar |

## Loghinweise ohne Verlust der Sicherheitskontrollen

Der erfolgreiche Lauf enthält eine Secret-Scan-Größenwarnung für einen 24-MB-npm-Cache sowie Trivys Alpine-3.24-EOL-Listenwarnung und node-domexception-Deprecation. Die Cachekorrektur wurde anschließend mit PR #36 gemergt; ihr Effekt im Security-Lauf ist auf dem aktuellen Main noch zu verifizieren. Keine Scanner deaktivieren, keine pauschalen Skip-/Allowlist-Regeln aus diesen Warnungen ableiten. Die EOL-Listenwarnung allein beweist weder Support noch EOL.

## Nächste Ausführung

- Privaten NATS-Service anhand deploy/render-nats.yaml mit 5-GB-Disk einrichten; Runtime-Token sicher erzeugen und auf beiden Services setzen. Tatsächlichen internen Host aus Render übernehmen.
- Image-Digest/Commit/SBOM/Attestations auf demselben Release abgleichen, danach tatsächliches Provider-Fact und Evidence-Replay prüfen. Kontrolliertes Neustart-Replay erst in einem abgestimmten Betriebsfenster.
- Domain-Bindings und DNS-Rollback-Werte vor Umschaltung inventarisieren; ZITADEL-Callback und Session auf capital-ai.online prüfen, anschließend Finance stilllegen.
- Der vorhandene Render-Connector bietet keine Erstellung privater Services/Disks oder Custom-Domain-Verwaltung. Ein Actions-Secret lässt sich nicht zurücklesen. Dafür ist ein autorisierter Dashboard-Zugriff oder ein entsprechend begrenzter Workflow nötig.

Keine Infrastruktur oder Secrets verändert, kein zusätzlicher Workflow oder Deploy ausgelöst. Dieser Snapshot schaltet keine Komponenten frei.
