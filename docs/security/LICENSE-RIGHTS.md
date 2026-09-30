# Basisimage-Quellen und Nutzungsrechte

Prüfstand: 30.09.2026, Europe/Berlin. Repository: `SvenKulessa/Capital-AI`.
Anwendungsstand: `ed594ef93f66ee8f13f67d75dde56f46a95b1cd6`.
Containerbefunde stammen aus [Workflow 36644672551](https://github.com/SvenKulessa/Capital-AI/actions/runs/36644672551)
mit `publish_candidate=false`; der geprüfte Quellcommit ist im
[Laufnachweis](evidence/license-review-run-36644672551.json) festgehalten.

**Status: REVIEW_OPEN. Lizenzfreigabe offen. deployEligible:false.**
Die technischen Quellenbelege ersetzen keine Freigabe durch den Rechteinhaber
und keinen Vertrag für CAPITAL-AI. Es wurden keine Scanner-Ausnahmen eingerichtet.

## 1. Basisimage und zugehörige Quellen

Dockerfile Build und Runtime verwenden denselben gepinnten Bezug:

```text
node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43
```

Das Runtime-Inventar enthält Alpine 3.24.1 und 18 OS-Pakete. Für alle wurden
die Paketversion und die Version des zugehörigen Alpine-Buildrezepts abgeglichen.
Die elf vollständigen APKBUILD-Dateien sind unter
[evidence/license-sources/aports](evidence/license-sources/aports) archiviert.
Das [Inventar](evidence/license-rights-review.json) enthält pro Rezept Commit,
Git-Blob, SHA256, vollständige Quelldeklaration und die erklärten SHA512-Werte.
Die Rezepte wurden gelesen, nicht ausgeführt.

| Installierte Pakete | Version | Quelle / verbleibende Aufgabe |
|---|---|---|
| alpine-baselayout, alpine-baselayout-data | 3.7.2-r1 | Lokale aports-Dateien und Debian netbase 6.4; alle Inputs und Generierung sichern |
| alpine-keys | 2.6-r0 | aports-Schlüsseldateien und MIT-Hinweise vollständig zuordnen |
| alpine-release | 3.24.1-r0 | alpine-base-Rezept für Release 3.24.1; generierte Dateien zuordnen |
| apk-tools, libapk | 3.0.6-r0 | Upstream-Archiv und alle Rezeptinputs sichern |
| busybox, busybox-binsh, ssl_client | 1.37.0-r31 | BusyBox 1.37.0 plus Alpine-Patches, Konfiguration und Buildinputs sichern |
| ca-certificates-bundle | 20260611-r0 | Alpine ca-certificates-Archiv 20260611; Mozilla-Quellen und MPL/MIT-Hinweise sichern |
| libcrypto3, libssl3 | 3.5.8-r0 | OpenSSL-Archiv 3.5.8; Apache-Lizenz und einschlägige Hinweise sichern |
| libgcc, libstdc++ | 15.2.0-r5 | GCC-Quellen, Alpine-Patches und konkrete Bibliotheksabdeckung prüfen |
| musl, musl-utils | 1.2.6-r2 | musl-Archiv und Patches sichern; drei Utility-Quelldateien geprüft |
| scanelf | 1.3.9-r1 | pax-utils-Archiv 1.3.9 und Buildinputs sichern |
| zlib | 1.3.2-r0 | zlib-Archiv 1.3.2 und Zlib-Hinweise sichern |

Die historischen Rezepte für apk-tools 3.0.6, ca-certificates 20260611 und
alpine-base 3.24.1 wurden separat gepinnt: Der heutige Branch enthält bereits
neuere Versionen. Bei den anderen Rezepten stimmt die Version am gepinnten
aports-Commit `f4b1c038c082e8097ad723deb221d46a922ba371` überein.

**Grenze des Nachweises:** Ein passendes Rezept belegt keine reproduzierte
Binärherkunft. Die externen Quellarchive wurden hier nicht heruntergeladen und
ihre Checksummen nicht unabhängig geprüft. Patches, Konfigurationen, weitere
Buildinputs und vollständige Corresponding Source sind noch nicht als
auslieferbarer Quellensatz gesichert. Ein Upstream-Link allein wird nicht als
erfüllte Quellbereitstellungspflicht gewertet. Für die geplante GHCR-Verteilung
sind der gewählte Bereitstellungsweg, die nötigen Lizenztexte/Hinweise sowie
die genaue Zuordnung zur Image-Identität noch zu prüfen.

## 2. Lizenzhinweise und zusätzliche Erlaubnisse

### GCC Runtime Library Exception

Für GCC 15.2.0 wurden [COPYING.RUNTIME](evidence/license-sources/GCC-COPYING.RUNTIME),
[GPLv3](evidence/license-sources/GPL-3.0.txt) und Copyright-/Lizenzheader von
[libgcc](evidence/license-sources/libgcc-license-header.txt) und
[libstdc++](evidence/license-sources/libstdc++-license-header.txt) archiviert.
Die Upstream-Header nennen GPLv3 oder später mit GCC Runtime Library Exception 3.1.
Alle Verweise sind auf GCC-Commit
`5115c7e447fc07457443df874bf57840e8316d5f` festgelegt.

Die zusätzliche Erlaubnis gilt unter ihren Bedingungen für entsprechend
gekennzeichnete Runtime-Dateien und Kombinationen mit unabhängigen Modulen.
Sie ist keine pauschale Ausnahme für den gesamten Container oder für die
Weiterverteilung der Bibliotheken selbst. Die gröberen Alpine/Trivy-Labels
GPL/LGPL bleiben im ursprünglichen Scan erhalten. Die archivierten Header
belegen Beispiele aus dem Upstream; die Abdeckung jeder enthaltenen Binärdatei
und die verbleibenden Weiterverteilungspflichten bleiben offen.

### musl-utils

Die vollständig archivierten Dateien
[getconf.c](evidence/license-sources/musl-utils/getconf.c),
[getent.c](evidence/license-sources/musl-utils/getent.c) und
[iconv.c](evidence/license-sources/musl-utils/iconv.c) stimmen jeweils mit dem
SHA512-Wert aus dem versionsgleichen Alpine-Rezept überein.
getconf/getent enthalten BSD-2-Clause-Hinweise; iconv nennt GPLv2 oder später.
Damit ist das kombinierte Paketlabel MIT/BSD/GPL erklärt. Das MIT-Label von
musl hebt die GPL-Bedingungen des separaten iconv-Programms nicht auf.
[GPLv2](evidence/license-sources/GPL-2.0.txt) ist als vollständiger Text archiviert.

### Weitere Hinweise

Die ca-certificates-Rezeptnotiz unterscheidet ein GPL-Skript im Quellarchiv,
das nicht ausgeliefert wird, von MPL/MIT-Inhalten des Pakets. Die genaue
Quellen- und Hinweisbereitstellung für das Zertifikatsbundle bleibt zu prüfen.

Die vollständige Node-24.19.0-Lizenzdatei liegt bereits unter
`docs/licenses/node-v24.19.0-LICENSE.txt` und im Runtime-Image unter
`/app/licenses/Node-LICENSE.txt`. ICU, c-ares und NAIST aus dem Textscanner
sowie Autoconf-Textbefunde bleiben im vorherigen Laufnachweis nachvollziehbar.
Vollständiger Lizenztext bedeutet keine automatische Scanner-Freigabe.
Buildtool-Befunde wie BlueOak in globalem npm bleiben von Runtime-Befunden getrennt.

Die neuen Belegdateien sind Repository-Dokumentation. Die vorhandene
Docker-Allowlist nimmt `docs/security` nicht in den Buildkontext auf;
die neuen OS-/Font-Texte werden durch diesen PR noch nicht ins Image eingebaut.

## 3. Assets und Marken

Die vier JPEGs sind mit SHA256 und Dateigröße im Inventar erfasst:

| Datei | Festgestellte Verwendung | Rechtebeleg |
|---|---|---|
| capital_ai_brand_emblem_1789997857835.jpg | Repository; kein statischer Import gefunden | Offen |
| capital_ai_full_logo_1789997869885.jpg | Repository; kein statischer Import gefunden | Offen |
| capital_ai_wide_banner_1789999064950.jpg | Repository; kein statischer Import gefunden | Offen |
| glowing_earth_nodes_1789997454893.jpg | Hero-Import | Offen |

Dateiname, Upload und Repository-Kopie beweisen keine Urheberschaft oder
kommerzielle Nutzungsrechte. Je Datei fehlen Urheber/Quelle, Lizenz oder
Erstellungsnachweis, erlaubter Nutzungskreis und gegebenenfalls Attribution.
Bei KI-Erstellung sind Werkzeug, Erstellungszeitpunkt und die dafür geltenden
Nutzungsbedingungen zu dokumentieren; KI-Herkunft wird hier nicht angenommen.

`src/components/AssetLogo.tsx` enthält Inline-Darstellungen für Asset-Symbole;
das Inventar erfasst 70 Symbolbezeichner einschließlich Aliassen, Rohstoffen
und Indizes. Diese Zahl ist keine Anzahl unterschiedlicher geschützter Marken.
Für erkennbare Unternehmens-/Projektlogos sind Zeichnungsherkunft und
einschlägige Marken-/Brand-Bedingungen gesondert zu belegen. Eine npm-Lizenz
erteilt hierfür keine Markenfreigabe. Bis dahin: REVIEW_OPEN.

## 4. Font

Plus Jakarta Sans wird über Google-Fonts-CSS aus `index.html` geladen.
Der vollständige [OFL-1.1-Text](evidence/license-sources/Plus-Jakarta-Sans-OFL.txt)
und [Metadaten](evidence/license-sources/Plus-Jakarta-Sans-METADATA.pb) sind aus
`google/fonts` am Commit `23e54b51ddffbc7713c583748e3bd86f62b1fa4a` archiviert.
Der Copyright-Hinweis nennt die Plus Jakarta Sans Project Authors / Tokotype.

Die OFL erlaubt den Einsatz in Anwendungen unter ihren Bedingungen. Beim
Weiterverteilen von Font-Dateien sind Copyright und Lizenz beizulegen;
isolierter Verkauf der Font-Software und Änderungen unter reservierten Namen
unterliegen den Bedingungen der OFL. Die externe CSS-Auslieferung ist nicht
auf eine konkrete Font-Binärdatei gepinnt. Upstream-Lizenz ist belegt,
Identität der tatsächlich ausgelieferten Dateien bleibt offen. Eine spätere
Selbsthost-Lösung benötigt versionsgebundene Dateien, Hashes und OFL-Hinweise.

## 5. Provider-Nutzungsrechte

Scope sind die vier tatsächlich in `server/market.mjs` implementierten
Marktdatenquellen. Eintragungen in der Provider-Registry allein gelten nicht
als aktive Integration. Es wurden keine Provider-Anfragen mit Secrets ausgeführt.
Der Adapter kennzeichnet Live-Provenienz bereits mit `licenseScope:'unverified'`.
Ein technisch erfolgreicher Feed beweist keine Nutzungsfreigabe.

Die Tabelle fasst zum Prüfzeitpunkt abrufbare Primärquellen-Suchauszüge zusammen.
Vollständige Vertragsstände wurden nicht archiviert; konkrete Nutzerverträge,
Kontoregion und Subscription-Tiers liegen nicht vor.

| Provider | Ergebnis der Quellenprüfung | Benötigter Beleg |
|---|---|---|
| Binance | Offizielle API-Dokumentation belegt den Live-Zugang. Gefundene regionale Terms-Fassungen begrenzen IP-Nutzung auf persönliche/interne Zwecke; die konkret geltende Fassung ist offen. Archivdaten-Lizenzen werden nicht auf den Live-Stream übertragen. | Zuständige Einheit/Region und Erlaubnis für kommerzielle externe Anzeige/API-Nutzung |
| Kraken | API-Guidance verweist auf Terms und Erlaubnis für nicht persönliche kommerzielle Datennutzung, auch bei öffentlichen Endpunkten. | Geltende Terms und konkrete Marktdaten-Erlaubnis |
| Twelve Data | Grundrecht ist interne Nutzung; externe Anzeige/Redistribution hängt von Tier, Add-ons oder separater Vereinbarung ab. Attribution und Börsenrechte sind feedabhängig. | Aktiver Plan, Feeds/Add-ons, externe Rechte, Attribution und Börsenauflagen |
| Polygon/Massive | Standard-Marktdatenterms begrenzen kommerzielle Nutzung und Weitergabe einschließlich abgeleiteter Werke. | Vertragspartner für den legacy Polygon-Endpunkt und passende kommerzielle Vereinbarung |

Primärquellen:

- [Binance Terms](https://www.binance.com/en/terms) und [offizielle Spot-API-Dokumentation](https://github.com/binance/binance-spot-api-docs).
- [Kraken API-Guidance](https://docs-legacy.kraken.com/api/docs/guides/global-intro/) und [EEA Terms](https://www.kraken.com/legal/eea-terms); Kontoregion nicht festgestellt.
- [Twelve Data Terms](https://twelvedata.com/terms), [kommerzielle Nutzung](https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage) und [Attribution](https://support.twelvedata.com/en/articles/12647398-attribution-guidelines-for-using-twelve-data).
- [Massive Market Data Terms](https://massive.com/legal/market-data-terms-of-service) und [Polygon-Marktdatenterms](https://massive.com/terms/market_data_terms.pdf).

Im Inventar sind je Provider separate, derzeit leere Belegfelder für
öffentliche Anzeige, API-Weitergabe, abgeleitete Scores/Research, Cache und
Retention, Export/Weiterverkauf, Attribution, Feeds, Laufzeit und Vertragsreferenz
angelegt. Diese Rechte müssen zum tatsächlichen Produktnutzungskreis passen.
Ein kostenpflichtiger Plan oder ein API-Key wird nicht als pauschale Erlaubnis gewertet.
Vertrauliche Vertragsinhalte und Schlüssel gehören nicht ins öffentliche Repo;
eine nicht vertrauliche Referenz auf den geprüften Nachweis genügt dort.

## 6. Nächste prüfbare Abschlüsse

1. Vollständige OS-Quellen samt Patches/Buildinputs sichern, Hashes prüfen und
   Hinweis-/Quellbereitstellung für genau das freizugebende Image belegen.
2. JPEG-Herkunft und konkrete Logo-/Markenbedingungen dokumentieren.
3. Tatsächlich verwendete Font-Dateien identifizieren und die OFL-Bedingungen
   für die gewählte Auslieferung nachvollziehbar erfüllen.
4. Provider-Vertragsrechte je Feed und Nutzungsart belegen und erforderliche
   Attribution anhand der belegten Bedingungen umsetzen.
5. Erst nach expliziter Lizenzfreigabe die separaten offenen Gates
   Render-Imagequelle per Digest und Runtime-Identität abschließen.

Die Bestandsaufnahme ist keine Lizenzfreigabe. Dieser PR verändert keine
Deploy-Eligibility, Provider-Konfiguration, Render-Einstellung oder Workflow.
