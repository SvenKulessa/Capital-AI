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
evidence exists, production provider execution remains fail-closed.## Verification and activation

### VERIFIED

- Production project readback on 2026-10-07 identifies Supabase project
  `AIFINANCIAL` (`ryzywoktpmyhwzxmstyu`, `eu-west-1`) as
  `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- Migration history contains
  `20261007214554_provider_query_guard`; the live table
  `private.capital_ai_provider_query_state` and RPC
  `public.capital_ai_claim_provider_query(uuid,text,bigint,integer,jsonb)`
  exist. The repository migration file is therefore treated as applied history
  and is not rewritten after the fact.
- Live catalog readback confirms the RPC is SECURITY INVOKER
  (`security_definer=false`), has `search_path=''` and
  `lock_timeout=1500ms`. `anon` and `authenticated` have no EXECUTE;
  `service_role` does.
- The state table has RLS enabled. `anon` and `authenticated` have no table
  access; `service_role` has the required SELECT/INSERT/UPDATE/DELETE grants.
- A production transaction executed under `service_role` and rolled back after
  verification: first claim allowed, duplicate request rejected as
  `QUERY_REPLAY_REJECTED`, and a second user on the same global cost scope was
  rejected as `PROVIDER_QUERY_COST_THROTTLED` without consuming its replay/rate
  claim.
- Two separately submitted database sessions produced the expected durable state:
  exactly one shared global-cost claim and one admitted replay/rate claim; the
  other replay/rate placeholders remained at `uses=0`. The available MCP path,
  however, serialized the stronger lock-timeout probe, so this is not claimed as
  proof of overlapping execution.
- Direct PostgreSQL hot-path measurement with 50 RPC invocations completed in
  28.218 ms total. PostgreSQL reported 0.548 ms average function-scan time per
  invocation. This is database execution evidence only, not PostgREST/network
  latency.
- Node tests prove timeout, 401, malformed, oversized and uncertain RPC results
  fail closed as `PROVIDER_STATE_UNAVAILABLE` with exactly one RPC attempt.
  Executor tests prove invalid proof, guard denial or storage failure prevents
  Vault/provider I/O.
- All temporary production test markers created by this verification were removed;
  final state-table row count after bounded cleanup was 0.
- Supabase Security Advisor reports no guard-specific RLS/function finding. The
  separate account-level warning `auth_leaked_password_protection` remains open
  because leaked-password protection is not enabled for this project/tier.
- Current PR head passed Docker Security Gate, Domain Governance, Mobile Hardening
  Validation and CodeQL before this evidence-only update.

### NOT_PROVEN / remaining activation gates

- True overlapping PostgreSQL sessions contending on the same guard rows are not
  yet proven. The available MCP SQL transport serialized the deliberate
  >1.5-second lock-contention attempt. `dblink` is available but not installed;
  no production extension was added merely to manufacture test evidence.
- The configured `lock_timeout=1500ms` is catalog-verified, but a real concurrent
  timeout under contention remains NOT_PROVEN.
- PostgREST/HTTP end-to-end RPC latency, service quota behavior and production
  restart/recovery behavior remain NOT_PROVEN. The 0.548 ms figure above must not
  be presented as network/runtime latency.
- The authenticated read-only Query → Bridge → Executor → Vault → provider
  roundtrip remains a separate runtime acceptance gate.
- Keep `PRIVATE_PROVIDER_BRIDGE_ENABLED=false` until those runtime checks are
  completed and the Owner separately authorizes activation.

Machine-readable live evidence is recorded in
`docs/security/evidence/provider-query-guard-live-20261007.json`.

The original isolated evidence remains valid as bounded pre-production evidence:
15 Node tests, 25 PGlite SQL assertions and disk-backed replay persistence all
passed. Those tests complement but do not replace the live readback above.
