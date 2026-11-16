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

### Target-native Vault transaction canary (2026-11-16)

**VERIFIED, strictly same-project and transactional:** On recovery project `wcvorlvhwvuprqsjcten`, an explicit `BEGIN; DO ... vault.create_secret(...); SELECT boolean checks; ROLLBACK;` with **only a clearly synthetic value** returned `canary_decrypt_ok=true` and `wrong_canary_rejected=true`. The negative check is a **wrong plaintext comparison**, not a cryptographic wrong-key proof and not a cross-project root-key transfer. The separate subsequent readback returned `vault_rows_after_rollback=0`, `canary_rows_after_rollback=0`, `active_cron_jobs=0`, `pending_net_requests=0`. No plaintext or ciphertext from a real secret was selected or printed. No root key, Management API write, GCS action, Auth user or production role was touched. **Cross-project root-key recovery, egress denial and production restore remain NOT_PROVEN / BLOCKED.**


## A. Target admission (fail closed)

Do not import real production data until all checks are independently VERIFIED:
1. Target identity: independent project ID, region, owner, PostgreSQL version, recovery operator and allowed duration; ensure **no production service/consumer uses its URL**.
2. **Existing target Auth user**: preserve evidence; do not assume an empty target. Use a newly authorized disposable target or an explicit, separately backed-up target reset. Never overwrite test user silently.
3. Prove network **deny egress** from all target database/extension workers, functions, scheduled jobs and recovery runners at the network boundary. A SQL `read_only` setting or `cron.job.active=false` is not a network firewall. Verify with controlled outbound-negative canaries to a sink owned by the operator; never invoke live webhook endpoints.
4. Verify `cron.job` active count 0; Edge Function count 0; disable/deny `pg_net`, `pgmq` consumers, auth SMTP/SMS/OAuth callbacks, Stripe/webhook endpoints and any external publishers on target. The target currently retains `PUBLIC USAGE` on `net`: **network deny remains NOT_PROVEN**.
5. Confirm encryption-at-rest, isolated credentials/KMS, target-only service keys, no production secrets or shared callbacks. Record only boolean statuses and key identifiers, never key material.
6. Define cleanup, TTL, cost cap, redacted audit log and rollback. **Do not run restore before admission evidence.**

**Managed-project limitation:** [Supabase Network Restrictions](https://supabase.com/docs/guides/platform/network-restrictions) filter **incoming** Postgres/pooler connections, not outgoing `pg_net` HTTP requests, Auth SMTP, Edge Functions or Storage/REST HTTPS traffic. Do not count that setting as an egress deny. The existing hosted recovery target **cannot yet be admitted for real production data**. For negative tests involving any externally executable task, use a self-controlled, disposable runner/PG17 fixture with an enforced `--network none` equivalent and independent proof of denied outbound connections. If a fully isolated managed target is required, obtain separate provider-grade egress evidence instead of claiming it from SQL catalog checks.

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
    "objects": [],
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

For client-side, **offline and read-only** checksum consistency, use the existing PG17 workflow's Node.js verifier:

```bash
node --test scripts/platform/verify-recovery-provenance.test.mjs
node scripts/platform/verify-recovery-provenance.mjs \
  /safe/evidence/manifest.json /safe/evidence/downloaded-encrypted.age \
  /safe/evidence/storage-bytes/
```

Only run the second command with an authorized **redacted** manifest and independent encrypted/downloaded files, not secrets or Vault keys. The manifest's `gcs.generation`/`metageneration` must be positive decimal **strings** from provider-side metadata; both SHA-256 fields must be distinct independently generated attestations of matching ciphertext bytes. Every `storage.objects[]` entry has a path relative to the configured local root and a 64-character lowercase SHA-256, and `binary_object_count` must equal the number of objects. A missing or empty inventory, symlink escape, changed byte, mismatched checksum or missing generation **fails closed**. Provider authenticity, a genuine GCS object generation, encryption-at-rest semantics, signed provenance, all Storage objects, and successful Restore are **not proven by a passing local verifier**. Its only success label is `LOCAL_BYTES_VERIFIED_NOT_PROVIDER` and it is not a production admission gate.

Read-only provider-side GCS metadata can be inspected by an authorized Owner from Acode with `gcloud storage objects describe gs://BUCKET/OBJECT --format=json`; the **actual object generation and immutable version** must be independently confirmed before download. The GCS service in this ChatGPT connection has no directly authorized object-readback action; no GCS proof is inferred from local tests.

## C. Vault recovery — synthetic canaries only

1. Current [Supabase Vault docs](https://supabase.com/docs/guides/database/vault) explicitly describe **different per-project encryption keys** and a managed `GET/PUT /v1/projects/{ref}/pgsodium` key migration route for manual `pg_dump/pg_restore`. The [Management API PUT](https://supabase.com/docs/reference/api/v1-update-pgsodium-config) is explicitly **experimental/Beta** and warns that updating a root key can make data encrypted under the old key inaccessible. Treat this as a **documented but high-risk, separately authorized provider procedure**: compare exact source/target capability, ask provider to confirm target-only portability, preserve rollback and target pre-existing canaries, and never automatically copy production keys. Matching `supabase_vault 0.3.2` versions **do not** prove key portability. A `pgcrypto` local-only test does not validate Vault.
2. In the isolated target, create **only a fresh synthetic, non-sensitive canary** via the documented API after explicit target-write authorization; validate decryption using a locally held test expected value. Do not output the plaintext.
3. Prove negative behavior on wrong key or intentionally mismatched ciphertext, and repeat after a fresh target lifecycle if the provider supports it. Do not simulate real Supabase Vault with generic `pgcrypto` and claim provider parity.
4. If the provider cannot support migration of production Vault key material, mark `BLOCKED` and plan explicit credential re-provisioning/rotation under separate approval. **No real Vault ciphertext/key material or secrets may be exported in this slice.**

## D. Independent full restore acceptance (not yet performed)

After A/B/C are VERIFIED, use a separate authorized encrypted restore runner and prove: database schema/migrations and row counts; owners/default grants/RLS and tenant negative tests; Auth identities and synthetic login/MFA; **all Storage object bytes** and private ACLs; Vault synthetic decrypt/negative canaries; disabled cron, pg_net, pgmq and external callbacks; complete provider readback; independent GCS generation/sha256; RPO/RTO with UTC timestamps. Restore success requires **all** checks, not merely `pg_restore` exit code 0.

Decision: `RECOVERY_NOT_PROVEN`; `PRODUCTION_BACKUP_READER_BLOCKED`; `OCC_V2_HOLD`. Next operator action: establish target egress isolation with independently evidenced negative network canary **before any production data moves**.

No new GitHub required check, workflow, secret, SQL migration, production mutation, or deployment is introduced by this runbook.
