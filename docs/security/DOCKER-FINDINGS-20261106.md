# Docker-Findings: Trivy-Hinweise, OpenTelemetry und pausierter NATS-Scope
Stand: 2026-11-06 · Primary Domain: TRUST · Cross-Domain: PLATFORM

## Evidenzbasis / Grenzen

- `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`) und `render.yaml`: NATS und Rust Provider Bridge bleiben deaktiviert, bis die notwendigen Rechte für echte Marktdaten vorliegen; `MARKET_BROKER_PAUSED=true`, `MARKET_PUBSUB_ENABLED=false`, `PRIVATE_PROVIDER_BRIDGE_ENABLED=false`.
- Historische Docker-Evidence: `Capital-AI-PR-Security-Audit-2026-10-30.md` vom 31.10.2026, ursprünglicher vollständiger #527-Scan. Die daraus übernommenen Paketversionen sind **keine neue Production-Runtime- oder aktuelle Image-Scan-Aussage**.
- Die vorhandenen Trivy-Summaries zählen HIGH/CRITICAL und Secret-Funde als blockierend; `blocking=0` ist ausdrücklich nicht gleichbedeutend mit `findings=0` oder einem Reachability-Attest.
- Keine Produktionsänderung, kein neuer NATS-Test und keine aktuelle vollständige GA4-Dependency-/Runtime-Verifikation in dieser Triage. Die regulären CI-Checks der vorgeschlagenen Branch-Änderung sind separat auszuwerten.

## P1: OpenTelemetry-API in der GA4-MCP-Umgebung

Historischer Befund: `CVE-2026-114603` / `GHSA-xcq7-p3pf-p88h` in `opentelemetry-api 1.44.0`, MEDIUM. Ursache ist die ineffiziente Verarbeitung eines manipulierten `tracestate`-Werts; vorrangige Auswirkung: Ressourcenverbrauch/Denial of Service. Upstream-Fix ab `opentelemetry-api 1.45.1`.

Betroffener Pfad: `Dockerfile` baut den GA4-MCP-Provider als isolierte Python-venv `/opt/ga4-mcp` mit `analytics-mcp==0.7.0`. Das historische Abhängigkeitsfenster von `google-adk` beschränkte die OpenTelemetry-1.44-Familie. Die PR-Agent-Venv ist **ein anderer Dependency-Graph**: `deploy/pr-agent/pyproject.toml` hat bereits `opentelemetry-api==1.45.1` und passende SDK-/Exporter-Pins. Ein Upstream-Migrationspfad für die GA4-MCP-venv muss **transitiv resolverkompatibel** sein, nicht nur per forcierter `pip install --no-deps`-Umgehung.

Risikoeinschätzung: P1 zur Bereinigung, jedoch keine nachgewiesene öffentlich erreichbare `tracestate`-Eingabeschnittstelle im GA4-MCP-stdio-Pfad. `server/google-analytics-mcp.mjs` gestattet nur eingeschränkte, serverseitige MCP-Leseoperationen. **Erreichbarkeit/Exposure und aktueller Produktionsstand: NOT_PROVEN**. Eine Ausnutzung ist nicht nachgewiesen.

Kleinster belastbarer Fix in separatem, ausführbarem Scope: kompatible stabile `analytics-mcp`/`google-adk`-Version und kohärente `opentelemetry-api`, `opentelemetry-sdk` und OTLP-Exporter-Familie auswählen; Constraints/Lock/Integrität und Lizenz prüfen; `pip check`, GA4-MCP-stdio/Import-Smoke, App-Regression, Build- und Trivy-Image-Scan sowie SBOM auf exakt demselben Kandidaten nachweisen. Bleibt die transitive Sperre bestehen, vorerst Restrisiko/Isolation dokumentieren statt Resolver zu umgehen. Kein MEDIUM-Suppressions-Eintrag.

Upstream: https://github.com/advisories/GHSA-xcq7-p3pf-p88h

## P2: Nicht blockierende Docker-Konfigurationshinweise

| Finding | Einordnung | Konkrete Behandlung |
| --- | --- | --- |
| `DS-0013`, MEDIUM | Dockerfile `RUN cd` statt anhaltendem `WORKDIR`; Wartbarkeit/Context-Robustheit, aus dem Befund allein keine ausnutzbare Schwachstelle belegt | Bei aktivem betroffenen Dockerfile `WORKDIR` und Layer-Semantik prüfen; keine pauschalen Changes an pausierten NATS-Dateien |
| `DS-0026`, LOW | Kein Docker-`HEALTHCHECK`; betrifft Diagnose/Orchestrator-Verhalten | Nur bei einem länger laufenden relevanten Service mit geeignetem, harmlosen Probe-Kommando ergänzen; ein einmaliger Security-Scanner benötigt nicht automatisch einen Healthcheck |

Historische NATS-bezogene Source-Hinweise bleiben im allgemeinen Source-Scan erkennbar; das pausierte NATS-Binary wird nicht erneut gescannt. Die verifizierten App-/Build-Image-Befunde dürfen dadurch weder unterdrückt noch als behoben bezeichnet werden.

Referenzen: https://avd.aquasec.com/misconfig/dockerfile/DS-0013/ und https://avd.aquasec.com/misconfig/dockerfile/DS-0026/

## DEFERRED / NOT_VERIFIED: NATS / GO-2026-5932

Historisches `GO-2026-5932` (`golang.org/x/crypto`, UNKNOWN) bleibt sichtbar. Die Reachability einer exakten Render-Production-Binary-Identität ist nicht festgestellt. Historische CI-`NOT_AFFECTED`-VEX wäre nur auf die damals untersuchte Binary-SHA übertragbar.

Der aktuelle Branch setzt **nur im bestehenden Docker Security Gate** eine scope-basierte Pause um: Bei eindeutiger versionierter `MARKET_BROKER_PAUSED=true` werden NATS-Dockerfile-Lint, Binary-Test, Image-Build, Disk-/Runtime-Smoke, Image-Scan, govulncheck und VEX-Neubewertung ausgelassen; der Bericht wird als `SKIPPED_PAUSED_NOT_VERIFIED` und nicht als `PASS` publiziert. Source-, Build-/Runtime-App-Scans und Secret-Schutz bleiben unangetastet. Fehlende oder mehrdeutige Pausen-Konfiguration löst konservativ weiter die Prüfungen aus.

**Reaktivierungsauslöser:** Erst wenn Lizenz-/Providerrechte tatsächlich vorliegen und die Reaktivierung autorisiert ist, die Pause in `render.yaml` aufheben und die bisherigen vollständigen NATS-Sicherheitsprüfungen vor produktiver Nutzung erneut ausführen. Ein Git-/Workflow-PASS ist kein Live-Readback der Render-Control-Plane. Kein automatischer NATS-Restart/Redeploy durch die vorliegende Änderung.

## Entscheidung

- OpenTelemetry: **P1 / REVIEW_REQUIRED**, bis kompatibler GA4-Dependency-Fix und exaktes Image überprüft sind.
- Docker-Hinweise: **P2 / ACCEPTED NONBLOCKING**, kontextbezogen im nächsten aktiven Dockerfile-Change behandeln.
- NATS: **DEFERRED / NOT_VERIFIED** bis zum expliziten Reaktivierungsereignis.
- Keine neuen Required Checks, Waiver, Ignore-Listen, zusätzlichen Kosten oder Production-Aktionen.
