# PR #124 — Bundle, Build-CVE und Image-Identität

## Baseline und Auftrag

Owner-Auftrag vom 03.10.2026: Issues, Lazy Imports und Chunk/CVE analysieren; Repository und Build für den GHCR-/Identity-Abschluss mit PR #124 vorbereiten. TRUST führt Security/QA, PRODUCT verantwortet Lazy-Views, PLATFORM führt Image-/Runtime-Handoff aus. Keine neue Architektur oder Gate-Abschwächung.

`AGENTS.md@currentmain` gelesen. Main: `fbb67ca0b3e08cdeeaf9835b09ca7af06b6230d7`; vorheriger PR-Head: `425c7bbfa2b2c7569f6121222549a64c99dab9b1`. Frischer lokaler Integrationsbranch: `capital-ai-trust/pr124-build-identity-20261003`. Änderungen werden als Fast-forward-Folgecommit im bestehenden PR #124 veröffentlicht; kein paralleler Ersatz-PR.

## Ursachen und Reparatur

- Der CI-Run [37089893001](https://github.com/SvenKulessa/Capital-AI/actions/runs/37089893001) hat den Merge-SHA `ff671c93f0904696e11baa54e3b469a69b450377` geprüft. Frontend-Build PASS, App-Chunk 1.558,76 kB. Build-Image-Scan FAIL: `CVE-2026-93748`, HIGH, `http-cache-semantics@4.2.0`, keine ausgewiesene FixedVersion. Runtime-Scan, SBOM, Smoke und Publishing wurden danach nicht ausgeführt.
- Der beigefügte OSS-Bericht gehört zu PR #125 / Commit `d0f7e9d8501c804c1d7c29bddb18a57b603cac11`, nicht zum bisherigen PR-124-Head. Nur seine Änderungen an `src/App.tsx` und `vite.config.ts` übernommen und mit dem Advisor-HTTP-422-Fix von #124 kombiniert. Kein MARKET-Shadow-/Scoring-Code übernommen. Diese zwei Dateien überlappen danach absichtlich mit #125 und sind nach Merge zu rekorrelieren.
- Neun bestehende Ansichten werden über `React.lazy` geladen. `Suspense` zeigt einen zugänglichen Ladezustand; die bestehende globale ErrorBoundary bleibt erhalten. Der statische Cycle-Guard und das 500.000-Byte-Budget bleiben aktiv; keine höhere Warnschwelle und keine erzwungene Motion-Vendor-Zerlegung.
- Die Root- und Runtime-Lockfiles enthalten `http-cache-semantics` nicht. Der Fund stammt aus dem mit npm gebündelten Installationswerkzeug. Das heruntergeladene offizielle npm-12.2.0-Artefakt enthält `package/node_modules/http-cache-semantics/package.json` mit Version 4.2.0 und BSD-2-Clause. npm-Artefaktintegrität: `sha512-ZsJjKpTnlmSXOLLXiU1xDCzC4Wlok4IwZmh/aw2KUuXytU7q6qMv/cUT7MoeSf95Slwuw/lRXYefGzGCspHPNQ==`.
- npm/npx und der Installationscache werden nach `npm ci` im selben RUN-Layer entfernt, bevor die isolierte Validierung beginnt. Die unveränderten Manifest-Scripts laufen anschließend mit `node --run lint`, `node --run test`, `node --run build`. Die bestehenden gepinnten npm-Vendor-Patches bleiben für die Installation erhalten. Kein Dependency-/Lockfile-Update, kein unbekannter Vendor-Patch, keine CVE-Suppression und keine NOT_AFFECTED-Aussage.
- Das npm-Installationswerkzeug wird während der Installationsphase weiterhin ausgeführt; diese Änderung ist keine nachträgliche Aussage, dass die Toolchain nie betroffen war. Die Abhilfe entfernt den nicht mehr benötigten Cache-Transport aus dem finalen Build-Artefakt. Erst der neue Image-Scan belegt die Abwesenheit am konkreten Image; historische Findings bleiben gültig für ihren alten Scope.
- TS7-Reachability wird nur bei tatsächlichen HIGH-Funden in `stdlib` oder `golang.org/x/text` gestartet. Ein beliebiger npm-CVE-Fund löst keine fehlgeleitete Compiler-Kopie mehr aus. Ein fehlschlagender Build-Scan bleibt unabhängig von Diagnosen blockierend. Die VEX-Diagnose hebt HIGH-/CRITICAL-Gates nicht auf.

Primärquellen, am 03.10.2026 gelesen: [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp), [Upstream-Issue #56](https://github.com/kornelski/http-cache-semantics/issues/56), npm-Registry-Metadaten für `http-cache-semantics` und `npm@12.2.0`. Registry-latest ist 4.2.0, Upstream-Issue bleibt offen. Keine vertrauenswürdig veröffentlichte gepatchte Version nachgewiesen. Entfernung des gesamten nicht benötigten Installers statt Versionsetikett-Patch.

## Lokale Validierung

- `npm ci --ignore-scripts --no-audit --no-fund` PASS; Manifeste und Lockfiles unverändert.
- Vollständiger Preflight PASS: Typecheck, Contracts, Security, Navigation, Build, Browser-Boundary.
- Derselbe Typecheck/Test/Build über Nodes eingebauten Script-Runner zusätzlich PASS.
- npm-Security-Policy-Tests: 6 PASS, inklusive Entfernung vor Offline-Validierung und Abwesenheit der Cache-Dependency in Root-/Runtime-Lockfiles.
- TS7-Reachability-Regressions: 4 PASS. Dependency-free Preflight nach der Änderung PASS.
- Workflow-YAML parsebar, `git diff --check` PASS.
- Finaler App-Dateireadback: `App-Cs1rxZnZ.js`, 408.792 Bytes, SHA-256 `c1c67941faa118c2819fca5b2cf0f83ae585d9f8e82fccf96d193278530b0d31`. Alle 25 JavaScript-Dateien unter `dist/assets` unter 500.000 Bytes; Browser-Boundary prüft 26 Artefakte. Keine Browser-Render-, Netzwerk- oder Produktionslatenz-Abnahme daraus abgeleitet.
- Docker ist im lokalen Workspace nicht verfügbar. Image-/SBOM-/Container-Nachweis wird nicht aus lokalen Source-Tests behauptet; der neue GitHub-Docker-Check ist erforderlich.

## Issues und Required Gates

Aktiv gelesenes Ruleset `main-production-protection` / 24259174: Docker Security Gate und Domain Governance erforderlich, strict/current-main; Review-Thread-Auflösung, lineare History, keine erzwungenen Updates; CodeQL-Gate ab medium/errors-and-warnings und Code-Quality-Gate ab warnings. Required Approval Count 0; bei Readback keine Reviews/Threads für #124. Keine künstlichen fünf menschlichen Approvals als existierende Repository-Regel behauptet.

- [Issue #120](https://github.com/SvenKulessa/Capital-AI/issues/120): GO-2026-5932 bleibt im Scan sichtbar. NATS-Binary-/VEX-Evidence muss genau zum ausgelieferten Digest passen; ein CI-Binary-Nachweis gegen ein anderes Image schließt die produktive Reachability nicht.
- [Issue #105](https://github.com/SvenKulessa/Capital-AI/issues/105): Rechtefreigabe und mindestens 100 reale eligible Krypto-/Aktien-Assets fehlen als produktiver Nachweis. Synthetischer Capacity-Benchmark ist kein Ersatz für Rights-/Full-Pipeline-Evidence.
- PR #125 teilt die Build-CVE und die jetzt übernommenen Bundle-Änderungen. Nach Merge von #124 gegen neues Main korrelieren; kein blindes Cherry-pick des ganzen MARKET-PRs.

## GHCR-/Runtime-Abschluss bleibt evidencepflichtig

Bestehender Ablauf bleibt unverändert: geschützter Main → exakt geprüftes Image → GHCR-Registry-Digest + digestgebundene Provenance/SBOM → Render-Image-Quelle → Provider-Platform-Digest → `/healthz` mit eingebettetem Source-SHA. Ein lokaler Config-Digest oder Archivhash ersetzt keinen OCI-Manifest-Digest.

GHCR-Kandidaten-Publishing ist aktuell explizit `workflow_dispatch`, `publish_candidate=true`, Main-only; ein PR-Check veröffentlicht keinen Kandidaten. Production-Handoff bleibt separat fail-closed. Lizenzreview ist weiterhin REVIEW_OPEN/deployEligible:false. Auth/AAL2, Entitlements, Guard-Benchmark, aktuelle CodeQL/Quality-Entscheidung, reale Broker-/Rights-/Multi-Asset-/200ms-Evidence und digestgebundene Render-/Runtime-Evidence bleiben eigenständige Gates. Die zuvor abweichende Node-24.19.0-Lizenzkopie wurde durch die offizielle Node-26.10.0-LICENSE ersetzt und im Dockerfile korrigiert. Quelle: `nodejs/node@v26.10.0`, Blob `67cd2feb69a9b610ee038d285c9c04bdd977e41b`; lokaler Dateihash SHA-256 `6b85ee1983d01fa2cdcdd5d1a3053c6221fae41d6a54e43b416bf35969fc4128`. Die historische Node-24-Evidence bleibt erhalten. Korrespondierende Binary/Source- und übrige Distribution-Nachweise bleiben eigenständige Gates; der aktualisierte Lizenztext ist keine allgemeine Freigabe.

Rollback: nur diesen Folgecommit im Review-Branch zurücknehmen; keine DB-/Auth-/Billing-/Runtime-Migration. Historische Evidenz nicht überschreiben. Selbstheilungs-Promotion erst nach drei unabhängigen positiven Zyklen; dieser lokale Lauf ist keine solche Promotion.
