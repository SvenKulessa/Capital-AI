# CAPITAL-AI — Google OAuth scope reconciliation (2026-11-18)

**Domain:** TRUST. **Contract:** Root `AGENTS.md`, `SOLO_MAINTAINER_FLOW@2`.  
**Project:** `aifinancial-500208` (`542877602707`).  
**Baseline:** `main@c56c91ef5974dbe522e616f26e70be84bab7daad`.  
**Impact:** Evidence and a negative test only; no provider configuration, credentials, active scopes, deployment or upload changed.

## Reason for the audit

On 2026-11-18 the Google OAuth verification team requested more complete least-privilege explanations, an exact code/Cloud Console scope match and a demo covering:
- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/drive.readonly`

This is a review finding, **not** approval of YouTube Data API v3, OAuth consent, or any Drive scope.

## Scoped readback: code, manifest and prior Cloud documentation

| Surface | Observed permissions / behavior | Evidence state |
| --- | --- | --- |
| YouTube server-side OAuth authorization URL | Exactly `youtube.readonly` and `youtube.upload` in `server/social-media/youtube-oauth-start.mjs`; English consent, PKCE S256, owner check and allowed request parameters stay intact | **VERIFIED (code)** |
| YouTube OAuth exchange / channel verification | Same two required scopes, mandatory channel readback, fail-closed on missing scope | **VERIFIED (code)** |
| Social Edge vault YouTube branch | The dedicated `YOUTUBE` branch uses the same two scopes; X publishing scopes remain isolated | **VERIFIED (code)** |
| YouTube manifest/configuration | `render.yaml` declares the YouTube OAuth client as a server-side setting; no third Drive permission is declared there. The Google API service enablement workflow checks service availability, not OAuth consent grants | **VERIFIED (repository)** |
| Acode/Rclone Drive OAuth | Drive documents `2026-11-16_PLATFORM_GCP_DRIVE_OAUTH_DISPATCH_README_v1.md` and `2026-11-16_PLATFORM_ACODE_SPLIT_SCOPE_MIRROR_README_DRAFT_v2.md` describe a separate Desktop client requesting restricted `drive.readonly` in **the same GCP project**, alongside `drive.file` for an independently scoped writer. Both documents explicitly label this as **DRAFT_ONLY**, not a successful live authorization | **VERIFIED (documentation); NOT_PROVEN (live client)** |
| Google Auth Platform > Data Access | Google's 2026-11-18 email lists all three scopes, but no authenticated Console readback of actual configured scopes / client IDs is available through the GitHub, Drive, or service-usage operator connections | **BLOCKED / NOT_PROVEN (live)** |
| Deployed OAuth consent request and exact OAuth client ID | Repository behavior alone cannot establish current Render secret bindings, production deployment SHA, or a real browser consent screen | **NOT_PROVEN (live)** |

**Finding:** The known YouTube code does **not** request `drive.readonly`. The additional restricted Drive scope originates in a documented, separate Acode/Rclone workflow that proposes reusing the same Google Cloud project. This is a plausible cause of the project-level review discrepancy, not proof of which OAuth client requested the third scope. Do not add Drive permissions to the YouTube OAuth URL merely to make it match a project-wide submission.

## Code-side correction / regression evidence

`server/social-media/youtube-oauth.test.mjs` now has an explicit negative test:
1. A hypothetical `SOCIAL_YOUTUBE_OAUTH_SCOPES` environment override containing `drive.readonly` must **not** broaden the YouTube consent URL.
2. The consent URL must contain exactly the required two YouTube scopes.
3. Query-string attempts to override the scope, including a purportedly valid YouTube-only override, must redirect back to the owner connection page **without issuing OAuth state**.

This preserves the existing fail-closed behavior; it is a regression guard, not an OAuth scope mutation.

## Smallest safe Cloud Console reconciliation (owner-authenticated readback)

1. Open [Data Access](https://console.cloud.google.com/auth/data-access?project=aifinancial-500208) and the [Verification Center](https://console.cloud.google.com/auth/verification?project=aifinancial-500208) in the **authorized owner account**. Capture a redacted screenshot or export of the exact submitted scope list and active project, no secrets.
2. Identify the actual OAuth client ID and type for **CAPITAL-AI server-side YouTube**, plus the **Acode/Rclone Desktop** client; compare these with the redacted Render client-ID readback and `rclone config show` *only after redacting tokens and secrets*. Do not paste raw `rclone.conf`.
3. If `drive.readonly` belongs only to Acode/Rclone, **prefer an isolated GCP project and Desktop OAuth client** for that separate workflow, subject to owner approval and actual readback. Do not remove scope access used by existing authorized consumers without dependency evidence. If the scope is unused, propose removal from this project's Data Access submission only after proving that fact.
4. Keep the currently pending YouTube scopes and publishing state unchanged. Do not add an unverified scope to active production traffic. Record a new video showing readable expanded consent, channel `readonly`, a single explicitly authorized private test upload, and the same video in YouTube Studio. Do not repeat an upload on an ambiguous response.
5. Submit the matching project-scoped data, exact scope justifications, a safe test navigation guide, and the video by replying in the **existing** Google review thread. Only provider acceptance proves verification.

## Evidence / validation

- Base SHA: `c56c91ef5974dbe522e616f26e70be84bab7daad`
- Relevant existing suite: `node --test server/social-media/youtube-oauth.test.mjs`
- Broader social regression: `npm run test:social-provider`
- GitHub required checks: `Docker Security Gate` and `Domain Governance`, evaluated at the **actual PR Head**.
- Keep individual command exit codes, check run URLs, and Head SHA in PR evidence. No local `PASS` or provider approval is claimed by this document.
- Rollback: revert this documentation and the additional regression test. No runtime configuration was changed.
- Final OAuth acceptance stays **BLOCKED** until a real Google Auth Platform readback and Google review decision.

Related source: `docs/growth/GOOGLE-OAUTH-VERIFICATION-20261114.md`, `docs/growth/YOUTUBE-OAUTH-20261013.md`; the two named Acode Drive documents above.
