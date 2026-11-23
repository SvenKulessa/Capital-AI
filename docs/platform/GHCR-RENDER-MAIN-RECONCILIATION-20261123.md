# PR #913 · SHA-gebundene P0-Rechte- und Image-Reconciliation — 2026-11-23

Status: **EVIDENCE ONLY / NO GHCR PUBLICATION / NO RENDER SOURCE SWITCH**. Projekt `SvenKulessa/Capital-AI`, Root-`AGENTS.md` Blob `3d5ad12cb6e0f055dac6db427422a903937c91dd`, `SOLO_MAINTAINER_FLOW@2`. Dieses Dokument begründet keine neue GitHub-Pflichtprüfung, Rechtsfreigabe oder Production-Admission.

## Unveränderliche Git-/CI-Referenzen

- Main vor Synchronisierung: `fe4cc7a5784af1b4924c8bbb8c5af49af8b29e34`; PR #913 vorheriger Head: `c7fcbed8c951f483d6606142f85d255438eb2d34`, frühere Merge-Basis: `fa706af9aa698d702dc782f3f95a95c7f7572a22`.
- Branch-Synchronisierung: Die 22 PR-Pfade und die 33 geänderten Main-Pfade sind laut GitHub-Compare **ohne Dateischnittmenge**. Bei neuem Head die GitHub-Required-Checks erneut auswerten.
- Main Docker Security Gate: [Run 45088125138](https://github.com/SvenKulessa/Capital-AI/actions/runs/45088125138), Job `137411279074`: `completed/success`. [CodeQL 45088124543](https://github.com/SvenKulessa/Capital-AI/actions/runs/45088124543): `completed/success`.
- In den echten Main-Docker-Logs ist um 2026-11-23T00:25:25Z ein `os-source-inventory.mjs`-Readback `{"status":"IMAGE_INVENTORY_BOUND_SOURCE_DELIVERY_NOT_PROVEN","image":"sha256:9e7e94e8e3fafe20b081cf0fcbb947064e844fdbb50dde14d734314d9f064523","packages":50,"missingSourceMetadata":0}` dokumentiert. Das Digest ist eine **lokale Image-CONFIG-Identität**, **kein** veröffentlichter OCI-Index, Plattform-Manifest oder Render-Runtime-Image-Digest.
- Dieselben Main-Logs belegen die Ausführung von Trivy-Lizenzscan, CycloneDX-SBOM-Generierung, Extraktion von `THIRD_PARTY_NOTICES.txt`, `runtime-font-ofl.txt`, `runtime-node-license.txt` und `os-apk-installed.txt`. Der zugehörige Actions-Artifact-Eintrag `docker-security-fe4cc7a5784af1b4924c8bbb8c5af49af8b29e34`, ID `14779983571`, ist vorhanden. **Artifact-Dateiinhalte wurden hier nicht heruntergeladen oder byteweise gegen ihre Hashes geprüft**; daher kein ausgedachter SBOM-/NOTICE- oder Signatur-PASS.
- Git-basierter Render-Service `srv-dau1rp893c1s73cdhm1g`: Deploy `dep-dc1ogavb9u1s738ik7m0` steht `live` mit Git-SHA `fe4cc7a5784af1b4924c8bbb8c5af49af8b29e34`. Öffentlicher `GET /healthz` vom 23.11.2026 00:33:01 UTC: HTTP 200, `status=ok`, `runtimeIdentity.sourceSha=fe4cc7a5784af1b4924c8bbb8c5af49af8b29e34`; `buildIdentity.bound=false`, `renderGitBuildIdentity.evidence=RENDER_GIT_BUILD_ARG_UNATTESTED`. Git-SHA-Korrelation ist kein OCI-Provenance-Beweis.

## Sechs Rechte- und Herkunftsnachweise — genaue Trennung der Evidenzstufen

| Thema | Tatsächlich belegter technischer Teil | Weiter offener Nachweis / Status |
| --- | --- | --- |
| 1. OS-Binaries und Quellcodeauslieferung | Main-CI-Inventar für **50 installierte Pakete**, `missingSourceMetadata=0`; ältere PR-#913-Isolationsläufe mit Quellarchiv-/Rezeptprüfungen betreffen frühere Source-/Image-Digests | Für den **aktuellen** Image-Binary-Satz vollständige passende Source-Archive, Patches, Build-Inputs, rechtlich erforderliche Source-Delivery/Offers und Empfängerbezug: **NOT_PROVEN / RELEASE_BLOCKED** |
| 2. Exaktes Basisimage und NOTICE | Aktuelles Dockerfile pinnt `node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5`; CI inventarisiert Runtime-Lizenzen | Aktuelle Binary-to-Source-/Upstream-Manifest-Kette und ausreichendes NOTICE-/Source-Lieferverfahren sind **NOT_PROVEN**; historisches Lizenzledger referenziert andere Node-Version |
| 3. JPEG- und Content-Grafiken | Build kopiert Branding-/Learning-Assets; dadurch können Asset-Listen identifiziert und gegengeprüft werden | Für jedes tatsächlich ausgelieferte relevante JPEG: Pfad, Bytes-/Blobhash, Schöpfer- und Lizenzkette, kommerzielle Bearbeitungs-/Weitergaberechte **NOT_PROVEN**, keine synthetische Eigenschöpfungs-Erklärung |
| 4. Logos, Inline-SVGs und Marken | Das bestehende Registry-/Manifest-Verfahren erfasst Teile der Branding-Assets | Herkunft und markenrechtliche Freigaben der tatsächlich eingebundenen Elemente **NOT_PROVEN**; Copyright- und Markenprüfung getrennt halten |
| 5. Provider- und Datenrechte | Main-MARKET-Evaluator prüft Use Cases fail-closed; PR #915 bereits gemergt und getestet. Live-Health meldet `quotesEnabled=false` und `spotIngestion.configured=false` | Verträge für öffentliche Darstellung, API-/Datenweitergabe, abgeleitete Daten, Export und notwendige Attribution je realem Provider: **NOT_PROVEN**; keine Provider-Aktivierung |
| 6. Fonts und OFL | Main-Docker-Job liest die im finalen **CI-Image** enthaltene `/app/dist/fonts/OFL.txt` und erzeugt SBOM-/NOTICE-Inventare | Byte-/Hashvergleich sämtlicher Fonts plus OFL und Notice-Lieferung im späteren **registry-pulled** Image **NOT_PROVEN**. CI-Image ≠ publizierter OCI-/Render-Digest |

**Source-of-truth Lizenzledger:** `docs/security/evidence/license-rights-review.json` (Blob `1cd26301e33a2628f2b4aad8e720f7edfa361bac`) hat `status=REVIEW_OPEN`, `deployEligible=false`, `legalApproval=null`, sechs `remainingGates`, historische `applicationSourceSha=ed594ef93f66ee8f13f67d75dde56f46a95b1cd6` sowie `node:24.19.0-alpine` als Basis. Eine pauschale Owner-Arbeitsfreigabe ist **kein** unabhängiger Rechts- oder Weitergabe-Nachweis. Dieses historische Ledger wird ausdrücklich **nicht** künstlich zu `APPROVED` konvertiert.

## Technische Weiterbearbeitung / Akzeptanz

1. Bestehende Tests `scripts/platform/*test.mjs`, `scripts/verify-os-source-mirror.test.mjs` und vorhandene Workflow-Gates am nach Main synchronisierten Head laufen lassen; Test-/Merge-SHA und Run-IDs im PR-Kommentar dokumentieren, fehlende Tests **NOT_PROVEN** lassen.
2. Byteweise Prüfung des aktuellen CI-Artifacts `14779983571` gegen SBOM, OS- und Fonts-Notices durchführen, sobald ein authentifizierter ZIP-Readback verfügbar ist. Bis dahin ist nur die Log-Evidence gültig.
3. Pro offener Rechtekategorie nur echte Autor-/Vertrags-/Upstream-Quellen und die konkrete, aktuelle Image-Auslieferung belegen. Keine Rechte-„Reparatur“ aus Dateinamen, Hash-Gleichheit oder grünem Scanner.
4. Das bestehende `scripts/assert-ghcr-publication-rights.mjs` bleibt fail-closed; Registry-Push, GitHub-Attestations-Bewertung und Render-Image-Cutover nur über den bereits bestehenden freigegebenen Pfad nach vollständigen tatsächlichen Rechten, Signaturen, Ruleset-/Kostenfreigaben.

**Rollback:** Der nach Main synchronisierte Draft-Branch kann durch Ref-Rücksetzung auf `c7fcbed8c951f483d6606142f85d255438eb2d34` (nur mit geprüftem Lease) verworfen werden. Keine Mutation von `main`, GHCR oder Render erfolgt durch diese technische Reconciliation.
