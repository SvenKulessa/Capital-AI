# Open-Source-Werkzeuge für Bundle, Evidence und Qualität

Owner-Vorgabe vom 03.10.2026: Künftige neue Lösungen für Scoring, Evidence, Compliance und Qualität verwenden Open-Source-Werkzeuge. Bestehende produktive Logik wird dadurch nicht automatisch ersetzt. Produktionsaktivierung bleibt separat freigabepflichtig.

## Tatsächlich verwendete Werkzeuge

| Werkzeug | Installierte Version | Lizenz | Verwendung |
| --- | --- | --- | --- |
| Vite / Rolldown | 8.3.1 / 1.2.11 | MIT | Build, dynamische Imports, Chunk-Graph |
| React | 19.3.0 | MIT | Lazy-Views und sichtbarer Suspense-Ladezustand |
| Zod | 4.6.5 | MIT | Strikte Rohdaten-, Konfigurations- und Snapshot-Validierung |
| spdx-expression-parse | 5.0.0 | MIT | Lizenz-Ausdrücke prüfen |
| spdx-license-ids | 3.0.24 | CC0-1.0 | Gepinnte SPDX-Identifierdaten; kein Rechtebeleg |
| Node-Test-Runner / WebCrypto | bestehende Node-Runtime | vorhandenes Node-Lizenzregister | Regressionen, kanonisches JSON und Content-Hashes |

Diese Werkzeuge wurden bereits aus dem vorhandenen Lockfile mit `npm ci --ignore-scripts --no-audit --no-fund` installiert. Für diesen Fix ist kein zusätzlicher Toolkit-Download erforderlich. Lockfile und Dependencies bleiben unverändert; keine neue Datenbank, kein Sidecar und kein kostenpflichtiger Dienst werden eingerichtet.

ORT/ScanCode sind bereits als Report-Adapter integriert; ihre Scannerprogramme sind hier **nicht installiert oder ausgeführt**. SPDX-/CycloneDX- und Trivy-Reports werden ebenfalls als untrusted Evidence gelesen. Original-LICENSE-/NOTICE-Texte, gepinnte Quellen und Hashes stehen unter `docs/licenses/license-engine/`; Imports erteilen keine automatische Freigabe. Scannerzeilen liefern jetzt ausdrücklich `ownerApproved:false`, entsprechend der bestehenden Regression.

## Bundle-Fix

Neun Ansichten in `src/App.tsx` laden per `React.lazy` erst bei Verwendung. Das vorhandene Main-Layout zeigt währenddessen einen zugänglichen Ladezustand. Der globale ErrorBoundary bleibt zuständig für Ladefehler. Keine erzwungene Vendor-Zerlegung von Motion und keine erhöhte Warnschwelle.

Der lokale Build reduziert den App-Chunk von ca. 1.570,88 kB auf ca. 407,51 kB; alle finalen JavaScript-Dateien bleiben unter 500.000 Bytes. Der bestehende statische Cycle-Guard prüft weiterhin den ausgegebenen Importgraphen. Zusätzlich blockiert ein Chunk-Budget große JavaScript-Chunks und erzeugt `bundle-evidence.json`. Der Readback der tatsächlich geschriebenen Dateien mit Größen und SHA-256 steht in `docs/security/evidence/part2-shadow-20261003/bundle-readback.json`. Der Plugin-Graph entsteht vor abschließenden Ausgabeschritten; für endgültige Bytegrößen gilt dieser Dateireadback.

Das behebt die lokale Chunk-Größenwarnung. Ein visuelles Überlagerungsproblem wurde ohne konkrete reproduzierbare Ansicht nicht nachgewiesen. Navigationsregressionen sind keine Browser-Render- oder Produktionslatenzmessung. Erst der neue CI-Build und ein expliziter freigegebener Runtime-Handoff können die spätere Auslieferung nachweisen.

## Evidence und Quality

Rohformeln laufen rein offline ohne proprietären Scoring-Dienst: Wilder-RSI14, SMA20, Z-Score, Bollinger-%B und quotierter Spread. Formeltests, feste Auswertungszeit, vollständige Inputs und unveränderte Rights-Snapshots ermöglichen deterministisches Neuberechnen. Qualität, Normalisierung, empirische Kalibrierung und Komponentenadmission bleiben gesonderte Pflicht-Gates. Alle 50 Komponenten behalten ihren kanonischen Lifecycle; Rohformeln machen sie nicht automatisch ausführbar.

Ein Compliance-Score kompensiert weder fehlende Rechte noch ungültige Provenance. Referenzdatenbanken und SBOMs beschreiben Lizenzinformationen; tatsächliche Verträge, korrespondierende Quellen und Image-Bindung bleiben erforderlich. Die historische Rechte-Evidence wird deshalb nicht auf APPROVED umgeschrieben.

## Verbleibende Distribution-Nachweise

| Scope | Noch benötigte Evidence |
| --- | --- |
| Exaktes Runtime-Image | Attestierter GHCR-Digest, SBOM, Runtime-Digest und eingebetteter Source-SHA |
| OS-Binaries | Korrespondierende Quellen, Patches und Buildinputs mit Auslieferungsweg am selben Digest |
| Marktdaten | Tatsächlicher Plan, Einheit/Region, Dataset/Symbol/Venue und Rechte je Use Case |
| Bilder und Marken | Konkrete Erstellungs-/Nutzungsreferenzen und einschlägige Bedingungen |
| Gesamt-Review | Scope-gebundene tatsächliche Entscheidung statt Scanner-Selbstfreigabe |

Diese Lücken kann eine Open-Source-Datenbank nicht als Vertragsnachweis ersetzen. Technisch belegte Lizenztexte bleiben erhalten; fehlende Nachweise blockieren die jeweils betroffene Distribution/Admission.

Primärquellen: [Vite Build](https://vite.dev/guide/build), [Vite Features](https://vite.dev/guide/features), [SPDX-Lizenzdaten](https://github.com/spdx/license-list-data). Tool-Lizenzen und Versionen wurden zusätzlich an den tatsächlich installierten Paketen und dem bestehenden Lizenzregister gelesen.

Rollback: Lazy-View-Imports und Bundle-Budget im Review-Branch zurücknehmen. Kein DB-/Runtime-Migrationsschritt erforderlich. Evidence-Artefakte werden nicht rückwirkend umgeschrieben.
