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
- Der Agent-Lauf 36644672551 hat Container-Build, Build-/Runtime-Lizenzinventare
  und sämtliche Validierungsschritte bestanden. GHCR-Publish war übersprungen;
  das dritte Inventar am Registry-Digest bleibt deshalb noch aus.

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

## Auswertung des Agent-Laufs 36644672551

Geprüfter Head: `69cd56c45854d57a1a24479c4a9b8bf398b65463`.
[Workflow-Lauf](https://github.com/SvenKulessa/Capital-AI/actions/runs/36644672551):
validate=success, publish_candidate=skipped. Es wurde kein GHCR-Kandidat
veröffentlicht und kein Render-Deploy ausgelöst. Die erfolgreiche Agent-
Validierung ist kein Nachweis eines bereits ausgeführten Main-Publish.

Das heruntergeladene Actions-Artefakt 11067544178 stimmt mit dem von GitHub
angegebenen SHA-256 überein:
`3cfa13cacd53cc0d2ba1afb7932007d4f6fc34166aef184a7a5c64f8ce3032e6`.
Es läuft am 06.10.2026 um 23:22:40 UTC ab. Der dauerhafte Auswertungssnapshot
[evidence/license-review-run-36644672551.json](evidence/license-review-run-36644672551.json)
enthält Datei-Hashes, Paketversionen, Lizenzlabels und offene Nachweise.
Er ist eine Zusammenfassung, kein Ersatz für die ursprünglichen JSON-Berichte.

### Verifizierte Inventare

- 319 Lockfile-Einträge: 294 NOTICE_REQUIRED, 24 BUILD_TOOL_REVIEW,
  1 DATA_ATTRIBUTION_REVIEW; kein UNREVIEWED-Metadateneintrag.
- 52 Frontend-Pakete: 37 MIT, 11 ISC, 2 Apache-2.0, 1 MIT AND Zlib,
  1 MIT AND ISC. Der Notice-Hash stimmt mit dem Frontend-Inventar überein;
  beide Inventare referenzieren denselben Lockfile-Hash.
- Frontend-Notices: 117.825 Byte, SHA-256
  `96312616f2dca1c6cb497ca173a1353c67f3840d0dd85623f575c36ef8328e3f`.
- Runtime: 18 OS-Pakete, 53 Lizenzklassifikations-Datensätze:
  HIGH=17, MEDIUM=2, LOW=28, UNKNOWN=6, CRITICAL=0.
- Build-Stufe: 445 Lizenzklassifikations-Datensätze:
  HIGH=17, MEDIUM=8, LOW=402, UNKNOWN=18, CRITICAL=0.
- Die separaten Build-/Runtime-Sicherheitsberichte enthalten keine
  HIGH/CRITICAL-Schwachstellen oder Secret-Befunde. Die Lizenzzahlen oben
  sind keine CVE-Zahlen und keine Anzahl unabhängiger Rechtsprobleme.

### Einordnung der Lizenztreffer

Die 17 HIGH-Runtime-Treffer setzen sich aus 13 OS-Lizenzdatensätzen und
vier Texttreffern zu Autoconf-Ausnahmen in zwei Kopien der vollständigen
Node-LICENSE zusammen. Trivy zählt beispielsweise libgcc/libstdc++
jeweils zweimal, weil die Paketmetadaten GPL und LGPL aufführen.
Aus diesen Labels wird keine GPL-Lizenz für die eigene Anwendung abgeleitet.

Die OS-Nachweise betreffen insbesondere:
alpine-baselayout/data 3.7.2-r1; apk-tools/libapk 3.0.6-r0;
busybox/binsh/ssl_client 1.37.0-r31; libgcc/libstdc++ 15.2.0-r5;
musl-utils 1.2.6-r2; scanelf 1.3.9-r1.
Die nächsten prüfbaren Arbeiten sind exakte Quellpakete einschließlich
Alpine-Patches und Build-Anweisungen, Lizenztexte und die konkrete Zuordnung
etwaiger GCC-Runtime-Ausnahmen. Diese Nachweise sind noch nicht beigefügt.

Die beiden MEDIUM-Treffer sind MPL bei ca-certificates-bundle und ein
MPL-Text im Frontend-Notice-Dokument. DOMPurify wird laut Bundle-Inventar
über seine Apache-2.0-Alternative verwendet; der mitkopierte MPL-Text beweist
keine Auswahl der MPL für das Bundle. Die OS-Zertifikatskomponente bleibt
separat zu prüfen.

UNKNOWN=6 bedeutet im Runtime-Bericht drei unterschiedliche Labels an
jeweils zwei Pfaden: ICU, LicenseRef-C-Ares, NAIST-2003 in
`/usr/local/LICENSE` und `/app/licenses/Node-LICENSE.txt`.
Die Texte sind vorhanden. Der c-ares-Abschnitt enthält ausdrücklich eine
MIT-Erlaubnis mit Copyright-/Notice-Bedingung; der NAIST-Abschnitt enthält
Erlaubnis-, Copyright- und Disclaimer-Bedingungen. Die Klassifikation wird
nicht durch eine Ignore-Regel versteckt. Die vollständigen Node-Texte samt
Unterabschnitten bleiben erhalten; eine abschließende komponentenspezifische
Lizenz-/Rechteprüfung wird hierdurch nicht ersetzt.

Die 18 UNKNOWN-Build-Treffer umfassen dieselben sechs Node-Texttreffer,
elf BlueOak-1.0.0-Metadatentreffer im globalen npm und rgbcolors kombinierten
Ausdruck. Diese npm-Werkzeuge wurden nicht als Runtime-Pakete erfasst.
rgbcolor ist im Frontend-Inventar bereits mit seiner MIT-Alternative und
dem tatsächlich enthaltenen Lizenztext dokumentiert.

### Image-Identitäten korrekt unterscheiden

Der Docker-Wert aus image-id.txt entspricht laut Build-Log dem OCI-Index:
`sha256:2a631e3dba76ace90cd65391d027f5b0e7815f184b1fe15571551a68bf63a753`.
Der Build exportiert außerdem den Plattform-Manifest-Digest
`sha256:e2aa2eeba057496bc847d7a26459a35dc5a733d9b9225a314ff67f2cdd120e9b`
und den Config-Digest
`sha256:5899168a78f923053b12a13cd953ccfcd87c757a9032e04b15e293bbbf78dc63`.

Metadata.ImageID in beiden Trivy-Berichten und der SBOM stimmt mit diesem
Config-Digest überein. Die beiden Trivy-Berichte haben außerdem denselben
ArtifactID-Wert. Die unterschiedlichen Index-/Config-Werte sind daher
nicht als Gleichheitsvergleich zu verwenden. Diese Korrelation verwendet
Build-Logs und Report-Metadaten; eine separat gespeicherte und kryptografisch
nachgerechnete Index → Manifest → Config-Kette bleibt als zusätzlicher
Release-Nachweis sinnvoll. Ein Registry-Digest wurde in diesem Lauf nicht
gelesen.

### Entscheidung

Technische Inventarisierung und Notice-Erzeugung: VERIFIED für diesen Head.
LICENSE_REDISTRIBUTION_REVIEW: weiterhin REVIEW_OPEN.
Kein Statuswechsel zu deployEligible:true. Kein Scanner-Ignore, keine
pauschale GPL-/LGPL-Freigabe, keine neue Container-Version und kein weiterer
kostenintensiver Workflow-Lauf für diese reine Dokumentationsauswertung.

Weiterhin erforderlich: OS-Source-/Notice-Nachweise, konkrete Ausnahmen,
Bild-/Logo-/Font-Rechte und Provider-Verträge. Das Registry-Lizenzinventar
entsteht erst bei einem später ausdrücklich gestarteten Main-Publish.
