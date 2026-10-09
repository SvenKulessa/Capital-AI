# Private Google Neural2 Voice-over — Social Media Engine

**Status:** IMPLEMENTED_DISABLED / REVIEW_REQUIRED
**Date:** 2026-10-09 · **Owner/private use only**
**Contract:** CAPITAL_AI_SOCIAL_NEURAL2_PRIVATE@1

## Purpose

The earlier CAPITAL-AI Pattern Academy shorts used poor-quality eSpeak German voices. This patch provides Google Cloud Text-to-Speech Neural2 as a new **private owner-local voice source** for the Social Media Engine, without changing public endpoints, OAuth, production billing, Render flags or social publication authority.

No provider API calls are performed by CI or merely by merging this PR. No model weights, third-party voices, public routes or automatic posting are activated. Previously removed OSS audio models stay removed.

## Architecture

Private approved text → Neural2 EU endpoint → private WAV + SHA-256 evidence → listening review → existing scripts/media/render_content_assets.py voiceover binding → new MP4 and asset SHA → Social Media Engine approval/publisher (independently controlled).

Source: server/social-media/google-neural2-tts.mjs. Local runner: scripts/media/private-neural2-voiceover.mjs.

- The only voice IDs allowed are **de-DE-Neural2-H** (male) and **de-DE-Neural2-G** (female).
- Google API host is hard-coded to https://eu-texttospeech.googleapis.com/v1/text:synthesize.
- OAuth bearer token is obtained privately through gcloud auth print-access-token or an ephemeral shell variable. Tokens and credentials are never committed or written to evidence.
- Google project identity and x-goog-user-project quota header are bound to the verified usage readback project.
- Plain text only, max 4,000 UTF-8 input bytes, LINEAR16/WAV. Input/outputs are content-/hash-bound; generated output is always REVIEW_REQUIRED, publishReady=false.
- Existing renderer requires full audio SHA verification and **explicit owner listening acceptance PASS** before the voiceover will render. No review is forged.

## Neural2 Free Tier and risk boundary

Google Cloud's published Neural2 tier includes **1,000,000 characters/month** without usage fees, with **US$16 per million characters thereafter** (checked 2026-10-09). Cloud billing must be enabled even for free-tier calls. Actual account balance, tier eligibility and service status were not verified.

Private code uses an **800,000 UTF-8-byte-equivalent monthly upper limit**, deliberately less than Google's public threshold. It requires a **Google Cloud Console/Monitoring month-to-date usage snapshot no older than six hours** for the same project. Each attempted local request is reserved in a file-lock protected ledger BEFORE any network call. Failures/timeouts are conservatively counted and not retried automatically. Existing local requests plus external month-to-date usage are added, potentially double-counting but never subtracting.

This local upper limit **is not a guarantee of zero charges**: external Google workloads, delayed provider statistics and other billing consumers are not controlled. Use a dedicated project, minimized IAM, provider-managed restrictions where available and Cloud billing alerts; alerts are not a hard spending block. Never enter a fabricated zero for external used characters.

## Private owner setup — no project activation performed by this PR

1. 👋⚙️ Select a dedicated Google Cloud project, inspect month-to-date Neural2 usage and billing eligibility in its Cloud Console. Enabling billing or a paid service is a separate owner action.
2. Authenticate locally: gcloud auth login; gcloud config set project YOUR_GOOGLE_PROJECT.
3. Set these private environment variables (no .env files committed):

   SOCIAL_NEURAL2_PRIVATE_ENABLED=true
   SOCIAL_NEURAL2_FREE_TIER_ONLY=true
   SOCIAL_NEURAL2_PROJECT_ID=YOUR_VERIFIED_GOOGLE_PROJECT
   SOCIAL_NEURAL2_EXTERNAL_READBACK_PROJECT=YOUR_VERIFIED_GOOGLE_PROJECT
   SOCIAL_NEURAL2_EXTERNAL_USED_CHARS=REAL_CONSOLE_MONTH_TO_DATE_CHARACTERS
   SOCIAL_NEURAL2_EXTERNAL_READBACK_AT=REAL_READBACK_UTC_TIMESTAMP
   NODE_ENV=development

4. Preview without calling Google:

   node scripts/media/private-neural2-voiceover.mjs --request CAPITAL-AI-GROWTH/neural2-requests/cup-and-handle-educational.json --dry-run

5. When the real quotas and billing have been verified, execute privately:

   node scripts/media/private-neural2-voiceover.mjs --request CAPITAL-AI-GROWTH/neural2-requests/cup-and-handle-educational.json --execute

WAV and *.review.json files are written to the private location at ~/.capital-ai/private-social-audio/. The month-by-month private usage ledger is at ~/.capital-ai/private-social-audio-usage-ledger.json. Four reusable request JSONs cover Cup-and-Handle and Double Bottom, each with educational and referral variants; candidateContentHash is the respective earlier video asset hash.

6. Listen to the *entire* audio, including numbers, disclaimer and pauses. Check that its duration fits the short (FFmpeg padding/trimming is not a listening test). An output is REVIEW_REQUIRED. After genuine listening and rights review, place the voiceover object in a **private** render manifest located alongside its audio file; replace the pending listening reference with a genuine one and set acceptanceStatus to PASS by owner decision. The existing renderer rejects unreviewed or SHA-mismatching voiceover objects.

   python scripts/media/render_content_assets.py --manifest ABSOLUTE_PRIVATE_RENDER_MANIFEST.json --out-dir ABSOLUTE_PRIVATE_OUTPUT_DIR --video

7. A new video/audio mix requires a **new asset SHA-256 and approval reference**. Existing TikTok/YouTube provider authority stays unchanged. Referral promotion remains separately review-required; this TTS implementation cannot publish.

## Tests

Run: npm run test:social-neural2

The node:test suite mocks the provider and exercises region/voice allowlists, private flag, usage snapshot freshness, budget limit, no automatic retry, local ledger and SHA/approval state. The standard npm test chain includes the suite. **Real provider TTS, voice naturalness and billing remain NOT_PROVEN** until a separate private owner run. GitHub Required Checks remain Docker Security Gate and Domain Governance.

## Google primary documentation (checked 2026-10-09)

- Pricing: https://cloud.google.com/text-to-speech/pricing
- Voice IDs: https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types
- EU endpoints: https://docs.cloud.google.com/text-to-speech/docs/endpoints
- REST API: https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
- Authentication: https://docs.cloud.google.com/text-to-speech/docs/authentication
