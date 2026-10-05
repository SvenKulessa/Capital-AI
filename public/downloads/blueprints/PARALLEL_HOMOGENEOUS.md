# Blueprint PARALLEL_HOMOGENEOUS — Parallel Homogeneous Redundant Consensus

**Stand:** 2026-10-05  
**Status:** kanonische Architektur-Spezifikation; kein eigenständiges aktives Stripe-SKU verifiziert.

## Zweck

`PARALLEL_HOMOGENEOUS` führt mehrere Feeds für dasselbe fachliche Instrument parallel und wählt bzw. bewertet sie anhand von Freshness, Gesundheit und optionalem Consensus. Ziel ist robuste Verfügbarkeit, ohne „schnellster Feed“ automatisch mit „richtiger Feed“ gleichzusetzen.

## Architektur

```text
Feed A ─┐
Feed B ─┼─> Normalize + Identity Gate ─> Health/Freshness Resolver ─> Canonical Feed
Feed C ─┘                                   │
                                            └─> degraded / failover evidence
```

Datenkonzepte: **Parallel Homogeneous**, **Authority & Evidence**, **Snapshot + Delta**.

## Voraussetzungen

- mindestens zwei unabhängige, zugelassene Feeds;
- identisches Instrument-/Venue-/Contract-Mapping;
- Heartbeat, Circuit Breaker und Reconnect-Regeln;
- Sequenz- und Timestamp-Normalisierung;
- definierte Resolver-Prioritäten und Degraded-Zustände.

## Trust-Grenzen

Fastest-Wins ist keine Wahrheitsgarantie. Ein Failover darf weder Datenrechte noch Capability Gates umgehen. Verschiedene Venues oder Quote-Währungen bleiben sichtbar und werden nicht nur wegen ähnlicher Symbole als homogen klassifiziert.

## Failure Modes

- schnellster Feed ist stale oder fachlich falsch;
- Clock Skew verzerrt den Resolver;
- mehrere Feeds hängen am selben Upstream;
- reconnectende Feeds erzeugen Duplikate;
- Failover wechselt zu einer Quelle ohne passende Rechte.

## Betrieb

Provider-Latenz, Heartbeats, Resolver-Entscheidungen, Failover-Häufigkeit, Quorumqualität und Degraded-Dauer werden als Evidence geführt. Jeder Wechsel behält Provider-/Venue-Herkunft.

## Abnahmekriterien

- deterministisches Failover bei gleichem Health-State;
- keine doppelte Canonical-Publikation;
- Degraded-Zustand wird sichtbar, nicht verschleiert;
- Provider-/Venue-Herkunft bleibt erhalten;
- Rights Gate bleibt für jede Quelle separat aktiv;
- Sequenz- und Freshness-Lücken sind nachvollziehbar.

## Kaufstatus

Am 05.10.2026 war kein aktives eigenständiges Stripe-Produkt/Preisobjekt für `PARALLEL_HOMOGENEOUS` nachweisbar.
