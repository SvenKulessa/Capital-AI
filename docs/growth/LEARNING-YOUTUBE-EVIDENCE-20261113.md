# Learning YouTube Inventory Evidence — 2026-11-13

**Issue:** #559  
**Branch:** `capital-ai-growth/learning-youtube-evidence-20261113`  
**Base main:** `78c70f8940e39dd1ce9edbdc09f94b6081886f1e`

## Purpose
Document the current fail-closed state of the public Learning video inventory and the remaining external blockers for the first chart-analysis YouTube release. This is evidence only; it does not invent a video ID, claim rights, or publish content.

## Current Inventory State (VERIFIED)
- `shared/seo-video.mjs`: `PUBLIC_LEARNING_VIDEO_INVENTORY = Object.freeze([])`
- Admission function `admittedPublicLearningVideos` is fail-closed.
- Categories: Architektur, Fintech Deepdive, Social.
- UI (`LearningVideos.tsx`) uses consent-gated `youtube-nocookie` embeds and shows Coming-Soon graphics for empty categories.

## Remaining Blockers (NOT_PROVEN / REVIEW_REQUIRED)
| Boundary | State |
|----------|-------|
| Google OAuth verification / review submit | NOT_PROVEN |
| F01 commercial third-party media rights | REVIEW_REQUIRED |
| Actual YouTube upload + processing + embeddability | NOT_PROVEN |
| Confirmed video ID in inventory | NOT_PROVEN |

## Next Owner Actions
1. Complete Google verification demo / review submission for the existing OAuth app.
2. Resolve F01 media rights evidence (see `docs/licenses/CHARTANALYSE-LEARNING-MEDIA-RIGHTS-20261014.md`).
3. After verified upload and provider readback, add the confirmed video to the inventory with all required fields (publicationState=PUBLISHED, licenseState=VERIFIED, etc.).

## Non-claims
- No video ID has been fabricated.
- No upload or visibility change has been performed.
- Live publication remains NOT_PROVEN.
