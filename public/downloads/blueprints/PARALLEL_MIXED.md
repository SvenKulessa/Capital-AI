# Blueprint PARALLEL_MIXED — Parallel Mixed Multi-Modal Market Intelligence

**Stand:** 2026-10-05  
**Status:** kanonische Architektur-Spezifikation; kein eigenständiges aktives Stripe-SKU verifiziert.

## Zweck

`PARALLEL_MIXED` führt Marktpreis, Orderbook, News und Fundamentals als getrennte Evidence-Familien zusammen. Rohbeobachtungen und Inferenz bleiben strikt unterscheidbar; fehlende Modalitäten reduzieren Coverage bzw. Confidence, statt Fakten zu erfinden.

## Architektur

```text
Ticks ───────┐
L2 Book ─────┼─> Modalitätsadapter ─> Versioned Context / Feature Layer ─> Scoring
News/RSS ────┤                         │
SEC Facts ───┘                         └─> Evidence + Replay
```

Datenkonzepte: **Parallel Mixed**, **Feature Store**, **Event-Sourced Market Data**.

## Voraussetzungen

- L2 Snapshot-/Delta-Vertrag inklusive Sequenzlogik;
- zugelassene News-/RSS-Quellen;
- SEC-EDGAR- oder gleichwertige Fundamentals mit Feld-/Periodenherkunft;
- versionierte Sentiment-/Feature-Inferenz;
- Context Snapshot, der jede Modalität auf Quelle und Zeitpunkt zurückführt.

## Observation vs. Inference

Eine LLM-, NLP- oder Feature-Ausgabe ist keine Rohbeobachtung. Model-ID, Prompt-/Template-Version, Input-Fingerprints und Berechnungszeitpunkt gehören zur Evidence. Gemini oder andere externe Inferenzprovider sind optional und benötigen eigenen Kosten-, Datenschutz- und Providervertrag.

## Failure Modes

- alte Fundamentals werden mit Live-Preis als zeitgleich behandelt;
- News-Duplikate dominieren Sentiment;
- Inferenz wird als Provider-Fact gespeichert;
- eine ausgefallene Modalität wird durch erfundene Defaultwerte ersetzt;
- Rechte für News oder Marktdaten erlauben die geplante Retention nicht.

## Betrieb

Freshness und Zustand je Modalität separat anzeigen. Partial Failure darf nicht als vollständiger Kontext erscheinen. Model-/Prompt-Versionen werden gepinnt und müssen für Replay verfügbar sein.

## Abnahmekriterien

- jede Modalität besitzt eigene Provenienz;
- Observation und Inference sind maschinenlesbar getrennt;
- fehlende Daten senken Confidence oder blockieren den betroffenen Pfad;
- Context Snapshot ist replaybar;
- Rechte-/Retention-Gates je Datenfamilie sind fail-closed;
- keine Modellbehauptung ersetzt fehlende Market Facts.

## Kaufstatus

Am 05.10.2026 war kein aktives eigenständiges Stripe-Produkt/Preisobjekt für `PARALLEL_MIXED` nachweisbar.
