# GA4 MCP: OpenTelemetry-Sicherheitsfix und verifizierter Laufzeitstand (2026-11-07)

Primary Domain: TRUST · beteiligt: PLATFORM/GROWTH · Tracking: [Issue #593](https://github.com/SvenKulessa/Capital-AI/issues/593) · Umsetzung: [PR #596](https://github.com/SvenKulessa/Capital-AI/pull/596).

**Status (Evidence-Snapshot 2026-11-07 04:22 UTC): LIBRARY_CVE_FIXED_IN_SCANNED_MAIN_IMAGE / RENDER_DEPLOY_LIVE / REAL_GA4_PROVIDER_READBACK_NOT_PROVEN.**

Dies ist der Abschlussnachweis für den ursprünglich hier geplanten Kandidaten. Die Überschrift des Dateipfads `GA4-OTEL-RESOLVER-CANDIDATE-20261107.md` bleibt aus Gründen stabiler Referenzen erhalten; `PR_CI_PENDING`, `CVE_NOT_CLEARED` und `PRODUCTION_NOT_PROVEN` sind **keine aktuellen Paket-/Deployment-Statuswerte** mehr.

## Ursache und minimale Korrektur

Der frühere historische GA4-MCP-Scan meldete `opentelemetry-api 1.44.0` / `CVE-2026-114603` (`GHSA-xcq7-p3pf-p88h`, MEDIUM). Google ADK 2.13.0 begrenzte API/SDK auf `<=1.44`; ein erzwungener Fix hätte den Resolver-Vertrag verletzt. PR #594 isolierte zuvor den read-only GA4-stdio-Unterprozess mit `OTEL_PROPAGATORS=none`, behob die Paket-CVE aber nicht.

Der offizielle stabile [Google-ADK-Release v2.14.0](https://github.com/google/adk-python/releases/tag/v2.14.0) vom 07.11.2026 erlaubt laut [versioniertem Upstream-Metadatenvertrag](https://github.com/google/adk-python/blob/v2.14.0/pyproject.toml) `opentelemetry-api` und `opentelemetry-sdk` bis `1.45.2`.

Der gemergte Fix [#596](https://github.com/SvenKulessa/Capital-AI/pull/596) installiert im isolierten `/opt/ga4-mcp`-Venv `analytics-mcp==0.7.0`, `google-adk==2.14.0`, `opentelemetry-api==1.45.2` und `opentelemetry-sdk==1.45.2`. Die vier bestehenden read-only-MCP-Werkzeugverträge, `OTEL_PROPAGATORS=none` und die Credential-/Projektgrenzen bleiben unverändert. Installation durch regulären `pip install`-Resolver, danach `pip check`, exakte Versions-Assertions und Import-/Isolations-Regression; **kein** `--no-deps`, kein Trivy-Ignore und keine neuen Providerrechte.

## Nachweise – Scope jeweils getrennt

| Prüfobjekt | Nachweis | Bewertung |
| --- | --- | --- |
| #596 PR-Head `42fa69c630a58b3246cc89c01eb51c7f4aed2dcc` | [Domain Governance #42322090688](https://github.com/SvenKulessa/Capital-AI/actions/runs/42322090688) und [Docker Security Gate #42322090732](https://github.com/SvenKulessa/Capital-AI/actions/runs/42322090732) erfolgreich; regulärer Resolver, `pip check`, GA4-Imports, mock-stdio-Isolation, Build-/Runtime-Scan, SBOM/Lizenz | **VERIFIED** für getesteten Kandidaten |
| Merge nach `main` | [Squash-Merge `2736bf98...`](https://github.com/SvenKulessa/Capital-AI/commit/2736bf98acff8ff19d789f70d44a04f3046f690f); [Main Docker Security Gate #42322831385](https://github.com/SvenKulessa/Capital-AI/actions/runs/42322831385) erfolgreich | **VERIFIED** |
| Späterer `main` `098178b529cadd1635d8cd5ab00f52081e4d9f79` | [Docker Security Gate #42337462681](https://github.com/SvenKulessa/Capital-AI/actions/runs/42337462681) erfolgreich; Dockerfile bewahrt die GA4-/OTel-Pins; `pip check` „No broken requirements found“; Build- und Runtime-Scan melden **keine** `CVE-2026-114603` | **VERIFIED** für exakt diesen CI-SHA und Scanstand |
| Render-Webservice `Capital-AI` (`srv-dau1rp893c1s73cdhm1g`) | Read-only-Render-Deployment `dep-dbnadhu8bjmc73a29mn0`: `live` für **denselben** `098178b529cadd1635d8cd5ab00f52081e4d9f79`, beendet 2026-11-07 04:22:12 UTC; `autoDeployTrigger=checksPass` | **VERIFIED** für Deployment-Identität, nicht GA4-Provider-Funktion |
| Echter GA4-MCP-Provider | Kein authentifizierter `tools/list`-Roundtrip oder echte erlaubte GA4-Leseanfrage mit berechtigtem Konto nachgewiesen. Mock-stdio-Tests und Python-Imports sind dafür kein Ersatz. | **NOT_PROVEN** |

Die Image-Scans belegen das Fehlen **dieser einen** OTel-CVE im genannten geprüften Artefakt. Sie belegen weder allgemeine CVE-Freiheit noch eine Reachability-/Funktionsprüfung des live angebundenen Google-Analytics-Providers. Publikations-/Resolver-Evidence und SBOM liegen vor; ein gesonderter vollständiger externer Hash-/Provenance-Attest **jedes** transitiven Python-Artefakts wird hier nicht beansprucht.

## Offen: reale Provider-Verifikation und unabhängige zlib-CVE

1. **[P1 #593](https://github.com/SvenKulessa/Capital-AI/issues/593):** Mit einem ausdrücklich berechtigten GA4-Konto und zulässigem Projekt read-only `tools/list` am tatsächlichen MCP-stdio-Provider sowie eine bestehende erlaubte GA4-Leseoperation prüfen. Keine Keys, Tokens, GA4-Eigenschaften oder Kundendaten in Issue, CI, Logs oder Chat publizieren. Bis dahin `GA4_PROVIDER_READBACK_NOT_PROVEN`; Issue offen halten.
2. **[P2 #597](https://github.com/SvenKulessa/Capital-AI/issues/597):** Die separaten aktuellen Build-/Runtime-Trivy-Summaries melden `zlib 1.3.2-r1` / `CVE-2026-4738` (MEDIUM, `blocking=0`), nicht die frühere OTel-CVE. Nur einen unterstützten stabilen Alpine-Patch/kompatibles Basisimage prüfen und später nach neuem CI-/SBOM-/Runtime-Nachweis aktualisieren. Kein Edge-Stable-Mixing, keine CVE-Unterdrückung.
3. **Scope/Änderungsreihenfolge:** Bestehende offene PRs #585 und #588 berühren ebenfalls das Root-`Dockerfile`. Ihre eigene Main-Synchronisierung und frischen Required Checks sind vor deren Merge zu prüfen; dieser Dokumentationsabschluss verändert das Dockerfile nicht.

**Rollback:** Sollte die Änderung aus #596 zurückgenommen werden müssen, nur über einen gesonderten geschützten Revert-/Fix-PR und nach Bewertung des möglichen Wiederauftretens von `CVE-2026-114603`. Keine Produktions-Secrets exportieren, keine kostenpflichtige Provideraktivierung. NATS und Rust Provider Bridge bleiben deaktiviert und werden weder getestet noch neu bereitgestellt. Kein neuer Required Check, keine zusätzliche Freigabestufe.
