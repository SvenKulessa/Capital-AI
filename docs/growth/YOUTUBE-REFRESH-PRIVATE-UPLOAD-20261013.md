# Owner YouTube token lifecycle and private test

Base main: 90fad472c9189a9632b01934b3d6b67f48811c72. Owner authorizes automatic token renewal, one private Short test and a genuine verification demo.

## Resulting behavior

Owner GET account/status refreshes an expired or soon-expiring access token before returning token-free status. Refresh is on demand, not an extra polling cron. The encrypted refresh token is retained if Google omits a replacement. Per-owner single-flight and optimistic expiry/channel/account compare-and-swap avoid stale concurrent overwrites. invalid_grant requires personal reauthorization; no automatic privilege increase.

The owner-only `/api/social-media/youtube/private-test` accepts exactly the original approved OHLC MP4 hash and fixed verified channel UCqaBNJwcfu2cZL3GgG9TLgA. POST requires same-origin, verified owner and bounded video/mp4 bytes. A deterministic, durable job is claimed before provider submission. Unknown/ambiguous delivery never automatically retries. A video receipt is saved before readonly videos.list confirms the target channel and private visibility. Private evidence is never labelled public publication.

The existing owner-JWT + workload-HMAC Social Edge Vault exposes ciphertext only to the authenticated Render workload for refresh and private job metadata. Public visitors and other users cannot fetch credentials. JWT verification remains enabled. Legacy service-role storage is retained for credential operations and private receipts.

## Deploy

1. After normal merge/checks, apply the committed youtube_private_upload_jobs SQL, keeping RLS and service-role-only grants.
2. Deploy the merged main `capital-social-x-vault` with verify_jwt=true; keep existing workload key and YouTube encryption key unchanged.
3. Normal Render deployment from main. Verify actual runtime SHA and owner guards.
4. In a real owner session, open the private test page, upload the original MP4 and verify VERIFIED_PRIVATE. A refreshed account expiry is live token evidence; unit fixtures are not.

No public-upload flags or broader scopes are enabled. A Cloud Browser policy block currently prevents agent-controlled owner-session upload/recording; owner-browser readback remains required. No private upload or full verification recording is claimed before observed results.

## Validation / rollback

109 Social provider tests pass, including expired refresh, concurrent calls, wrong-user/AAD/cipher/scopes, invalid_grant, CAS conflict, signed credential retrieval, private readback, duplicate suppression, ambiguous submission, cross-site and non-owner denial, and original-file hash rejection. 26 Auth/HTTP tests, 26 frontend security tests with tsx and 6 Docker-context tests pass.

Disable the OAuth connect flag to pause new linkage. Preserve encryption keys and durable UNKNOWN receipts. Revert through the normal main path. Do not delete receipts or retry ambiguous uploads without explicit reconciliation.
