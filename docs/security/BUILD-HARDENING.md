# Docker-Build und Sicherheitsfreigabe

Der manuelle Workflow `Docker Build Sicherheit` baut das Anwendungsimage und die separaten Scanner-Container. Er deployt nicht. Workflow erstmalig nach Merge verfügbar; danach immer den gewünschten Commit/Branch auswählen und den Head mit den Nachweisen vergleichen. Render-Auto-Deploy bleibt deaktiviert.

## GHCR-Kandidaten ohne erneuten Anwendungsbuild

Die optionale manuelle Eingabe `publish_candidate` ist standardmäßig aus.
Die Veröffentlichung ist ausschließlich für `SvenKulessa/Capital-AI` auf
`refs/heads/main` zulässig. Ein eigener Job erhält packages:write,
attestations:write und id-token:write; der Validierungsjob bleibt bei
contents:read. Fork-/PR-Trigger und Render-Zugangsdaten sind nicht beteiligt.

Nach erfolgreichem lokalem Scan und Smoke-Test wird dasselbe Docker-Archiv
als kurzlebiges Actions-Artefakt an den Publish-Job übergeben. Dieser prüft
Image-ID und linux/amd64, veröffentlicht einen pro Commit/Lauf/Versuch
benannten Kandidaten, liest den Manifest-Digest zurück, zieht diesen Digest
und vergleicht dessen Image-ID mit dem ursprünglichen geprüften Image.
Nur der Scanner wird erneut gebaut; die Anwendung wird nicht erneut gebaut.

Der aus GHCR gelesene Digest wird nochmals auf HIGH/CRITICAL und Secrets
geprüft. Das daraus erzeugte CycloneDX-SBOM und GitHub-Build-Provenance
erhalten separate Attestations für denselben Digest. Die CLI-Verifikation
verlangt Repository, Workflowpfad, Main-Ref, Quellcommit und Hosted-Runner.
Main wird vor Veröffentlichung und vor Ausgabe des Kandidatennachweises
erneut gelesen; bei zwischenzeitlich geändertem Main entsteht kein gültiger
Kandidatennachweis. Kandidaten können bei späteren Fehlern in GHCR verbleiben,
sind aber ohne abgeschlossene Nachweise nicht freigegeben.

`candidate.json` enthält ausdrücklich `deployEligible:false`; es ist kein
angenommenes Release-Manifest. Lizenz-/Redistribution-Review (einschließlich
Frontend-Abhängigkeiten und Basisimage), Image-Quelle in Render und
Runtime-Identity bleiben offene Gates. Kein Render-Deploy, Release-Tag oder
Package-Sichtbarkeitswechsel wird ausgelöst. Der verwendete GITHUB_TOKEN
vermeidet einen zusätzlichen Push-PAT. Render verwendet sein separates
Registry-Pull-Credential.

Die Provenance wird von GitHub für das gebaute und geprüfte Image erzeugt.
Dieser Slice erzeugt keine zusätzliche BuildKit-Provenance und behauptet
kein SLSA-Level. Docker-Archiv/Image-ID und Registry-Manifest-Digest sind
verschiedene Identitäten; ihre Korrelation erfolgt durch Digest-Pull und
Config-/Image-ID-Vergleich. Build-once bedeutet Wiederverwendung desselben
Artefakts, keine nachgewiesene bitweise Reproduzierbarkeit eines Neubaus.

### Fünf Validierungsschritte der Fortsetzung

1. Exakten Main und Workflow-Scope prüfen; TypeScript, Tests und Frontend
   laufen weiterhin ohne Netzwerk. Binance/Kraken/Polygon werden nur zur
   Laufzeit angesprochen; Polygon-Priorität gilt je Instrument/Währung,
   nicht pauschal vor Börsenfeeds.
2. Secrets, Konfiguration und Abhängigkeiten prüfen; Lizenzfreigabe bleibt
   separat offen und blockiert Deployment.
3. Dasselbe lokale Runtime-Image und anschließend den GHCR-Digest scannen;
   Scannerfehler und HIGH/CRITICAL bleiben blockierend.
4. SBOM/Provenance attestieren und gegen exakte Identitäten verifizieren;
   ausschließlich einen nicht deploybaren Kandidatennachweis ausgeben.
5. Erst nach weiteren Gates einen Image-Service per Digest betreiben,
   Render-Image/Deploy-ID lesen und /healthz sowie Runtime-Identität prüfen.

Bei Fehlern wird die konkrete Ursache im Branch korrigiert und dieselbe
Prüfkette wiederholt. Tags allein, HTTP-200 und frei gesetzte Runtime-
Umgebungswerte ersetzen keine Digest-/Provider-Korrelation.

## Werkzeuge und Eingaben

- Offizielles Node 24.19.0 Alpine: Digest im Dockerfile, beide Stufen identisch. OpenSSL libcrypto3/libssl3 in beiden Stufen auf 3.5.8-r0 korrigiert; npm in der Build-Stufe auf 11.20.0 gepinnt.
- Trivy 0.74.0 und Hadolint 2.15.1: separate Dockerfile.security, jeweils Registry-Digest festgeschrieben.
- Actions: vollständige Commit-SHAs, contents:read, keine persistierten Git-Credentials.
- npm ci mit Lockfile und ohne Installationsskripte; TypeScript, Offline-Tests und Vite-Build ohne Netzwerkzugriff in der Build-Stufe.
- Runtime: UID/GID 1000, root-eigene schreibgeschützte Anwendungsdateien, keine npm/Yarn-Installation und keine Tests, Secrets oder Repository-Historie.

## Vier Validierungsschritte

1. Hadolint sowie Trivy für Konfiguration, Secrets und alle Lockfile-Abhängigkeiten einschließlich devDependencies.
2. Build-Stufen-Scan einschließlich npm/Buildwerkzeugen und Docker-Build mit TypeScript und Offline-Anwendungstests; Server-Regressionstests für Fehlerbehandlung, versteckte Dateien und Symlink-Escape.
3. Trivy am exportierten Build-Artefakt: HIGH/CRITICAL und Secrets blockieren, auch wenn noch kein Patch verfügbar ist. Keine ignore-unfixed-Ausnahme. CycloneDX-SBOM, Image-ID und Scan-JSON als 7-Tage-Artifact.
4. Runtime-Smoke-Test mit read-only-Dateisystem, ohne Linux-Capabilities, no-new-privileges, UID- und Healthcheck-Nachweis.

Fehler beheben, neuen Commit bauen und alle vier Gates erneut prüfen. Eine erfolgreiche Quellcodeprüfung ersetzt keinen erfolgreichen Image-Scan. Scan- oder Datenbankfehler blockieren. Image-ID bezeichnet das lokale Image, nicht den Registry-Manifest-Digest. Bei späterem Registry-Publish den Manifest-Digest separat erfassen und Deploy daran binden.

Render kann die hier im Smoke-Test gesetzten Docker-Run-Isolationsflags nicht über diesen Blueprint übernehmen; schreibgeschützte Anwendungsdateien und Non-root gelten im Image selbst. Vollständige read-only-/Capability-Isolation auf Render ist damit nicht bewiesen.

Digest-Updates sind separate geprüfte Änderungen; Pinnung erfordert regelmäßige Sicherheitsupdates. Die SBOM ist ein Inventar, keine Signatur oder Exploitability-Aussage. Keine bezahlten Code-Security-Funktionen werden aktiviert.

## npm-Build-Scan: Behebung vom 29.09.2026

Workflow-Lauf 36631357062 auf Main bcd253269661a56239e47c7cfc0b53e866e52d2a
blockierte die Build-Stufe mit 9 HIGH und 1 CRITICAL. Die zehn Befunde
liegen im globalen npm 11.12.0, nicht in den geprüften App-Abhängigkeiten:
brace-expansion (3), ip-address (1), pacote (1), picomatch (1), sigstore (1),
tar (3). Der kritische Befund ist CVE-2026-59873 in tar 7.5.11.

Gezieltes Update innerhalb npm 11: 11.20.0. Das offizielle Upstream-Lockfile
von npm/cli@v11.20.0 enthält brace-expansion 5.0.9, ip-address 10.5.0,
pacote 21.5.1, picomatch 2.3.2/4.0.4, sigstore 4.1.1 und tar 7.5.22.
Diese liegen für die genannten Befunde an oder über den gemeldeten
Fix-Versionen. Die Node-Engine-Anforderung ^20.17.0 || >=22.9.0 umfasst das
gepinnt verwendete Node 24.19.0. Kein Wechsel auf npm 12, keine manuelle
Manipulation des npm-Abhängigkeitsbaums und keine CVE-Ausnahme.

Das ist statische Upstream-Korrelation, noch kein Nachweis eines sauberen
Container-Images. Der nächste Workflow muss Installation, Offline-Lint,
Tests, Build und aktuellen Trivy-Scan erneut bestehen. Der Build-Scan
schreibt nun build-image.json als Nachweis auch bei Sicherheitsbefunden.
Die SBOM-Stufe läuft nur bei vorhandenem Runtime-Archiv; nach einem frühen
Build-Gate-Fehler ist sie nicht anwendbar, statt einen zweiten Fehler wegen
fehlender Datei zu erzeugen. Der ursprüngliche Fehler bleibt blockierend.

Quellen:
- https://github.com/npm/cli/releases/tag/v11.20.0
- https://github.com/npm/cli/blob/v11.20.0/package-lock.json
- https://github.com/npm/cli/blob/v11.20.0/package.json
- https://github.com/SvenKulessa/Capital-AI/actions/runs/36631357062

## Smoke-Test: Startup-Diagnose vom 29.09.2026

Lauf 36632385828 auf Main 08d624ac3065a99f59f6ff09265a38ed0ae85760
besteht Build-Scan, Offline-Build, Server-Tests, Runtime-Scan und SBOM.
Der erste /healthz-Aufruf rund 0,24 Sekunden nach Containerstart scheitert
mit curl Exit 56 (Connection reset). --retry-connrefused erfasst diesen
Fehlertyp nicht. Der Container wird unmittelbar entfernt; ohne Logs ist
Startup-Race gegenüber echtem Runtime-Absturz bislang nicht bewiesen.

Der GET-Smoke-Test verwendet deshalb begrenzte --retry-all-errors mit
12 Retries, 1 Sekunde Abstand, 30 Sekunden Retry-Zeitbudget und höchstens
3 Sekunden je Request. Die Antwort wird mit --output in eine Datei
geschrieben, statt per Shell-Umleitung duplizierte Teilantworten zu sammeln.
HTTP-Fehler und dauerhafte Startfehler bleiben nach dem Budget blockierend.
UID-/Schreibschutz-/npm-Prüfungen bleiben unverändert. Der Exit-Trap sichert
Containerstatus und Logs vor Entfernung und erhält den ursprünglichen
Exitcode. Keine Environment-/Credential-Ausgabe per docker inspect.

Diese Änderung belegt noch keinen erfolgreichen Containerstart. Der nächste
Workflow muss den Smoke-Test tatsächlich bestehen; andernfalls werden die
nun verfügbaren Runtime-Logs zur Ursachenanalyse verwendet. GHCR-Publish
bleibt vom Erfolg sämtlicher Validierungsschritte abhängig. Die Option
publish_candidate=true löst keinen Render-Deploy aus.

Quellen:
- https://github.com/SvenKulessa/Capital-AI/actions/runs/36632385828
- https://curl.se/docs/manpage.html#--retry-all-errors

## Node-24-Actions und Ubuntu-26.04-Runner

Beide Jobs verwenden ausdrücklich ubuntu-26.04 (x64-Standard-Runner).
Die Auswahl fixiert die Ubuntu-Release-Linie, nicht einzelne Versionen der
laufend aktualisierten GitHub-Runner-Images. Standard-Runner sind in diesem
öffentlichen Repository kostenlos. Die Migration von ubuntu-latest beginnt
am 19.10.2026 und soll am 19.11.2026 abgeschlossen sein.

Gepinnte Node-24-Actions: checkout v7.0.1, upload-artifact v7.0.1,
download-artifact v8.0.1, docker/login-action v4.6.0. Die jeweiligen action.yml
wurden am aufgelösten Release-Commit geprüft. Die Attestation-Actions nutzen
bereits den gepinnten actions/attest v3 mit Node 24. Kein unsicherer
Node-20-Opt-out und keine Unterdrückung der Deprecation-Warnung.

Upload nutzt weiterhin das standardmäßige ZIP-Archivformat und bisherige
Artefaktnamen. Download extrahiert nach candidate; digest-mismatch:error
ist explizit gesetzt. Image-ID-, Plattform-, CVE- und Attestation-Gates
bleiben erhalten. Docker/Node/Alpine der Anwendung werden nicht geändert.
Reales Ausführen von Build, Artifact-Übergabe und GHCR-Publish auf Ubuntu
26.04 ist erneut erforderlich; statische Prüfungen allein belegen keine
Runner-Kompatibilität.

Quellen:
- https://github.com/actions/checkout/releases/tag/v7.0.1
- https://github.com/actions/upload-artifact/releases/tag/v7.0.1
- https://github.com/actions/download-artifact/releases/tag/v8.0.1
- https://github.com/docker/login-action/releases/tag/v4.6.0
- https://github.com/actions/runner-images/issues/14748
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners

## Registry-Digest-Readback: Behebung vom 29.09.2026

Lauf 36635928754 auf Main 8b804361b136d7bd87c46542c130bb50f3d84c8c
besteht die Validierung und Artifact-Übergabe. Login, Push und Tag-Pull
sind erfolgreich; der Job endet vor Digest-Pull und Attestierung mit Exit 1.
Der Kandidat liegt damit bereits in GHCR, ist aber nicht freigegeben.

Die bisherige Ermittlung über den ersten lokalen RepoDigests-Eintrag ist
nicht auf das Ziel-Repository eingeschränkt. Welche Referenz dort tatsächlich
stand, wurde im fehlgeschlagenen Lauf nicht ausgegeben. Die lokale Reihenfolge
ist daher keine belastbare Registry-Digest-Quelle.

Der Workflow liest nun den Manifest-Digest direkt mit docker buildx imagetools
inspect vom gerade gepushten GHCR-Kandidaten. Das Manifest wird als JSON
aufbewahrt; jq verweigert fehlende, nichttextuelle oder syntaktisch ungültige
SHA-256-Digests. Die unveränderliche Referenz wird ausschließlich mit dem
festen ghcr.io/svenkulessa/capital-ai-Repository konstruiert. Anschließend
bleiben Digest-Pull, Image-ID-Vergleich, erneuter CVE-Scan, SBOM und beide
Attestations obligatorisch. Weder Tag noch lokaler Image-ID-Wert werden
ersatzweise als Registry-Digest eingesetzt. Kein Anwendungs-Rebuild.

Statische JSON-/Workflow-/Shell-Prüfung ersetzt keinen echten GHCR-Readback.
Der nächste Main-Lauf mit publish_candidate:true muss die ganze Kette bestehen.
Der vorhandene fehlgeschlagene Kandidat wird nicht als Release verwendet.

Quellen:
- https://github.com/SvenKulessa/Capital-AI/actions/runs/36635928754
- https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
