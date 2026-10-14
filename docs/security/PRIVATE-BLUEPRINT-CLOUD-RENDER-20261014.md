# CAPITAL-AI Private Blueprint Cloud — Render Disk

Authority: AGENTS.md / SOLO_MAINTAINER_FLOW@1. Domain: TRUST with PLATFORM/PRODUCT. No additional approval gate.

## Current observed infrastructure (14 October 2026)
- Confirmed by Render Control Plane: \`Capital-AI\` (\`srv-dau1rp893c1s73cdhm1g\`) in workspace \`AICapital\` has an attached **5 GB** disk \`dsk-db7d22q5b2lc73fflpug\` at \`/var/data\`. This is **not** the NATS disk.
- Control-plane mount does not prove runtime UID 1000 write permissions, crash durability or backup restore.
- Existing Stripe/Supabase commerce contract controls \`CAP-BP-001\` and \`CAP-BP-002\` through verified purchases, release \`1.0.0\`, revoked/refunded entitlements and SHA-256.

## Storage architecture
\`\`\`mermaid
flowchart LR
  C[Customer session] --> D[Existing /api/billing/blueprints/download/SKU]
  D --> E[Server-side Supabase purchase + release RPC]
  E --> V[Encrypted vault on /var/data]
  F[Verified Owner IAM + confirmed email] --> O[Private cloud import/verify/backup/restore]
  O --> V
  V --> B[Owner-only encrypted .caibak export]
  B --> G[Google Drive private backup folder]
\`\`\`

- Mount: \`/var/data\`; app-owned storage directory: \`/var/data/capital-ai-private-blueprints\` mode \`0700\`; immutable ciphertext records mode \`0600\`.
- Encryption: independent **32-byte AES-256-GCM** key via server environment \`BLUEPRINT_DISK_ENCRYPTION_KEY\`, 64 lowercase hex characters. Random 96-bit nonce per artifact, authenticated AAD binds SKU, release and SHA-256. Key never goes into the mounted volume, repo, backup, client or logs.
- Owner import: exact validated released SKU and SHA (fetched from existing private Supabase RPC), one immutable object per SKU/version; no overwrite/replay; max 1 MiB.
- Owner restore: only custom \`.caibak\` from this implementation; checks full GCM authentication + plaintext SHA before atomic creation. Old \`.aesgcm\` backups are a separate format and **cannot** be imported into this route.
- Customer: original existing authenticated \`/api/billing/blueprints/download/SKU\` verifies paid entitlement and release first. If an encrypted disk copy exists, it is decrypted only after that check and cross-checked with the same Supabase release SHA. Corruption blocks delivery; a missing disk copy falls back to the existing Supabase source without changing purchase semantics.
- Disk cannot be served by the public static file server. No static URLs, web symlinks or direct object listing. Owner-only paths are under the already authenticated Blueprint backend; no second auth service.

## Founder verification and operation
1. 👋⚙️ Add \`BLUEPRINT_DISK_ENCRYPTION_KEY\` to **Capital-AI web service Render environment**, not Render NATS, by generating 32 cryptographically random bytes offline and encoding as lowercase hexadecimal. Keep a separately secured **offline** recovery copy. No value in chat, repo, Drive, CI or any URL. Rotating the key without re-encrypting existing records makes them unreadable.
2. Use the existing verified Owner login and open \`/studio?tab=blueprints\`. The **Founder · Private Blueprint Cloud** view is shown only after server-side IAM owner verification and confirmed email.
3. GET \`/api/billing/blueprints/private-cloud/verify\` returns availability, disk-write probe, released SKU source SHA and whether the stored copy decrypts and matches that SHA. This is **not** a mount-persistence or restore attestation.
4. Only if the Supabase original is released, select the exact original \`CAP-BP-001/002\` Markdown in the Founder UI. The browser checks SHA-256 before posting, the server independently validates it and stores authenticated ciphertext immutably.
5. Export the \`.caibak\` binary from the Founder UI and upload **only the ciphertext** to the already private Google Drive folder \`CAPITAL-AI/PRIVATE-BACKUPS/SCREENER-BLUEPRINTS\` using a separate authorized Google Drive user/automation. The ChatGPT Google Drive connector cannot automatically authenticate the Render runtime. Do not mark Drive backup VERIFIED until the actual uploaded blob and checksum are correlated.
6. In a synthetic/isolated restore test, use the Founder Restore interface with a matching encrypted backup after ensuring the destination is absent. Existing on-disk versions are never overwritten. Record the result and measured RTO/RPO. Do not delete production originals to test recovery.
7. For full disaster recovery, preserve both **encryption key** (offline) and **Supabase commerce entitlements/artifact release metadata**, as the disk-only ciphertext does not establish buyer authorization.

## API summary
- \`GET /api/billing/blueprints/private-cloud/verify\` — Owner only, no-store; write/read probe, release and key states.
- \`POST /api/billing/blueprints/private-cloud/import/CAP-BP-00X\` — verified Owner + same-origin + \`Content-Type: text/markdown\` + \`X-Blueprint-Release-SHA256\`.
- \`GET /api/billing/blueprints/private-cloud/backup/CAP-BP-00X\` — Owner only, returns encrypted \`.caibak\` with \`X-Backup-SHA256\`; no cloud upload/token.
- \`POST /api/billing/blueprints/private-cloud/restore/CAP-BP-00X\` — verified Owner + same-origin + \`Content-Type: application/octet-stream\` + release hash.
- \`GET /api/billing/blueprints/download/CAP-BP-00X\` — existing account session, SKU release, paid entitlement and immutable SHA.
- Missing key, mount or authorized release must fail closed. No public upload/write/delete endpoints.

## Evidence and costs
- Unit/contract tests: \`node --test server/blueprint-private-cloud.test.mjs server/blueprint-commerce.test.mjs\`.
- Docker Security Gate (existing, not new): offline Node tests, app build, Trivy/CodeQL/SBOM and dependency verification on exact PR SHA.
- Prior owner-provisioned 5 GB disk is not a new resource here. Remaining Render disk charges/quotas and Drive storage/egress: **NOT_PROVEN**; monitor under AGENTS.md cost policy.
- Production READBACK requires: deployed commit, disk verification as authenticated Owner, exact encrypted import/read/export of own non-sensitive test asset, isolated restore and actual Drive ciphertext/Hash readback.
- No Google Drive backup schedule/automatic runtime authentication is implemented. Google Drive must never be a public-origin download.
- Rollback: revert application PR or disable key-based vault. Ciphertext and disk must be retained for recovery; do not delete current disk, Supabase entitlements or existing backup material.
