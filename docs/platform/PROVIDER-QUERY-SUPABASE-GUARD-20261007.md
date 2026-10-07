# Durable private-provider guards

The owner selected Supabase transactions in the 2026-10-07 chat before implementation.
This change moves provider replay, per-user execution rate and user/global cost
cooldowns out of the evictable Valkey cache. Valkey remains the quote/PubSub cache.

The Node executor verifies the signed envelope and read-only operation contract,
then calls one server-only RPC before Vault/provider access. It checks proof expiry
again after the RPC. A storage/configuration/timeout error refuses execution and
is not automatically retried: an uncertain commit must never cause a second provider
call. A claim remains consumed after a subsequent provider failure.

The rate limit counts admitted provider executions, rather than malformed HTTP
attempts. Replay, rate and all cost scopes are locked in a consistent order and
claimed together only after all checks pass. A denied claim does not consume any
other scope. Expired placeholder rows are harmless and bounded garbage collection
removes at most 128 rows per call, only after an additional minute beyond expiry.

`private.capital_ai_provider_query_state` stores only scope identifiers, expiration
and counters; no credentials, parameters or provider responses. RLS and grants
restrict the table to `service_role`. The public RPC uses SECURITY INVOKER with
empty search_path, explicit schema references and revoked PUBLIC/anon/authenticated
EXECUTE. Modern `sb_secret_` keys are sent only in the server apikey header; a legacy
service-role JWT is supported as in the existing Vault adapter.

## Verification and activation

- 15 Node tests passed locally, covering existing query contracts, guard ordering,
  proof expiry during storage I/O, failures/denials and bounded RPC responses.
- 25 SQL assertions passed against an isolated PGlite 0.5.8 Postgres engine;
  transactional rollback leaves no test rows. They cover caller grants, RLS,
  replay, rate, global/user cost denial without partial consumption, expiry,
  retention and malformed scopes.
- A disk-backed PGlite close/reopen retained a live replay marker and rejected
  its duplicate. This is local SQL persistence evidence, not a Supabase outage test.
- True concurrent sessions, Supabase RPC latency/quotas and production restart/
  recovery behavior still require staging evidence. No production latency claim.

The DDL is in `supabase/proposals/provider_query_guard.sql`. The Supabase CLI is
unavailable in this workspace and its download is unreachable. Generate the final
migration using `supabase migration new provider_query_guard`, retain these exact
reviewed SQL bytes, and execute `supabase/tests/provider_query_guard.sql` only on
an isolated database. Do not run test SQL against production.

Before enabling private queries, apply the generated migration through the
authorized release path and verify grants/advisors and real concurrent RPC claims.
Deploy app and worker from approved merged main, then prove the authenticated
read-only Query → Bridge → Executor → Vault roundtrip, expiry, replay and cost denials.
Keep `PRIVATE_PROVIDER_BRIDGE_ENABLED=false` until that verification completes.

No live schema mutation, runtime setting change, merge or deploy was performed.
