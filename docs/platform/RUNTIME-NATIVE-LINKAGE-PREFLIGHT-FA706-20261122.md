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
