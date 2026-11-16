# Issue #664 · Recovery admission, GCS provenance and Vault canary runbook

Status: **PRECHECK_ONLY / NOT_PROVEN**. Date: 2026-11-16. Contract: `SOLO_MAINTAINER_FLOW@2`. This document is **not** a production export, role grant, secret recovery, or restore authorization. Root `AGENTS.md` remains the sole repository-wide engineering policy.

## Verified baseline (read-only provider evidence)

| Surface | Source `ryzywoktpmyhwzxmstyu` | Target `wcvorlvhwvuprqsjcten` |
|---|---|---|
| Provider | Supabase PG 17.11, eu-west-1 | Separate Supabase PG 17.11, eu-west-1, ACTIVE_HEALTHY |
| `pg_cron` | 3 jobs, **3 active** | 2 jobs, **0 active** |
| Edge Functions | 4 active functions | **0 functions** |
| Auth users | 8 | **1** existing test user |
| Storage | 2 private buckets, 1 metadata row | **0 buckets, 0 metadata rows** |
| Vault | 6 ciphertext rows | **0 ciphertext rows** |
| `pg_net` | 0 pending HTTP requests at readback | **PUBLIC USAGE** on `net` still present |
| `supabase_vault` | 0.3.2 | 0.3.2 |

Source has `PUBLIC USAGE` on `net`, and `PUBLIC INSERT/UPDATE/DELETE` on `net.http_request_queue` and `net._http_response`. Therefore a permanent directly authenticated backup reader cannot be claimed write-isolated. `capital_ai_backup_reader` does not exist in source. **RISK_REJECTED / NO_GO** for production role and OCC-v2 cutover.

Historical evidence: [Issue #664](https://github.com/SvenKulessa/Capital-AI/issues/664), [reader decision](https://github.com/SvenKulessa/Capital-AI/issues/664#issuecomment-6889914439), existing PG17.11 synthetic contract and recovery slices. No source or target mutation in this readback.

## A. Target admission (fail closed)

Do not import real production data until all checks are independently VERIFIED:
1. Target identity: independent project ID, region, owner, PostgreSQL version, recovery operator and allowed duration; ensure **no production service/consumer uses its URL**.
2. **Existing target Auth user**: preserve evidence; do not assume an empty target. Use a newly authorized disposable target or an explicit, separately backed-up target reset. Never overwrite test user silently.
3. Prove network **deny egress** from all target database/extension workers, functions, scheduled jobs and recovery runners at the network boundary. A SQL `read_only` setting or `cron.job.active=false` is not a network firewall. Verify with controlled outbound-negative canaries to a sink owned by the operator; never invoke live webhook endpoints.
4. Verify `cron.job` active count 0; Edge Function count 0; disable/deny `pg_net`, `pgmq` consumers, auth SMTP/SMS/OAuth callbacks, Stripe/webhook endpoints and any external publishers on target. The target currently retains `PUBLIC USAGE` on `net`: **network deny remains NOT_PROVEN**.
5. Confirm encryption-at-rest, isolated credentials/KMS, target-only service keys, no production secrets or shared callbacks. Record only boolean statuses and key identifiers, never key material.
6. Define cleanup, TTL, cost cap, redacted audit log and rollback. **Do not run restore before admission evidence.**

## B. Immutable encrypted provenance manifest (template, no real values)

Each entry must be produced by the authorized owner/runner from actual GCS and client-side bytes; **do not populate with guessed hashes**. The manifest itself must be integrity-protected and stored separately from the encrypted backup. Do not store credentials, plaintext data, signed URLs or decrypted Vault values.

```json
{
  "contract": "CAPITAL_AI_RECOVERY_PROVENANCE_V1",
  "status": "NOT_PROVEN",
  "source_project": "ryzywoktpmyhwzxmstyu",
  "target_project": "wcvorlvhwvuprqsjcten",
  "snapshot_utc": null,
  "gcs": {
    "bucket_redacted_id": null,
    "object_redacted_id": null,
    "generation": null,
    "metageneration": null,
    "encrypted_blob_sha256": null,
    "independent_download_sha256": null,
    "kms_key_version_id_redacted": null,
    "encryption_algorithm": null
  },
  "database": {
    "pg_version": "17.11",
    "encrypted_dump_sha256": null,
    "scope_manifest_sha256": null,
    "acl_owner_default_privileges_verified": false,
    "auth_provider_mfa_verified": false
  },
  "storage": {
    "bucket_count_expected": 2,
    "metadata_rows_expected_at_preflight": 1,
    "binary_object_count": null,
    "all_objects_byte_sha256_verified": false,
    "private_bucket_acl_verified": false
  },
  "vault": {
    "ciphertext_rows_expected_at_preflight": 6,
    "provider_key_portability_documented": false,
    "synthetic_canary_decrypt_verified": false,
    "production_secret_values_transferred": false
  },
  "egress_deny_evidence": null,
  "operator_approval_ref": null,
  "restore_start_utc": null,
  "restore_finish_utc": null,
  "rpo_seconds": null,
  "rto_seconds": null,
  "final_status": "NOT_PROVEN"
}
```

The database dump alone does **not** contain Storage object bytes. Enumerate the object inventory via an authorized Storage/S3 API, export each binary to an encrypted independent object, compare SHA-256 on upload and independent download, and verify metadata-to-binary joins. Use GCS **generation** pinning for the downloaded immutable object. If any generation or hash differs, stop and do not restore.

## C. Vault recovery — synthetic canaries only

1. Obtain **written, current provider-supported procedure** for `supabase_vault 0.3.2` key portability or safe re-provisioning between distinct Supabase projects. Matching extension versions **do not** prove root-key portability.
2. In the isolated target, create **only a fresh synthetic, non-sensitive canary** via the documented API after explicit target-write authorization; validate decryption using a locally held test expected value. Do not output the plaintext.
3. Prove negative behavior on wrong key or intentionally mismatched ciphertext, and repeat after a fresh target lifecycle if the provider supports it. Do not simulate real Supabase Vault with generic `pgcrypto` and claim provider parity.
4. If the provider cannot support migration of production Vault key material, mark `BLOCKED` and plan explicit credential re-provisioning/rotation under separate approval. **No real Vault ciphertext/key material or secrets may be exported in this slice.**

## D. Independent full restore acceptance (not yet performed)

After A/B/C are VERIFIED, use a separate authorized encrypted restore runner and prove: database schema/migrations and row counts; owners/default grants/RLS and tenant negative tests; Auth identities and synthetic login/MFA; **all Storage object bytes** and private ACLs; Vault synthetic decrypt/negative canaries; disabled cron, pg_net, pgmq and external callbacks; complete provider readback; independent GCS generation/sha256; RPO/RTO with UTC timestamps. Restore success requires **all** checks, not merely `pg_restore` exit code 0.

Decision: `RECOVERY_NOT_PROVEN`; `PRODUCTION_BACKUP_READER_BLOCKED`; `OCC_V2_HOLD`. Next operator action: establish target egress isolation with independently evidenced negative network canary **before any production data moves**.

No new GitHub required check, workflow, secret, SQL migration, production mutation, or deployment is introduced by this runbook.
