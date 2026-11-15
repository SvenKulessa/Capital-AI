# Google OAuth verification: privacy and demo follow-up (2026-11-14)

**Scope:** CAPITAL-AI; TRUST/GROWTH; `SOLO_MAINTAINER_FLOW@2`; no provider mutation, credential access, YouTube upload, deployment, or merge.

## Evidence and current findings

- **VERIFIED — reviewer feedback:** The two owner screenshots show Google verification findings last reviewed on **2026-10-14**: missing explicit disclosure of the recipients of Google user data, and a demonstration video that insufficiently shows app functionality.
- **VERIFIED — current repository:** `src/privacy/privacyPolicy.ts` already declares separate `google-oauth` (website login) and `youtube-owner-oauth` (owner connection and private test upload) processing activities, including categories, purposes, recipients, transfers, retention and safeguards.
- **VERIFIED — this branch:** `scripts/generate-cookie-storage-notice.mjs` now displays the same recipient and transfer facts prominently near the start of `public/datenschutz/index.html`. `scripts/static-legal-routes.test.mjs` checks canonical parity and catches duplicate/missing summaries.
- **USER-REPORTED / NOT_PROVEN — video:** An updated video was uploaded at `https://www.youtube.com/watch?v=rRdMW8Za3Hs`. Accessible playback, full English OAuth consent, exact cloud scopes, branding, and end-to-end scope usage **have not been independently verified**. This URL is not evidence that the old submission has been replaced.
- **BLOCKED — Cloud Console:** An authorized browser-profile readback on 2026-11-14 was redirected to Google password sign-in. Project selection, configured consent-screen URLs, actual requested scopes and review submission could not be read back or changed.
- **NOT_PROVEN — production:** This branch does not imply that the public site has deployed or that Google has accepted the new policy/video. Verify live HTML and the owner's exact OAuth project after normal release separately.

## Google verification requirements and next authorized readback

Google official requirements:
- https://support.google.com/cloud/answer/13806988?hl=de — privacy policy must say who receives, gets, or processes Google user data.
- https://support.google.com/cloud/answer/13804565?hl=de — video must demonstrate the submitted application's brand, complete OAuth consent screen in English, exact requested scopes, and actual features using each scope.

After a separately authenticated Owner session, check **the correct CAPITAL-AI project only**:

1. Compare current project brand, homepage, privacy policy URL `https://capital-ai.online/datenschutz/`, verified domain and granted/requested scopes with the actually deployed app, without reading any secret.
2. Open the updated video as an independent viewer. Check login initiation, complete English consent, scopes, return callback, channel status, and each requested YouTube read/upload use-case actually implemented. No live API action just to establish evidence.
3. Link or submit the new demo only for that validated project; where the URL has not changed, tell Google's review team that the privacy text was updated at the existing URL. The owner or an authenticated authorized operator must complete this step.
4. Read back verification status. Do not claim approval until the provider confirms it.

## Rollback and limits

Revert the three changed application/test files to remove the prominent summary; the existing full registry and detailed data disclosures remain unchanged. No change to OAuth scopes, API endpoints, data storage, consent version or privacy recipients. Do not merge this PR without the existing Docker Security Gate and Domain Governance checks.
