# Docker-Findings: Trivy-Hinweise, OpenTelemetry und pausierter NATS-Scope

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

## Nachtrag 2026-11-09: Alpine 3.24 / zlib-CVE-2026-4738 – konservativer Fixkandidat

- **Ursache:** Das exakte `node:26.13.0-alpine`-Basisimage (SHA-256 `c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94`) verwendet Alpine **v3.24**; der bisherige Mindeststand `zlib>=1.3.2-r1` ließ den im [Main-Sicherheitslauf 42651215317](https://github.com/SvenKulessa/Capital-AI/actions/runs/42651215317) nachgewiesenen MEDIUM-Befund in Build und Runtime zu.
- **Paket-/Advisory-Quelle:** [Alpine-Advisory in OSV](https://osv.dev/vulnerability/ALPINE-CVE-2026-4738) kennzeichnet `1.4-r0` als Fix für Alpine **v3.24** (neben v3.21–v3.23). Das ist nicht mit der früheren Annahme gleichzusetzen, der Fix sei nur auf Edge vorhanden.
- **Kleinste Änderung:** Die vorhandene `crypto-base`-Stage fordert jetzt aus den **unveränderten Standard-Repositories** `zlib>=1.4-r0` und gibt den tatsächlich installierten Stand mit `apk info -v zlib` aus. `build`, `production-deps` und `runtime` erben dieselbe Stage. Der Node-Image-Digest, die OpenSSL- und GA4-OTel-Pins, Non-Root-UID und die Marktbroker-Pause bleiben unverändert. Keine Edge-Mischung, neue Required Checks, CVE-Ausnahme oder kostenpflichtige Aktivierung.
- **Regression:** Ein zusätzlicher Test in der **bereits vorhandenen** `scripts/docker-context.test.mjs` prüft die Mindestversion, stabile Basis, unveränderte Stage-Vererbung und fehlende Edge-Repositories. Die tatsächliche Paketauflösung, ABI, Image-Scans und Runtime-Funktion sind ausschließlich über den *exakten* nachfolgenden PR-Head-Run zu bestätigen.
- **Evidenzgrenze:** Ein erfolgreicher Quelltexttest allein ist **nicht** `CVE_FIXED`. Bis zu erfolgreichen regulären Required Checks, vollständiger Trivy-/SBOM-Validierung und gesondertem Render-Live-Readback bleibt Produktionswirkung `NOT_PROVEN`. Nachweise und Entscheidung zu [Issue #597](https://github.com/SvenKulessa/Capital-AI/issues/597) sind SHA-gebunden zu protokollieren. **Rollback:** normaler geschützter Revert-PR; keine direkte Produktivänderung.

### PR-/CI-Nachtrag 2026-11-09 (Vorgang #617 → #621)

- [PR #617](https://github.com/SvenKulessa/Capital-AI/pull/617) war ein erster technisch identischer Kandidat mit nicht regelkonformem Branch-Namen und wurde **ohne Merge geschlossen**. Sein erster Docker-Run [42671164749](https://github.com/SvenKulessa/Capital-AI/actions/runs/42671164749) führte die vorhandene Test-Suite tatsächlich aus und meldete eine veraltete Assertion: die Anwendung musste weiterhin genau `zlib>=1.3.2-r1` enthalten. Der Test wurde im selben Scope auf die höhere sichere Mindestversion aktualisiert; der gesonderte NATS-Dockerfile-Quelltest bleibt wegen des pausierten Brokers unverändert.
- [PR #621](https://github.com/SvenKulessa/Capital-AI/pull/621) wurde mit `capital-ai-trust/zlib-cve-2026-4738-20261109` regelkonform eröffnet. Für den bis dahin aktuellen Head `0929362bea4055461de86569b3de250ea9c3fb8a` meldete [Domain Governance 42672069613](https://github.com/SvenKulessa/Capital-AI/actions/runs/42672069613) **SUCCESS**; [Docker Build Sicherheit 42672069605](https://github.com/SvenKulessa/Capital-AI/actions/runs/42672069605) hingegen **FAILURE ohne gestarteten Validate-/Docker-Security-Gate-Job**. Sichtbar waren nur `publish_candidate` und `Production Handoff Gate` als `SKIPPED`; das ist weder eine erfolgreiche CVE-Prüfung noch ein nachgewiesener Fehler bei der Alpine-Paketauflösung. GitHub lehnte das `rerun-failed-jobs` für diesen Lauf mit HTTP 403 ab, weil der Lauf nicht erneut ausführbar war.
- Die tatsächliche Ursache der fehlenden Job-Scheduling-Evidence ist **NOT_PROVEN**. Die Build-/Runtime-Trivy-SBOM-Abnahme bleibt **BLOCKED_CI** und jeder Merge **BLOCKED** bis zu erfolgreichen frischen Checks am finalen Head. Dieser Nachtrag ist ein historischer Fehlversuchsbeleg, keine spätere Statusüberschreibung. Keine Änderungen an Production, Auth, SQL, NATS oder Providerrechten.

## Nachtrag 2026-11-09: verifizierter Scan-Readback und CodeQL-Konfigurationslücke

- **Exakte getestete PR-Identität:** Head `0f945db2350c85acbe72e843f4e0f58e9d4945ae`, getesteter GitHub-PR-Merge-Commit `9d0139beb7f0f24fb381e9298f808f8d548cdf82`, Base `679e93405a4b54e7601951911a2e3242f9332a0c`. Docker Security Gate [42672701812](https://github.com/SvenKulessa/Capital-AI/actions/runs/42672701812), Domain Governance [42672912606](https://github.com/SvenKulessa/Capital-AI/actions/runs/42672912606) beide **SUCCESS**.
- **Reale Paketauflösung:** Docker-Buildlog `Upgrading zlib (1.3.2-r1 -> 1.4-r0)` aus unveränderten Alpine-3.24-Repositories; Build- und Runtime-Trivy-JSON-Zusammenfassungen `vulnerabilities: []`, `secrets: 0`, `blocking: 0`. CycloneDX-Report bestätigt `pkg:apk/alpine/zlib@1.4-r0?arch=x86_64&distro=3.24.3` und `vulnerabilities: []`. Non-Root-/Read-only-Runtime-Smoke erfolgreich. GitHub-Actions-Artefakt `13698848054` hat verifizierten Archiv-Digest `sha256:1701ee39b1ef276fd40950711c825a9274008bfe7e64c628b269ec5e5db78617`. Das lokale Image-Config-ID `sha256:ab9a02a35b10368fbf7e4236f83576b7be51364dffb39349ad1b00529b29d6b4` ist **kein** produktiver OCI-Manifest-/Render-Digest.
- **Offene Einschränkungen:** Trivy Source meldet weiterhin `DS-0026` LOW, nicht als CVE-Fix ausgegeben. NATS `SKIPPED_PAUSED_NOT_VERIFIED`. Produktiver Render-Image-Digest und Runtime-Readback weiterhin `NOT_PROVEN`.
- **Merge-Sperre:** CodeQL meldete auf diesem PR-Head `neutral` mit `1 configuration not found: Default setup /language:actions` (nur JS/TS, Python und Rust liefen). GitHub `mergeable_state: blocked` trotz erfolgreicher Required Checks. Das ist **nicht** durch eine Suppression, deaktivierte Scan-Ruleset oder falsche Freigabe lösbar.
- **Konservative Korrektur im bestehenden Security-Workflow:** Nach bereits vorhandenen Build- und Runtime-Trivy-Schritten verweigert eine gezielte `jq`-Assertion künftig die Freigabe bei erneut gefundenem `CVE-2026-4738` (MEDIUM), ohne allgemeine Severity-Gates zu verändern. Der relevante Workflow ist dabei selbst ein CodeQL-Actions-Scan-Target. Der **neue PR-Head** muss erneut vollständig erfolgreich gescannt werden; bis dahin keine Merge-/Production-Freigabe. Keine neue Required Check, keine NATS-Reaktivierung.
