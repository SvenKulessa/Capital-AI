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
- Image blueprint now pins sharp 0.35.5 (Apache-2.0) including its musl binaries via
  deploy/runtime/package-lock.json. A real PNG decode/encode smoke is in the Docker production-deps stage.
- ClamAV 1.4.6-r0 and FreshClam 1.4.6-r0 (GPL-2.0-only; verify distribution/source obligations)
  are included in the final Alpine 3.24 runtime, but scanner processes start **only** with
  both PROFILE_AVATAR_UPLOAD_ENABLED=true and exact Unix socket path configured.
- ClamD socket must be UID 1000 owned, mode 0600; local VERSION must identify engine
  1.4.6 and signatures not older than 48 hours. FreshClam fetches official signatures
  on startup and checks at most six times daily; failure leaves the endpoint closed.
- Live runtime memory budget, download egress, persistent signature DB storage, private
  Bucket/RLS and actual signature age remain NOT_PROVEN until isolated staging. ClamAV
  documentation recommends substantial memory (potentially 4 GiB) for signature sets.
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


## Exact runtime integration (PR #762 continuation)
- Disabled by default: unchanged web CMD invokes local supervisor only when explicitly enabled;
  no scanner or signature-network request from CI at the default configuration.
- Local runtime configuration: deploy/profile-avatar/{clamd,freshclam}.conf; scanner binds
  only /run/clamav/clamd.sock, mode 0600, no TCP listener, runs as existing uid 1000.
- Fail closed before a *single* Storage request for permission mismatch, unavailable UDS,
  engine mismatch, stale/future signatures, timeout, malformed VERSION, and EICAR/FOUND.
- Production package pin: sharp@0.35.5 and @img/sharp-linuxmusl-x64@0.35.5,
  @img/sharp-libvips-linuxmusl-x64@1.3.4 as lockfile optionals; no new paid API.
- Freshclam writes /var/lib/clamav; a writable persistent mount for signatures and
  writable /run/clamav require explicit infrastructure/readback before enablement.
- ClamAV's GPL-2.0-only and Sharp Apache-2.0 require standard license/notice reviews;
  no claim of blanket commercial license clearance or compliance certification.
- Unchanged critical stop: no merge, deployment or product enablement under this request.
