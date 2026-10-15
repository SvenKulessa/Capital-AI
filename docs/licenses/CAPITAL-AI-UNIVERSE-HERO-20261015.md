# CAPITAL-AI Universe Hero – Asset Rights and Provenance

Date: 2026-10-15 · LicenseRef-CAPITAL-AI-UNIVERSE-HERO-1.0 · PRODUCT/GROWTH

## Source and scope

Four owner-directed, AI-assisted graphics were created in the CAPITAL-AI project chat, in desktop (1672×941), tablet (1448×1086), smartphone (941×1672), and transparent globe (1254×1254) compositions. Original PNGs reside under the owner's connected Drive folder `GROWTH/10_Media/30_Artwork/2026-10-15_Universe_Hero`.

The repository contains four optimized **WebP raster exports**, plus `hero-universe-orbit.svg`: a separately constructed, simplified and genuinely vector-based illustration using original geometric SVG paths, gradients and orbit circles. This SVG **is not** a lossless vector conversion of the highly detailed AI-generated raster artwork. SVG animation uses CSS and honors `prefers-reduced-motion`. No remotely loaded assets, scripts, external fonts or third-party icons were added.

The silent 12-second local promotional preview is deposited in owner Drive `GROWTH/10_Media/20_Exports/CAPITAL-AI_Universe_Intro_12s_16x9.mp4`. No automatic YouTube/X publishing or JaJa video inclusion occurred.

## Rights

CAPITAL-AI-directed, product-specific proprietary brand use is intended; all rights reserved **to the extent legally protectable**. No permission is given here for unrelated third-party re-use, resale or white labeling. A chat approval cannot itself prove exclusive copyright eligibility of AI-generated pixels, trademark registration, or ownership of any third-party matter in inputs. Actual image-generator terms, third-party contributions and commercial use obligations remain subject to separate review; no sponsorship by Google/Gemini or another provider is claimed.

The OWNER/ENTERPRISE badge license is separate. No badge, Founder status, partner entitlement or commercial marketplace license is granted by this graphic.

## Integration and authority

- Website: `src/components/Hero.tsx` presents breakpoint-specific WebP in `picture` with a small SVG vector accent; original CTAs and text remain real DOM text.
- Media Studio: `src/platform/SocialMediaEngine/Editing/MediaStudioTemplates.ts` references the same canonical asset and shared token authority. `publishReady` remains false by default.
- Gold value: `#F5C453` per `src/index.css`; no new color authority.
- Accessibility: images are decorative with empty alt, vector animation can be disabled by `prefers-reduced-motion`, responsive/focus/browser QA still requires real readback.
- No provider credentials or private media links may be embedded.

## SHA-256 of optimized rasters

| Asset | SHA-256 |
|---|---|
| desktop WebP | `9433f67916217a50ef5e3cff79e93559f45e48f3bfc244aace67d22227896bbc` |
| tablet WebP | `eb7177ff4976c73c07025119e5711c6f282d1cb59550176579dbc4774e2ab189` |
| mobile WebP | `5e8f68fe961efb42120d95d5075f6d0a5060fbcd76c75c68132d78b74d815b82` |
| transparent globe WebP | `d510ac752e79314d69475a7645c554625b86ed676b0b04aabbc2869599de8eb4` |
| silent preview MP4 (Drive) | `417d26137812e418dc61748b6c07a1c5060c471365e5624c31f52c6b23006625` |

State: ASSETS_IN_REPO; responsive browser QA NOT_PROVEN; Production NOT_PROVEN; external commercial distribution REVIEW_REQUIRED. Rollback via normal PR revert; originals remain unchanged.
