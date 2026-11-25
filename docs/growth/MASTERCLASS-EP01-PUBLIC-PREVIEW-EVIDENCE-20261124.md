# Masterclass EP01 — free public preview

Date: 2026-11-24. Base: `524f25ef07e5436d5dbda416dfdacd1129a4cddd` (PR #928). Scope: one free Fintech Deepdive preview only.

## Owner confirmation

The repository owner expressly confirmed in the 2026-11-24 PRODUCT/PLATFORM/TRUST integration request the necessary usage rights for episode 01, the identity of the uploaded video with the reviewed K01-v4 file, and the public visibility, completed processing and embedding permission in YouTube Studio for video `msfyAwCkzOM`. Earlier publishing README also records owner editorial approval for K01. This is an owner attestation, not an independent legal opinion or a third-party license grant. It supersedes the previous pending owner confirmation only for EP01 in the specified website preview scope. Other episodes and separate redistribution/commercial sales are not admitted.

The 2026-11-23 masterclass individual QA report v5 records K01 SHA-256 `9824afd29439deb661c0bc502e5d10eaf7d8b6d075a7b768f115ab9dcdb3cff4`, runtime 06:45, 9723 decoded frames, and technical audio decode. Semantic speech and full frame rights audit were not independently proven. The exact upload-to-source association is owner-confirmed; YouTube transcoded streams are not asserted byte-identical to the MP4. No private Drive IDs or credentials are published.

## Provider readback

- Public watch page: https://www.youtube.com/watch?v=msfyAwCkzOM. Title readback matches.
- TubeAlfred enhanced video readback (2026-11-24): HTTP 200, ID `msfyAwCkzOM`, channel `UCqaBNJwcfu2cZL3GgG9TLgA`, title “Masterclass Chartanalyse und Grundlagen”, handle `@capital-ai.online`, duration 405 seconds, normalized publication date field `2026-11-24T00:00:00.000Z`, thumbnail `https://i.ytimg.com/vi_webp/msfyAwCkzOM/maxresdefault.webp`.
- Separate channel videos readback (HTTP 200) lists the same video on that channel. Channel listing shows 6:46/406 seconds and relative publication time; rounding difference is retained, not treated as exact duration or exact upload-time proof. The inventory uses the enhanced date field, which is date-normalized, not a verified second-level upload timestamp.
- Public listing and exact provider ID/channel are independently read back through the provider metadata connector. Public visibility, successful processing and embedding permission also have the explicit owner Studio confirmation above. The fields processingStatus and embeddable in the inventory rely on that confirmation, not independently retrieved YouTube Data API status/processingDetails. The direct anonymous embed URL returned player configuration Error 153; this does not establish disabled embedding or successful playback. Actual in-site playback with normal referrer remains a separate live acceptance check.
- Prior metadata and outstanding evidence: https://github.com/SvenKulessa/Capital-AI/issues/559#issuecomment-7120091927 ; previous live navigation acceptance: https://github.com/SvenKulessa/Capital-AI/pull/928#issuecomment-7120085121.

## Integration and boundaries

Single shared inventory drives UI and VideoObject. Existing validation and one-public-free-preview-per-category limit unchanged. No iframe before explicit load action, no automatic playback, no external thumbnail request in the learning UI, fullscreen allowed, same-origin page remains intact; external YouTube link is a user-initiated fallback. Source provenance refreshed for corrected learning journey copy. No video file rehosted, no new provider credentials, paid API or publishing action.

Tests: actual catalog entry and SEO schema, existing negative admission fixtures, empty fixture and consent-first UI. CI and live playback must be measured separately. Rollback: revert the scope PR; restores empty approved inventory and prior journey copy. If the owner's status or rights confirmation is withdrawn, remove the entry immediately through the normal guarded release path.
