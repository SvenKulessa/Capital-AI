# React Hydration – SEO-Spezifikation
**Status:** PROPOSED  
**Arbeitspaket:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Ausgangslage

Der Server injiziert für indexierbare Routen einen öffentlichen SEO-Snapshot direkt in `#root` (`injectPublicSeoSnapshot` in `server/index.mjs`). React `createRoot` ersetzt diesen Inhalt beim Mount. Abweichungen zwischen Server-Snapshot und erstem Client-Render führen zu Hydration-Warnungen.

## Empfohlene Vorgehensweise

### Option 1: Snapshot schlank und stabil halten (bevorzugt)
- Der injizierte Snapshot soll möglichst genau dem ersten Client-Render entsprechen.
- Keine dynamischen Werte (Datum, Zufall, Browser-APIs) im initialen Markup.
- Texte und Struktur zwischen Server-String und Client-JSX angleichen.
- Vorteil: Keine Hydration-Warnungen, SEO-Inhalt bleibt bis zum interaktiven Zustand stabil.

### Option 2: Hydration-Warnungen gezielt behandeln
- Sobald der interaktive Zustand stabil ist, Hydration-Mismatches beheben oder (nur bei unvermeidbaren, nicht-SEO-relevanten Unterschieden) unterdrücken.
- SEO-kritische Elemente (Title, Meta, Canonical, sichtbarer Hauptinhalt) müssen vor und nach Hydration übereinstimmen.
- Keine Unterdrückung, solange SEO-Signale betroffen sind.

## Konkrete Regeln für SEO-kritische Seiten

1. Snapshot enthält nur statische, freigegebene Inhalte.
2. Keine internen Pfade, Drafts oder LICENSE_REVIEW_REQUIRED-Materialien im Snapshot.
3. Canonical und Meta Robots bleiben nach Hydration unverändert.
4. Sichtbarer Hauptinhalt (H1, Beschreibung, Navigation) ist zwischen Server und Client konsistent.
5. Änderungen am Snapshot unterliegen dem Branding-Check.

## Debugging-Referenz

- Browser-Console auf Hydration-Warnungen prüfen.
- View Source vs. gerenderter DOM vergleichen.
- Screaming Frog mit JavaScript Rendering für Raw-vs-Rendered-Vergleich nutzen.

## Status

Konkrete Code-Änderungen bleiben **PROPOSED**, bis ein reproduzierbarer Hydration-Fehler auf einer SEO-kritischen Seite vorliegt. Die Spezifikation dient als Entscheidungsgrundlage für zukünftige Fixes.
