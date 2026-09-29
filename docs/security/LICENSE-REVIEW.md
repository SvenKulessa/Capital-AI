# Lizenzprüfung und Redistribution-Nachweise

Prüfstand: 30.09.2026 (Europe/Berlin), Quellcommit
`d9f998c441554fba2f9bf2d42d99849305df51d0`.
Die zwischenzeitlich gemergte Plattform-Hub-Navigation aus PR #10 ist erhalten.
Status: **REVIEW_OPEN**, `deployEligible:false`.
Dies ist eine technische Prüfung der vorhandenen Nachweise und Verteilungswege,
keine pauschale rechtliche Freigabe. Ein grüner Workflow schließt dieses Gate
nicht automatisch.

## Prüfergebnis

Das npm-v3-Lockfile enthält 319 Drittanbieter-Einträge einschließlich optionaler
Plattformpakete; nur der eigene Root-Eintrag hat keine Lizenzangabe.
Keiner der Drittanbieter-Einträge hat fehlende Lizenzmetadaten. Das ist kein
Beweis, dass sämtliche eingebetteten Teilwerke dieselbe Lizenz haben.

| Deklarierter Ausdruck | Lockfile-Einträge | Einordnung |
| --- | ---: | --- |
| MIT | 246 | Lizenz-/Urheberhinweise erhalten |
| ISC | 17 | Lizenz-/Urheberhinweise erhalten |
| Apache-2.0 | 10 | Lizenz und vorhandene NOTICE-Texte erhalten |
| BSD-3-Clause | 14 | Copyright, Bedingungen und Disclaimer erhalten |
| BSD-2-Clause | 1 | Copyright, Bedingungen und Disclaimer erhalten |
| 0BSD | 2 | Inventarisieren |
| MPL-2.0 | 24 | Lightning CSS 1.32.0/1.33.0 und Plattformpakete; Werkzeugprüfung |
| CC-BY-4.0 | 1 | caniuse-lite 1.0.30001813; Daten-/Attributionsprüfung |
| (MPL-2.0 OR Apache-2.0) | 1 | DOMPurify; Apache-2.0 als Alternative dokumentiert |
| (MIT AND Zlib) | 1 | pako; beide Lizenztexte/Hinweise erfassen |
| MIT AND ISC | 1 | victory-vendor; Wrapper und vendorte Bibliotheken erfassen |
| MIT OR SEE LICENSE IN FEEL-FREE.md | 1 | rgbcolor; MIT-Alternative dokumentiert |

Der lokale Vite-Build erfasst 52 npm-Pakete anhand der Modul-IDs der tatsächlich
erzeugten Chunks, einschließlich Lazy-Load-Chunks. Das ist ein npm-Bundle-
Inventar, kein vollständiges Inventar aller eingebetteten Teilwerke. Unter den
52 Paketen ist keine ausschließlich unter MPL lizenzierte Lightning-CSS-
Bibliothek und kein caniuse-lite. CSS-Ausgabe allein bedeutet nicht, dass der
Compiler selbst ausgeliefert wird. Nicht im Frontend enthaltene Werkzeuge
werden weiterhin über Lockfile und Build-Image separat geprüft.

Relevante geprüfte Paketdetails:

- lucide-react 0.546.0: Der Pakettext enthält neben ISC auch MIT-Hinweise für
  Feather-abgeleitete Teile. Die reine Lockfile-Angabe ISC reicht nicht als
  vollständiger Hinweis.
- pako 2.2.0: MIT-Text aus LICENSE und Zlib-Hinweis aus dem unveränderten
  Header von lib/zlib/deflate.js werden übernommen.
- es-toolkit 1.52.0: LICENSE und NOTICE werden übernommen.
- DOMPurify 3.4.16: Apache-Alternative explizit ausgewählt; mitgelieferte
  Lizenzdateien bleiben erhalten. Keine pauschale MPL-Erlaubnis für neue
  Frontend-Abhängigkeiten.
- victory-vendor 37.3.6: 13 vendorte Lizenzdateien plus MIT-Wrapper-Lizenz
  vom identischen Upstream-Tag v37.3.6. Upstream-Git-Blob:
  `4d33f1aba85636b665016cabb1b991209177c606`.
- cookie-signature 1.0.7 und data-uri-to-buffer 4.0.1: vollständige MIT-
  Texte liegen in README; die Rückfallregel ist auf diese Versionen begrenzt.
- Native npm-Werkzeugpakete können ohne eigene LICENSE-Datei veröffentlicht
  sein. Sie sind keine automatisch freigegebenen Redistributables, nur weil
  sie nicht im Frontend erscheinen.

## Umsetzung

`scripts/license-evidence.mjs` inventarisiert alle Lockfile-Lizenzen mit
Lockfile-SHA-256 und meldet unbekannte Ausdrücke als Fehler. Anerkannte
Ausdrücke sind eine technische Prüfliste, keine automatische Lizenzfreigabe.
MPL-Werkzeuge und CC-BY-Daten bleiben ausdrücklich zur Prüfung markiert.

Der Vite-Hook erzeugt offline `THIRD_PARTY_NOTICES.txt` und
`frontend-license-inventory.json` aus dem installierten, mit dem Lockfile
korrelierten Paketbaum. Version/Lizenzabweichungen, unbekannte Paketmodule,
fehlende Texte, ein leeres npm-Inventar oder nicht freigegebene Bundle-
Lizenztypen stoppen den Build. Er erfasst auch Lizenz-/NOTICE-Dateien in
Paket-Unterverzeichnissen. Er ist kein allgemeiner SPDX-Parser und erkennt
nicht jede in Quellkommentaren eingebettete Fremdlizenz; die bekannten
zusätzlichen Hinweise oben sind gezielt berücksichtigt.

Der Footer verlinkt die Lizenztexte; der Server liefert TXT als text/plain
und das Inventar als application/json mit nosniff. Die Dateien sind im
Runtime-Image enthalten. Die vollständige Node.js-24.19.0-LICENSE mit
eingebetteten Drittanbieterhinweisen wird zusätzlich unter
`/app/licenses/Node-LICENSE.txt` im Container aufbewahrt.
Upstream-Git-Blob: `2842efa1288eef1de3a6778b5dd3519bc903308d`.
Die Upstream-Texte werden nicht durch selbst geschriebene Standardlizenzen ersetzt.

Der Workflow sichert drei Trivy-Lizenzinventare im JSON-Format ohne
Schweregradfilter: Build-Stufe, lokales Runtime-Archiv, GHCR-Image nach
Digest-Pull. `--license-full` erfasst zusätzlich lose Lizenztexte, soweit
der Scanner sie erkennt. Scanner-/Dateifehler blockieren. Lizenzbefunde
werden mit `--exit-code 0` zur Prüfung gesammelt: Die Trivy-Schweregrade
sind keine abschließende juristische Beurteilung. GPL-Komponenten des
Betriebssystems werden weder pauschal verboten noch automatisch freigegeben.

Frontend-Inventar und Originalhinweise werden aus demselben Runtime-Image
extrahiert und mit den Scan-Nachweisen gespeichert; das Inventar enthält
den Hash der Notice-Datei und ihrer einzelnen Lizenztexte. Nach erfolgreichem
Publish bleiben SBOM/Provenance an den Registry-Digest attestiert. Die
hier ergänzten Lizenz-JSONs bekommen keine zusätzliche eigene Attestation.

## Offene Nachweise vor Deployment-Freigabe

| Punkt | Fehlender konkreter Nachweis |
| --- | --- |
| Alpine-/Node-Basisimage | JSON des neuen vollständigen Lizenzscans am tatsächlichen Digest; Paketversionen, eingebettete Rechte, erforderliche Hinweise und gegebenenfalls vollständiger korrespondierender Quellcode einschließlich Build-Anweisungen |
| GPL-/LGPL-Redistribution | Tatsächlich ausgelieferte Komponenten und Verteilungsweg prüfen; passende Source-Bereitstellung/Offer-Pflichten erfüllen. Eine allgemeine Projekt-URL allein wird nicht als Nachweis gewertet |
| Bilder und Logos | Herkunft und Nutzungsrechte der vier JPEGs und nachgebildeten Asset-/Markenlogos; kein Lizenz-/Provenienzmanifest vorhanden |
| Schrift | Plus Jakarta Sans wird extern von Google Fonts geladen; OFL und Dienst-/Datenschutzprüfung separat dokumentieren. Keine Fontdatei wird durch diesen PR selbst gehostet |
| Marktdaten | Vertrag/Tarif und erlaubte Anzeige, Speicherung, Weitergabe/Redistribution je aktivem Provider und Instrument; ein öffentlicher API-Endpunkt oder vorhandener API-Key belegt keine Berechtigung |
| Eigener Quellcode | Herkunft aus SvenKulessa/FRONTEND dokumentiert. Eigentum/Übernahme und Drittbeiträge klären, soweit relevant; fehlende Root-LICENSE ist keine automatische Pflicht, eigene Software unter eine OSS-Lizenz zu stellen |
| Nutzungsbedingungen | Rechte an Drittanbieterkomponenten bei der Prüfung der bestehenden AGB berücksichtigen; proprietäre Bedingungen ersetzen keine Upstream-Lizenzen |

Keine fremden Bilder werden entfernt, keine eigene Projektlizenz erfunden und
keine Provider-Berechtigung behauptet. Die getrennten offenen Gates
RENDER_IMAGE_SOURCE und RUNTIME_IDENTITY bleiben ebenfalls erhalten.
Die Prüfung des neu gebauten Images ist erforderlich; die alten Attestations
beziehen sich auf den vorherigen Quellstand.

## Validierung

- npm ci ohne Installationsskripte: 246 installierte Pakete auf dem lokalen
  Linux-System; die Plattformzahl ist kleiner als das plattformübergreifende
  Lockfile-Inventar.
- TypeScript-Prüfung und Provider-/Contract-/Scoring-Suites bestanden.
- Acht Lizenzregressionen sowie fünf Server-/Marktdatenregressionen bestanden.
- Vollständiger Vite-Build mit Originalassets: 52 Frontend-Pakete,
  117.825 Byte Notice-Datei; beide kombinierten Lizenzfälle und NOTICE,
  Footer-Verweis und Text-/JSON-Auslieferung geprüft.
- Workflow-YAML und sämtliche Bash-Blöcke statisch geprüft; bestehende
  HIGH/CRITICAL-/Secret-Gates, CycloneDX und deployEligible:false erhalten.
- Docker steht lokal nicht zur Verfügung. Die drei echten Trivy-
  Lizenzinventare und der Container-Build müssen im nächsten Actions-Lauf
  geprüft werden. Sie sind nicht als bereits bestanden gekennzeichnet.

## Primärquellen

- https://www.apache.org/licenses/LICENSE-2.0 (insbesondere Abschnitt 4)
- https://www.mozilla.org/en-US/MPL/2.0/
- https://www.mozilla.org/en-US/MPL/2.0/FAQ/
- https://trivy.dev/docs/v0.74/guide/scanner/license/
- https://github.com/nodejs/node/blob/v24.19.0/LICENSE
- https://github.com/FormidableLabs/victory/blob/v37.3.6/LICENSE.txt
- https://github.com/google/fonts/blob/main/ofl/plusjakartasans/OFL.txt

Zusätzlich wurden die tatsächlichen per npm ci installierten LICENSE-,
NOTICE-, README- und oben genannten Source-Header-Dateien gelesen. Die
Upstream-Hinweise werden bei jedem Build aus den exakten Paketen neu erfasst.
