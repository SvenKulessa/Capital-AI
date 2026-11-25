# Masterclass EP02 — free public preview

Date: 2026-11-24. Base: `8dd8138b54c38c43d04d6fbbf9b1f3290d1ac44a` (PR #929).

## Owner confirmation

The owner explicitly confirms the necessary media rights for episode 02, association of uploaded video `AMeuY4P11Gw` with the reviewed K02 master file, public visibility, completed processing and embedding permission. This is owner attestation and publication approval for this website preview, not an independent legal opinion. The 2026-11-23 individual QA report v5 identifies K02 SHA-256 `6d81780485a67cc2931b037c1d2fcb9832315c119ac6dc9210d79638c4696910`, duration 07:31, 10826 decoded frames and technical audio decode; semantic speech and full frame rights audit were not independently established. Upload association is owner-confirmed, not a claim that YouTube transcodes are byte-identical. No other episode is approved here.

## Provider readback

- TubeAlfred enhanced video readback 2026-11-24 HTTP 200: `AMeuY4P11Gw`, title Masterclass Realitätscheck, channel `UCqaBNJwcfu2cZL3GgG9TLgA`, handle @capital-ai.online, duration 451 seconds, normalized date field 2026-11-24T00:00:00.000Z, thumbnail https://i.ytimg.com/vi/AMeuY4P11Gw/maxresdefault.jpg, educational disclaimer.
- Separate public channel listing HTTP 200 includes both EP01 and EP02. EP02 listing rounds to 452 seconds. Exact upload timestamp not independently established.
- Public listing and ID/channel independently read back; processing and embedding status rely on the explicit owner Studio confirmation, not independently retrieved Data API status/processingDetails. Actual iframe playback remains a separate live acceptance check.
- Evidence: https://github.com/SvenKulessa/Capital-AI/issues/559#issuecomment-7120732496. EP01 rollout https://github.com/SvenKulessa/Capital-AI/pull/929#issuecomment-7120718876 confirms live runtime, but browser run cancelled before final result; playback and fullscreen NOT_PROVEN.

## Integration

Exact EP01/EP02 ID pair is the sole two-preview exception for Fintech Deepdive. All per-video validation remains unchanged; all other categories retain single-preview limit. No third video or unapproved video admitted, no paid-entitlement bypass, no automatic playback. Both cards independently require explicit action before loading the no-cookie iframe; external links remain user-initiated. SEO uses the same admission set. Regression tests cover actual pair, duplicate/third rejection, other-category limit, negative rights/embeddability/free-preview states and absence of iframe before consent.

No new provider credentials, paid activation, video rehosting or YouTube publication action. CI, production rollout and actual playback separately verified. Rollback: revert this scope PR to restore EP01-only admission.
