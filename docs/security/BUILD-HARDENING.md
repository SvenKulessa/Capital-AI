# Docker-Build und Sicherheitsfreigabe

Der manuelle Workflow `Docker Build Sicherheit` baut das Anwendungsimage und die separaten Scanner-Container. Er deployt nicht. Workflow erstmalig nach Merge verfügbar; danach immer den gewünschten Commit/Branch auswählen und den Head mit den Nachweisen vergleichen. Render-Auto-Deploy bleibt deaktiviert.

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
