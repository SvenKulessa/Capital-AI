# CAPITAL-AI Universe · Chart-Lernatlas SVG- und Manifest-Konsistenz

**2026-11-16 · GROWTH · Issue #766 · SOLO_MAINTAINER_FLOW@2**

## Beobachteter Befund und Umsetzung

Die bisherige SVG-Komponente `ChartLessonGraphic.tsx` und 52 daraus exportierte `public/learning/charts/*.svg` verwendeten die zwei fachlichen Serienfarben, enthielten aber keine siebenfarbige Universe-Signatur. Das zugehörige Pillow-PNG hatte bereits die separate siebenfarbige Dekoration aus PR #746.

Der Renderer übernimmt nun exakt die kanonischen sieben Farben aus `shared/hub-branding.mjs`. Sie werden als **`aria-hidden` dekorative Kreise** am oberen Rand außerhalb der Diagrammgeometrie ausgegeben. Preislinien, Werte, Stricharten, Indikatoren, Erklärungen und `CHART_LEARNING_SOURCE_SHA` bleiben unverändert. Fehlende, doppelte, zusätzliche oder ungültige Farben werden abgewiesen.

## Generierte und hashgebundene Artefakte

- **52** SVGs mit vollständigem dekorativen Farbspektrum.
- **52** zugehörige `*.media-project.json`-Entwürfe, deren `assets[0].sha256` auf die neu generierten SVG-Bytes verweist.
- `manifest.json` mit allen aktualisierten SVG- und Projekt-SHA-256-Werten.
- `png-manifest.json` mit dem SHA-256 des neuen Quell-Manifests; die bestehenden 52 PNG-Bytes und Bild-Digests wurden **nicht** verändert.
- Die Artefakte wurden in commitgebundenen Git-Bäumen aktualisiert, nach Überprüfung der alten Bytes/Hashes. Der normale `scripts/generate-chart-learning.tsx --check` muss die endgültigen Ausgaben bytegenau bestätigen.

## Prüfpfad

```sh
npm ci --ignore-scripts --no-audit --no-fund
node --import tsx --test src/features/learning/chartLearning.test.tsx
node --import tsx scripts/generate-chart-learning.tsx --check
```

Die existierende `financial-learning-browser.yml` prüft per realem Chromium bei **320/390/1440 CSS-Pixeln**, dass auf der Content-Studio-Seite exakt die sieben sichtbaren SVG-Farben in der ursprünglichen Reihenfolge existieren, dass sie `aria-hidden` sind und dass keine Buddy-/Textüberlagerung oder Horizontalscroll-Regressions auftritt.

**Technischer Status:** Bis zum vollständig positiven CI-Readback des PR-Heads **NOT_PROVEN**. Nach erfolgreicher CI ist nur der überprüfte Draft- und Source-/Hash-Vertrag bestätigt. CADS/Berechtigungen, redaktionelle Freigabe, Urheberrechte, Live-Screenshots und Nutzer-Geräteprüfungen bleiben eigenständig.

## Governance / Grenzen

`publishReady:false`, `networkPolicy:offline`, reine schematische Finanzbildung. Keine Publisher-Bindung, keine neuen Kosten, keine Secrets, keine OAuth-Veränderung, keine Produktivveröffentlichung, kein automatischer Upload. Die Website zeigt eine lokal deklarierte Chart-Dekoration; Deployment und Live-Wirkung sind nicht aus grüner CI ableitbar.

**Rollback:** Revert des Scope-PRs einschließlich der 52 SVGs, der 52 Projekte und beider Manifeste als Einheit, ohne Änderung von Quell-Lerndaten oder PNG-Bytes.
