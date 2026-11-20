# CAPITAL-AI Agent Operations – durable pilot evidence

Status as of 2026-11-18: **IMPLEMENTED_SOURCE / TESTED_SYNTHETIC / DB_RUNTIME_NOT_PROVEN / CUSTOMER_LAUNCH_BLOCKED**
Scope: PR #786, Root AGENTS.md, SOLO_MAINTAINER_FLOW@2
Main at review: c56c91ef5974dbe522e616f26e70be84bab7daad (one commit after original branch base c1eded10a59864472a739e767084c273551444d5).

## What the pilot actually does

| Workflow | Skill boundary | Evidence | Never asserts |
|---|---|---|---|
| ci-evidence | PLATFORM / TRUST | User-supplied check states and SHA, integrity-bound receipt | Live GitHub verification |
| credential-expiry | TRUST | Bounded metadata-only expiry classification | Provider token validity or key reading |
| media-rights | GROWTH / TRUST | Rights/source/attribution gap classification | Media clearance, license ownership, publishing approval |

- Existing Supabase session is resolved by auth.verify, website paid tier by auth.resolvePaidTier. Every paid request is server-gated; the browser cannot submit userId or tenantId.
- Pilot tenant = a **single verified Supabase user UUID**. Organization membership and multi-user team tenants remain NOT_PROVEN.
- The Node HTTP implementation is a deterministic source-bound demo, not a model-based execution service and not an active LangGraph worker.
- Separate Python LangGraph adapter reuses scripts/growth-agent/auto_loop.py for read-only previews. The SQLite checkpoint adapter calls its existing execute_durable with 0700 private mount, lock and user-namespaced hashed thread ID. It does not handle customer HTTP requests.

## Persisted usage/evidence design (not applied live)

- SQL migration: supabase/migration-candidates/20261118180000_agent_operations_pilot_durable_ledger.sql.
- Table: public.agent_operations_pilot_runs with UUID foreign key to auth.users and on-delete cascade; single durable usage/event row contains one vetted synthetic JSONB receipt, canonical SHA-256, tenant UUID, UTC day, tier and idempotency key.
- RLS is enabled with explicit deny and revoked table access for anon/authenticated/service_role. SQL SECURITY DEFINER RPCs have empty search_path and execution GRANT **only to service_role**. Verify actual role grants on target project before applying.
- Atomically inside one PostgreSQL transaction: pg_advisory_xact_lock(hashtextextended(user_uuid::text, 0)), lookup by unique (user_id, idempotency_key), conflict on changed request hash, replay stored original receipt, then count user's UTC-day rows and insert if within tier limit.
- Limits: starter 2, pro 10, enterprise 30 runs per verified user per UTC day. A retry with the identical idempotency key does not spend a second quota unit; the key is mandatory on POST.
- Receipt hashes use recursively sorted JSON object keys, so PostgreSQL JSONB key reordering cannot invalidate the digest. Reads recompute the digest and fail closed on tampering.
- GET by receipt UUID requires a new verified paid session and filters by user ID inside SQL. Cross-tenant lookups return 404; SQL RPC errors return 503, not raw provider messages.
- Missing DB config, missing schema, insufficient privileges, failed RPC, invalid response or SHA mismatch means **NO in-memory fallback** and no successful execution.
- BYOK remains metadata-only and additionally requires a separately trusted owner-verified vault-reference resolver; no secret values, LLM calls, external API calls or paid model activation.
- Receipt content contains no raw request body, credentials, key references or email, but pseudonymous user ID and synthetic repository/asset metadata in server-only SQL require a retention policy.

## Deployment and cost gates

- The migration is COMMITTED AS SOURCE ONLY. It has NOT been applied to production or to the recovery/test Supabase project. There is no actual PostgreSQL concurrency/restore proof yet; SQL contract tests and shared-store Node mocks do not replace it.
- AGENT_OPERATIONS_PILOT_ENABLED is disabled by default. It must remain false in production until an authorized migration, isolated DB transactional tests, verified backup/restore, valid entitlement and runtime readback. No database mutation is authorized by CI green.
- No new Stripe products, prices or subscriptions; existing Starter/Pro/Enterprise catalog remains authoritative.
- No paid provider activation. Database storage, traffic and existing CI resources can still incur operational consumption, even when modelCalls=0.
- Retention/purge, backups, tenant membership for organizations, HTTP-to-LangGraph worker integration, reconciliation with the latest main and real paying-customer operation are NOT_PROVEN.
- The private standalone HTML in docs/product/agent-operations-pilot-preview.html remains unpublished, no lead collection and no GA4 event dispatch.

## Verified paths and exact tests

Existing Docker Security Gate includes:
- node --test server/agent-operations-pilot.test.mjs server/agent-operations-pilot-store.test.mjs scripts/agent-operations-pilot-migration.test.mjs
- Docker context, runtime dependency, module copy, license and security scans.

Existing Google Maintenance and Local Growth Graph additionally executes those Node/SQL contract tests independently of Docker scans, and runs all scripts/growth-agent/test_*.py with the pinned LangGraph lock. Tests cover cross-tenant 404, parallel quota, restart/replay, changed-key 409, tamper 503, missing DB 503, BYOK-denied, and SQLite checkpoint 0700.

The Node test's persistent fake store checks API/contract semantics only; the transaction property is implemented by PostgreSQL SQL and inspected by SQL contract tests, not measured on a live database. A separate isolated PostgreSQL test must verify real simultaneous transactions and persistence across process/database restarts before enabling the feature.

## Current independent security blocker

Docker Security Gate source scan identified CVE-2026-112366 HIGH in picomatch 4.0.7 (ReDoS), with no published fixed version as of the check. package-lock.json is unchanged by PR #786; the issue is independent of the feature code. Do not suppress the scan or bypass the Required Check. Official references:
- https://nvd.nist.gov/vuln/detail/CVE-2026-112366
- https://advisories.gitlab.com/npm/picomatch/CVE-2026-112366/
- https://github.com/micromatch/picomatch/issues/247

## Rollback and smallest independent next step

The default-off flag prevents HTTP execution before migration. Revert pilot module, store adapter, SQL migration, tests, CI wiring and docs on the current feature branch if needed. A database rollback after applying the migration requires an approved recovery plan and awareness that stored receipts would be lost. Never drop a ledger on production as an unreviewed rollback.

After the upstream picomatch fix and isolated PostgreSQL proof, reconcile main and rerun invalidated checks. Assess pilot read-only readiness separately from publication, payment and real agent execution. No manual deployment or OAuth/secret changes are required for this source-only phase.

## 2026-11-19 isolated PostgreSQL 17 verification and non-executing candidate

- The exact SQL candidate has been executed against **disposable PostgreSQL 17.11 CI only**, not against either Supabase project. GitHub Actions `pg-ledger` tests SQL function ACLs, explicit RLS deny with temporary read grants, service-role-only RPC calls, two synthetic tenants, replay/conflict, 18 concurrent requests, FK error rollback, and separate-process persistence.
- A previous production migration history records automatic execution of a migration after main updates (`20261013110247_youtube_private_deleted_receipt_recovery.sql`). Therefore the pending pilot SQL is kept outside `supabase/migrations/` at `supabase/migration-candidates/`, not eligible for automatic provider migration synchronization. Any future relocation or execution requires a separately authorized cutover and tested backup/restore.
- Production schema/RPC is absent (read-only readback 2026-11-19). Feature flag remains **OFF**; no new paid services, provider calls or production DB changes. Source-only merge may be evaluated independently of product/runtime admission after the existing GitHub required checks pass.

## Post-Merge-Abnahme · 2026-11-19 (read-only, separat vom ursprünglichen Evidence-Stand)

- **GitHub-Merge:** PR #786 wurde gemergt; der später geprüfte Main `61da8c461721b55731d1ec4ecc0161b7f154825c` enthält den source-only Agent-Operations-Pilot. Bei Run [44494242314](https://github.com/SvenKulessa/Capital-AI/actions/runs/44494242314) sind `test` und `pg-ledger` beide SUCCESS. PostgreSQL 17.11 lief isoliert in GitHub CI mit synthetischen Nutzern. Das belegt ACL/RLS, service-only RPC, Cross-Tenant-Denial, Idempotenz, Quota-Races und Persistenz über unabhängige Sessions **nur im CI-Testumfeld**.
- **Supabase read-only, reale Projekte:** Produktion (`ryzywoktpmyhwzxmstyu`) und Recovery-Test (`wcvorlvhwvuprqsjcten`) meldeten PostgreSQL 17.11; `to_regclass('public.agent_operations_pilot_runs')` ergab in beiden Fällen `NULL`, die Pilot-RPC in Produktion ebenfalls `NULL`. **NO_MIGRATION_APPLIED / CUSTOMER_LEDGER_NOT_PROVEN**. Keine DDL/DML ausgeführt.
- **Render read-only:** Workspace `AICapital`, Service `srv-dau1rp893c1s73cdhm1g`; Deploy `dep-dbvc7rqjnfac739u02lg` meldete `live` für `61da8c461721b55731d1ec4ecc0161b7f154825c`. `live` belegt die Quelle des Webdeployments, aber keine Agent-Pilot-Aktivierung oder vollzogene Kundentransaktion. Der öffentliche `/api/agent-operations-pilot/readiness`-Readback war aus dieser Sitzung nicht erreichbar und bleibt **NOT_PROVEN**.
- **Quellcode-Default:** `createAgentOperationsPilot` aktiviert den Handler nur bei `AGENT_OPERATIONS_PILOT_ENABLED === 'true'` und vorhandenem Store; `productionEligible=false`, `publicationAuthorized=false` im Readiness-Vertrag. Eine tatsächliche Runtime-Umgebungsvariable wurde aus Sicherheitsgründen nicht ausgelesen.
- **Verkaufsvorbehalt:** Keine neue kommerzielle Freischaltung aus Source-, CI- oder Render-Gates. Nachzuliefern: autorisierter Cutover-Plan, echte isolierte Kundenentitlements/Receipt-E2E, sichere Retention/Backup-Restore, Berechtigungs- und Kostenreview. Bis dahin nur **synthetische interne Demonstration** und separate, manuelle Scope-/Beratungsanfrage über den bestehenden Governance-Evidence-Sprint.
