# Blueprint INDIVIDUAL_PACKAGE — Individual Analysis Package Contract

**Stand:** 2026-10-05  
**Status:** kanonische Architektur-Spezifikation; kein eigenständiges aktives Stripe-SKU verifiziert.

## Zweck

`INDIVIDUAL_PACKAGE` ist ein Contract-First-Blueprint für Analysefunktionen, die gezielt wenige, hochwertige Inputs benötigen. Beim Buffett-/Piotroski-Pfad sind periodengenaue Fundamentals, Restatements und nachvollziehbare Formeln wichtiger als ein permanenter Tickstream.

## Architektur

```text
Fundamentals / SEC Facts
          │
          ▼
Period + Restatement Gate
          │
          ▼
Versioned Features / Formulas
          │
          ▼
Screener Read Model / Cache
          │
          ▼
Buffett / Piotroski UI
```

Datenkonzepte: **Individual Analysis Package**, **CQRS / Projection**, **Reference / Master Data**.

## Voraussetzungen

- Fundamentals-Quelle mit Feld-, Perioden- und Restatement-Semantik;
- versionierte Formeln und Feature-Historie;
- Screener Read Model mit Input-Fingerprint;
- expliziter Missing-Data-Vertrag;
- Source Admission je Fundamental-Feld bzw. Dataset.

## Semantik

Ein `Moat Rating` oder eine Qualitätsklasse ist eine abgeleitete Inferenz und keine SEC-Fact. Fehlende ROE-, FCF-, ROIC-, Debt- oder DCF-Inputs dürfen nicht durch Marktpreise oder generische Defaults ersetzt werden. Restatements invalidieren abhängige Projektionen nachvollziehbar.

## Failure Modes

- Quartal/Jahr oder Periodenende falsch ausgerichtet;
- Restatement aktualisiert die Projektion nicht;
- eine abgeleitete Kennzahl verliert ihren Input-/Formula-Bezug;
- Cache liefert ein Ergebnis für einen veralteten Input-Fingerprint;
- fehlende Fundamentals werden als „0“ statt „unavailable“ behandelt.

## Betrieb

Für jede Kennzahl werden Formula-Version, Input-IDs, Perioden, Restatement-Status und Ergebnis-Fingerprint geführt. Cache-Hits sind nur bei unverändertem Input-Fingerprint zulässig.

## Abnahmekriterien

- minimaler Datenvertrag ist vollständig und maschinenlesbar;
- jede Kennzahl ist auf konkrete Inputs zurückführbar;
- Restatement-Replay ist reproduzierbar;
- Missing Data erzeugt keine erfundenen Werte;
- kein Tickstream-Zwang für fundamentale Analyse;
- Rechte- und Provenance-Gates bleiben unabhängig fail-closed.

## Kaufstatus

Am 05.10.2026 war kein aktives eigenständiges Stripe-Produkt/Preisobjekt für `INDIVIDUAL_PACKAGE` nachweisbar.
