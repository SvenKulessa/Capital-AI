# CAPITAL-AI · Native-Linkage-Readback am gescannten CI-Image

**Scope:** CAPITAL-AI Draft-PR #913, Main-Referenz `fa706af9aa698d702dc782f3f95a95c7f7572a22`. Nur Evidence/Qualität; keine Produktions-, Registry-, Rechte- oder Kosten-Autorisierung.

## Ausgangslage

Die technische SHA-512-Prüfung von 229 Aports-Quelleingaben und die Runtime-Lizenzkorrelation (50 Alpine, 21 Node und 63 Python Paketdatensätze) sind durch bestehende GitHub-CI belegt. Das prüft weder native ELF-Linkage noch statisch eingebettete Bibliotheken, Verfügbarkeit von NOTICE-Bundles im finalen Image oder die juristische Vollständigkeit entsprechender Quellcodeangebote.

## Neue technische Prüfung (keine neue Required Check)

Der bestehende **Docker Security Gate** führt nach Image-Export, Trivy/SBOM und Runtime-Lizenzkorrelation folgenden Readback aus:

1. Gleichheit der tatsächlichen exportierten Docker-Image-CONFIG-SHA-256 mit `security-reports/image-id.txt` prüfen, ohne diese CONFIG-ID mit einem veröffentlichten OCI-Manifest zu verwechseln.
2. Den bind-mount-geladenen Skriptprüfer `scripts/platform/runtime-native-linkage.mjs` mit `--network none`, unveränderlicher Container-Root, `--cap-drop ALL`, `no-new-privileges`, dem vorhandenen Runtime-Image und dessen normalen non-root USER ausführen. Es erfolgt keine Paketinstallation und keine Mutation.
3. Alpine-DB `/lib/apk/db/installed` auf Dateieigentümerschaft auswerten und Bytes sowie SHA-256 der installierten ClamAV-/libmspack-Native-Dateien erfassen. Insbesondere werden `clamav-libs`, `clamav-daemon`, `clamav-clamdscan`, `freshclam` und `libmspack` kontrolliert.
4. Für `@img/sharp-libvips-linuxmusl-x64`, `@img/sharp-linuxmusl-x64` und `sharp` tatsächliche `package.json`, native `.so`-/`.node`-Dateien sowie vorhandene Lizenzdateien erfassen und hashen. Die Version des libvips-Pakets wird gegen die bestehende Runtime-SBOM/Scanner-Korrelation abgeglichen.
5. An ELF-Magic überprüften Dateien die **direkten** `DT_NEEDED`-Einträge mit `scanelf -BF '%n'` auslesen. Scannerfehler und nicht lesbare ELF-Dateien bleiben `NOT_PROVEN`. Dateinamen, Pfade und Hashes werden begrenzt und allowlisted ausgegeben; keine Dateien oder Lizenztexte werden öffentlich exportiert.
6. APK-Datenbank-SHA-256, tatsächliche Paketanzahl, aktuelle Quellinventar-Identität und den bisherigen Runtime-Lizenzbericht in einem separaten **nicht autorisierenden** Readback miteinander verknüpfen.

**Nachweisdateien:** `runtime-native-linkage.json` (Datei-/ELF-Einzelbefunde) und `runtime-native-linkage-summary.json` (Gebundene Zusammenfassung) im bestehenden Docker-Security-Artefakt. Acht lokale Fixture- und Negativtests wurden vor dem GitHub-CI-Lauf erfolgreich ausgeführt. Die eigentlichen Image-Dateihashes dürfen nur anhand des realen CI-Artifacts als `VERIFIED` bewertet werden.

## Rechtliche Grenzen

- Ein gefundenes `libclamunrar`-Binary oder ein direkter `DT_NEEDED`-Eintrag kann Hinweise auf tatsächliche Runtime-Inklusion liefern; seine Abwesenheit **beweist keine Abwesenheit statisch eingebetteter UnRAR-Quellteile**.
- `@img/sharp-libvips-linuxmusl-x64` kann LGPL-pflichtige Native-Dateien enthalten. Datei- und Linkage-Evidence **entscheidet weder** über anwendbare Linking-Ausnahmen noch über Re-Linking-/Korrespondenzquellcodepflichten bei Weitergabe.
- Die finalen Lizenz-, Copyright- und NOTICE-Dateien sowie die Zugänglichkeit des Corresponding Source für tatsächliche Image-Empfänger bedürfen weiterhin einer rechtlichen und technischen Prüfung.
- Die historischen Dateien `docs/security/evidence/license-rights-review.json` und ältere OS-Quellevidenz bleiben unverändert; `status=REVIEW_OPEN`, `deployEligible=false`.

**Admission bleibt:** `FINAL_IMAGE_NATIVE_BYTES=WAIT` bis GitHub-Lauf erfolgreich abgeschlossen und Ausgaben gelesen; `ELF_LINKAGE=WAIT`; `STATIC_UNRAR_INCLUSION=NOT_PROVEN`; `REDISTRIBUTION=BLOCKED`; `PUBLISH=NONE`; `DEPLOY=NONE`.

## Real CI-byte readback and targeted remediation

**Actual artifact:** [Docker Security Gate 44972410982](https://github.com/SvenKulessa/Capital-AI/actions/runs/44972410982), source SHA `01e27bdf117118fa43fe824b3e6190b13a9f9ed8`, artifact ID `14734636445`, ZIP SHA-256 `c58c44a83dce61ac0ea43cc032f964c246b07dafd69b9a69fa7cb7baee0e92e4`. Re-read the actual ZIP independently. Its `runtime-native-linkage.json`, `runtime-native-linkage-summary.json`, `runtime-license-coverage.json`, `os-source-inventory.json` and `image-id.txt` match the same **CI config digest** `sha256:7bb2d1225bf79e3b525c6056dbb231ec5e7eb555b988f02d42cd8265a7341570`; APK database digest also matches.

- 10 verified native APK-file *paths* across ClamAV and libmspack (some are symlink aliases of the same content); 2 verified Node-native file paths.
- `/usr/lib/libclamav.so.12.0.3`: SHA-256 `14ee6d9b1d89a1eadb55d5dcfa30602f248e39742f9ff19f4d44d0544ffd9105`.
- `/app/node_modules/@img/sharp-libvips-linuxmusl-x64/lib/libvips-cpp.so.8.18.7`: SHA-256 `979b625437190a1970b835164e0e30d47dc60159ce6a394ce78cc40cb9d59ab8`.
- `/app/node_modules/@img/sharp-linuxmusl-x64/lib/sharp-linuxmusl-x64-0.35.5.node`: SHA-256 `14ce8ddd283c101f225089152da805632568bfa372d336ccbfdd811f4f1dca02`.
- The APK installed database lists no filename containing `unrar`, yet the recorded `directDtNeededObserved=false` was derived from **unresolved DT_NEEDED checks**. It is **not** evidence of absent direct, dynamically loaded, or statically embedded UnRAR.
- **Reproduced technical defect:** Every ELF file's first-pass `dynamic.status` was `NOT_PROVEN` despite the Docker Security Gate step succeeding. The previous output omitted a safe failure category. Inventory confirms `scanelf=1.3.9-r1` is installed, but exact scanelf failure reason remains unproven.
- **Remediation in the same PR:** `scripts/platform/elf-needed.mjs` implements a bounded, read-only, no-execution ELF64 little-endian `PT_DYNAMIC`/`DT_NEEDED` parser. The native collector retains its existing scanelf path and uses the parser only when scanelf cannot validate. The parser rejects unexpected endianness/class, invalid offsets, malformed dynamic entries, missing string-table mapping and non-allowlisted library names. Existing Docker Security Gate runs dedicated fixtures and binds both scripts read-only into the inspected image. No changes to installed production packages, rulesets, entitlement, publication or provider state.

**Current-new-head ELF outcome:** `WAIT` until the revised CI run produces fresh hashed file and `DT_NEEDED` evidence. Any static or `dlopen` inclusion stays `NOT_PROVEN` even after a successful direct dependency parse. Rights and corresponding-source duties remain `REVIEW_OPEN`/`BLOCKED`; prior `license-rights-review.json` remains unchanged.
