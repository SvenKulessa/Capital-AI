# Aktuelles OS-Quellpaket-Inventar und Source-Mirror-Evidence — 19.11.2026

**Evidenztyp:** technische, unveröffentlichte Momentaufnahme ohne rechtliche Redistributionsfreigabe. Repositoryvertrag: Root `AGENTS.md`, `SOLO_MAINTAINER_FLOW@2`. Dieser Bericht ist weder ein zusätzlicher Required Check noch ein Release- oder Owner-Approval.

## Unveränderlicher CI-Bezug

- GitHub `main` der untersuchten Image-Version: `03dcdb6426f30ca0b2b575060773d7ea84480fd0`.
- [Docker Security Gate 44601519182](https://github.com/SvenKulessa/Capital-AI/actions/runs/44601519182), SUCCESS; Artifact `docker-security-03dcdb6426f30ca0b2b575060773d7ea84480fd0` (ID `14569725774`; Archiv-SHA-256 `6b30d0ab59f9fb805a59be5e10fda06b2f439e85edc9cb3978a3d410c4b9cf33`).
- Immutable Base: `node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5`, Alpine `3.24.4`.
- Lokale, im CI geprüfte Docker Image Config-ID: `sha256:5e4958217461643deca09a0ea29e28c868b989dc769b3762349bc1d0b64ad259`. **Kein** OCI Registry-/Render-Manifest-Digest.
- APK-Datenbank `sha256:99e107010fa8f9a6928b2de3970eb8a0834e655dc7c534a5e6cfaa26007b7e4f`.

## Nachgewiesener technischer Vergleich

| Kriterium | Tatsächlicher Befund | Status |
|---|---|---|
| Installierte APK-Binärpakete | 50 | VERIFIED |
| Exakter Name/Version-Abgleich mit CycloneDX `pkg:apk` | 50/50 | VERIFIED |
| Sonstige SBOM-Komponenten | 21 npm, 63 PyPI, 1 Betriebssystem (135 insgesamt) | VERIFIED |
| aports Source-Recipe-Locators | 34/34 mit Commit, erwarteter Version und upstream Git-Blob SHA1 | VERIFIED |
| SHA512-Deklarationen in gepinnten APKBUILD-Rezepten | 228, alle deklarativ formatgültig | VERIFIED **nur Metadaten** |
| Metarezept `alpine-base` | 0 SHA512-Deklarationen | VERIFIED / keine externen Checksummen |
| Tatsächlich gestagte, archivierte und selbst gehashte Source-/Patch-Bytes **für dieses Image** | 0/228 | NOT_PROVEN |
| Vollständige Buildinputs, Original-Copyright-Hinweise und Source-Delivery | nicht nachgewiesen | REVIEW_REQUIRED |
| Rechte/Owner-Zustimmung | `REVIEW_OPEN`, `deployEligible:false`, `legalApproval:null` | BLOCKED |
| OCI-Registry-Manifest-Digest | nicht vorhanden | NOT_PROVEN |

**Versioniertes Rezept-Lock:** [os-aports-recipe-lock-03dcdb64-20261119.json](evidence/os-aports-recipe-lock-03dcdb64-20261119.json). Enthält alle 34 Rezepte mit `sourcePackage`, `version`, `aportsCommit`, Git-Blob SHA1, festem Pfad und Anzahl deklarierter SHA512-Einträge. Die Version und Git-Blob-Identität wurden über das offizielle `alpinelinux/aports`-Repository am jeweiligen unveränderlichen Commit gelesen; keine ungeprüften Quelltexte wurden ausgeführt.

**Nachgewiesener Codefehler:** Zwei aktuelle Rezepte liegen unter `community/`, nicht `main/`: `community/clamav/APKBUILD` und `community/libmspack/APKBUILD`. Der bisherige `reconcileRecipeLock()` akzeptierte ausschließlich `main/`. Im bestehenden Verifier wird nun ein genaues `main/<sourcePackage>/APKBUILD` **oder** `community/<sourcePackage>/APKBUILD` erlaubt; `testing/`, fremde Paketnamen, Traversal und angehängte Pfadsegmente bleiben gesperrt. Positive/negative Tests decken beide Community-Pakete ab. Es gibt kein automatisches Ausführen externer APKBUILD-Shell-Skripte.

**Noch kein Archiv-/Patch-Checksum-PASS:** Die 228 SHA512-Einträge sind *nur upstream deklarierte Soll-Hashes*. Weder deren Quellarchive noch die Alpine-Patches/Config-Files wurden für diese 34 Rezepte in einem privaten Mirror staged und Byte-für-Byte SHA512-verifiziert. Der vorhandene `scripts/verify-os-source-mirror.mjs` prüft staged Dateien fail-closed; ein erfolgreicher Metadatenvergleich darf nicht an seine Stelle treten. Der historische 21-Rezept-/197-Dateien-Erfolg von 13.11.2026 gehört zu einem anderen Image/Apk-Hash und ist nicht übertragbar.

**Lizenz/Notices:** Die Runtime-Node-LICENSE und Font-OFL Dateien wurden gegen die dokumentierten Artefakt-Hashes geprüft. `OS-PACKAGE-NOTICES.txt`, Lizenzkennungen aus APK und ein SBOM allein beweisen weder komplette Original-Copyright-Texte und NOTICE-Pflichten noch Source-Offer/Corresponding Source. GPL/LGPL/sonstige Lizenzpflichten sind je tatsächlich verteilter Binary und Patch zu prüfen; für nicht alle Open-Source-Pakete ist eine zusätzliche Erlaubnis erforderlich, wenn die Lizenzbedingungen erfüllt sind.

## Nachprüfbarer sicherer Ablauf (noch nicht ausgeführt)

1. In einem isolierten, nicht privilegierten, geheimnisfreien Source-Runner die 34 `APKBUILD`-Dateien vom jeweils gepinnten Alpine-aports-Commit unter dem **exakten Pfad im Lock** abrufen und ihre Git-Blob-SHA1 prüfen.
2. Für alle SHA512-deklarierten Archive, Patches und Konfigurationen die **tatsächlichen Bytes** in `mirror/<sourcePackage>/` bzw. `distfiles/` ablegen; keine fremden Shell-Skripte ausführen. Alle 228 SHA512-Prüfungen mit `scripts/verify-os-source-mirror.mjs` durchführen.
3. Dazu Original-Notices, vollständige entsprechende Quellen, eventuell weitere Patches/Buildinputs und Auslieferungs- bzw. Quellenangebotswege getrennt fachlich prüfen. Erst dann separate rechtliche/Owner-Entscheidung **für das tatsächliche veröffentlichte Image** mit unveränderlichem OCI-Digest.

**Governance / Rücknahme:** `docs/security/evidence/license-rights-review.json` bleibt historisch und unverändert (`REVIEW_OPEN`, `deployEligible:false`, `legalApproval:null`). Weder GHCR-Publish noch Provider-/Secret-Änderungen noch Render-Handoff. Änderungen dieses Slices können durch Revert der Rezept-Lockdatei, dieser Dokumentation und der kleinen Verifier-/Teständerung zurückgenommen werden.
