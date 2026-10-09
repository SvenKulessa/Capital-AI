# Chart-Lernatlas und CADS-Produktvorstellung

Stand: 2026-10-09. Ausgangs-Main: `75b0bae05a5c862e87274adf28a5e4d079c5a87a`.

Finale Synchronisierung: `a157dd5a002a3f47838d8707012e82d53e41be14` inklusive Commerce-Frontend (#312) und HTTP-Discovery-Contract (#314). Beide Testergänzungen bleiben erhalten. Die Testsuite bestand nach dem Sync; das Einstieg-Bundle beträgt nach Lazy-Loading der Content-Engine-Sektion 480,07 kB. Grafikprovenance bleibt an den ursprünglichen authored Source-Snapshot gebunden.

## Ergebnis und Herkunft

Zwölf selbst erstellte Lernbriefs erklären Bull-/Bear-Flags, Wimpel, aufsteigende Dreiecke, Doppeltop/-boden, Schulter–Kopf–Schulter, Unterstützung/Widerstand, RSI, MACD, gleitende Durchschnitte und Volumen. Erkennung, mögliche Bestätigung, Widerlegung und Selbstcheck gehören zu jedem Brief. SVG und PNG tragen sichtbar die Kennzeichnung synthetischer Bildungsinhalte. Indikatorlinien illustrieren Konzepte und sind ausdrücklich keine aus einem Kursfeed berechneten Werte.

- Öffentlicher Einstieg: `/learning?tab=patterns`; Direktbeispiel: `&lesson=macd`.
- Startseite: grafischer Lerneinstieg und CADS-Nutzenbeschreibung mit bestehendem Tarifdialog.
- Content Studio: Beitragsvorschau, SVG-/PNG- und validierte MediaProjectV2-Entwürfe.
- Offline-Generierung: `npm run charts:generate` nutzt vorhandene React-/Pillow-Komponenten.
- Exportprüfung: `npm run test:chart-learning`.

Eigene Texte, Koordinaten und Layouts; keine fremden Chartbilder übernommen. Fachlicher Abgleich mit offiziellen Fidelity- und Schwab-Lernunterlagen am 09.10.2026:

- https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/overview
- https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/RSI
- https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/macd
- https://www.schwab.com/learn/story/how-to-read-stock-charts-and-trading-patterns

Illustrationen unterliegen der bestehenden Repository-/Produktlizenz. Fachliche Quellen verifizieren Lernkonzepte; sie übertragen keine Fremdbild- oder Marktdatenrechte.

## Evidence und Grenzen

Die Kampagne erfüllt den ContentCampaignBrief-Contract. Zwölf MediaProjectV2-Dateien sind validiert und an die konkreten SVG-Hashes gebunden. Manifestdateien enthalten Source-Identität, Formate, Abmessungen, Hashes und Beitragsentwürfe. Öffentliche Dateien enthalten ausschließlich eigene synthetische Beispiele und öffentliche Produkttexte. Keine API-Keys, private Providerantworten, Benutzeridentitäten oder Marktdatenfeeds werden verarbeitet.

Drei neue Tests prüfen Geometrie/Achsen, Textalternativen/SVG-Angriffsfläche, Exportdrift, PNG-Header/Dimensionen/Hashes, MediaProject-Contract, Offline-/Draft-Grenze und CADS-Aussagegrenzen. Sie laufen im bestehenden `npm test`. `npm test`, `npm run lint`, `npm run build`, `npm run test:roadmap` und `npm run verify:browser` bestanden vor der finalen Main-Synchronisierung. Das anfänglich überschrittene 500-kB-Bundle-Limit wurde durch Lazy-Loading der neuen Startseitensektion eingehalten. Das Gate bleibt unverändert.

PNG-Bull-Flag wurde visuell geprüft. Interaktive Mobile-/Desktop-Browserprüfung: NOT_PROVEN, da kein lokales Browserbinary verfügbar ist und der Browserdownload kein gültiges Archiv lieferte. Renderingtests ersetzen keine Browser-E2E.

Kanalveröffentlichung, persistente Redaktion, hashgebundene Publishing-Freigaben, Video-/Codec-Abnahme und Provider-Endzustände bleiben offen. SVG-Rendererprofil im Projekt ist ein Exportvertrag, kein behaupteter produktiver Video-Renderer. MediaProject-Dateien sind kein fertiges Video. Keine Veröffentlichung an externe Social-Konten ausgeführt.

CADS wird als Komponentenvergleich vermarktet, nicht als profitabler Marktscore. `CADS_COMMERCIAL_READINESS` bleibt unverändert: Kauf-/Ausführungs-E2E und Marketplace-Publikation sind nicht nachgewiesen. Die Startseite benennt diese Grenze. Keine neuen Preise, SKUs, Entitlements, Dependencies, kostenpflichtigen Ressourcen oder Providerrechte eingeführt.

## Alternativen, Kosten und Roadmap

Deterministische Charts bilden dieselben erklärbaren Geometrien offline auf Website und Export ab. Generative Bildmodelle wären eine Alternative für Hintergründe, eignen sich hier schlechter für exakte Achsen und können Inference-Kosten verursachen. Solche Dienste wurden nicht aktiviert. Hosting-/CI-Kosten bleiben tarifabhängig; Restquotas sind NOT_PROVEN.

`ROADMAP-CONTENT-INVENTORY-20261009.json` inventarisiert projizierte Pakete. SOC-COPY, SOC-MEDIA und SOC-STUDIO erhalten konkrete Teil-Evidence und bleiben OFFEN. Grafikgeneration schließt weder alle Roadmap-Aufgaben noch den Social-Production-Cutover. Rollback: Revert ohne Datenmigration.
