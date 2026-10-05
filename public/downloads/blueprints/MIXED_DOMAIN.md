# Blueprint MIXED_DOMAIN — Mixed Domain Multi-Asset Ingestion

**Stand:** 2026-10-05  
**Status:** kanonische Architektur-Spezifikation; kein eigenständiges aktives Stripe-SKU verifiziert.

## Zweck

`MIXED_DOMAIN` verbindet heterogene Markt- und Referenzdaten, ohne deren Semantik zu verwischen. Krypto, Aktien und Makro-/Referenzserien behalten eigene Handelszeiten, Einheiten, Währungen, Freshness- und Eligibility-Regeln; ein kanonischer Asset-Master verbindet sie.

## Architektur

```text
Crypto Feeds ─────┐
Equity Feeds ─────┼─> Domain Adapter ─> Asset Master ─> Harmonized Event Bus
Macro/Reference ──┘          │                │
                             └── provenance ──┘
```

Datenkonzepte: **Parallel Mixed**, **Data Mesh / Domain Contracts**, **Reference / Master Data**.

## Voraussetzungen

- kanonischer Asset-Master und belastbare Symbologie;
- zugelassene Datenquelle je Assetklasse und Capability;
- Equity-Adapter mit nachgewiesenen Nutzungsrechten;
- Makro-/Referenzadapter, beispielsweise ECB/FRED oder gleichwertig;
- Normalisierungsvertrag für Currency, Unit, Timestamp, Venue und Trading Calendar.

## Semantik

Eine Statistik- oder Referenzserie darf nicht als Live-Spotpreis ausgegeben werden. 24/7-Kryptohandel darf nicht stillschweigend mit Börsenhandelszeiten gleichgesetzt werden. Jede Observation trägt eine kanonische Asset-ID und die ursprüngliche Provider-/Dataset-Herkunft.

## Rechte- und Trust-Grenzen

Open-Source-Adaptersoftware ist von den Rechten an den transportierten Daten zu trennen. Display, Derived Use, Retention, Replay und Redistribution werden je Dataset/Provider separat zugelassen. Eine technische Normalisierung ist keine Rechtefreigabe.

## Fehlermodi

- Symbolkollisionen zwischen Börsen oder Assetklassen;
- falsche FX-/Währungsnormalisierung;
- Referenzserie wird als handelbarer Spot dargestellt;
- Kalender-/Timezone-Fehler erzeugt falsche Freshness;
- Provider-Quota führt zu unbemerkten Datenlücken.

## Observability

Messen: Mapping-Rejects, Unit-/Currency-Konvertierungen, Calendar-State, Dataset-Freshness, Provider-Quota und Eligibility je Observation. Domain-spezifische Degradierung muss sichtbar bleiben.

## Abnahmekriterien

- kanonische Asset-ID pro Observation;
- Einheit, Währung, Venue und Timestamp explizit;
- Source Admission je Dataset/Capability;
- keine semantische Substitution zwischen Assetklassen;
- fehlende Domänen senken Coverage statt Daten zu erfinden;
- Rights Gate bleibt fail-closed.

## Kaufstatus

Am 05.10.2026 war kein aktives eigenständiges Stripe-Produkt/Preisobjekt für `MIXED_DOMAIN` nachweisbar.
