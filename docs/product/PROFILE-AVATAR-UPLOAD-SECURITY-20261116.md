# Profile avatar secure upload – unactivated product slice
Date: 2026-11-16. Domain: PRODUCT; PR #762; SOLO_MAINTAINER_FLOW@2.

The existing licensed 256×256 Learning Mastermind badge and its verified
entitlement remain unchanged. Presentational 300×100 cards stay separate.

## Implemented controls
- POST /api/profile/upload-logo accepts raw PNG/JPEG/WebP <= 2 MiB, not SVG or arbitrary multipart.
- Server verifies its own signed session and CSRF origin; no caller-supplied user or object path.
- Quarantine is in-memory only; local ClamAV Unix-socket INSTREAM scans source and normalized PNG output.
- A real server image decoder/re-encoder (sharp) must validate <=4096×4096 and output <=512 KiB.
- On scanner timeout, missing socket, unavailable decoder, invalid magic, malformed image,
  oversized payload, wrong origin or unauthenticated caller, the upload is denied.
- Only after clean scans and decoding does a server-only secret-key request write to
  private Supabase Storage under <verified-auth-uid>/avatar.png.
- GET /api/profile/logo, GET /api/profile/avatar/current and DELETE /api/profile/logo
  use the verified session and never accept caller-chosen bucket paths.
- Private Storage bucket proposal in supabase/proposals/capital_ai_private_profile_avatars.sql.
  No public bucket, no browser policy for insert/update/delete, no public CDN, no VirusTotal.
- Profile UI offers explicit upload/delete and preserves provider-avatar fallback on errors.

## Deployment blockers (fail closed)
- PROFILE_AVATAR_UPLOAD_ENABLED defaults off. No productive DB migration or secrets changed.
- Local ClamAV daemon, signed/current signature set, Unix socket restricted to the web
  process and a verified sharp runtime dependency are not provisioned by this PR.
- The runtime image has no installed sharp package. Dynamic import throws and endpoint
  returns 503; do not enable without pinned lockfile, Alpine support and security scans.
- Validate private bucket, explicit absence of broad storage.objects policies, RLS
  negative A/B tests with authenticated user tokens, actual EICAR fixture and clean PNG,
  scanner outage, delete/replace lifecycle and cross-instance convergence in staging.
- Storage service key is server-only. Its presence does NOT authorize any cross-user
  object lookup because path is derived solely from auth.verify(). Never log credentials.
- No deployment, production storage activation, paid APIs or automatic merge.
Rollback: disable flag; revert scope commit and remove private bucket only after
review of stored per-user data and authorized retention/deletion plan.

Evidence: automated mocked route isolation tests are necessary, not proof of a
running scanner or production Storage RLS. Claim NOT_PROVEN until staging.
