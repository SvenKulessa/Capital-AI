# Control Center – Unterseiten und barrierearme Navigation

Scope: PRODUCT (Frontend, Navigation, UX); bestehende Server-Owner-Boundary bleibt verbindlich.

## Umsetzung

- Elf vorher als große Tab-Kacheln dargestellte Module sind nun unter jeweils einer eigenen Route `/control-center/<bereich>` verfügbar. Der Einstieg `/control-center` zeigt weiter die Roadmap.
- Die bestehende Navigation auf der Homepage und im Hub-Sideboard verweist auf diese Routen. Frühere Bookmarks wie `/control-center?tab=components` funktionieren weiterhin und zeigen den entsprechenden Bereich.
- Auf schmalen Displays erscheint eine beschriftete native Auswahlliste; auf größeren Screens eine vertikale Navigation mit `aria-current="page"`, Tastaturfokus und ausreichend großen Zielen.
- Jede Route rendert genau ihre vorhandenen Komponenten. Für aktuell noch nicht belegte Module bleibt `DataUnavailable` wahrheitsgemäß sichtbar; es werden keine Produktivdaten oder Aktionen simuliert.
- Das Wechseln der Unterseite aktualisiert URL und Verlauf; Zurück/Vorwärts und Reload behalten die Auswahl. Nach einem Seitenwechsel erhält die Bereichsüberschrift Fokus.
- Die bisherigen Live-Dashboards (Roadmap, CADS, Toolkatalog, Observability, News und Lizenzen) bleiben angebunden. Die komponentenbezogene Status-Tabelle wird nur noch in Console und System gezeigt.
- Serverseitig ist jede `/control-center/*`-Anfrage weiterhin Owner-only, auch bei direktem Reload. Die SEO-Policy behandelt sämtliche Unterseiten als `PRIVATE`.

## Tests und Grenzen

Regressionstests: `npm run test:navigation` (kanonische Routen, bestehende Query-Deep-Links, Navigation, PRIVATE-/Owner-Gates). Ergänzend `npm run lint` und `npm run build` sowie vorhandene Required GitHub Checks im Pull Request.

Keine neuen Dependencies, externen APIs, kostenpflichtigen Ressourcen oder geänderten Berechtigungsrollen. Navigation ersetzt keine serverseitige Autorisierung.

- Die optionale Breadcrumb-Navigation wird separat geladen, damit die Hauptanwendung ihr bestehendes 500-kB-JavaScript-Budget einhält, ohne Budgetgrenzen oder Sicherheitsprüfungen zu lockern.


## Ergänzung 24.11.2026 — Roadmap und Datenhygiene

Die bestehende Roadmap projiziert die allgemeinen Planungsaufgaben aus `src/data/publicSurfaceDeliveryPlan.json` über `src/data/publicSurfaceAuditRoadmap.ts` auf kanonische Arbeitspakete; die 105 historischen Paketquellen bleiben erhalten. Die Code-Hygiene umfasst gemeinsame Owner-Präsentationsprüfung, abgebrochene/fehlgeschlagene Readbacks ohne alte Snapshot-Anzeige, begrenztes sichtbarkeitsabhängiges Polling und Validierung des Lizenzinventars. Die Serverautorisierung bleibt maßgeblich. Keine vertraulichen Findings, neuen Freigabestufen oder behauptete Produktionsabnahme. Die unabhängigen Detailabnahmen der elf Unterseiten sowie der Audit-Teilaufgaben bleiben offen; die bestehenden Tests und realen Runtime-Readbacks sind maßgeblich.

Die Repository-Readback-Hülle für Roadmap und Toolkatalog wird gemeinsam validiert (Repository, SHA, Zeitstempel und Freshness). Gecachte oder veraltete Daten bleiben als solche gekennzeichnet; fehlgeschlagene Anfragen entfernen den bisherigen Snapshot. Die bestehende Browser-QA bleibt synthetisch; produktiver Owner- und Screenreader-Nachweis sind davon getrennt.
