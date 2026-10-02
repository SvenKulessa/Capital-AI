# CADS Pipeline Observability & Self-Healing

Stand: 2026-10-02  
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
