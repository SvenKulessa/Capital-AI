# GA4 MCP: OpenTelemetry resolver-kompatibler Patchkandidat (2026-11-07)

Primary Domain: TRUST · beteiligt: PLATFORM/GROWTH · Follow-up: [P1 Issue #593](https://github.com/SvenKulessa/Capital-AI/issues/593).

**Status: CANDIDATE / PR_CI_PENDING / PRODUCTION_NOT_PROVEN / CVE_NOT_CLEARED.**
Der frühere PR #594 wurde nach grüner CI gemergt und hat automatische W3C-Trace-Propagatoren im isolierten read-only GA4-Unterprozess abgeschaltet. Das ist eine Reichweitenminderung, kein bibliotheksseitiger Fix.

## Neue offizielle Version

Am 7. November 2026 um 00:58:18 UTC wurde [Google ADK v2.14.0](https://github.com/google/adk-python/releases/tag/v2.14.0) in GitHub als nicht-vorläufiger Release markiert. Das zugehörige **versionierte** [pyproject.toml](https://github.com/google/adk-python/blob/v2.14.0/pyproject.toml) erlaubt
`opentelemetry-api>=1.39,<=1.45.2` und `opentelemetry-sdk>=1.39,<=1.45.2`. Anders als ADK 2.13.0 mit `<=1.44` ist 2.14.0 somit vom Upstream-Metadatenvertrag her für den behobenen OTel-Stand freigegeben. Das formale GitHub-Release **beweist allein noch keine verfügbare/verifizierte PyPI-Distribution**. Die reguläre Docker-Installation muss diesen Nachweis in CI erbringen.

## Minimaler Update-Scope

In `Dockerfile` wird der bestehende offizielle read-only Provider `analytics-mcp==0.7.0` beibehalten, statt seinen MCP-Server und die erlaubten vier Tool-Verträge zugleich zu ändern. Im **separaten** `/opt/ga4-mcp`-Venv werden `google-adk==2.14.0`, `opentelemetry-api==1.45.2` und `opentelemetry-sdk==1.45.2` fest gepinnt. Ein regulärer `pip install` ohne Override muss alle transitiven Anforderungen auflösen; danach müssen `pip check` und exakte `importlib.metadata.version`-Assertions bestehen, bevor pip/setuptools aus dem Image entfernt werden. Der importierbare GA4-Server und die unveränderte Befehlsschnittstelle werden weiterhin geprüft.

Weder eine direkte Installation mit `--no-deps` noch das Unterdrücken des Trivy-Befundes wird akzeptiert. `OTEL_PROPAGATORS=none` und der bisherige read-only stdio-/Credential-/Projekt-Grenzschutz bleiben bestehen.

## Verbindlicher CI- und Production-Nachweis

1. Bestehende PR-Checks `Domain Governance`, `Docker Security Gate`, einschließlich `scripts/mcp-isolation.test.mjs`, vollständig grün auf dem exakten aktuellen PR-Head und Main-Basis. Kosten nur im Rahmen regulärer GitHub Actions, keine neuen API-/Cloud-Dienste.
2. Der Docker-Build löst `google-adk==2.14.0` aus dem regulären Paketindex auf, `pip check` und Versions-Assertions beweisen API/SDK `1.45.2`; Entrypoint/GA4-SDK-Imports und Read-Only-Tool-Contract bleiben erfolgreich.
3. Trivy-SBOM plus Runtime-Paketinventar im **exakt getesteten Build/Runtime-Image** zeigen keine `CVE-2026-114603` und keine neuen blockierenden HIGH-/CRITICAL-Befunde. SHA-/Provenance-/Lizenznachweise für die veröffentlichten Artefakte getrennt von bloßen Versionsmetadaten dokumentieren.
4. Erst bei vollständigen Kriterien nach aktueller `AGENTS.md` mergen. Danach Main-Docker-Checks, Render Deploy-Commit-ID und gezielten GA4-Runtime-Readback getrennt beurteilen. Ohne echte GA4-Readback-Credentials bleibt Funktionswirkung `NOT_PROVEN`.

**Merge-Reihenfolge:** Offener PR #585 verändert ebenfalls `Dockerfile`. Vor einem Merge zu diesem Fix neueste offene PRs/Files vergleichen, Branch auf den dann aktuellen Main synchronisieren und die Required Checks erneut auswerten. Keine fremden Scope-Dateien überschreiben.

**Rollback:** Geschützter Revert-PR zum späteren Squash-Merge; bei Problemen GA4-Readback deaktiviert lassen/als `NOT_PROVEN` markieren. Keine NATS-Scans, NATS-Broker- oder Rust-Bridge-Aktivierung. Kein Auth-, Provider-Write- oder lizenzrelevanter Umfang.
