# Blueprint HYBRID — Hybrid Real-Time & Historical Data Plane

**Stand:** 2026-10-05  
**Status:** kanonische Architektur-Spezifikation; kein eigenständiges aktives Stripe-SKU verifiziert.

## Zweck

`HYBRID` verbindet Live-Observations, Hot-State und persistente Historie hinter einer gemeinsamen Query-Grenze. Der Client soll erkennen können, ob ein Wert aus Live-Ingress, Cache, historischer Speicherung oder einer berechneten Projektion stammt.

## Architektur

```text
Live Provider
     │
     ▼
Ingress / Normalize
     │
     ├──> Hot State (Valkey / Ring Buffer)
     │
     └──> Persistent History (PostgreSQL / optional Timeseries Extension)
                         │
                         ▼
               Versioned Features
                         │
                         ▼
                  Query Gateway
```

Datenkonzepte: **Hybrid Data Architecture**, **Time-Series Architecture**, **Feature Store**.

## Voraussetzungen

- persistente OHLCV-/Feature-Historie;
- versionierte Aggregations- und Feature-Regeln;
- Hot-State mit definiertem TTL-/Retention-Vertrag;
- Query-Grenze mit expliziter Source- und Freshness-Semantik;
- idempotenter Backfill und Restatement-Verarbeitung.

## Storage-Entscheidung

Für einen kleinen Pilot reicht PostgreSQL grundsätzlich aus; TimescaleDB oder eine andere Timeseries-Erweiterung ist nicht automatisch Voraussetzung. Die Wahl richtet sich nach Messdaten, Query-Profil, Retention und Betriebsaufwand. Vorhandene Live Quotes belegen keine vollständige Historie.

## Rechte- und Trust-Grenzen

Ein Cache erweitert keine Provider-Rechte. Retention, Replay, Shared Cache und abgeleitete Features benötigen jeweils die zulässige Rechtekette. Historische Werte behalten Provider, Originaltimestamp, Ingesttimestamp, Formula-/Feature-Version und gegebenenfalls Restatement-Information.

## Fehlermodi

- staler Hot-State maskiert eine neuere persistente Observation;
- History-Gaps werden als echte Nullwerte interpretiert;
- Formel- oder Schemaänderungen brechen reproduzierbares Replay;
- Backfill überschreibt neuere Daten ohne Versionslogik;
- TTL/Retention widerspricht dem Datenrechtsvertrag.

## Observability

Messen: Cache Hit/Miss, Staleness, Query-Latenz, Backfill-Lag, Restatement-Anzahl, History-Gaps, Feature-Version und Storage-Fehler. Ein Performance-Ziel gilt erst nach realer Messung.

## Abnahmekriterien

- jede Antwort besitzt Source- und Freshness-Metadaten;
- Backfill ist idempotent und restatement-aware;
- Feature-/Formula-Version ist nachvollziehbar;
- Historie lässt sich mit gebundener Konfiguration replayen;
- Retention entspricht den Datenrechten;
- Cache-Fallback erzeugt keinen stillen Qualitätsupgrade.

## Kaufstatus

Am 05.10.2026 war kein aktives eigenständiges Stripe-Produkt/Preisobjekt für `HYBRID` nachweisbar. Die Spezifikation wird deshalb nicht als separat kaufbar bezeichnet.
