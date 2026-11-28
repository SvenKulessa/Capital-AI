# CAPITAL-AI — OS Source Archive & License Audit

**Datum:** 2026-11-22  
**Main:** `fa706af9aa698d702dc782f3f95a95c7f7572a22`  
**CI-Run:** `44955707366`  
**Artifact:** `14727855604`

## Evidenzstufen

| Stufe | Ergebnis |
|---|---|
| CI ZIP SHA-256 | VERIFIED |
| /lib/apk/db/installed Hash | VERIFIED |
| Node-Lizenzdatei / Font-OFL aus CI-Image | VERIFIED (Bytehash zum Inventar) |
| Installierte Binärpakete / Quellrezept-Locators | 50 / 34 |
| Quelle pro Paketversion / Commit-Metadaten | 50/50 vorhanden |
| Aktueller APKBUILD-Rezeptstand | 33 unverändert aus altem Lock; libxml2 r3 gesondert gelesen |
| Deklarierte SHA-512-Dateien | 229 |
| Tatsächliche SHA-512-Byteprüfung | 3 libxml2-Patches |
| Vollständig SHA-512-verifizierte Quellarchive | 0 / NOT_PROVEN |
| Copyright-, NOTICE-, Quellcode-Auslieferung und Redistribuierung | NOT_PROVEN / BLOCKED |

## Einzelne überprüfte libxml2-Patches

| Datei | Git-Blob | deklarierte SHA-512 stimmt |
|---|---|---|
| `CVE-2026-6732.patch` | `66ce0a32d1349e23b7019ffafa1515138629561c` | VERIFIED |
| `CVE-2026-6732-test.patch` | `e88d2b8ab1874f1acd85e4bc095f73c0181e410e` | VERIFIED |
| `CVE-2026-86144.patch` | `d72ead5af477ffd8ffce71fda9d6900a0b954364` | VERIFIED |

Das zugehörige Originalarchiv `libxml2-2.13.9.tar.xz` liegt nur als SHA-512-Deklaration im Rezept vor; die Datei selbst konnte hier nicht bytegenau geprüft werden.

## Lizenz-Metadatenpriorisierung (kein Rechtsentscheid)

| Prüfklasse | Binärpakete |
|---|---:|
| COPYLEFT_SOURCE_AND_NOTICE_REVIEW | 23 |
| FILE_LEVEL_COPYLEFT_AND_NOTICE_REVIEW | 1 |
| PERMISSIVE_NOTICE_REVIEW | 25 |
| PUBLIC_DOMAIN_DECLARATION_REVIEW | 1 |

**COPYLEFT:** GPL/LGPL-Beteiligung erfordert besondere Prüfung von Quellen, Patch- und NOTICE-/Angebotspflichten. Dies ist keine Feststellung einer Verletzung. **MPL:** Datei- und Mitteilungspflichten prüfen. **PERMISSIVE:** Lizenztext/Attribution/NOTICE müssen weiterhin zum ausgelieferten Produkt passen. **PUBLIC DOMAIN:** originäre Deklaration und Paketinhalte prüfen.

## Aufgaben ohne Freigabe

1. Die 226 noch nicht byteverifizierten deklarierten Dateien einschließlich Quellarchive isoliert beschaffen und SHA-512 gegen die exakt gepinnten APKBUILDs prüfen. Davon sind drei Patch-Dateien bereits verifiziert.
2. Quellarchive, Patches, Build-Eingaben und vollständige Lizenz-/Copyright-Texte je tatsächlichem Quellpaket zuordnen. Bei `alpine-base` ohne SHA-512-Deklaration ist die Rezeptherkunft separat zu bewerten.
3. Daraus die einschlägige Corresponding-Source-/Lizenznotice-Auslieferung für das zukünftige Registry-Image prüfen; Images nicht wegen eines positiven Hashchecks automatisch freigeben.
4. JPEG, Logo, Providerrechte, Font-Binärdateien und Trademarks im finalen Image separat prüfen.
5. Historische Rechte-Datei und älteren Recipe-Lock unangetastet lassen; neu entstandene Evidence separat speichern.

## Vollständige 50-Paket-Matrix

| Binärpaket | Version | Quellpaket | Deklarierte Lizenz | Prüfklasse |
|---|---|---|---|---|
| `alpine-baselayout` | `3.7.2-r1` | `alpine-baselayout` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `alpine-baselayout-data` | `3.7.2-r1` | `alpine-baselayout` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `alpine-keys` | `2.6-r0` | `alpine-keys` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `alpine-release` | `3.24.4-r0` | `alpine-base` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `apk-tools` | `3.0.9-r0` | `apk-tools` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `brotli-libs` | `1.2.1-r0` | `brotli` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `busybox` | `1.37.0-r31` | `busybox` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `busybox-binsh` | `1.37.0-r31` | `busybox` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `c-ares` | `1.34.9-r0` | `c-ares` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `ca-certificates-bundle` | `20261020-r0` | `ca-certificates` | `MPL-2.0 AND MIT` | `FILE_LEVEL_COPYLEFT_AND_NOTICE_REVIEW` |
| `clamav-clamdscan` | `1.4.7-r0` | `clamav` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `clamav-daemon` | `1.4.7-r0` | `clamav` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `clamav-libs` | `1.4.7-r0` | `clamav` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `freshclam` | `1.4.7-r0` | `clamav` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `gdbm` | `1.26-r0` | `gdbm` | `GPL-3.0-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `json-c` | `0.18-r1` | `json-c` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `libapk` | `3.0.9-r0` | `apk-tools` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `libatomic` | `15.2.0-r5` | `gcc` | `GPL-2.0-or-later AND LGPL-2.1-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `libbz2` | `1.0.8-r6` | `bzip2` | `bzip2-1.0.6` | `PERMISSIVE_NOTICE_REVIEW` |
| `libcrypto3` | `3.5.9-r1` | `openssl` | `Apache-2.0` | `PERMISSIVE_NOTICE_REVIEW` |
| `libcurl` | `8.23.0-r0` | `curl` | `curl` | `PERMISSIVE_NOTICE_REVIEW` |
| `libexpat` | `2.10.0-r0` | `expat` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `libffi` | `3.5.2-r1` | `libffi` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `libgcc` | `15.2.0-r5` | `gcc` | `GPL-2.0-or-later AND LGPL-2.1-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `libidn2` | `2.3.8-r0` | `libidn2` | `GPL-2.0-or-later OR LGPL-3.0-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `libmspack` | `0.11_alpha-r1` | `libmspack` | `LGPL-2.1-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `libncursesw` | `6.6_p20260516-r0` | `ncurses` | `X11` | `PERMISSIVE_NOTICE_REVIEW` |
| `libpanelw` | `6.6_p20260516-r0` | `ncurses` | `X11` | `PERMISSIVE_NOTICE_REVIEW` |
| `libpsl` | `0.21.5-r3` | `libpsl` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `libssl3` | `3.5.9-r1` | `openssl` | `Apache-2.0` | `PERMISSIVE_NOTICE_REVIEW` |
| `libstdc++` | `15.2.0-r5` | `gcc` | `GPL-2.0-or-later AND LGPL-2.1-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `libunistring` | `1.4.2-r0` | `libunistring` | `GPL-2.0-or-later OR LGPL-3.0-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `libxml2` | `2.13.9-r3` | `libxml2` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `mpdecimal` | `4.0.1-r0` | `mpdecimal` | `BSD-2-Clause` | `PERMISSIVE_NOTICE_REVIEW` |
| `musl` | `1.2.6-r3` | `musl` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `musl-utils` | `1.2.6-r3` | `musl` | `MIT AND BSD-2-Clause AND GPL-2.0-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `ncurses-terminfo-base` | `6.6_p20260516-r0` | `ncurses` | `X11` | `PERMISSIVE_NOTICE_REVIEW` |
| `nghttp2-libs` | `1.70.0-r0` | `nghttp2` | `MIT` | `PERMISSIVE_NOTICE_REVIEW` |
| `pcre2` | `10.49-r0` | `pcre2` | `BSD-3-Clause` | `PERMISSIVE_NOTICE_REVIEW` |
| `pyc` | `3.14.10-r1` | `python3` | `PSF-2.0` | `PERMISSIVE_NOTICE_REVIEW` |
| `python3` | `3.14.10-r1` | `python3` | `PSF-2.0` | `PERMISSIVE_NOTICE_REVIEW` |
| `python3-pyc` | `3.14.10-r1` | `python3` | `PSF-2.0` | `PERMISSIVE_NOTICE_REVIEW` |
| `python3-pycache-pyc0` | `3.14.10-r1` | `python3` | `PSF-2.0` | `PERMISSIVE_NOTICE_REVIEW` |
| `readline` | `8.3.3-r1` | `readline` | `GPL-3.0-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `scanelf` | `1.3.9-r1` | `pax-utils` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `sqlite-libs` | `3.53.4-r0` | `sqlite` | `blessing` | `PUBLIC_DOMAIN_DECLARATION_REVIEW` |
| `ssl_client` | `1.37.0-r31` | `busybox` | `GPL-2.0-only` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `xz-libs` | `5.8.4-r0` | `xz` | `GPL-2.0-or-later AND 0BSD AND Public-Domain AND LGPL-2.1-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |
| `zlib` | `1.4-r0` | `zlib` | `Zlib` | `PERMISSIVE_NOTICE_REVIEW` |
| `zstd-libs` | `1.5.7-r2` | `zstd` | `BSD-3-Clause OR GPL-2.0-or-later` | `COPYLEFT_SOURCE_AND_NOTICE_REVIEW` |

## Integrität & Grenzen

- CI-Archiv: `sha256:8206e05babde257aca3a6d281d1c4a888dd68c3e7019b38a8b9615a5b1d63c1f`
- Original APK-Datenbank: `sha256:263c775b75102a70b050dcf8bfde0da4e728ab316c8ebea31cd51735fdc16f64`
- CI-Image Config: `sha256:5f76597529b8ef14ead01b686879b577c9ba35a455c03ae5aa021c1a8ae7d1d7`
- Es wurde **kein** OCI-Registry-Manifest- oder Render-Runtime-Digest bewiesen.
- Bericht ist eine **nicht-autoritative Compliance-Evidenz** und schafft keine neue GitHub-Gate-Pflicht.
- Original-Lizenzfreigabe: `REVIEW_OPEN`, `deployEligible=false`.