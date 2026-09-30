# Docker-Sicherheitslauf nach PR 34: Ursache und Behebung

Main c1a27a9d2d8547af8933a94a0b0e9a8061010bfc; Actions-Lauf 36713305880.
Render-CLI, IONOS-Inventar und privater NATS-Sicherheitslauf waren erfolgreich.
Im Dockerlauf bestehen Docker-Kontext, Hadolint, NATS-Disk-/UID-/GID-/Capability-Gate und Quellscan.
Die Build-Stufe wurde erfolgreich gebaut, wird aber von drei HIGH-CVEs in npm 11.20.0 blockiert:

| Paket | Vorher | Fix | Befunde |
|---|---|---|---|
| brace-expansion | 5.0.9 | 5.0.11 | CVE-2026-102276, CVE-2026-102278 |
| undici | 6.28.0 | 6.28.1 | CVE-2026-19534 |

Alle liegen unter usr/local/lib/node_modules/npm/node_modules, nicht im App-Lockfile.
Ein npm-Majorwechsel würde sie nicht beheben: auch der veröffentlichte npm-12.1.0-Lockstand enthält 5.0.9/6.28.0.

## Eng begrenzter Build-Toolchain-Hotfix

npm bleibt bei 11.20.0, erhält aber zwei ausdrücklich dokumentierte Vendor-Patches.
Das ist kein unverändertes Upstream-npm und kein CVE-Ignore.
Veröffentlichte Patchpakete werden mit npm ci --ignore-scripts aus einem separaten Lockfile
mit exakten Versionen, registry.npmjs.org-URLs und SHA-512-Integritäten installiert.
Das Skript prüft die npm-/Alt-/Fix-Versionen, Registry-/Integritätsmetadaten, Node-Engine
und Abhängigkeitskompatibilität vor jeder Änderung. balanced-match 4.0.4 bleibt kompatibel.
Die vollständigen veröffentlichten Dateien einschließlich Lizenzen ersetzen nur die beiden betroffenen npm-Bundlepakete.
Echte minimatch-/Undici-Consumer werden anschließend ausgeführt. Ein unerwarteter Basisstand blockiert.
Bei einem künftig korrigierten npm-Release ist der Hotfix als eigene geprüfte Änderung zu entfernen.

Die Patchpakete sind Buildwerkzeuge. Runtime entfernt weiterhin das gesamte globale npm.
Der Installer und seine Donor-Dateien werden nach dem Patch gelöscht.
Die normale npm-Toolchain bleibt im Build-Image scanbar, einschließlich der tatsächlichen gepatchten Paketdateien.
HIGH/CRITICAL, Secret-Scanning und Scannerfehler bleiben blockierend.

## Warnungen und Infos

| Meldung | Bedeutung und Behandlung |
|---|---|
| Große root/.npm/_cacache-Datei (24 MB) | Entbehrlicher Downloadcache: nach Toolchaininstallation, npm ci und npm prune im jeweiligen RUN entfernen. Keine skip-files-Ausnahme. |
| Alpine 3.24 nicht in EOL-Liste | Fehlende Metadaten in aktuellem Trivy 0.74.0; Alpine nennt Support bis 01.06.2028. OS-CVE-Scan erfolgt weiterhin. Warnung bleibt sichtbar; kein OS-Downgrade oder behaupteter EOL-PASS. |
| node-domexception deprecated | Transitiv aus aktuellem Google-SDK 2.24.0; kein Sicherheitsbefund. Ohne sichere kompatible Upstream-Lösung beibehalten und sichtbar dokumentieren. Kein Override oder Warnungsfilter. |
| DB-Download / Scanner aktiviert / Lizenzinformationen | Normale Scannerinformationen. Kein Fehler; insbesondere Secret-Scanning nicht deaktivieren. |
| Git default branch hint | Initialisierungshinweis beim Checkout, ohne Änderung an Main oder Repositoryschutz. |

Der Build-Scan gibt künftig eine kurze Paket-/CVE-/Fix-Zusammenfassung und eine Secret-Anzahl aus.
Match/Code/Zeilen von Secret-Funden gelangen nicht in den Joblog. Der ursprüngliche Scanner-Exitcode bleibt erhalten;
fehlender/unlesbarer JSON-Bericht führt ebenfalls zum Fehler. Vollständige Evidenz bleibt im bisherigen Artefaktpfad.

## Fünf Validierungen

1. Exakten Main, Workflow, Logs und build-image.json korreliert; drei HIGH-Befunde und Ursache extrahiert.
2. npm 11.20.0/12.1.0 sowie Fixpakete gegen offizielle Veröffentlichungen/Registry und SHA-512-Lockfile geprüft.
3. Installer an realem lokal installiertem npm 11.20.0 ausgeführt; Trivy-rootfs mit aktuellem DB-Download meldet 0 HIGH/CRITICAL. Das ist kein vollständiger Docker-Image-Nachweis.
4. Dieselbe gepatchte npm-CLI: echte App-Installation, TypeScript, drei Vertragssuiten, 20 Analysis-Foundation-Tests, Produktionsbuild und echtes Produktions-Pruning PASS.
5. Docker-Kontexttests und secret-safe Berichtstest (3), Hadolint 2.15.1 SHA-256-verifiziert, Dockerfile-Konfigurationsscan, Actionlint (nur bestätigte ubuntu-26.04-Labelmeldung ausgeblendet) und diff --check PASS.

Kein lokaler Docker-Daemon. Neuer vollständiger Container-/CVE-/SBOM-/GHCR-Lauf steht aus.
Kein Workflow, Deploy oder DNS-Wechsel wurde neu gestartet.

Quellen:
- https://github.com/npm/cli/blob/v11.20.0/package-lock.json
- https://github.com/npm/cli/releases/tag/v12.1.0
- https://registry.npmjs.org/brace-expansion/5.0.11
- https://github.com/nodejs/undici/releases/tag/v6.28.1
- https://alpinelinux.org/releases/
- https://github.com/aquasecurity/trivy/releases/tag/v0.74.0
- https://github.com/SvenKulessa/Capital-AI/actions/runs/36713305880

## Nachprüfung des ersten Kandidatenlaufs

Lauf 36715472658 auf Main 46ee077dea184a5defa84ef028fb93e3ac73fad5:
Validierung einschließlich Build-/Runtime-CVEs, Secrets, SBOM, NATS und read-only Runtime erfolgreich.
Die gelesenen source.json, build-image.json und image.json enthalten jeweils 0 HIGH/CRITICAL und 0 Secret-Funde.

Die Cachewarnung bestand trotzdem fort: Der erste RUN mit der globalen npm-Installation exportierte den Cache
in einer früheren Image-Schicht; ein rm in einem späteren RUN beseitigt diesen Schichtinhalt nicht.
Die Bereinigung erfolgt jetzt auch im selben RUN wie npm install --global.
Trivy scannt weiterhin alle Schichten; keine Scanner-Ausnahme oder Logunterdrückung.

Drei Validierungen: Warnung dem früheren Installationslayer zugeordnet; Hadolint/Docker-Kontext/diff --check PASS;
neuer Image-Lauf nach Merge bleibt offen. Bestehende Kandidatenevidenz gilt ausschließlich für ihren Quellcommit.
Ein lokaler Docker-Neubuild ist weiterhin nicht möglich. Kein Workflow oder Deployment gestartet.
