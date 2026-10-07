# TRUST Runtime Review — 2026-10-07

Read-only baseline: `main@4beff8093cecaa36ab5a3185a6796f8601c93f45`.
This review introduces no runtime configuration change or additional release rule.

## Render source and deployment drift

AICapital workspace: `tea-d90o4rj7uimc739i86ug`.
Capital-AI web: `srv-dau1rp893c1s73cdhm1g`.
NATS private service: `srv-dauhcoojo6nc738eedjg`.
Both observed live deploys use `4fa3e3f92547cd6356f46490a38e9b7515f69a6d`.
Webservice branch is main, but actual `autoDeployTrigger=off`;
repository `render.yaml` declares `checksPass`.
Changing the setting can activate future deployments; do not claim it is reconciled.
No Rust bridge worker is present in the observed workspace.

NATS stays unchanged unless a concrete NATS-specific runtime/security need is demonstrated.
A new repository HEAD alone is not a reason to redeploy NATS.

## CI findings and fixes

- PR #228: `contentEngine.test.ts` expected module list needed literal types.
- PR #229: Nodemailer 10.0.14 requires exact registry integrity plus unchanged upstream license bytes; installed-artifact verification is performed in CI.
- PR #223: locked Rust tests (7/7), Clippy, RustSec, cargo-deny, Docker build and hardened smoke passed in run 37680249103. OCI scanning stopped because its non-root scanner could not write `/reports`. The fix sends report JSON through stdout to host-owned files, mounts input reports read-only, and uploads evidence even after failure. The new head still requires its own terminal result.
- PR #230 contains the same Cargo.lock blob as #223 (`98f8e3096956ad63f2e5d738746ce9cbf22caeda`). No automatic PR closure or merge is performed.

## Valkey protection state — owner decision required

Observed cache: `red-dau61kvavr4c73fr1plg`, Valkey 8.1.10,
`maxmemoryPolicy=allkeys_lru`, `persistenceMode=off`.
The provider replay, rate and cost markers share this cache.
They can be evicted under memory pressure and are lost on restart.
The application fails closed when state is unavailable, but an evicted marker
looks like an absent marker; cache availability alone does not prove replay safety.

Option A (proposed recommendation): place replay/rate/cost state in Supabase private
tables with server-only transactional RPCs. Atomically claim a unique request ID
until expiry, update fixed-window counters, and claim user/global cooldown scopes
in one transaction. Keep Valkey for quotes and PubSub. Refuse provider execution
on storage error. Proposed tests: concurrent duplicate claims, process/cache
restart, cache eviction, expiry, atomic multi-scope rollback and caller grants.
No schema change has been applied; latency/quota impact requires measurement.

Option B: dedicated persistent Valkey protection store using `noeviction`.
Require documented persistence/recovery guarantees and refuse requests on capacity
errors. Keep it isolated from the evictable cache. A provider plan/cost review is
needed before provisioning. RDB snapshots alone do not guarantee survival of every
recent replay marker.

Option C: suspend private-provider queries until one of these approaches is verified.
No selected option or production mutation is implied by this document.

## Smallest runtime evidence chain after an owner-authorized merge

1. Successful exact-head required checks and terminal Rust/OCI evidence.
2. Confirm merged main identity, deploy source and immutable artifact identity where available.
3. Provision the Rust bridge worker on main with bridge-only NATS credentials.
4. Confirm app, bridge and executor authentication and subject permissions without printing values.
5. Confirm readiness and an authenticated read-only Query → Bridge → Executor → Vault roundtrip.
6. Verify replay/invalid-proof/expiry/cost limits fail closed and no credential material appears in results, logs, JetStream or shared cache.

The Render worker configuration, auto-deploy reconciliation and protection-state architecture
remain separate owner decisions. No merge, deploy, credential rotation or database write occurred.

## Standalone CADS publication blocker

The GitHub connector returned HTTP 403 `Resource not accessible by integration`
when creating a branch in `capital-ai-online/CADS`. The target repository was not modified.
The prepared security delta is retained as an applicable patch under
`docs/security/evidence/cads-standalone-security-delta-20261007.patch`.
Its paired JSON binds source, target base, patch hash, exact file hashes and validation:
42/42 standalone tests, provenance PASS and `git apply --check` PASS under Node 24.19.0.
Target CI under pinned Node 26.10.0 remains unexecuted.
Browser fallback needs user approval under the browser connector-fallback policy.
