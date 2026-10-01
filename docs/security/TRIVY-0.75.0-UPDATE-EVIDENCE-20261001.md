# Trivy 0.75.0 Update-Evidence — 2026-10-01

Primary Domain: TRUST. Cross-Domain: PLATFORM.

## Ausgangspunkt

- CURRENT_MAIN bei Branch-Erstellung: `b6cb91e06616670163035177344de42cb3237dec`
- Bisheriger Pin: `aquasec/trivy:0.74.0@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969`
- Ziel-Pin: `aquasec/trivy:0.75.0@sha256:af6acf9a6b85dfe389a1941505c0ce9efef52a4719635e1a962f022a3d855daa`
- linux/amd64 Manifest: `sha256:9db099105405c648166e6b94155eb32f8da12673cf1f455207f7385cc9a77283`
- Update-Klasse: Minor, Security-/Supply-Chain-sensitive Toolchain-Komponente.
- Offizieller Release: `aquasecurity/trivy v0.75.0`, veröffentlicht 2026-10-01T13:34:13Z, immutable, `draft=false`, `prerelease=false`.
- Release-Tag-Commit: `591e9799316a602e703f0b484f6c6d7b234ec8f3`, GitHub-Verifikation `verified=true`.

## Release-Artefakte

- `bom.json`: sha256:1972e201e20a096f608d884448ba46eb59bf0506ef0daf30105be65d7d59ec61
- `trivy_0.75.0_checksums.txt`: sha256:43a87485d39b60dae55cb1a14725dddd612040c0b1ec4caa88948c07d6c06219
- `trivy_0.75.0_checksums.txt.sigstore.json`: sha256:6df671a26df5e1683e57b6b8d080efbe48a185afe8378bd547df31c3792af911
- `trivy_0.75.0_Linux-64bit.tar.gz`: sha256:c6e65abddb348e25f10549df887045629cf28cc72453cd1c63acb717316b3f3f

## Alpine-Korrelation

Der reale Docker-Security-Lauf mit 0.74.0 erkannte das App-Image als Alpine
`3.24.2`, meldete aber `This OS version is not on the EOL list`.
Das ist eine Scanner-Metadatenlücke: Trivy 0.74.0 enthält in
`pkg/detector/ospkg/alpine/alpine.go` keinen Eintrag für 3.24.

Trivy 0.75.0 enthält explizit:

`"3.24": 2028-06-01T23:59:59Z`

Damit wird die vorhandene Alpine-3.24.2-Linie als unterstützt modelliert.
Kein Base-Image-Wechsel ist Bestandteil dieses Updates.

## Kompatibilität

Der deklarierte Breaking Change von 0.75.0 entfernt `getHostByName` aus
Report-Templates. CAPITAL-AI verwendet in seinem Docker Security Gate JSON,
CycloneDX und License-JSON; eine Nutzung dieses Template-Helpers wurde im
Repository nicht gefunden.

Weitere für den Scope relevante Änderungen:
- Alpine-/OS-Versionserkennung wurde gehärtet.
- Node-package-lock-Parsing wurde für boolesche `resolved`-Felder korrigiert.
- License-IDs erhalten kanonisches SPDX-Casing.
- CycloneDX kann zusätzliche Crypto-Assets aufnehmen.
- Die Trivy-Lizenz bleibt unverändert Apache-2.0.

## Workflow-Härtung

Der Docker Security Gate baut den gepinnten Scanner und führt vor allen
Scans einen expliziten Versions-Readback aus:

`trivy --version == 0.75.0`

Der Output wird als `security-reports/trivy-version.txt` mit der übrigen
Docker-Security-Evidence gesichert. `--skip-version-check` wird nicht
eingeführt.

## Fünf Freigabeschritte

1. **CURRENT MAIN / immutable Pin:** neuer Branch direkt von
   `b6cb91e06616670163035177344de42cb3237dec`; OCI-Index-Digest
   `af6acf...55daa` providerseitig zurückgelesen und im Dockerfile gepinnt.
2. **Release-/Compatibility-Review:** offizieller stabiler Release,
   signaturverifizierter Release-Commit, Apache-2.0 unverändert; deklarierter
   Template-Breaking-Change trifft den CAPITAL-AI-Scanpfad nicht.
3. **Tool-Identity:** Workflow erzwingt `trivy --version == 0.75.0` und
   archiviert den Readback.
4. **Full Gate:** Source, NATS, Build-Image, App-Image, Secrets,
   Misconfiguration, License, CycloneDX-SBOM und Runtime-Smoke müssen im
   neuen Workflow-Lauf erneut bestehen.
5. **Differenzprüfung:** 0.74.0 → 0.75.0 muss ohne Suppression-Drift
   korreliert werden. Erwartete positive Differenz: die Alpine-3.24-EOL-
   Warnung entfällt. Neue Findings bleiben sichtbar und werden nicht
   stillschweigend ignoriert.

## Status vor neuem Workflow-Lauf

`READY_FOR_VALIDATION` — nicht `VERIFIED`.

Der erfolgreiche ältere Scan mit Trivy 0.74.0 wird nicht als Beweis für
0.75.0 umgedeutet. Production-Deployment, GHCR-Publish, DNS, Billing und
Secrets sind nicht Bestandteil dieses Updates.

## Rollback

Ein Commit-Revert stellt den bekannten Pin
`0.74.0@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969`
wieder her.
