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

- Offizielles Node 24.19.0 Alpine: Digest im Dockerfile, beide Stufen identisch. OpenSSL libcrypto3/libssl3 in beiden Stufen auf 3.5.8-r0 korrigiert; npm in der Build-Stufe auf 11.12.0 gepinnt.
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
