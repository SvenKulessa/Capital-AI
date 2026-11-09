# P1: GA4 MCP – isolierte Trace-Context-Propagatoren

Stand: 2026-11-06 · Primary Domain TRUST · Cross-Domain GROWTH/PLATFORM  
Status: **MITIGATED_SCOPE_ONLY / CVE_NOT_FIXED / CI_PENDING**  
Nachverfolgung: Issue #593.

## Ursache und Abhängigkeiten

Ein historischer vollständiger Docker-Scan hat `opentelemetry-api 1.44.0` in der isolierten `/opt/ga4-mcp`-venv gefunden (`CVE-2026-114603`, MEDIUM, W3C `tracestate`-Parser, CPU/DoS). Ein Update auf mindestens `1.45.1` wäre erforderlich, um den Paketbefund wirklich zu beheben. Offizielle `google-adk 2.13.0`-Metadaten verlangen jedoch `opentelemetry-api>=1.39,<=1.44` und `opentelemetry-sdk>=1.39,<=1.44`. Auch `analytics-mcp 1.0.0` hängt weiterhin von `google-adk>=2.11.0` ab. Ein erzwungener Override, `--no-deps`-Install oder Advisory-Ignore ist daher keine akzeptable Lösung.

## Begrenzte, unmittelbar wirksame Maßnahme

`server/google-analytics-mcp.mjs` erzeugt den internen, ausschließlich per stdio kommunizierenden `analytics-mcp`-Unterprozess mit einer bewusst schmalen `childEnv`. Diese umfasst nun explizit `OTEL_PROPAGATORS=none`, statt eine mögliche elterliche W3C-Trace-Context-Einstellung zu übernehmen. Das verhindert die automatische Registrierung von `tracecontext`-/`baggage`-Propagatoren im Unterprozess und passt zum bestehenden erlaubten GA4-Readback ohne öffentliche HTTP-MCP-Eingänge und ohne vertragliche Trace-Weitergabe.

Diese Umgebungsvariable ersetzt **keine** bibliotheksseitige Reparatur: direkte Aufrufe von `TraceState.from_header`, Transitive Imports, alternative Parser oder ein späterer Transportwechsel sind durch diese Einstellung nicht ausgeschlossen. Insbesondere ist `CVE-2026-114603` im installierten Paket **nicht behoben** und die exakte produktive Reachability bleibt `NOT_PROVEN`.

## Reproduzierbarer Test

`scripts/mcp-isolation.test.mjs` startet den bestehenden GA4-Client gegen einen vollständig lokalen, gefälschten stdio-JSON-RPC-Subprozess (ohne Netzwerk, Google-Credentials oder Providerzugriff). Ein absichtlich auf `tracecontext,baggage` gesetzter Elternwert wird im Child zu `none` eingeschränkt. Die Tests kontrollieren die vier erlaubten Werkzeuge, stdio, den Projektkontext und den Ausschluss von Credential-JSON aus der Child-Umgebung. Dieser Test läuft als Teil des bestehenden `Docker Security Gate` (keine neuen Required Checks).

## Ausstehende P1-Behebung

Issue #593 bleibt für den vollständigen Fix offen: resolverkompatible, offizielle `analytics-mcp`-/`google-adk`-Releases oder eine eng geprüfte Alternative ohne ADK; unveränderte vier Read-Only-MCP-Tools; `pip check`, Import-/stdio-Smoke, GA4-Projektbindung, Trivy-CVE-Readback, SBOM/Integritäts-/Lizenzprüfung am exakt getesteten Image. Keine Production-Keys, kein Provider-Write und keine echte GA4-Mutation.

Quellen:
- https://github.com/open-telemetry/opentelemetry-python/security/advisories/GHSA-xcq7-p3pf-p88h
- https://opentelemetry.io/docs/languages/sdk-configuration/general/#otel_propagators
- https://github.com/google/adk-python/blob/v2.13.0/pyproject.toml
- https://github.com/googleanalytics/google-analytics-mcp/blob/1.0.0/pyproject.toml
- https://github.com/SvenKulessa/Capital-AI/issues/593

Rollback: regulärer geschützter Revert dieses Changes. NATS bleibt gemäß Owner-Entscheidung pausiert und wird durch diese Maßnahme weder geprüft noch gestartet.
