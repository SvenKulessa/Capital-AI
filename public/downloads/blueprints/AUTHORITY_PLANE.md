# Blueprint AUTHORITY_PLANE — Authority Plane & Consensus Evidence

**Stand:** 2026-10-05  
**Status:** kanonische Architektur-Spezifikation; kein eigenständiges aktives Stripe-SKU verifiziert.

## Zweck

`AUTHORITY_PLANE` erzeugt aus mehreren tatsächlich vergleichbaren Provider-Facts einen nachvollziehbaren kanonischen Snapshot. Die Authority-Schicht liegt vor dem Scoring: erst nach Identitäts-, Qualitäts- und Quorum-Prüfung darf eine Beobachtung als kanonischer Input weitergereicht werden.

## Architektur

```text
Provider A ─┐
Provider B ─┼─> Identity + Normalization Gate
Provider C ─┘            │
                         ▼
                 Consensus / Median
                         │
                 Outlier + Quorum
                         │
                         ▼
          Canonical Snapshot + Evidence
                         │
                         ▼
                    Scoring / Replay
```

Datenkonzepte: **Authority & Evidence**, **Event-Sourced Market Data**, **Bitemporal Data**.

## Identitätsregel

Konsens ist nur sinnvoll, wenn Instrument, Venue, Quote Currency, Contract-Typ und Zeitbezug kompatibel sind. `BTCUSD` und `BTCUSDT` dürfen nicht allein wegen ähnlicher Preisbewegung als homogene Konsensquellen behandelt werden.

## Voraussetzungen

- mindestens drei vergleichbare Provider-Facts für den vorgesehenen Authority-Modus;
- kanonisches Instrument-/Venue-/Währungs-Mapping;
- persistenter Evidence- und Konfigurationsspeicher;
- idempotente Outbox bzw. Replay-Projektion;
- versionierte Quorum-, Median- und Outlier-Regeln.

## Zielwerte und Claims

Studio-Angaben wie `42 ms`, `99.99 %` und `22,00 € / Monat` sind Design-/Planwerte. Ein SHA-/HMAC-/Hash-Fingerprint belegt Integrität einer gespeicherten Repräsentation, **nicht** Wahrheit, Unabhängigkeit der Quellen, Datenrechte oder regulatorische Konformität.

## Fehlermodi

- falsch gemappte Symbole bilden ein künstliches Quorum;
- mehrere Provider beziehen Daten aus derselben Upstream-Quelle;
- ein echter Marktmove wird als Outlier verworfen;
- Evidence referenziert eine andere Konfiguration als der Score;
- Replay nutzt geänderte Regeln ohne Versionsbindung.

## Betrieb und Observability

Pro Entscheidung werden Provider-Set, Instrumentidentität, Timestamp, Freshness, Abweichung, Quorum, Resolver-Version, Outcome und Snapshot-ID protokolliert. Degraded Quoren bleiben sichtbar und dürfen nicht stillschweigend als Full Authority erscheinen.

## Abnahmekriterien

- identitätsgebundenes Quorum;
- deterministische Entscheidung bei gleichen Inputs und gleicher Konfiguration;
- Canonical Snapshot unveränderbar referenzierbar;
- Replay reproduziert denselben Authority-Entscheid;
- Scoring stoppt bei unzureichender Authority;
- Source-Admission- und Datenrechte-Gates bleiben separat fail-closed.

## Kaufstatus

Am 05.10.2026 war kein aktives eigenständiges Stripe-Produkt/Preisobjekt für `AUTHORITY_PLANE` nachweisbar. Daher wird keine separate Kaufbarkeit behauptet.
