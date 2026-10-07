# Durable private-provider guards

The owner selected Supabase/PostgreSQL as the durable authority for private-provider
replay, per-user execution rate and user/global cost guards. Valkey remains
cache/PubSub and is not authoritative for these protections.

The Node executor verifies the signed envelope and read-only operation contract,
then calls one server-only Supabase RPC before Vault/provider access. Storage,
timeout, malformed or uncertain results fail closed. Unknown commits are not
automatically retried because a second attempt could duplicate provider execution.

## Live migration

The reviewed SQL is live as Supabase migration:

`20261007214554_provider_query_guard`

Repository source:

- `supabase/proposals/provider_query_guard.sql`
- `supabase/migrations/20261007214554_provider_query_guard.sql`

Both files have the same Git blob
`66c642ccac580b761b7ef3bcc68dd236ccd46d16`. CI verifies byte identity and
least-privilege SQL properties.

Live PostgreSQL readback confirmed RLS on
`private.capital_ai_provider_query_state`, no RPC EXECUTE for `anon` or
`authenticated`, bounded table/RPC authority for `service_role`, SECURITY
INVOKER, empty `search_path` and `lock_timeout=1500ms`. Supabase advisors
reported no guard-specific security or performance finding.

## True concurrent PostgreSQL evidence

The already-installed `pg_cron 1.6.4` module was used only as a short-lived test
harness so separate PostgreSQL sessions could start concurrently without exposing
database credentials.

First-pair start deltas:

- replay: 1.173 ms
- rate: 2.258 ms
- shared cost: 1.225 ms

Observed state proved atomic admission:

- replay produced exactly one live replay claim and one admitted rate use;
- rate limit 1 left the shared rate counter at 1, with one replay winner and one
  denied replay placeholder at 0;
- shared global cost was consumed once; the winning replay/rate/user-cost markers
  became 1 while all corresponding denied-request markers stayed 0.

Therefore a denied global cost claim does not partially consume replay, rate or
user-cost state.

## Real lock-timeout evidence

A separate PostgreSQL session held the target rate row for three seconds. A caller
started 2.628 ms later, delayed 200 ms, then invoked the guard RPC. PostgreSQL
cancelled the guard at the configured lock timeout with
`canceling statement due to lock timeout`.

The aborted transaction created no replay claim and left the rate counter at 0.
This demonstrates transactional rollback under real row contention. The Node
adapter separately maps timeout/storage/uncertain RPC failures to
`PROVIDER_STATE_UNAVAILABLE` with one attempt and no automatic retry.

All temporary cron jobs were unscheduled and all guard test rows were removed.

## Fail-closed and latency evidence

Live checks also confirmed:

- expired proof → `INVALID_QUERY_PROOF`;
- malformed cost scope → `INVALID_PROVIDER_STATE_REQUEST`;
- `anon` RPC → PostgreSQL 42501 permission denied;
- `authenticated` RPC → PostgreSQL 42501 permission denied.

`pg_stat_statements` recorded 80 guard calls with mean 5.228 ms, minimum
3.209 ms and maximum 19.933 ms. These are database-function timings only and
must not be represented as PostgREST/network or deployed-executor latency.

Canonical machine-readable evidence:
`docs/security/evidence/provider-query-guard-live-20261007.json`.

## Activation boundary

The schema migration is live, but private provider execution remains disabled.
This work did not authorize a provider call, credential read, worker deploy or
NATS redeploy.

After merge and approved deployment, activation still requires:

1. successful service-role PostgREST RPC from the deployed executor;
2. authenticated read-only Query → Bridge → Executor → Vault → provider roundtrip;
3. deployed end-to-end latency/runtime identity;
4. explicit Owner activation.

Until those checks pass, keep `PRIVATE_PROVIDER_BRIDGE_ENABLED=false`.
