# GHCR-/Render-Identität: Live-Readback vom 01.10.2026

Die technischen Identitäten des bestehenden Kandidaten wurden am 01.10.2026 über die freigegebene Render-Webshell der **aktiven Instanz lfp5s** erneut gelesen. Kein Build, Promote, Deploy oder Restart wurde dafür ausgeführt. Die offene Lizenzabnahme wird nicht als erfüllt dargestellt.

| Identität | Beobachtung |
|---|---|
| Main-Snapshot | `2150643dae8190fb2f8cd496072a7cc2baa89cfe` |
| Aktiver Source-SHA | `4fbd1373b07092ed8ef550f60e9cf60f1f3f526d` |
| Builder | `SvenKulessa/Capital-AI/.github/workflows/build-security.yml` |
| Workspace / Webservice | AICapital / Capital-AI; `tea-d90o4rj7uimc739i86ug` / `srv-dau1rp893c1s73cdhm1g` |
| Live-Deploy | `dep-dauri23ncjis738243fg`, seit 01.10.2026 01:36:36Z live |
| Unveränderliche Referenz | `ghcr.io/svenkulessa/capital-ai@sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23` |
| OCI-Index | `sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23` |
| linux/amd64-Manifest / Render image.sha | `sha256:3abee0293d0273fa0858e4bbdce00aca8d0f5060f9b9f64ee2c67f9dc6530a3e` |
| Config-Digest | `sha256:c161621d58ea32230750e95adf6551bb6f3c3ac697bfa048b0cf5393cd6356d3` |

## Fünf Validierungsschritte

1. **Source/Kandidat:** Main und Render-Deploy frisch gelesen. Der aktive Kandidat bleibt älter als Main. Kein aktueller Main-Stand wird ihm zugeschrieben.
2. **Registry:** Öffentliche GHCR-Pull-Challenge gelesen; ausschließlich einen anonymen Pull-Token verwendet, nicht ausgegeben. Index, ausgewähltes linux/amd64-Manifest und Config direkt gelesen. SHA-256 wurde jeweils über die originalen Response-Bytes berechnet und mit dem angeforderten Digest verglichen. Alle drei stimmen. Config meldet linux/amd64. Das rohe Plattformmanifest ist zusätzlich gespeichert.
3. **Runtime:** In der aktiven Render-Webshell `http://127.0.0.1:10000/healthz` gelesen: status=ok, bound=true, Source-SHA wie oben, erwarteter Builder. Keine Environment-Secrets gelesen. Die bisherige Health-Zugriffslücke ist damit für diesen Deploy geschlossen.
4. **Handoff:** Lizenzstatus bleibt REVIEW_OPEN. Die Source-Gleichheit mit aktuellem Main fehlt. GitHub-Browser zeigt CodeQL-Alert #1 auf Main, High, Regel js/incomplete-sanitization. Eine erfolgreiche Analyzer-Ausführung hebt diesen Finding-Blocker nicht auf. Code-Quality-Policy bleibt separat nachzuweisen. Production bleibt deployEligible=false.
5. **Korrektur/Regression:** Der Alert entsteht durch die bisherige Ersetzung nur eines Prozentzeichens bei der Änderungssortierung. Der neue Parser akzeptiert vollständige signierte Dezimalprozente mit Punkt/Komma und weist Mehrfachzeichen, angehängte Inhalte und nichtendliche Zahlen zurück. Funktionale Regressionstests sind in der bestehenden Vorprüfung eingebunden; 45 Tests bestanden. TRUST ist für den Security-Befund zuständig; der kleine Fix ist als Voraussetzung dieser PLATFORM-Abnahme enthalten. PRODUCT-Design bleibt unverändert.

**Technischer Befund:** Index → Plattformmanifest → Konfiguration → aktive Render-Referenz → eingebettete Runtime-Source sind für den bestehenden Kandidaten vollständig korreliert. Die historischen Attestation-Verifikationsausgaben aus Run 36765644507 bleiben an denselben Index und Source-SHA gebunden; diese Sitzung ersetzt sie nicht durch eine behauptete neue kryptografische Verifikation.

**Production-Handoff:** weiterhin gehalten. Nach bestätigtem CodeQL-Fix und tatsächlicher Owner-Lizenzabnahme ist der finale Main einmal als neuer Kandidat zu veröffentlichen. Anschließend denselben Digest auf Capital-AI übernehmen und getrennt ohne Rebuild abnehmen. Den vorhandenen kombinierten Publish/Handoff-Workflow nicht für einen bloßen Readback neu bauen lassen. Finance, NATS, Valkey, DNS, Auth und SMTP werden durch diesen Slice nicht umgestellt.

Belege: `docs/security/evidence/digest-live-20261001/`, ursprüngliche Kandidaten-/Attestation-Evidence `docs/security/evidence/ap-sec-image-20261001/`, CodeQL https://github.com/SvenKulessa/Capital-AI/security/code-scanning/1, Render https://dashboard.render.com/web/srv-dau1rp893c1s73cdhm1g/shell.

AP-SEC-IMAGE bleibt GEHALTEN, aber die technischen Runtime-/Konfigurationslücken sind geschlossen. Domain-Inventar und Cutover-/Rollback-Plan können vorbereitet werden. Dauerhafte Self-Healing-Regeln bleiben bis zu drei unabhängigen positiven Validierungen deaktiviert.

## Evidence-Tabelle und Validator-Ergebnis

Zeitpunkt der folgenden Readbacks: 01.10.2026 UTC. C = oben genannter aktiver Source-SHA; I/P/K = oben vollständig aufgeführte Digests. Der Validator wurde mit erwartetem Main `2150643dae8190fb2f8cd496072a7cc2baa89cfe`, Service und Owner aus der Identitätstabelle ausgeführt. Exit 1 ist das erwartete gehaltene Ergebnis, keine erfolgreiche Production-Freigabe.

| Gate | Erwartung | Beobachtung | Quelle/Run/Deploy | Source-SHA/Digest | Zeitpunkt | Status |
|---|---|---|---|---|---|---|
| SOURCE_CURRENT_MAIN | Kandidat entspricht Main | C ist älter als Main 2150643 | candidate.json, GitHub branches/main | C / I | 01.10.2026 | GEHALTEN |
| GHCR / Attestations | Identische veröffentlichte/attestierte Bytes | Drei Byte-Hashes bestätigt; historische Provenance/SBOM an C/I | Run 36765644507; provenance-/sbom-verification.json; Webshell lfp5s | C / I/P/K | 01.10.2026; historische Run-Evidence | PASS |
| LICENSE_REDISTRIBUTION_REVIEW | APPROVED für exakten Kandidaten-Scope | REVIEW_OPEN; Evidence betrifft ed594ef, keine Owner-Freigabe | license-rights-review.json | ed594ef93f66ee8f13f67d75dde56f46a95b1cd6 | 01.10.2026 gelesen | GEHALTEN |
| MAIN_PROTECTION | Strikte Checks/App-IDs, keine Bypässe, lineare Historie | Ruleset aktiv; Docker Security Gate/Domain Governance App 15368; keine Bypässe | Ruleset 24259174; main-rulesets.json | Main 2150643 | 01.10.2026 | PASS |
| RENDER_IMAGE_SOURCE | Richtiger Owner/Service, immutable I | AICapital/Capital-AI stimmen; Finance ausgeschlossen | render-service.json | I | 01.10.2026 | PASS |
| RUNTIME_DIGEST | Aktiver Deploy I, Provider-SHA P, P referenziert K | Byte-geprüftes Plattformmanifest verbindet P/K | dep-dauri23ncjis738243fg; platform-manifest.raw.json | I/P/K | 01.10.2026 | PASS |
| RUNTIME_IDENTITY | bound=true, C, erlaubter Builder | Aktive Instanz lfp5s erfüllt alle drei | runtime-health.json, lokale /healthz-Abfrage | C | 01.10.2026 | PASS |
| REQUIRED_CODE_SCANNING_RESULTS | Policy-konforme Ergebnisse für exakten Source | High-Alert #1 auf Main; Fix in diesem PR, Remote-Neuanalyse ausstehend; keine scoped positive Evidence für C | GitHub CodeQL Alert #1; analysis-results.json leer | Main 2150643 / C | 01.10.2026 | GEHALTEN |
| REQUIRED_CODE_QUALITY_RESULTS | Policy-konforme Ergebnisse für exakten Source | Keine gültige scoped positive Evidence vorgelegt | Ruleset 24259174; analysis-results.json leer | C | 01.10.2026 | OFFEN |

`handoff-live.json`: **PRODUCTION_HANDOFF_BLOCKED**, `deployEligible=false`. Die vier verbleibenden Gates sind SOURCE_CURRENT_MAIN, LICENSE_REDISTRIBUTION_REVIEW, REQUIRED_CODE_SCANNING_RESULTS und REQUIRED_CODE_QUALITY_RESULTS. Die leere Analyse-Evidence ist bewusst keine Freigabe.

Die Lizenzlücke umfasst weiterhin die Redistribution der Container-/Basis-Binaries sowie die tatsächlichen Asset-/Font-/Provider-Rechte im Review-Vertrag. Lokale Tests ändern diesen Scope nicht. Vor einem neuen Lauf sind Owner-Entscheidungen und ihre scoped Belege einzutragen. Danach: Fix-PR regulär prüfen/mergen, finalen Main neu lesen, Publish-only mit genau diesem SHA vorbereiten; erst den erhaltenen attestierten Digest ohne Rebuild auf Service srv-dau1rp893c1s73cdhm1g übernehmen. Ein konkreter neuer Publish-/Deploy-Auftrag wird erst mit dem dann feststehenden Source-SHA und den tatsächlichen Workflow-Inputs zur Freigabe vorgelegt.
