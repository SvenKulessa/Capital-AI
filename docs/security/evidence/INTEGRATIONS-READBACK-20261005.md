# Supabase · Stripe Wrapper · Grafana · OIDC Integrations-Readback

Stand: 2026-10-05  
Primary Domain: PLATFORM  
Security/Compliance: TRUST

## Current Main

`8045c78956e163af3011ed47f734184aca14aa04`

## Supabase

- Projekt: `AIFINANCIAL`
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: `17.11`
- Security Advisor:
  - `auth_leaked_password_protection`: WARN, weiterhin deaktiviert.
  - fünf `rls_enabled_no_policy`: INFO.

### RLS-Klassifikation

Die fünf Advisor-Findings sind **intentional fail-closed** und keine fehlenden Browser-Policies.

Die kanonische Migration `20260901220000_owner_device_authorization.sql` dokumentiert ausdrücklich:

- keine browser-facing Policies,
- RLS aktiviert,
- `anon` und `authenticated` entzogen.

Die Least-Privilege-Migration `20260928055300_owner_authorization_service_role_least_privilege.sql` normalisiert zusätzlich die Rechte:

- `owner_device_credentials`: service_role SELECT/INSERT/UPDATE
- `owner_authorization_challenges`: service_role SELECT/INSERT/UPDATE
- `adr0104_owner_sessions`: service_role SELECT
- `owner_authorization_evidence`: kein direkter service_role Tabellenzugriff
- `owner_authorization_consumptions`: kein direkter service_role Tabellenzugriff

Evidence-/Consumption-Writes bleiben über den vorhandenen SECURITY-DEFINER-RPC gekapselt.

**Entscheidung:** Keine künstlichen RLS-Policies ergänzen, nur um den Advisor INFO zu beseitigen.

## Leaked Password Protection

Das Finding wird separat behandelt. Es ist eine Supabase-Auth-Control-Mutation und wird nicht über SQL oder Repository-Migrationen simuliert.

Zielzustand:

```text
Supabase Auth
  leaked password protection = enabled
  danach Security Advisor = PASS / Finding verschwunden
```

Bis zum providerseitigen Readback bleibt TRUST dafür `PENDING`.

## Stripe Sync Engine / Wrapper

Verifiziert:

- `wrappers 0.6.3`
- `Stripe_wrapper_server`
- Managed Stripe Webhook: `status=enabled`, `livemode=true`
- `stripe-worker`: ACTIVE
- pg_cron ruft `stripe-worker` jede Minute auf.
- Vollständige `_sync_runs` zeigen ungefähr wöchentlichen Full-Sync und keine protokollierten Fehler.

Freshness-Snapshot:

| Objekt | letzter Sync |
|---|---|
| products | 2026-10-04 06:28:22 UTC |
| prices | 2026-10-04 06:28:22 UTC |
| checkout_sessions | 2026-10-03 13:08:51 UTC |
| payment_intents | 2026-10-01 21:23:07 UTC |
| invoices | 2026-10-01 21:21:15 UTC |
| subscriptions | 2026-10-01 21:21:02 UTC |
| customers | 2026-10-01 21:20:13 UTC |

Die älteren Subscription-Zeitstempel sind allein **kein Sync-Fehler**: Produkte/Preise/Checkout-Sessions wurden nach dem letzten Full-Sync inkrementell aktualisiert, während bei Subscriptions kein neuerer replizierter Objektstand vorliegt. Der Minutely Worker und der aktive Managed Webhook sind die laufende Inkrementalstrecke.

## Grafana / Alloy

Ein direkter Grafana-Prometheus-Data-Source-Aufruf auf einen rohen `/metrics`-Exporter ist nicht die kanonische Scrape-Architektur. Der Scrape erfolgt über Grafana Alloy/Prometheus und wird anschließend an Grafana Cloud/Mimir remote-written.

Repository-Konfiguration:

`deploy/grafana-alloy.alloy`

```text
capital-ai.online/metrics
  -> Bearer OBSERVABILITY_TOKEN
  -> Grafana Alloy prometheus.scrape
  -> prometheus.remote_write
  -> Grafana Cloud / Prometheus-compatible backend
  -> Grafana
```

Production-Readback:

- Render-Logs enthalten im geprüften Fenster keinen `/metrics` Request.
- Ein autorisierter `HTTP 200` Scrape ist daher noch nicht bewiesen.
- Fehlende Evidence bleibt fail-closed; kein PASS wird erfunden.

## OIDC / OAuth

CAPITAL-AI unterstützt zusätzlich:

```text
GET /api/auth/login/oidc
  -> Supabase Auth /authorize
  -> custom:<provider>
  -> OAuth Authorization Code
  -> PKCE S256
  -> /api/auth/callback
  -> Supabase session
```

Runtime-Binding:

`SUPABASE_OIDC_PROVIDER=custom:<provider-id>`

Client-ID, Client-Secret, Issuer, Discovery und JWKS bleiben in Supabase Auth. Das Repository speichert diese Werte nicht.

Wenn `SUPABASE_OIDC_PROVIDER` fehlt oder ungültig ist, antwortet der OIDC-Login fail-closed mit `503 oidc_not_configured`.

## Production Gates

Ein Merge oder Branch-Stand ist kein Deployment-Signal. Insbesondere löst diese Arbeit keinen NATS-Redeploy aus.
