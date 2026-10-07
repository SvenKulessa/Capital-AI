# Durable private-provider guards

The owner selected Supabase transactions on 2026-10-07 for replay, per-user
execution rate and user/global cost protection immediately before Vault/provider
access. Valkey remains cache/PubSub and is not authoritative for these guards.

The Node executor verifies the signed envelope and read-only operation contract,
then calls one server-only Supabase RPC before Vault/provider access. It checks
proof expiry again after the RPC. Storage/configuration/timeout/unknown-result
failures refuse execution and are not automatically retried because an uncertain
database commit must never cause a second provider call.

## Live migration

The reviewed SQL in `supabase/proposals/provider_query_guard.sql` was applied to
the Supabase project as migration:

`20261007214554_provider_query_guard`

The repository migration
`supabase/migrations/20261007214554_provider_query_guard.sql` retains the exact
reviewed SQL bytes. CI verifies proposal/migration byte identity.

Live readback on PostgreSQL 17 confirmed:

- RLS enabled on `private.capital_ai_provider_query_state`.
- `anon` and `authenticated` have neither table access nor RPC EXECUTE.
- `service_role` has the bounded table privileges and RPC EXECUTE.
- `capital_ai_claim_provider_query` is SECURITY INVOKER, not SECURITY DEFINER.
- `search_path` is empty and `lock_timeout` is 1500 ms.
- no provider-query-related Supabase security/performance advisor findings.

## Concurrent PostgreSQL evidence

True separate database sessions were created through the already-installed
`pg_cron 1.6.4` module. The first test pairs started within 1.173 ms (replay),
2.258 ms (rate) and 1.225 ms (cost).

Observed state:

- replay: exactly one live replay claim and one admitted rate use;
- rate limit 1: shared rate counter stayed at 1, one replay claim remained 1 and
  the denied request remained 0;
- shared global cost: global cost was consumed once; winner replay/rate/user-cost
  markers became 1 while every corresponding denied-request marker remained 0.

This is direct evidence that a global cost denial does not partially consume
replay, rate or user-cost state. All temporary cron jobs were unscheduled and all
temporary guard rows were removed after the evidence run.

## Fail-closed and latency evidence

Live database checks returned `INVALID_QUERY_PROOF` for an expired proof and
`INVALID_PROVIDER_STATE_REQUEST` for a malformed cost scope. Calls attempted
under the real `anon` and `authenticated` PostgreSQL roles failed with 42501
permission denied.

`pg_stat_statements` measured 80 guard calls at mean 5.228 ms, minimum 3.209 ms
and maximum 19.933 ms. These numbers are database-function execution time only;
they are not a PostgREST/network or deployed-executor latency claim.

The Node adapter tests cover storage/timeout/malformed/oversized/uncertain results:
one request is attempted, the adapter returns `PROVIDER_STATE_UNAVAILABLE`, and
it does not automatically retry an unknown commit.

Machine-readable evidence:
`docs/security/evidence/provider-query-guard-runtime-20261007.json`.

## Activation boundary

The schema migration is live, but this is not a provider-runtime activation.
`PRIVATE_PROVIDER_BRIDGE_ENABLED` remains false. No provider call, credential
read, worker deploy or NATS redeploy was authorized by the migration.

After merge and approved deployment, the remaining activation evidence is the
authenticated read-only Query → Bridge → Executor → Vault roundtrip plus a
successful service-role PostgREST call from the deployed executor. Until that
evidence exists, production provider execution remains fail-closed.
