# CAPITAL-AI Learning Mastermind / verified provider avatar – implemented slice
Date: 2026-11-16 · Domain: PRODUCT · contract: SOLO_MAINTAINER_FLOW@2

## Repository baseline
- Main commit at branch creation: `136bfec79d0beedeee71ab25e01c304a2bc7b453`.
- Existing canonical licensed Mastermind badge: `public/branding/badges/learning-mastermind.svg`, 256 × 256, with SHA-256 in `docs/licenses/capital-ai-badges.manifest.json`.
- Existing entitlement gate: `src/features/learning/LearningEntitlementBadge.tsx` reads `/api/billing/vocabulary/access` and requires `quantProEntitled === true`. It remains unchanged.
- New 300 × 100 reference: an offline **presentation card**, *not* a replacement for the canonical square badge.

## Actual changes
1. Extracted server allowlist to `shared/account-avatar-policy.mjs`; same policy gates the authenticated profile UI and server fallback.
2. The profile page and account-page header now render the verified, allowlisted provider picture (Google, X/Twitter, Notion) or an accessible icon fallback. No unsanitized URL, no referrer, no avatar-based role inference.
3. Server fallback prioritizes a validated same-origin custom avatar path, then the currently authenticated OAuth provider (if known). It rejects stale pictures from a different provider and remains presentation-only.
4. Added a deterministic, dependency-free SocialMediaEngine presentation-card renderer, using the existing seven offline Universe palette tokens. Strict allowlists: 3 sizes × 11 glow settings × 2 statuses = 66 combinations; malformed options and unadmitted tokens fail closed.
5. Added `npm run test:assets` to existing `npm test`. Also added entitlement-asset provenance, provider-scope and XSS/URL negative tests.

## Security boundaries and remaining independent upload work
- **No actual photo upload, scan, storage migration, server upload endpoint or production deployment is claimed in this PR.** The existing `/api/profile/avatar/*` path is a validated display URL contract; this PR does not create a storage service.
- A follow-up upload PR needs authenticated same-origin POST/DELETE/GET; max 2 MB before decoding, bounded pixel dimensions, **actual image decode and safe re-encode** (PNG/JPEG/WebP, no SVG), malware scanning that fails closed, per-user private Supabase Storage with RLS and authenticated proxy, immutable per-upload SHA-256 metadata, rate bounds, tenant A/B negative tests, deletion/rollback and privacy review.
- **VirusTotal Public API is not eligible for a commercial upload feature**, per https://docs.virustotal.com/reference/public-vs-premium-api . Neither that API nor a paid service is installed or invoked. Do not claim zero false positives, virus-free files, EU AI Act conformity or pixel-identical output without actual evidence.
- A scanner such as self-hosted ClamAV would need deployment/engine/signature lifecycle, safe failure modes and executable positive/negative integration evidence. Dependency licensing and available Render capacity must be checked before adoption.
- No new OAuth permissions, profile write permissions, public Storage bucket, Valkey keys, deployment workflow or CI required gate.

## Verification
- Offline renderer input/output smoke executed against fetched branch source: 66 options produced stable SVG; 4 malformed inputs rejected.
- GitHub `npm run test:assets`, `npm run lint`, existing Docker Security Gate and Domain Governance remain **NOT_PROVEN** until their actual PR runs are complete. Do not treat PR creation as a green gate.
- Rollback: revert PR commits. Existing static badge, entitlement RPC, storage and checkout paths are untouched.
