# Post-merge branding and release handover — 2026-09-30

Scope: SvenKulessa/Capital-AI. Fresh owner direction: branding integration,
Docker/GHCR release evidence, and read-only Render correlation. FE implements
branding; OPS receives release/runtime handover (PVC-07/08), SEC/COMP remain
cross-cutting constraints. This record is evidence, not a new authority.

## Baseline and overlap

Main: `546205764897c2f7bceb15cc3b5907a371390a63`.
PR #18 is merged at this exact main; no open PR was observed during intake.
Its Redis/NATS implementation is retained. No new provider, scorer, ingestion
or infrastructure implementation is introduced. No Finance mutation.

## Branding delta

- Header and existing inline/emblem consumers: original 1024×1024 emblem.
- Login: original 1024×1024 full logo via stacked variant.
- Footer: original 1376×768 banner, proportional and constrained to its container.
- Image width/height reserve aspect ratio; no cropping, regenerated image,
  remote image request or image hash change.
- Clickable branding supports keyboard activation; the image variants use a button.
- The slogan embedded in full-logo/banner pixels remains part of the original
  image. showSubtitle controls only additional HTML text, not image pixels.
- JPEG commercial-use terms remain open. Static import is implementation,
  not rights approval; deployEligible:false and legalApproval:null are retained.

## Four validation steps

1. Main/overlap: PR #18 merge verified; fresh main and open PR list read.
   Source imports and consumers reviewed; three original asset SHA256 hashes
   and intrinsic dimensions match the rights inventory.
2. Targeted tests: existing license-evidence (8 cases) and image-profile test
   passed with TMPDIR inside the permitted workspace. Full TypeScript,
   frontend build, React/browser rendering and navigation regression are
   NOT_RUN: npm offline install cannot obtain zod@4.6.5; network clone also
   fails. No dependency substitutions or weakened tests.
3. Image/SBOM/security: the existing manual workflow already publishes the
   same tested image as a non-deployable GHCR candidate, checks the remote
   digest, rescans it and verifies provenance/SBOM against source SHA.
   Latest observed successful run 36644672551 used
   69cd56c45854d57a1a24479c4a9b8bf398b65463, not the new main.
   No Docker daemon or workflow-dispatch tool is available here.
   Exact-current-source image, SBOM and security validation remain NOT_PROVEN.
4. Render: workspace tea-d90o4rj7uimc739i86ug, service
   srv-dau1rp893c1s73cdhm1g (Capital-AI), Free/Frankfurt, one instance,
   autoDeploy:no / trigger:off, /healthz, previews off.
   Latest provider-reported live deploy dep-dau5oumgekts73d2rgk0 uses
   d646a1bd7f9df9cac3fd921302c88e9651f899fe (PR #17).
   Service metadata still specifies Git-backed Docker runtime. The configured
   registry credential does not prove an immutable GHCR image source.
   Runtime digest/source identity and live frontend are NOT_PROVEN in this
   turn; no new HTTP/header inspection or deployment was performed.

## Release continuation boundary

Keep the PR draft until TypeScript/build and browser checks are available.
After the final source is merged, run the existing build-security workflow on
that exact trusted source; publish_candidate=true creates only a candidate.
Do not use an earlier source's image evidence for this change.

Before promotion: complete image/license/provider-rights gates, verified
Redis/NATS runtime and real feed end-to-end evidence, and chosen OIDC runtime
configuration where authentication is enabled. No Supabase connection is
assumed. Then correlate the accepted artifact digest with the Render image
source and provider deployment identity. No paid resources were provisioned,
no workflow was dispatched and no deploy or secret/IAM mutation was performed.
