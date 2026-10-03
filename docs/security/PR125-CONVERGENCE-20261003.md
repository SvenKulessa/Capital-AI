# PR #125 — Rekorrelation und Versionsprüfung, 03.10.2026

Baseline: `main@d0334ac1426680ed82fe67c987a6ea49c8b6f83d`; vorheriger PR-Head: `d0f7e9d8501c804c1d7c29bddb18a57b603cac11`.
Modus: PR-Korrektur, kein Merge, kein Deploy. AGENTS.md am aktuellen main gelesen.

## Rekorrelation

`src/App.tsx` und `vite.config.ts` entsprechen bytegenau currentmain. Lazy-Views, Suspense, Cycle-/Chunk-Budget und der Prompt-Guard-Fehlervertrag bleiben erhalten; diese beiden Dateien erzeugen keinen zusätzlichen Diff gegen diese Baseline. Der Dockerfile-COPY-Konflikt wurde mit Shadow-Evidence-Store **und** Guard/Billing-Modulen samt Tests aufgelöst. Keine pauschale ours/theirs-Auflösung.

Currentmain entfernt npm nach der deterministischen Installation aus der Build-Stufe und führt die Prüfungen mit `node --run` aus. Damit wird auch der gebündelte `http-cache-semantics` entfernt. Das ist eine scoped Entfernung des Installers, kein Upstream-Fix von CVE-2026-93748 und keine Scanner-Suppression. Die korrigierte TS7-Diagnose-Zuordnung bleibt erhalten. Die finale Containerprüfung muss diesen PR-Stand erneut prüfen.

## Manifest-, Lockfile- und installierter Bestand

Installation in allen drei Scopes: `npm ci --ignore-scripts --no-audit --no-fund`. Danach Vergleich der Root-Manifeste im Lockfile und jeder tatsächlich installierten Paketversion mit ihrem Lock-Eintrag. Plattformbedingte optionale Pakete sind separat ausgewiesen. Manifest/Lockfiles sind unverändert gegenüber currentmain.

| Scope | Installierte Paketpfade | Drift | npm audit bekannte Schwachstellen | Abweichung vom Registry-latest-Tag |
| --- | ---: | --- | ---: | ---: |
| `.` | 261 | 0 | 0 | 68 |
| `deploy/runtime` | 15 | 0 | 0 | 6 |
| `deploy/npm-security-patches` | 4 | 0 | 0 | 2 |

Eine Abweichung vom `latest`-Tag ist weder Lockfile-Drift noch automatisch ein Upgrade-Kandidat: transitive Abhängigkeiten, kompatible Major-Linien und gelegentlich niedrigere latest-Tags müssen getrennt bewertet werden. `npm audit` prüft die drei Projekt-Scopes; npm-interne Vendor-Pakete, OS-/Go-Binaries, Secret-/Misconfiguration- und Containerbefunde sind damit nicht abschließend geprüft.

## Direkte Pakete mit anderem latest-Tag

| Scope | Paket | Installiert | Registry latest |
| --- | --- | --- | --- |
| `.` | `@google/genai` | 2.24.0 | 2.27.0 |
| `.` | `@types/node` | 26.6.3 | 26.6.4 |
| `.` | `dotenv` | 18.0.4 | 18.0.5 |
| `.` | `lucide-react` | 1.48.0 | 1.50.0 |
| `.` | `motion` | 13.4.5 | 14.0.0 |
| `.` | `redis` | 6.2.1 | 6.3.0 |
| `.` | `typescript` | 6.0.3 | 7.0.2 |
| `.` | `vite` | 8.3.1 | 8.3.2 |
| `deploy/runtime` | `redis` | 6.2.1 | 6.3.0 |
| `deploy/npm-security-patches` | `ip-address` | 10.7.2 | 10.7.3 |
| `deploy/npm-security-patches` | `undici` | 6.29.0 | 8.11.2 |

Diese Versionen wurden geprüft, aber nicht pauschal aktualisiert. TypeScript 7, Motion 14 und Undici 8 erfordern eigene Kompatibilitäts-/Migrations- und Lizenzprüfung. Der Undici-Donor ist absichtlich auf der mit dem npm-Vendor-Patch kompatiblen Major-Linie; ein neuester Major ist kein sicherer Ersatz. Kein `npm audit fix --force`, kein Override und kein Gate wurde abgeschwächt.

## Build-, CI- und Infrastrukturwerkzeuge

Offizielle Releases/Quellen sind im `pinned-tool-upstream-versions.json` mit Abfragezeit und URL festgehalten. Gepinnt und mit latest übereinstimmend: Node-Container 26.10.0, npm-Installer 12.2.0, Trivy 0.75.0, Hadolint 2.15.1, NATS 2.15.0, Redis-Server 8.10.2, Render CLI 2.28.0, govulncheck 1.8.0, checkout 7.0.1, upload-artifact 7.0.1, download-artifact 8.0.1, setup-java 6.0.1, attest 4.2.2, docker/login-action 4.6.0, gradle/actions 6.4.0. Versionsgleichheit bestätigt keine vollständige Provenance- oder Digestprüfung.

Offene Versionsabweichungen: Go-Diagnose-Container 1.26.8 gegenüber latest 1.27.1; Mobile setup-node 4.4.0 gegenüber 7.0.0; Android Gradle 8.13 gegenüber 9.8.0. Java ist auf die Android-Kompatibilitätslinie 17 festgelegt, ohne exakten Patch-Pin. Android Gradle Plugin ist 8.13.2; sein offizieller Latest-Readback steht im JSON. Diese Mobile-/Diagnose-Werkzeuge sind in diesem PR nicht neu installiert oder migriert.

Lokale Prüfungsumgebung: Node 24.19.0 / npm 11.9.0, abweichend von aktuellem Node-24-Patch 24.21.0 / npm 12.2.0 und von der Produktions-Containerlinie Node 26.10.0. Lokaler Preflight ersetzt deshalb keinen Test im gepinnten Image. ORT/ScanCode sind Report-Adapter; ihre Scanner-Binaries sind hier nicht installiert. Laufende Render-/Broker-/Cache-Binaries wurden mit dieser Repository-Inventur nicht neu attestiert.

## Validierung und Merge-Gate

`node scripts/preflight.mjs --full`: PASS — Typprüfung, Contract-/Documentary-, Security-, Navigation-, Governance-/Lizenz-/Handoff-Regressionen, Build und Browser-Boundary. Gemeinsame Dateiblobs und Manifest/Lock-SHA256 sind in `convergence-validation.json` festgehalten. Keine neue Codeänderung nach dem Preflight; nur Audit-Evidence/Dokumentation.

Vor der Merge-Entscheidung erforderlich: frische Required Checks und CodeQL am neuen Head bzw. zugehörigen Merge-SHA, Container-Build- und Runtime-Scans inklusive HIGH/CRITICAL, Lizenz-/Provenance-Gates und tatsächliches Review. Docker ist in dieser lokalen Umgebung nicht verfügbar. Es wird keine globale Aussage „alle Sicherheitslücken geschlossen“ aus den npm-Audits abgeleitet. Production-Handoff, attestierter GHCR-Digest, Provider-Readback und Runtime-Identität bleiben separate, nicht mit diesem Merge geschlossene Gates.

Raw Evidence: [`pr125-convergence-20261003/`](evidence/pr125-convergence-20261003/). Historische CI-Evidence unter `part2-shadow-20261003` bleibt unverändert und autorisiert diesen neuen Stand nicht.
