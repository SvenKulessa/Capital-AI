# CAPITAL-AI — Universe SVG exclusion and Learning Hub media delivery (2026-10-15)

Status: **LOCAL_RENDER_VERIFIED / DRIVE_REPLACEMENT_VERIFIED / PRODUCTION_UI_NOT_PROVEN / COMMERCIAL_RIGHTS_REVIEW_REQUIRED**

## OWNER product requirement
The exact Drive asset [`hero-universe-orbit.svg`](https://drive.google.com/file/d/1rh1rmNveXTv-xssqgTZXbnMWLxeMf53q/view) remains a reusable first-party branding/vector *accent* in `public/branding/universe/` and the Social Media Engine templates, but **must not be rendered on the public homepage**. The responsive raster `hero-universe-desktop.webp`, `hero-universe-tablet.webp` and `hero-universe-mobile.webp` remain in the homepage hero. The change is restricted to the SVG overlay, without changing login, CTA or payments.

## Rendered owner-review assets
Local FFmpeg/Pillow creative render from previously supplied CAPITAL-AI images and owner-owned / owner-authorized Drive footage. New intro is silent (AAC silent track), does **not** claim approved marketing narration or a music license.

| Drive file (unchanged file ID) | SHA-256 of new local master | Size | Duration | Notes |
| --- | --- | --- | --- | --- |
| [Universe Learning Hub Intro 30s](https://drive.google.com/file/d/1RBRnTIrdV5CZt189RywgbFXTYZWjmgK1/view) | `f6d514dbc3984c08883c38dcce8a098a54ec79c27e11eb6b917595069905668b` | 7,749,035 bytes | 30.00 s | Six 5-second sections; gentle camera zoom, gold light sweeps, fade transitions |
| [Chartanalyse Episode 02 Final](https://drive.google.com/file/d/12DuCys-xhQzLCzSYmydRr4UtFTpZVZtl/view) | `c8d78976bf9d4a6ac2b49f3b2cfb834035e0486c89bdcc07cadf22a4c245780a` | 33,051,735 bytes | 449.02 s | Legacy end segment cut; site-branded footer and new 8s outro |
| [Chartanalyse Episode 03 Final](https://drive.google.com/file/d/15oJVC8l4NSlkseBbZ1ycdlmkYBtez5Rv/view) | `f8f632dff3f4e2413c0061a6f6d6123f5996fb01eccddf60a544c802ca50e672` | 28,327,609 bytes | 395.02 s | Legacy end segment cut; site-branded footer and new 8s outro |

The source file IDs in Drive were preserved by a verified Google Drive **in-place raw-byte replacement**, including renamed current titles; three short-lived transport copies were verified and then deleted. No manual upload or republishing was performed. The earlier 12-second intro and two older `Branded` masters were replaced in place. Exact SHA-256 comparison of Drive bytes after update is **NOT_PROVEN**; provider metadata readback confirms IDs, names, sizes, and replacements.

## Intro storyboard

0–5s: premium CAPITAL-AI universe/globe, branding and website URL.  
5–10s: LEARNING HUB: learning paths, finance glossary and methods.  
10–15s: CHARTANALYSE: synthetic demonstration chart, not live market data.  
15–20s: BLUEPRINT EXPLORER: data -> model -> score with explainability context.  
20–25s: JAJA BUDDY: five-second scene cropped from the private Grok-produced JaJa sample in `GROWTH/10_Media/10_Source`, embedded inside first-party framing, muted.  
25–30s: CAPITAL-AI conclusion and `https://capital-ai.online` in gold.

Presentation video includes animated zoom, additive gold streak and 0.3s fades. No voice, no billable TTS, no financial performance predictions. MP4 is 1280x720 H.264 + AAC silence.

## QA and rights

- Automated `ffprobe` confirms MP4 stream codecs, audio presence, dimensions, sizes and durations.
- Frame sampling at scene boundaries and midpoints confirms expected screens, new end-card and video placement. This does *not* constitute full-frame watermark absence proof; existing third-party marks hidden in other individual frames, original speech/music rights, and audio intelligibility are **NOT_PROVEN**.
- Intro uses the owner-supplied Grok JaJa source as expressly requested. Its commercial distribution remains subject to generator terms, account plan and rights review in `docs/product/JAJA-AVATAR-ASSET-LICENSE.md`. This remains **REVIEW_REQUIRED**, not a claim of licensed creator endorsement.
- Any generated or third-party image/video asset must be reviewed before ad-funded, affiliate, or retail publication. Refer to `docs/licenses/CAPITAL-AI-UNIVERSE-HERO-20261015.md`, `docs/licenses/CHARTANALYSE-LEARNING-MEDIA-RIGHTS-20261014.md`.
- The complex gold globe is an owner-provided raster composition. The simplified orbit SVG is a vector; this does not grant rights to third-party components.
- The video files were produced locally for owner review, **not** by a proven production SocialMediaEngine render worker or automatic publisher.

## Acceptance and rollback
1. Verify homepage source contains no `hero-universe-orbit.svg` markup; preserve responsive raster hero and motion-reduction styles.
2. Required CI for this change: Docker Security Gate, Domain Governance; browser accessibility CI when applicable.
3. Verify actual production browser display on desktop/tablet/phone after normal main deployment.
4. Owner reviews video thumbnails, full audible episode bodies, marks and terms before authorizing publication.
5. Rollback for website: revert PR. Original video versions can be retrieved only if the Drive revision is still recoverable, so no automatic rollback is assumed; local original pre-edits remain the source of truth.

## Content monetization boundary
Products, Learning access and prospective Founder / Enterprise tiers remain subject to existing entitlements and rights. This doc does not create a founder membership, license to market data, exclusive copyright or a commercial-use sublicense for Grok generated media.
