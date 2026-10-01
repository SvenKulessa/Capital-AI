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

## Verifikation mit Trivy 0.75.0

GitHub Actions Run `36925001335` / Job `110580043566` auf dem PR-Merge-SHA
`75bccadf9f95a8e9cbbfd599ca525c0cab1cf6d2` hat den vollständigen
`Docker Security Gate` erfolgreich abgeschlossen.

- Scanner-Readback: `Version: 0.75.0`
- NATS-Scan: PASS; vorhandener `GO-2026-5932` / `golang.org/x/crypto v0.57.0`
  bleibt mit Severity `UNKNOWN`, ohne Fixed Version und `blocking:0` sichtbar.
- Source-Scan: PASS; keine Vulnerabilities, 0 Secrets, dieselben zwei
  `DS-0026` LOW-Misconfiguration-Hinweise wie mit 0.74.0, `blocking:0`.
- Build-Image: PASS; 0 Vulnerabilities, 0 Secrets, 0 Blocking.
- App-Image: PASS; Alpine `3.24.2`, 18 APK-Pakete, 0 Vulnerabilities,
  0 Secrets, 0 Blocking.
- Die frühere 0.74.0-Warnung `This OS version is not on the EOL list`
  erscheint mit 0.75.0 für Alpine 3.24.2 nicht mehr.
- CycloneDX-SBOM: 35 Komponenten, 0 Vulnerabilities.
- 0.74.0 → 0.75.0: Komponentenmenge exakt identisch (35/35);
  Runtime-License-Inventar exakt identisch (77/77); keine Komponenten oder
  Lizenzzeilen hinzugefügt oder verloren.
- Runtime-Smoke, read-only, UID 1000, cap-drop ALL und no-new-privileges: PASS.
- Security Artifact: `11193656230`,
  SHA-256 `3af7f4011af4378bdf100c5dcef4ba651efef786599ca0a4ee6194b8e0263b9e`.

Damit ist die Scanner-Update-Evidenz `VERIFIED`. Diese Aussage gilt für
das Trivy-Update und die aufgeführten Build-/Scan-Gates; sie ist keine
Production-Freigabe. Production-Deployment, GHCR-Publish, DNS, Billing und
Secrets sind nicht Bestandteil dieses Updates.

## Rollback

Ein Commit-Revert stellt den bekannten Pin
`0.74.0@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969`
wieder her.
