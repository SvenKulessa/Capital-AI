# SmartClip P0 — SQL- und Webhook-Evidence
Date: 2026-11-22 | Repo: SvenKulessa/Capital-AI | Scope: PR #916
Contract: SOLO_MAINTAINER_FLOW@2 | TRUST / PLATFORM | No live activation
Source of truth: docs/platform/smartclip-sandbox-sql-candidate-20261122.sql
Target branch: capital-ai-growth/smartclip-sandbox-commerce-20261122

## Verified by actual provider/database readback

A *separate* non-production Supabase project named `capital-ai-recovery-664-test` was inspected; its project ID differs from CAPITAL-AI production. Initial read-only SQL showed PostgreSQL 17.11, with neither `private` schema, SmartClip ledger nor SmartClip RPC installed.

The PR's SQL candidate was executed under a single explicit `BEGIN ... ROLLBACK` transaction, with synthetic UUIDs and Stripe-shaped test IDs. The first run created the missing schema within the transaction, executed the candidate, and asserted:
- `anon` and `authenticated` have no EXECUTE on the RPC; `service_role` does.
- Anonymous/authenticated table SELECT access is denied.
- Valid grant succeeds; duplicate identical grant returns the same effective paid status and one ledger row.
- A different user cannot claim the same Stripe payment intent.
- A different SHA-256 cannot grant access.
- Full refund *before* payment success creates a durable revocation tombstone; later grant returns false.
- Refund/dispute *after* a grant revokes entitlement, and a subsequent delayed grant stays denied.
- Access is false after revocation and true only while an independent valid purchase remains active; revoking that purchase returns false.

Database tool result: `rollback_verified=true`. A second verification after changing the SQL candidate to create a missing private schema returned `rolled_back=true`. Both assertions checked that no SmartClip function/schema remained after rollback. No live database, user account, Stripe charge, or permanent test-database object was modified by this procedure.

Evidence level: **SQL_TRANSACTION_TESTED=VERIFIED**. Not evidence of a deployed migration, a committed grant, or a concurrent multi-connection workload.

## Source changes

- SQL candidate adds `CREATE SCHEMA IF NOT EXISTS private` to support otherwise empty isolated sandboxes. This is not permission to deploy it to production; no existing schema grants are altered by this addition.
- `server/smartclip-sandbox-commerce.test.mjs` adds a 24-way concurrent simulated signed webhook dispatch, and an explicitly staged in-flight grant / full refund / delayed grant race. Both use a mocked provider and in-memory ledger to test HTTP orchestration; neither proves PostgreSQL cross-session locking.
- The pre-existing regression suite covers forged/stale signatures, unverified payments, wrong SKU/digest, duplicate receipts, cross-channel attempts, partial/full refunds and provider outages.

## Historical NOT_PROVEN scope (2026-11-22, before isolated Docker CI)

Die folgenden Aussagen kennzeichnen ausschließlich den damaligen Stand. Der spätere abgeschlossene tatsächliche **Zwei-Backend-Test** ist im Abschnitt **„Evidence update 2026-11-23“** belegt; der frühere `DB_CONCURRENT_TRANSACTIONS=NOT_PROVEN`-Stand darf nicht als heutiger Schlussstatus missverstanden werden.

## Not proven / limits

- **DB_CONCURRENT_TRANSACTIONS=NOT_PROVEN**: No durable dedicated SmartClip testing database was designated. The recovery-test project was used exclusively inside ROLLBACK transactions; a real two-connection race needs a separately designated ephemeral PostgreSQL database or authorized test branch with isolated credentials.
- **DATABASE_MIGRATED=NOT_PROVEN**: Candidate intentionally not applied.
- **STRIPE_TEST_PAYMENT=NOT_PROVEN**: Real end-to-end provider checkout and webhook callback not executed.
- **STRIPE_TEST_TAX_READY=BLOCKED**: Stripe Tax settings active but zero active German tax registrations in test-mode readback. Product tax-code/account tax obligations not attested.
- **STRIPE_MANAGED_PAYMENTS_MOR=NOT_PROVEN**; **ACODE_CONTRACT=WAIT**; **ACTI_PAID_CHANNEL=HOLD**.
- **LIVE_CHECKOUT=BLOCKED**; **MERGE=HOLD**; **PUBLISH=BLOCKED**.

## Revalidation

After any change: rerun `npm run test:smartclip-sandbox`, inspect Docker Security Gate and Domain Governance at the **new PR head SHA**, test the SQL transaction again in a separate rollback-safe environment, and independently validate Postgres multi-connection races before declaring the entitlement subsystem race-proof.

Never store private provider keys, Stripe webhook signing secrets, real customer data or personal identifiers in test fixtures or evidence.


## Evidence update 2026-11-23 — echter Zwei-Backend-Renntest im isolierten CI-Container

**Gültiger technischer Evidenzstand für den geprüften PR-Head [`bc84d4a98c55ecb2d1ea14f1d8c57f6243ba8029`](https://github.com/SvenKulessa/Capital-AI/commit/bc84d4a98c55ecb2d1ea14f1d8c57f6243ba8029): `DB_CONCURRENT_TRANSACTIONS=VERIFIED_ISOLATED_POSTGRES_17`.** Dies ist keine Aussage zur produktiven Datenbank. Der frühere Hinweis `NOT_PROVEN` betraf ausschließlich den Stand vor Ausführung des folgenden realen Tests.

- **CI-/Job-Readback:** [Docker Build Sicherheit Run 45089238539](https://github.com/SvenKulessa/Capital-AI/actions/runs/45089238539), [Docker Security Gate Job 137414816030](https://github.com/SvenKulessa/Capital-AI/actions/runs/45089238539/job/137414816030), `completed/success`; Schritt `SmartClip PostgreSQL two-connection race (isolated Docker)` `success`.
- **Verifizierte Origin:** Skript `scripts/trust/smartclip-postgres-concurrency.sh`, Git-Blob `be3b4a3d445de4c60f6a9ae1caec070a1e71379c`; SQL-Quelle `docs/platform/smartclip-sandbox-sql-candidate-20261122.sql`, Git-Blob `551584768e836b63b0fa647839730c12e9e4874f`; gepinnte Docker-Image-Referenz `postgres:17.12-alpine@sha256:f9cf3e1f0066f0eb0c48707d864f0ac5941e9ff454a072077d97a4d278d07d73`.
- **Tatsächliche Job-Log-Belege:** Zeile ca. 929: `SMARTCLIP_P0=POSTGRES_READY final_init=true isolated_db=smartclip_p0`. Zeile 930: `SMARTCLIP_P0=duplicate VERIFIED distinct_backend_pids=true relation_lock_wait=true state=paid`. Zeile 931: `SMARTCLIP_P0=refund_before_grant VERIFIED distinct_backend_pids=true relation_lock_wait=true state=revoked`. Zeile 932: `SMARTCLIP_P0=grant_before_refund VERIFIED distinct_backend_pids=true relation_lock_wait=true state=revoked`. Zeile 933: `SMARTCLIP_P0=VERIFIED postgres_two_connection_races_and_sql_rollback isolated_network=none container_cleanup_verified=true`.
- **Methodik:** Zwei separate `psql`-Prozesse mit unterschiedlichen `pg_backend_pid()` und beobachteter Relation-Lock-Wartesituation, kontrollierte Überlappung von `grant`/`revoke`/identischem `grant`. Anschließend SQL-Row-Count/Status-Readback, spätes Erfolgsereignis gegen Refund-Tombstone, `access` vor/nach Widerruf, ein echter `BEGIN…ROLLBACK`-Test, Containerentfernung und fehlgeschlagene `docker inspect`-Abfrage als Cleanup-Evidence. Prozess lief auf isoliertem `--network none`-Docker und **nicht** in Supabase/Render oder einer produktiven Datenbank.
- **Interpretation:** `SQL_TRANSACTION_TESTED=VERIFIED` (ältere separate Rollback-Evidence) und **`POSTGRES_TWO_BACKEND_RACE=VERIFIED`** (heutige unabhängige CI); `CI_SECURITY_GATE=SUCCESS` am oben referenzierten Head. **Nicht verifiziert** sind dauerhafte Integration in Supabase, echter Stripe-Testzahlungs- und Tax-/Invoice-End-to-End-Readback, Kundenauslieferung, kostenpflichtige Provider-/Produktionseinstellungen oder Live-Checkout. `DATABASE_MIGRATED=NOT_PROVEN`, `STRIPE_TEST_PAYMENT=NOT_PROVEN`, `STRIPE_TEST_TAX_READY=BLOCKED`, `LIVE_CHECKOUT=BLOCKED`, `PUBLISHING=BLOCKED`.

Diese Dokumentationsänderung führt keinen Test erneut aus, installiert keine DB-Objekte und aktiviert kein Produkt. Neue Branch-Commits erfordern einen eigenen CI-Readback am neuen SHA; die hier genannte Log-Evidence bleibt auf `bc84d4a98c55ecb2d1ea14f1d8c57f6243ba8029` gebunden.
