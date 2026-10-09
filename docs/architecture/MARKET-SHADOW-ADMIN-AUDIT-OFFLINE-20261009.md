# MARKET — Immutable owner-scoped shadow configuration audit (offline)

Date: 2026-10-09. Baseline: `main@09a483e5f20ea70c3b48229397a1fa8ae1fc5007`.
Authority: `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`.
Related: `src/services/pipelineConfigurator.ts`, `src/features/analysis/AnalysisShadowSession.ts`,
`src/services/shadowPipeline.ts`, `server/shadow-evidence-store.mjs`.

## Problem and implementation

The existing browser-only `AnalysisShadowSession` holds configuration revisions and replay evidence
in memory. That supports offline preview, but not a server-side append-only admin history.
The existing file-based `FileShadowEvidenceStore` already provides a tested offline
score/evidence replay across a new store instance: this change **does not recreate it**.

New `server/shadow-configuration-audit.mjs` provides an additional **server-side,
offline-only** `FileShadowConfigurationAuditStore` for revisions of the existing
`ShadowPipelineConfigSchema`:

- Exact owner user UUID is provided to the server-side constructor; append requests must
  use the same actor identity. A future authenticated API must derive both identities
  from a verified server session, not from a client-supplied field.
- Per-owner private directory (0700), immutable revision files (0600), read-through
  `O_NOFOLLOW`, size/sequence checks, content-addressed SHA-256 events, full-content
  schema validation and chained `previousEventId`.
- SemVer config-version monotonicity, `expectedHead` compare-and-swap, exclusive file lock,
  temp-file flush/fsync plus exclusive hard-link publication. Append reads back the complete
  chain before returning; owner/version/hash/chain corruption fails closed.
- Existing shadow schema enforces `mode=shadow`, `productionApproved=false`,
  bounded weights and policy minima. Every record explicitly has
  `productionEligible=false`. This store cannot activate a provider or scoring runner.
- 100-record hard limit per isolated owner store; no background worker, network calls,
  database writes or external providers.

Regression tests in `server/shadow-configuration-audit.test.mjs`, included in the
existing `npm run test:market` command, cover restart/reload, isolation, lock/CAS races,
rollback of requested head, version reuse, corruption, mode/permissions, symlink and
world-readable-file rejection. Tests use only synthetic configurations.

## Precise limitations: not a production integration

The module is **not mounted on an HTTP route**, not imported by the browser, and not
added to the production Dockerfile. There is **no authorized owner RPC**, Supabase RLS
schema, per-user quota, cross-instance lock service, backup, recovery or Render persistent
disk for this offline audit. File persistence across a local process restart is not
persistence across container redeploys. SHA-256 chains detect accidental/tampered
edits but are **not signatures**; an attacker with arbitrary write access could rewrite
a chain. Deleted tail records can be detected by a previously trusted `expectedHead`,
not by the chain alone. Stale locks deliberately fail closed until reviewed; they are not
automatically broken. Additional secure durable storage/anchor and signed evidence may
be needed for adversarial audit requirements.

The module does not make the existing browser session history persistent; wiring must
follow an authenticated backend design and a tenancy-aware managed database.
No production configuration, API permission, secret, deployment, provider feed, NATS
service or Valkey cache is modified. No provider right is inferred.

## Data-path and exit criteria

```text
Verified owner session (FUTURE)
  -> allowlisted server RPC (FUTURE)
  -> schema validation (IMPLEMENTED OFFLINE)
  -> owner scope + monotone CAS + immutable audit (IMPLEMENTED OFFLINE)
  -> managed durable owner-scoped storage (NOT_PROVEN)
  -> exact readback + cross-deploy replay (NOT_PROVEN)
```

For production, reject without verified identity + tenancy isolation, durable
RLS-protected records, concurrency-safe transaction and verified retention policy.
Demonstrate owner/other-user negative tests, retries, duplicate revisions and readback
across a **deployment**, not just re-instantiation.

## Cost and governance

No new external SaaS account, API subscription or paid infrastructure is activated.
Existing GitHub Actions consumes normal CI minutes; quota/billing unknown
(`NOT_PROVEN`). If activated later, durable storage, IO/egress, retention and backup
can generate charges. Alternative: reuse existing Supabase/Postgres service with RLS,
append-only service role, optimistic concurrency and separately verified storage
cost; it is preferable to Render's ephemeral filesystem for production.

Required Checks stay `Docker Security Gate` and `Domain Governance`; owner merge
is separate. `npm run test:market` extends an existing test suite; no new gate.
