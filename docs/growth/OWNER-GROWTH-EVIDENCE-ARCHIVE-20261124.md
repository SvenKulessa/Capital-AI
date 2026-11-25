# Owner Growth Evidence History and Engine Readback

Date: 2026-11-24. Scope: GROWTH / PRODUCT / MARKET / PLATFORM / TRUST. Builds on #936 (main f022bbce5873acd5a4d65d29ca26a6c9af98f6fb).

## Read-only engine coordination

`GET /api/profile/growth-intelligence/engine-readback` reuses the existing Render owner gate. During offline Docker build, the adapter reads the canonical homepage edition and news lifecycle index, invokes only the existing deterministic Content Engine draft projection, and hashes the SOLO2 graph source. The runtime artifact contains only counts, state and SHA-256 references. Market is SOURCE_SNAPSHOT_ONLY, Content is DRAFT_ONLY, graph is SOURCE_ONLY_RUNTIME_NOT_PROVEN. No scheduler, materializer, publication, market-data read, graph execution, or account mutation. Missing/invalid artifact is NOT_PROVEN. Provider transport and separate graph execution remain #933 scope.

## Owner evidence archive

`/api/profile/growth-intelligence/evidence-history` implements explicit inventory, immutable save, plaintext load, authenticated ciphertext backup and restore. The browser verifies SHA-256 receipts and downgrades imported VERIFIED to NOT_PROVEN. Archived history is documentation, not provider authentication. No new database, credentials, cloud resource or auto-upload. AES-256-GCM, HKDF domain separation and configured owner UUID binding, SHA-256 content identity, private disk permissions (0700 directory, 0600 files), immutable link commit, fsync, no-follow reads and bounded workspace. Obvious credential formats rejected; no tokens, PII, customer data or raw provider data may be stored. A maximum of 128 entries is a bounded operational limit, not a retention policy; no automatic deletion.

The existing Render disk is the intended persistent storage. The archive API fails closed unless both CAPITAL_AI_GROWTH_EVIDENCE_ARCHIVE_ENABLED and CAPITAL_AI_GROWTH_EVIDENCE_RECOVERY_VERIFIED are explicitly true, the configured owner and existing encryption key are available and the owner passes existing server authorization. Do not set flags based on a synthetic test. Required before activation: confirm intended mounted directory and key/owner binding; exercise isolated ciphertext backup, restore under same owner and key, wrong-key/wrong-owner rejection, and restart readback; establish external backup retention and recovery evidence. No live storage writes or flag change performed by this PR.

Tests: existing test:private-knowledge and test:owner-operations plus existing Docker Security Gate. Isolated temp-directory tests are not production recovery evidence. Rollback: revert code; do not delete archived files. Disable flags immediately if runtime is unsafe. Production activation and live engine identity remain NOT_PROVEN until observed.

## Growth graph report handoff

The Owner UI accepts the status-only `CAPITAL_AI_GROWTH_GRAPH_HANDOFF@1` report from #933 through an explicit bounded 16 KiB JSON import. Strict schema, exact source cardinality, digest shapes and denied publication/cost/attribution/mutation flags are checked. The exact input bytes are SHA-256 hashed in the browser; graph source hashes remain untrusted references, not authentication. Imported statuses occupy separate documentation rows and never overwrite the direct GA4 readback or existing provider rows. A blocked report clears stale graph-import source rows. The normal snapshot/export and gated encrypted archive can retain those references without raw metrics, account identifiers or tokens. This is an operator-mediated integration, not automatic Render graph execution or a live provider import. No archive activation, recovery claim or new endpoint. Existing owner model tests cover rejection and non-promotion.
