# JaJa Avatar Buddy — PRODUCT continuation (2026-10-09)

Status: IN_PROGRESS. This is an implementation scope record, not a production-readiness claim.

## Baseline and source of truth

- Branch: `capital-ai-product/jaja-avatar-buddy-20261009` based on `main`.
- Repository policy: root `AGENTS.md` only.
- Existing website UI: `src/components/HeroBuddy.tsx`, `src/app/AppShell.tsx`.
- Existing local Chat Buddy: `Chat Buddy/src/`; voice presets exist in `Chat Buddy/src/voice.ts` but **voice is not to be wired**.
- Existing read-only endpoints: `/api/chat-buddy/keys`, `/api/chat-buddy/learn`.

## Confirmed product requirements

1. Replace the current circular 2D Hero Buddy mark with the provided JaJa character media (`grok_video_2026-10-09-02-23-31.mp4`) after the actual source file is accessible and provenance/licensing can be assessed.
2. Produce a transparent-background deliverable from the supplied character source; avoid claiming alpha transparency from ordinary MP4 video. Use a documented matte/cutout pipeline and appropriate browser-compatible transparent format if feasible.
3. Preserve existing open/close, positioning, hiding, keyboard support and motion-reduction behavior. Provide fallback static image for unsupported motion/video and reduced-motion users; keep meaningful accessible labels and WCAG-compatible focus/contrast.
4. Do **not** integrate speech synthesis, speech recognition, Gemini voice API or any billable TTS service. Any future eight-voice concept remains deferred and must not be represented as implemented.
5. Domain-wide skills are only accessible through explicitly registered, authorized server-side capabilities; never claim arbitrary repository skill text grants execution rights. Owner-only site quality checks require server-verified owner identity, strict allowlisted read-only checks, audit records, and tenant isolation. No client-supplied `isOwner` trust.
6. Keep provider API credentials and billing data server-side. No live deployments outside the normal `main` path and no extra required checks.

## Acceptance criteria

- Character asset physically present with verified rights and tested alpha/matte edges on dark and light surfaces.
- Responsive layout tested at narrow and desktop widths with keyboard, screen reader labels and reduced motion.
- No speech permissions requested, no voice API calls and no billable inference triggered by opening the buddy.
- Existing chat flow, safe local answers and navigation actions still work, including failure/empty states.
- Owner QA endpoints deny anonymous and non-owner users; auth and negative tests demonstrate this.
- Required GitHub checks `Docker Security Gate` and `Domain Governance` green on the exact PR head; production separately verified after owner-authorized merge.

## Known blocker

The referenced video is present in an earlier conversation, not yet available as a byte-addressable file in this GitHub connector workflow. **Do not fabricate or substitute a character image.** The existing 2D mark remains until the user-supplied asset can be processed and tested.
