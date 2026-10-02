# Lizenzierungsengine im Control Center

Primary Domain: PRODUCT. Cross-Domain: TRUST (Nachweisregeln), PLATFORM (Offline-Build).
Basis: main@2150643dae8190fb2f8cd496072a7cc2baa89cfe.

Aufruf: `/control-center?tab=licenses`. Die Engine zeigt den bestehenden,
historisch gebundenen Rechte-Snapshot, dessen Datum/Quellcommit, das aktuelle
Build-Lockfile sowie konkrete fehlende Provider-Vertragsfelder und OS-Quellen.
Sie prüft SPDX-Ausdrücke, benennt Pflichten und importiert Scannerberichte
lokal im Browser. JSON-Export ist möglich. Keine Datei wird hochgeladen oder
persistent im Browser gespeichert. Ein Import ist kein verifizierter Nachweis
für einen GHCR-/Render-Digest. `deployEligible:false` bleibt immer erhalten.

## Kosten und Werkzeugauswahl

Installiert sind spdx-expression-parse 5.0.0 (MIT), spdx-license-ids 3.0.24
(CC0-1.0) und spdx-exceptions 2.5.0 (CC-BY-3.0). Exakte npm-Versionen und
SHA-512-Integritäten stehen im Lockfile und im Herkunftsmanifest. Download
erfolgte über registry.npmjs.org, ohne Installationsskripte. Paket-Repository
und Lizenzmetadaten wurden gelesen. Integritätsprüfung bedeutet nicht, dass
eine unabhängige Signatur- oder vollständige Sicherheitsprüfung vorliegt.

ORT 94.2.0 und ScanCode v32.5.0 sind über JSON-Berichtsadapter angebunden.
Ihre Original-LICENSE-/NOTICE-Texte wurden aus dem jeweiligen unveränderlichen
Git-Commit heruntergeladen; URLs, Git-Blobs und SHA-256 stehen unter
`docs/licenses/license-engine/provenance.json`. Die Scannerprogramme selbst
sind nicht installiert und laufen nicht auf dem Webservice. Zusätzlich können
vorhandene Trivy-Lizenzberichte, CycloneDX- und SPDX-Inventare importiert werden.
FOSSology und Documenso werden nicht als installiert behauptet; neue Dienste,
Vertragssignaturen oder kostenpflichtige Cloud-Funktionen gehören nicht zu
dieser Integration. Alle tatsächlich integrierten Werkzeuge haben keine
Lizenzgebühren. Es werden keine Abos, neuen Dienste oder Scanworkflows angelegt.

## Originaltexte und Attribution

Der Build liefert die archivierten Originaltexte unter `/license-engine/`
aus. Die bestehenden THIRD_PARTY_NOTICES enthalten zusätzlich die Parser-MIT-
Lizenz, AUTHORS, die unveränderten Daten-READMEs und die vollständigen CC0-/
CC-BY-3.0-Texte aus dem gepinnten SPDX-Lizenzdaten-Repository. Die Exceptions-
README nennt die Linux Foundation und ihre Contributors (2010–2015) sowie
Kyle Mitchell. Die Identifierlisten werden unverändert benutzt; die Engine
beansprucht keine SPDX-Zertifizierung. Die erlaubte Verarbeitung im bisherigen
Bundle-Gate ist auf die zwei konkreten Datenpaket-Versionen und Lizenztypen
begrenzt. Andere CC-Lizenzen oder neuere Versionen erhalten keine pauschale
Freigabe. Die Projektlizenz wird dadurch nicht geändert.

## Verträge und Grenzen

- ScanCode: `headers.tool_name=scancode-toolkit`, `files`,
  `detected_license_expression_spdx` bzw. `license_expression_spdx`.
- ORT: `scanner.scan_results[]` mit `provenance` und `summary.license_findings[].license`
  (aktuelles Modell), zusätzlich ältere ID-Gruppierung mit `results[]`.
  Andere ORT-Ausgabeformen sind nicht unterstützt.
- Trivy: `SchemaVersion`, `Results[].Licenses[]`, `Name` und `PkgName/FilePath`.
- CycloneDX: `bomFormat=CycloneDX`, flache `components[].licenses`.
- SPDX: `spdxVersion`, `packages[].licenseConcluded/licenseDeclared`.

Keine vollständige Schema-Zertifizierung oder kryptografische Attestationsprüfung.
Unbekannte Formate, leere Ergebnisse und Dateien über 2 MiB werden abgelehnt.
Maximal 5.000 Ergebniszeilen, 400 Zeichen pro SPDX-Ausdruck und 200 sichtbare
Treffer. Text wird ausschließlich als React-Text gerendert. OR-Verbindungen
verlangen eine dokumentierte Auswahl, AND-Verbindungen die Prüfung aller
Pflichten. Unbekannte Ausdrücke und Lizenzreferenzen bleiben manuell zu prüfen.
Die Engine erteilt keine Provider-/Markenrechte und erfüllt keine GPL-Quellpflicht
allein durch einen Download einer allgemeinen Lizenzdatei.

`npm run license:report` erzeugt einen lokalen Bericht. Der Vite-Hook erzeugt
denselben Bericht und die Texte ohne Netzwerk. Docker übernimmt nur den
expliziten Rechte-Snapshot; andere Security-Dokumente bleiben aus dem Kontext
ausgeschlossen. Private Verträge und deren Inhalte werden nicht veröffentlicht.

## Vier Validierungsschritte

1. Herkunft, gepinnte Versionen, Lockfile-Integritäten und Originaltext-Hashes.
2. Positive/negative SPDX- und Scannerfälle; keine automatische Freigabe.
3. TypeScript, Build, Notices, Docker-Kontext und Server-/Browsergrenze.
4. PR gegen frisches Main prüfen; produktive Digest-/Rechteabnahme separat.

Wiederkehrende Muster werden als begrenzte Prüfregeln und Regressionen festgehalten:
fehlender Originaltext, unbekannter Ausdruck, nicht bestätigter Import und
historischer Snapshot. Produktive unabhängige Self-Healing-Zyklen: 0. Eine
dauerhafte automatische Freigabe nach drei Zyklen ist hier nicht implementiert.
