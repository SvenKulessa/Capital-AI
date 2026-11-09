# Docker-Findings: Trivy-Hinweise, OpenTelemetry und pausierter NATS-Scope

> **2026-11-09 · P2 #597 · STABLE_UPSTREAM_PATCH_AVAILABLE / PR_CI_PENDING:** Der aktuelle Main-Security-Run [42651215317](https://github.com/SvenKulessa/Capital-AI/actions/runs/42651215317) auf `main@679e93405a4b54e7601951911a2e3242f9332a0c` meldete weiter `zlib 1.3.2-r1` / `CVE-2026-4738` in **Build und Runtime**, jeweils MEDIUM, `blocking=0`. Alpine v3.24 **stable/main** stellt mittlerweile `zlib 1.4-r0` bereit (offizielle Schwachstellen-Metadaten: https://security.alpinelinux.org/vuln/CVE-2026-4738 ; [OSV für Alpine](https://osv.dev/vulnerability/ALPINE-CVE-2026-4738) ; [v3.24-x86_64-Index](https://ipv4.mirror.telepoint.bg/alpine/v3.24/main/x86_64/) ; [v3.24-aarch64-Index](https://ipv4.mirror.telepoint.bg/alpine/v3.24/main/aarch64/)). Der begrenzte Fix-Kandidat erhöht **nur** das gemeinsame `Dockerfile`-`crypto-base`-Floor auf `zlib>=1.4-r0`; Build, Produktionsabhängigkeiten und Runtime erben dieselbe Stufe, ohne Basis-Digest-Änderung, Alpine-Edge-Mischung, Suppression oder NATS-Reaktivierung. `scripts/docker-context.test.mjs` schützt künftig diese Vererbung. **Bis zur erfolgreichen aktuellen PR- und Main-CI sowie exaktem Image-/SBOM-/Deployment-Nachweis: kein VERIFIED- oder PRODUCTION_FIXED-Status.** Separater [Issue #593](https://github.com/SvenKulessa/Capital-AI/issues/593)-GA4-Lesetest weiterhin offen; frühere OTel-CVE bleibt unabhängig davon gefixt.

> **Fortschreibung vom 2026-11-07 (verifizierte Nachweise, keine Umschreibung des Befund-Snapshots):** Der hier als P1 / REVIEW_REQUIRED dokumentierte historische GA4-OpenTelemetry-Befund `CVE-2026-114603` ist seit dem gemergten [PR #596](https://github.com/SvenKulessa/Capital-AI/pull/596) im getesteten GA4-Paketstand behoben. Auf `main` `098178b529cadd1635d8cd5ab00f52081e4d9f79` sind der [Docker Security Gate #42337462681](https://github.com/SvenKulessa/Capital-AI/actions/runs/42337462681) und das Render-Live-Deployment auf exakt diesem Commit verifiziert. **Nicht nachgewiesen** ist ein authentifizierter echter GA4-Provider-`tools/list`-/Lese-Roundtrip; [Issue #593](https://github.com/SvenKulessa/Capital-AI/issues/593) bleibt deshalb offen. Aktuell verbleibt unabhängig davon die zlib-MEDIUM `CVE-2026-4738` als [P2 #597](https://github.com/SvenKulessa/Capital-AI/issues/597). Die nachfolgenden Aussagen sind die historische Triage **vom 2026-11-06** und dürfen nicht als heutiger Paket-/Deployment-Status gelesen werden. Siehe [aktualisierte GA4-Evidence](GA4-OTEL-RESOLVER-CANDIDATE-20261107.md).
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
