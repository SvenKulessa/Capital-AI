# Control Center – Unterseiten und barrierearme Navigation

Scope: PRODUCT (Frontend, Navigation, UX); bestehende Server-Owner-Boundary bleibt verbindlich.

## Umsetzung

- Elf vorher als große Tab-Kacheln dargestellte Module sind nun unter jeweils einer eigenen Route \`/control-center/<bereich>\` verfügbar. Der Einstieg \`/control-center\` zeigt weiter die Roadmap.
- Die bestehende Navigation auf der Homepage und im Hub-Sideboard verweist auf diese Routen. Frühere Bookmarks wie \`/control-center?tab=components\` funktionieren weiterhin und zeigen den entsprechenden Bereich.
- Auf schmalen Displays erscheint eine beschriftete native Auswahlliste; auf größeren Screens eine vertikale Navigation mit \`aria-current="page"\`, Tastaturfokus und ausreichend großen Zielen.
- Jede Route rendert genau ihre vorhandenen Komponenten. Für aktuell noch nicht belegte Module bleibt \`DataUnavailable\` wahrheitsgemäß sichtbar; es werden keine Produktivdaten oder Aktionen simuliert.
- Das Wechseln der Unterseite aktualisiert URL und Verlauf; Zurück/Vorwärts und Reload behalten die Auswahl. Nach einem Seitenwechsel erhält die Bereichsüberschrift Fokus.
- Die bisherigen Live-Dashboards (Roadmap, CADS, Toolkatalog, Observability, News und Lizenzen) bleiben angebunden. Die komponentenbezogene Status-Tabelle wird nur noch in Console und System gezeigt.
- Serverseitig ist jede \`/control-center/*\`-Anfrage weiterhin Owner-only, auch bei direktem Reload. Die SEO-Policy behandelt sämtliche Unterseiten als \`PRIVATE\`.

## Tests und Grenzen

Regressionstests: \`npm run test:navigation\` (kanonische Routen, bestehende Query-Deep-Links, Navigation, PRIVATE-/Owner-Gates). Ergänzend \`npm run lint\` und \`npm run build\` sowie vorhandene Required GitHub Checks im Pull Request.

Keine neuen Dependencies, externen APIs, kostenpflichtigen Ressourcen oder geänderten Berechtigungsrollen. Navigation ersetzt keine serverseitige Autorisierung.
