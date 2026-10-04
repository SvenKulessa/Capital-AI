# CADS Pipeline Observability & Self-Healing

Stand: 2026-10-05  
Primary Domains: PLATFORM + TRUST  
Market-data semantics: MARKET

## Ziel

CADS erzeugt eine evidenzgebundene Fehlerlokalisierung pro Pipeline-Schicht. Ein Fehler wird nicht nur als "Pipeline down" klassifiziert, sondern mindestens nach `layer / service / operation / errorClass / duration`.

Keine Telemetrie darf Secrets, Tokens, Cookies, API-Keys, private Keys oder rohe sensible Provider-Payloads als Evidence speichern.

## Kanonische Layer

| Layer | Typische Authority | CADS-Messung | Fehlerklassen |
|---|---|---|---|
| ingress | Provider/Adapter | Provider fetch / websocket ingest | DNS, TIMEOUT, CONNECTIVITY, AUTH |
| normalization | Contract/Schema | parse/normalize/validate | DATA_VALIDATION |
| scoring | Enterprise Scorer | canonical score HTTP / engine | SCORING, TIMEOUT, DATA_VALIDATION |
| stream | NATS JetStream | publish + ack | STREAM_EVIDENCE, AUTH, TIMEOUT |
| cache | Valkey (Redis protocol) | read/write/pubsub | CACHE_PUBSUB, CONNECTIVITY |
| storage | JetStream file store / Supabase when applicable | replay / persistence | STREAM_EVIDENCE, DATA_VALIDATION |
| api | Capital-AI HTTP | request duration/status | TIMEOUT, UNKNOWN |
| presentation | Browser/Chart/UI | synthetic browser/render evidence | PRESENTATION/UNKNOWN |

Die Server-Runtime instrumentiert bereits NATS-Verbindung, Valkey-Verbindung, Quote-/Score-Publish-Acks, Cache-/PubSub-Zugriffe, JetStream-Replay und den kanonischen Scorer-Aufruf. HTTP wird über `CAPITAL_AI_OPERATIONAL_TELEMETRY@1` gemessen.

## Evidence-Form

Runtime-Ereignis:

```json
{
  "schema": "CAPITAL_AI_CADS_EVENT@1",
  "layer": "stream",
  "service": "nats-jetstream",
  "operation": "score.publish_ack",
  "correlationId": "bounded-non-secret-id",
  "durationMs": 12.4,
  "outcome": "ok"
}
```

Fehler speichern nur die Fehlerklasse, niemals den ursprünglichen Secret-/Payload-Inhalt.

Aggregierte Evidence ist geschützt verfügbar über:

- Prometheus: `GET /metrics`
- JSON: `GET /api/internal/cads`

Beide verwenden dasselbe `OBSERVABILITY_TOKEN`-Gate.

## Grafana-Anbindung

Grafana ist **kein zweiter Telemetrie-Authority-Pfad**. CAPITAL-AI exportiert weiterhin ausschließlich den bestehenden Prometheus-kompatiblen `/metrics`-Contract; Grafana beziehungsweise ein Prometheus-kompatibler Collector konsumiert diesen Endpoint.

Verbindliche Regeln:

- `OBSERVABILITY_TOKEN` bleibt ein Runtime-Secret und wird nur in der Zielumgebung gesetzt.
- Der Endpoint bleibt fail-closed: ohne gültigen Bearer-Token wird `404` zurückgegeben.
- Keine Grafana API Keys, Cloud Access Policies, Datasource-Credentials oder Remote-Write-Secrets werden im Repository gespeichert.
- Eine spätere Einführung von Grafana Alloy/OpenTelemetry Collector ist eine eigene Runtime-/Kosten-/Security-Entscheidung und nicht Bestandteil dieser Bindung.
- Dashboards dürfen nur aggregierte, begrenzte Metriken konsumieren; rohe Auth-, Billing-, Provider- oder Benutzer-Payloads bleiben ausgeschlossen.

Damit bleibt die Observability-Kette:

```text
CAPITAL-AI Runtime -> /metrics (Bearer Gate) -> Prometheus-kompatibler Scraper -> Grafana
```

## Supabase Stripe Wrapper

Der Supabase Stripe Wrapper ist eine **read-only Reconciliation-, Reporting- und Observability-Quelle**. Er ersetzt weder Stripe Checkout noch verifizierte Stripe Webhooks als autoritative Payment-/Entitlement-Quelle.

Aktuell verifizierte Boundary:

- Supabase PostgreSQL: 17.11
- `wrappers`: 0.6.3
- Foreign Server: `Stripe_wrapper_server`
- Schema: `stripe`
- Tabellenrechte auf `stripe.*`: ausschließlich `postgres`; keine Grants an `anon`, `authenticated` oder `service_role`
- vorhandene replizierte Kernobjekte: Produkte, Preise, Subscriptions, Checkout Sessions und Active Entitlements

Verbindliche Authority-Trennung:

```text
Checkout / Payment Mutation -> Stripe API
Event Authority             -> verifizierte Stripe Webhooks
Application Entitlements    -> Supabase Application Schema / RPC
Reconciliation / Reporting  -> Supabase Stripe Wrapper (read-only)
```

Ein Grant von `service_role` oder Browser-Rollen auf `stripe.*` ist **keine Routineintegration**, sondern eine Security-Boundary-Mutation und benötigt eine separate, explizite Owner-Freigabe sowie Least-Privilege-Evidence.

## Supabase 17.11 Post-Upgrade Readback

Der Production-Readback bestätigt PostgreSQL 17.11. Für die Supabase-17.11-Hinweise wurde zusätzlich geprüft:

- UTF-8 / ICU ist aktiv.
- Es existieren keine `ltree`-Indizes, daher ist kein `ltree`-Reindex erforderlich.
- `btree_gist` ist installiert, aber es existieren keine GiST-Float-Indizes, daher ist hierfür kein Reindex erforderlich.
- `pgcrypto` ist installiert; legacy-cipher-spezifische Nutzdaten werden durch diese Repository-Bindung nicht automatisch verändert.
- Supabase Security Advisor meldet weiterhin `auth_leaked_password_protection` als WARN sowie fünf RLS-Tabellen ohne Policies; diese Findings sind getrennt von der Stripe-/Grafana-Anbindung zu behandeln.

## Datenleck-Erkennung

Telemetry-Redaction greift sowohl auf sensible Schlüsselnamen als auch auf offensichtliche Secret-Wertformen, insbesondere Bearer-Werte, JWTs, private PEM-Keys und URLs mit eingebetteten Zugangsdaten.

Nur die Anzahl der Redactions wird als `capital_ai_telemetry_redactions_total` exportiert. Ein Secretwert selbst ist niemals Diagnose-Evidence.

## Release-Gate

`CAPITAL_AI_RELEASE_READINESS@1` bleibt fail-closed. Für einen Live-Deploy sind gleichzeitig erforderlich:

1. Source SHA = Current Main.
2. Required Checks = PASS.
3. Authentifizierte NATS-Verbindung + JetStream-Evidence = PASS.
4. Valkey/Redis-Protokoll-Verbindung = PASS.
5. Vollständiger Pipeline-Scope `FULL_PIPELINE` mit mindestens 600 Samples.
6. p95 < 200 ms **und** max < 200 ms.
7. 0 Data-Leak-Findings.
8. CADS-Abdeckung für ingress, normalization, scoring, stream, cache, storage, api und presentation.
9. Mindestens 100 gleichzeitig scorebare Assets je kanonischer Assetklasse:
   - crypto
   - equity_us
   - equity_eu
   - commodities
   - forex
   - fixed_income
10. Exakte immutable GHCR-Referenz `ghcr.io/svenkulessa/capital-ai@sha256:...`.
11. Production-Handoff = PASS.

Fehlende Evidence ist kein PASS.

## NATS / SSH

Render-SSH und NATS-Clientauthentifizierung sind getrennte Trust Boundaries. Ein im Render-Account hinterlegter SSH Public Key autorisiert administrativen SSH-Zugang und ersetzt oder verändert `NATS_TOKEN` nicht.

Ein neuer Repository-HEAD löst keinen NATS-Redeploy aus.

## Self-Healing

Ein automatischer Fix wird nur aus wiederholbarer Evidence abgeleitet:

```text
DETECT -> CORRELATE -> CLASSIFY -> REMEDIATE -> VERIFY
```

- unbekannte Fehlerklasse: beobachten / manuelles Review;
- bekannte Low-Risk-Reparatur: erst nach 3 unabhängigen positiven Validierungszyklen promoten;
- Security-, Lizenz-, Auth-, DNS-, Secret-, Billing- und Production-Änderungen bleiben manuell;
- jeder Patch bindet vorher/nachher Source SHA, Image-Digest, betroffene Layer und Regressionsevidence;
- fehlgeschlagene Verifikation führt zum Rollback-Kandidaten, nicht zur Unterdrückung des Findings.

## Aktueller Release-Status

Die vorhandene Top-400-Evidence betrifft Krypto und ist kein Nachweis für 100 Assets je kanonischer Assetklasse. Render-Control-Plane-Evidence bestätigt NATS als laufenden Dienst und Valkey als verfügbar; ein authentifizierter App->NATS->JetStream->Valkey Full-Pipeline-Lauf unter 200 ms ist separat nachzuweisen, bevor `deployAllowed=true` möglich ist.
