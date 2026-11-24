# Fintech Deepdive / Masterclass cover integration

Date: 2026-11-24. Baseline main: `1ad3201bfe80f79f050fcd35adbb15f75cb7930e` (PR #927).

The repository owner supplied the CAPITAL-AI logo, requested a stronger Universe visual treatment of both covers, and explicitly approved the two resulting cover images for website integration ("freigegeben zur Integration"). Generated artwork: ChatGPT image generation with owner-supplied logo reference. No third-party stock imagery intentionally added. This approval is scoped to the cover design and first-party website use; it does not assert third-party redistribution rights or clear the separate masterclass video rights.

## Asset identity

| Asset | Approved source PNG SHA-256 | Optimized local WebP SHA-256 | WebP bytes |
|---|---|---|---:|
| `public/learning/videos/fintech-deepdive-universe.webp` | `a7cd1e222b047a261b1856dfb4e55fcf2200dacb0e0bbf3f3c6db8d802b24189` | `322ac3920482dc2304e4e0d19e4beb45c4807bc271e72dba55b1ec589a9c7940` | 193060 |
| `public/learning/videos/masterclass-universe.webp` | `72c9da10bb4127d9b5a2a3862a1db82267dcf85e50ad7ce48988643ab9181857` | `1c9a4c682bd37c2c193ccb95ae13413aa025229c0cff8ca6c789102de863cd9c` | 214168 |

Both generated originals are 1672×941. Optimized locally with Pillow RGB/WebP quality 87, method 6, preserving dimensions. Hashes are from actual local file bytes; repository transfer and CI are separate evidence boundaries. The existing Docker context explicitly includes public/learning/videos/**.

## User flow and evidence boundaries

Lernvideos → Fintech Deepdive → Masterclass Videos → admitted episodes. Full cover is a keyboard-accessible button; explicit back buttons, focus restoration, responsive images and same-page video player. No provider iframe before explicit user action. Existing `admittedPublicLearningVideos` policy remains authoritative, including the one free preview per category limit. No paid lesson bypass, external thumbnail request or SEO publication is introduced.

Episode 01 YouTube ID `msfyAwCkzOM` has prior official channel metadata evidence in issue #559; the exact uploaded bytes, media rights and provider embeddability/publication status remain unproven for admission. A cover containing an episode title is not evidence of available playback. The list must report an empty approved inventory until admission passes.

Regression coverage added to the existing learningPolicy tests (stage rendering, digest validation, consent and denied admission). Test execution, Docker Security Gate, Domain Governance, merge, Render deployment and mobile live QA remain pending. No new provider, costs or protection changes. Rollback: revert scope commits and remove the two cover assets together.
