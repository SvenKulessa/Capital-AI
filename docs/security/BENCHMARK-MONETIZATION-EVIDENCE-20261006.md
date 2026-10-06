# Benchmark-Monetarisierung — Subscription- und Runtime-Evidence 2026-10-06

Primary Domain: TRUST
Cross-Domain: PRODUCT / PLATFORM

## Current-Main-Basis

- Repository: `SvenKulessa/Capital-AI`
- Startbasis: `c13de16d8af006c37b08db616d1016173c99e7db`
- Root-Policy: `AGENTS.md@currentmain`

## Supabase Subscription Sync

Produktiv angewendete Migration:

`20261006072600_sync_stripe_subscription_catalog_v2`

Ziel:
- `metadata.plan_id` bleibt primäre Tier-Autorität.
- Fallback verwendet ausschließlich die sechs aktuellen Stripe-Price-IDs aus dem kanonischen Billing-Katalog.
- Metadata-/Price-Konflikt wird auf `Free` heruntergestuft.
- unbekannte aktive/trialing Subscription ohne belastbare Zuordnung wird `Free`.
- nicht aktive/trialing Subscription wird `Free`.
- kein Default auf Pro/Enterprise.
- trigger-only SECURITY DEFINER bleibt für `public`, `anon`, `authenticated` und `service_role` nicht direkt ausführbar.

Targeted Live-Readback:
- `search_path=pg_catalog`
- alle sechs aktuellen Price-IDs in der Function vorhanden
- Conflict-Guard vorhanden
- `Free` Fail-Closed vorhanden

Der Supabase-MCP zeigte während großer `execute_sql`-Readbacks intermittierend FGA-/Protocol-Fehler. Deshalb werden große synthetische Assertions zusätzlich deterministisch im Repository getestet; daraus wird kein erfolgreicher Live-Test erfunden.

## Security Advisor

Nach der Migration wurden keine neuen Function-spezifischen Findings ausgewiesen. Bestehende separate Findings bleiben sichtbar:
- sechs RLS-Tabellen ohne Policy: INFO
- Leaked Password Protection deaktiviert: WARN

Diese Findings werden durch die Benchmark-Monetarisierung weder geschlossen noch unterdrückt.

## Benchmark Run API

Der neue API-Slice ist fail-closed vorbereitet:

- `GET /api/benchmark/readiness`
- `POST /api/benchmark/runs`
- `GET /api/benchmark/runs/:id`
- `GET /api/benchmark/history`

Grenzen:
- Tier ausschließlich über `auth.resolvePaidTier()`.
- Request kann keinen Tier setzen.
- Starter: Standardprofil + direkter Run-Status.
- Pro/Enterprise: zusätzlich History gemäß `BENCHMARK_TIERS`.
- nur `CAPITAL_AI_EVENT_BACKBONE@1` ist zunächst erlaubt.
- Repository und 40-stelliger Git-SHA sind Pflicht.
- ohne persistenten Store ist API trotz Feature-Flag nicht aktiviert.
- kein Runner ist gebunden; Readiness meldet `executionBound=false`.
- Store-Ausfall führt zu 503.
- API erteilt nie Production-/Decision-Freigabe.

## Usage / Cost

`CAPITAL_AI_BENCHMARK_USAGE@1` definiert die spätere Mess-Evidence für:
- Wall Time
- CPU Time
- Peak Memory
- Disk Writes
- Network Bytes
- Compute-/Storage-/Network-/Gesamtkosten in EUR
- Pricing-Evidence-Referenzen
- Credit-Kalibrierung

Bis reale Runner-Messungen vorliegen:
- `measurementStatus=PENDING`
- keine erfundenen EUR-Kosten
- keine erfundenen Starter/Pro/Enterprise Monatscredits
- `productionEligible=false`
- `decisionEligible=false`
