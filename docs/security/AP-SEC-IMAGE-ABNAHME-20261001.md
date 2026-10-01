# AP-SEC-IMAGE: Abnahme vom 01.10.2026

Ergebnis: **PRODUCTION_HANDOFF_BLOCKED**, `deployEligible:false`. Kein Publish, Deploy, DNS-Wechsel, Finance-Stopp oder Ruleset-Schreibzugriff wurde ausgeführt. Primary Domain PLATFORM; Lizenz-/Security-Entscheidungen bleiben bei TRUST.

## 1. Quellstand und Kandidat

Die Branch-API und der lokale Checkout ergeben `main@07b3ff1785d2306bc743f41c990c975a69365d0b` nach Squash-Merge von PR #70. Im Repository-Baum ist keine AGENTS.md vorhanden; die Domain-Anweisung steht in `CAPITAL-AI-PLATFORM/PROJECT.md`.

| Kürzel | Identität |
|---|---|
| M | `07b3ff1785d2306bc743f41c990c975a69365d0b` – aktueller Main-Snapshot |
| C | `4fbd1373b07092ed8ef550f60e9cf60f1f3f526d` – Kandidaten-Source-SHA |
| R | Aktiver Runtime-Source-SHA unbekannt: kein aktuelles Health-Dokument erhalten |
| I | `sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23` – OCI-Index |
| P | `sha256:3abee0293d0273fa0858e4bbdce00aca8d0f5060f9b9f64ee2c67f9dc6530a3e` – linux/amd64-Manifest |
| K | `sha256:c161621d58ea32230750e95adf6551bb6f3c3ac697bfa048b0cf5393cd6356d3` – Konfigurationsdigest laut Registry-Scan |

Unveränderliche Kandidatenreferenz: `ghcr.io/svenkulessa/capital-ai@sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23`.

Run `36765644507`, Attempt 1, veröffentlichte C am 30.09.2026. `candidate.json` bleibt unverändert `ATTESTED_CANDIDATE`, nicht deploybar. Der Production-Handoff-Job dieses Runs war **skipped**. Der aktuelle Docker-Run `36796475915` für M war erfolgreich; Publishing und Handoff waren dort ebenfalls skipped.

Der existierende Handoff-Workflow verlangt vor der Abnahme `current main == SOURCE_SHA`. C erfüllt diesen Vertrag heute nicht mehr. Außerdem unterscheiden sich tatsächlich ausgelieferte Dateien: `server/index.mjs` und `server/infrastructure.mjs` enthalten auf M den neuen Probe-Subscriber und weitere Broker-Korrekturen. Der Frontend-/Roadmap-Stand wurde ebenfalls verändert. Ein neuer Kandidat für den finalen freigegebenen Main ist daher erforderlich; PR #59–#69 sind dafür keine Voraussetzung. Ein Promote des vorhandenen Artefakts ersetzt keine Aufnahme dieser Quelländerungen.

## 2. Registry, Attestations und Security

Die heruntergeladenen ZIPs stimmen bytegenau mit den von GitHub gemeldeten Artefakt-Digests überein:

- Kandidat `11121345077`: `sha256:dcafcc6339570ba9141210d1533321ed7feb79739959711ddcbba5ec36c8cc8e`.
- Security `11120243424`: `sha256:90bffbb55e51ef1b6752ac9630574d94964a9cdaeffb614730c3358c8bbb737b`.

Der vollständige veröffentlichte Index enthält P für linux/amd64 sowie ein unknown/unknown-Attestation-Manifest. Registry-Scan und SBOM beziehen sich auf das vom Publish-Job per unveränderlicher Referenz gezogene Image. Alle veröffentlichten Scan-Ergebnisse wurden eingelesen: Build-/App-/Registry-Scan ohne Vulnerabilities oder Secrets; Source mit zwei LOW `DS-0026`; NATS mit UNKNOWN `GO-2026-5932`, `golang.org/x/crypto v0.57.0`, ohne angegebenen Fix. Das damalige Gate blockiert HIGH/CRITICAL und Secrets; die verbleibenden Findings werden nicht als entfernt dargestellt. NATS ist eine separate Komponente und wird nicht wegen dieser Abnahme deployed.

Die vollständigen archivierten Provenance-/SBOM-Verifikationsausgaben enthalten denselben Subject-Digest I, Source C, Repository `SvenKulessa/Capital-AI`, Ref `refs/heads/main`, Signer `SvenKulessa/Capital-AI/.github/workflows/build-security.yml`, OIDC-Issuer `https://token.actions.githubusercontent.com` und github-hosted Runner. Provenance-Predicate: `https://slsa.dev/provenance/v1`; SBOM-Predicate: `https://cyclonedx.org/bom`. Die jeweiligen gh-Verifikationsschritte im Publish-Job waren erfolgreich. **Dies belegt die historische Verifikation vom Publish-Run; in dieser Sitzung wurde keine neue unabhängige kryptografische Verifikation ausgeführt.**

Der Workflow lädt das geprüfte Docker-Tar, prüft dieselbe Docker-ID und linux/amd64, pusht ohne erneuten Anwendungsbuild und zieht/scant anschließend dieselbe Registry-Referenz. `candidate.localImageId` und `image-id.txt` sind hier I. Deshalb darf diese lokale Docker-ID nicht automatisch als Konfigurationsdigest K bezeichnet werden. K stammt aus `registry-image.json/Metadata/ImageID`; ein separat archiviertes rohes Plattform-Manifest mit `config.digest` fehlt. Ein frischer Registry-Readback soll diese zusätzliche direkte K-Bindung sichern.

## 3. Render und Runtime

Workspace `AICapital`: `tea-d90o4rj7uimc739i86ug`. Ziel: Webservice `Capital-AI`, `srv-dau1rp893c1s73cdhm1g`, runtime image, Autodeploy aus. Finance `srv-d91o1o9o3t8c73edi55g` ist ein anderer Service und bleibt bestehen.

Konfigurierte Quelle und aktiver Deploy `dep-dauo3nc1nsns73f1u4t0` wurden getrennt gelesen. Beide verwenden die exakte Referenz mit I. Deploy status live; `image.sha` ist P und entspricht genau dem linux/amd64-Deskriptor in I. Diese konkrete Zuordnung ist belegt; eine pauschale Provider-Regel, jeder Render-SHA sei ein Config-Digest oder müsse I entsprechen, wird daraus nicht abgeleitet. Start 30.09.2026 21:40:50.771351Z; live beendet 21:41:11.691986Z.

Aktuelles `/healthz`: Shell-Proxy-Timeout, Web-Abruf nicht verfügbar, Cloud-Browser `ERR_BLOCKED_BY_CLIENT`. Das ist eine Zugriffslücke dieser Sitzung, kein Nachweis eines Serviceausfalls. Das archivierte CI-Smoke-Health enthält bound=true, C und den erwarteten Builder; es ersetzt **keinen** aktuellen Render-Health-Readback. R bleibt unbekannt. Vor Freigabe: aktuelles Health über einen genehmigten Actions-Readback beziehen und direkt gegen Kandidat/Deploy korrelieren.

## 4. Evidence-Tabelle

Zeitpunkt des korrelierten Snapshots: 01.10.2026 00:44:30Z (02:44:30 Berlin). Historische Run-Zeitpunkte stehen separat in den Nachweisen. Kürzel M/C/R/I/P/K sind oben vollständig aufgelöst.

| Gate | Erwartung | Beobachtung | Quelle/Run/Deploy | Source-SHA/Digest | Zeitpunkt | Status |
|---|---|---|---|---|---|---|
| SOURCE_CURRENT_MAIN | Kandidat entspricht aktuellem Main-Vertrag | C != M; produktive Quelländerungen fehlen im Kandidaten | Branch main; Run 36765644507; Git-Diff | M / C / I | Snapshot | GEHALTEN |
| GHCR/Attestations | Derselbe geprüfte und attestierte Kandidat | Historische gh-Verifikation erfolgreich; keine frische Crypto-Verifikation oder rohe config.digest-Bindung | Artefakte 11121345077 / 11120243424 | C / I / P / K | 30.09.19:26–19:30Z | OFFEN |
| LICENSE_REDISTRIBUTION_REVIEW | APPROVED, deployEligible=true, Source exakt C | REVIEW_OPEN, false, Source ed594ef93f66ee8f13f67d75dde56f46a95b1cd6 | license-rights-review.json | Lizenz-SHA != C | Snapshot | GEHALTEN |
| MAIN_PROTECTION | Strict Checks, richtige App, kein Bypass, lineare Historie | Aktiv; Docker Security Gate und Domain Governance jeweils App 15368; Strict true; kein Bypass; squash zugelassen; lineare Historie erforderlich | Ruleset 24259174 | M | Snapshot | PASS |
| RENDER_IMAGE_SOURCE | Richtiger Owner/Service, exakte Digest-Referenz | image-backed Capital-AI im AICapital-Workspace mit I | render-service.json | C / I | Snapshot | PASS |
| RUNTIME_DIGEST | Aktiver Deploy verwendet I/P; vollständige direkte Konfigurationsbindung | Live-Deploy ref I, sha P passt; rohes Plattform-Manifest für K-Bindung fehlt | dep-dauo3nc1nsns73f1u4t0; registry-manifest.json | I / P / K | Snapshot | OFFEN |
| RUNTIME_IDENTITY | Aktuelles Health: bound=true, Source C, erlaubter Builder | Aktuelles Health fehlt; historisches Smoke-Health nicht übernommen | runtime-health-unavailable.json | R unbekannt | Snapshot | UNGEKLÄRT |
| REQUIRED_CODE_SCANNING_RESULTS | Aktivierte CodeQL-Policy samt Findings erfüllt | Drei Analyze-Jobs auf M success; Alert-/Policy-Readback nicht zugänglich; C nicht dadurch freigegeben | Main-Checks; Ruleset code_scanning | M != C | Snapshot | UNGEKLÄRT |
| REQUIRED_CODE_QUALITY_RESULTS | Aktivierte warnings-Policy erfüllt | Code-Quality-Regel aktiv, sourcegebundene Ergebnis-Evidence fehlt | Ruleset code_quality | C | Snapshot | UNGEKLÄRT |

Der Main-Validator wurde unverändert ausgeführt: blocked wegen Lizenz und Runtime-Identität. Er übersieht den Main-Altersvertrag, die konkrete Provider-Digest-Bindung, lineare Historie/App-Identitäten und die aktivierten Analyseanforderungen. Das vorgeschlagene korrigierte Ergebnis liegt getrennt in `handoff-proposed-validator.json`; es blockiert zusätzlich Source-, direkte Config-Bindungs- und Analyse-Lücken. Beide Ergebnisse sind lokale Auswertungen, kein erfolgreich gelaufener Production-Handoff.

Die tatsächliche Owner-Lizenzabnahme bleibt TRUST-Arbeit: OS-Binary-/Source-Delivery, Notices, AI-/Asset-/Markenrechte, Font-Identität und Providervertragsumfang im tatsächlichen Auslieferungsscope prüfen. Vorhandene FRONTEND-Lizenzdateien und Tests ersetzen diese Entscheidung nicht. Keine automatische Umschreibung auf APPROVED.

## 5. Korrekturen, nächste Läufe und Roadmap

Der Validator bindet nun Render-SHA an den eindeutigen linux/amd64-Indexeintrag, übernimmt den vorhandenen Main-Ruleset-Validator inklusive App 15368/lineare Historie und prüft den bestehenden Current-Main-Vertrag auch lokal. Bei aktivem code_scanning/code_quality blockieren fehlende separate sourcegebundene Policy-Ergebnisse. CLI-Parameter nach Registry-Scan: `analysisResults.json` und das rohe `registry-platform-manifest.json`. Dessen SHA-256 wird über die unveränderten Dateibytes ermittelt und mit P verglichen; `config.digest` muss K entsprechen. Für künftige Publishing-Läufe wird dieses Manifest archiviert. `analysisResults.json` ist ein Array aus `{type, sourceSha, status, evidenceUrl}`. PASS muss die vollständige jeweilige Provider-Policy-Auswertung bezeichnen, nicht lediglich einen erfolgreichen Analyzer-Job. Der aktuelle Workflow liefert diese Readbacks noch nicht und bleibt bei solchen Regeln fail-closed. Ein passender Reader muss vor einer zukünftigen Freigabe ergänzt und gegen die tatsächlichen Provider-Antworten geprüft werden.

Render-Deploy-Listen werden im Workflow mit `.deploy // .` normalisiert; exakt ein aktiver Deploy ist erforderlich. Regressionen prüfen fremde Provider-SHAs, fehlende/mehrdeutige Registry-Evidence, ältere Source-SHAs, lineare Historie, fremde/ungebundene Check-Apps, Main-Ausschlüsse und fehlende Analyseergebnisse. Lokaler Preflight: 43/43 Tests, Lizenzinventar 333 Einträge. Erster Versuch scheiterte ausschließlich am hier fehlenden /tmp; Wiederholung mit beschreibbarem TMPDIR erfolgreich. Kein Vollbuild und keine Dependency-Updates.

Konkrete vorbereitete Laufparameter, **nicht ausgeführt**:

| Lauf | Source/Ref | Ziel/Inputs | Zweck und Grenze |
|---|---|---|---|
| Publish nach gesonderter Freigabe | Gelesener Main M, falls unverändert; nach PR-Merge ist M zwingend neu zu lesen und Freigabe an den dann exakten SHA zu binden | build-security.yml; ref main; publish_candidate=true; verify_production_handoff=false | Neuen Kandidaten einmal bauen/prüfen/publishen; kein automatischer Render-Deploy; noch keine Production-Freigabe |
| Candidate-Testdeploy nach License-/Security-Freigabe | Exakter Source aus neuem candidate.json; Digest erst nach Publish bekannt | srv-dau1rp893c1s73cdhm1g; Owner tea-d90o4rj7uimc739i86ug; ausschließlich neue attestierte ghcr.io/...@sha256-Referenz | Nur App, kein NATS/Valkey/Finance; keine Domainumschaltung |
| Handoff-Readback desselben Kandidaten | Neuer Kandidaten-SHA muss weiterhin Main sein | candidate.json plus Registry-/Attestation-/Lizenz-/Ruleset-/Analyse-/Deploy-/Health-Evidence | Ohne Rebuild; vorhandener kombinierter Workflow würde neu bauen und ist für diesen Schritt daher nicht unverändert erneut zu starten |

Zuerst Lizenzscope und die Evidence-Reader schließen. Für Publish, Testdeploy und Handoff jeweils konkrete Werte zurücklesen und die vom Owner verlangte Ausführungsfreigabe einholen. Ein Digest für einen noch nicht veröffentlichten Kandidaten wird nicht vorweggenommen.

AP-SEC-IMAGE bleibt GEHALTEN. Die read-only Vorbereitung der Domain-Migration (Inventar, Callback-/Mail-Abhängigkeiten, Cutover-/Rollback-Plan) kann beginnen; DNS-/Auth-/Mail-Abnahmen und Finance-Ablösung bleiben separate Pakete. Kein Cutover vor vollständigem Handoff.

Self-Healing: erkannte Muster sind Regressionstests, keine Deploy-Authority. Anzahl unabhängiger positiver produktiver Validierungen: **0**. Dauerhafte Regeln erst nach drei getrennten positiven Evidence-Zyklen aktivieren; mehrfacher lokaler Testlauf zählt nicht.

Provider-Readbacks sowie kompakte, hashgebundene Auszüge der vollständigen historischen Artefakte liegen unter `docs/security/evidence/ap-sec-image-20261001/`. Quellen-URLs: https://github.com/SvenKulessa/Capital-AI/actions/runs/36765644507 , https://github.com/SvenKulessa/Capital-AI/actions/runs/36796475915 , https://github.com/SvenKulessa/Capital-AI/rules/24259174 , https://dashboard.render.com/web/srv-dau1rp893c1s73cdhm1g .
