# Blueprint TIER_1_4_LIVE — Tier 1–4 Live Ingestion & Streaming

**Stand:** 2026-10-05  
**Quelle:** `src/data/studioData.ts`, `deploy/FREE-INFRASTRUCTURE-AND-BLUEPRINTS.md`  
**Status:** kanonische Architektur-Spezifikation; kein eigenständiges aktives Stripe-SKU verifiziert.

## Zweck

`TIER_1_4_LIVE` beschreibt den latenzarmen Live-Pfad für Marktbeobachtungen vom Provider bis zu Browser- und AI-Consumern. Der Entwurf trennt Ingress, Qualitäts-/Conflation-Gate, Fan-out und Delivery. Dadurch werden Provider-spezifische Protokolle nicht direkt an Produktclients gekoppelt.

## Architektur

```text
Provider WebSocket / REST
        │
        ▼
Tier 1 — Ingress
        │  normalize · timestamp · source identity
        ▼
Tier 2 — Tick Gate / 250-ms-Conflation
        │  freshness · sequence · quality
        ▼
Tier 3 — Valkey/Redis-kompatibler Fan-out
        │  bounded hot-state · pub/sub
        ▼
Tier 4 — React / Agent / AI Consumer
```

Verwendete Datenkonzepte: **Tiered Live Data**, **Snapshot + Delta**, **Parallel Homogeneous**.

## Zielwerte

Der Studio-Katalog nennt `< 35 ms`, `99.95 %` SLA und `14,50 € / Monat` als Architektur-/Planwerte. Diese Angaben sind **keine Runtime-Messung, kein Kostenbeleg und keine Zertifizierung**. Production darf nur gemessene Werte ausgeben.

## Technische Voraussetzungen

- zugelassener Quote-Provider für Instrument und konkrete Capability;
- Valkey/Redis-kompatibler Fan-out oder gleichwertige Open-Source-Komponente;
- Heartbeat, Reconnect, Sequenz- und Freshness-Prüfung;
- SSE/WebSocket-Egress mit Backpressure;
- persistenter Evidence-Writer für produktive Score-/Replay-Pfade.

## Security- und Datenrechte-Grenzen

Provider-Auswahl im Builder ist keine Source Admission. Display-, Cache-, Retention-, Replay- und Redistribution-Rechte werden unabhängig geprüft. Shared Cache und Fan-out dürfen keine Rechte erweitern. Credentials gehören niemals in Tick-Payloads, Client-Logs oder Evidence.

## Failure Modes

1. Provider-Stall oder Sequenzlücke.
2. Conflation entfernt eine fachlich relevante Zustandsänderung.
3. Consumer fällt hinter den Producer zurück.
4. Reconnect erzeugt Duplikate oder Gap-Füllung ohne Kennzeichnung.
5. Cache-/Streaming-Nutzung überschreitet zugelassene Datenrechte.

## Observability

Mindestens messen: Provider-Heartbeat, Ingress-Rate, Reconnects, rejected/dropped ticks, Conflation-Rate, Fan-out-Lag, Client-Backpressure und End-to-End-Freshness. Latenzwerte werden immer mit Messpunkt und Sample-Fenster dokumentiert.

## Abnahmekriterien

- reproduzierbarer Ingress → Gate → Fan-out → Client-Pfad;
- kanonische Source-/Instrument-Identität pro Observation;
- Sequenz- und Freshness-Fehler fail-closed oder sichtbar degraded;
- keine Secrets im Datenstrom;
- Rights Gate bleibt unabhängig vom technischen Erfolg fail-closed;
- Replay-/Evidence-Pfad ist für scorefähige Daten nachgewiesen.

## Kaufstatus

Am 05.10.2026 wurde im live gelesenen Stripe-Katalog kein aktives eigenständiges Blueprint-Produkt und kein Blueprint-Preis für `TIER_1_4_LIVE` nachgewiesen. Das Dokument beschreibt deshalb die Architektur, ohne eine separate Kaufbarkeit zu behaupten.
