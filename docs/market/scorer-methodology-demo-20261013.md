# Enterprise Scorer Methodology Demo

Base: b57ac791859691d77d9c6692ca409fb99d18aa09. Historical reference:
SvenKulessa/Finance c08a68bdfdeaa91cb8ba974b5a1829bf00fe61bb,
src/services/cryptoScoringService.ts (2026-08-16).

The public overview retains index/volatility cards and offers an expandable
educational profile. The Scorer tab displays the same profile before the real
unavailable analysis. This is one versioned, explicitly synthetic ten-factor
Krypto learning contract, never the six-family canonical production contract.
Every factor, its 0–100 scale, nominal/effective weight, risk inversion and
contribution uses the same metadata. Exchange liquidity is included. No asset
is assigned a synthetic rating. Partial coverage is explicitly incomparable;
coverage is neither measured accuracy nor calibrated confidence. No factors
produces null, while an available genuine zero remains zero.

Neutral numeric bands share the historical backend boundaries 90/80/70/60.
Trading labels, rankings and trade zones are not exposed. Existing real-score
publication gates remain intact; an absent source stays unavailable after the
freshness window rather than changing into stale/degraded data.

Learning links target /learning?tab=glossar and
/learning?tab=glossar#learning-offer. Existing consent, authentication, price,
Stripe checkout and server entitlements are reused without changing them.
The offer copy distinguishes vocabulary access from separate chart tiers.

## Executed local evidence

- npm run test:analysis-ui: 17 PASS, including independent 74.08, 71.111111,
  inversion 90, missing/null vs zero, invalid factors, exact thresholds,
  accessible labels and Learning targets.
- npm run test:navigation: 38 PASS.
- npm run test:learning-portal: 47 PASS across its three suites.
- npm run lint: TypeScript + FRONTEND_BOUNDARIES_PASS.
- npm run build: PASS, acyclic chunks and existing 500kB budget enforced.
  Existing node:crypto browser externalization warnings remain; the demo does
  not invoke these research functions.
- node --check scripts/scorer-methodology-browser.mjs and git diff --check: PASS.

## Browser evidence

NOT_PROVEN locally: cloud browser rejects terminal.local with
ERR_BLOCKED_BY_CLIENT. Chromium is absent and its official download returned
an invalid ZIP. No screenshot, Android recording or WCAG certification is
claimed from these attempts.

Existing Financial Learning Simulator Browser QA workflow is extended without
adding a new required check or npm dependency. ffmpeg is installed from the
runner Ubuntu package repository only when absent. It builds the exact PR tree, starts
an isolated local server, then runs scorer-methodology-browser.mjs with its
installed Chrome. Scope: 320/390/768/1440, three scenarios, native keyboard
select, AX name, 44px controls, overflow, 200% text enlargement, reduced-motion
preference, overview expansion, existing Learning offer and unselected consent.
An MP4 is encoded from actual Chromium screencast frames with ffmpeg. This is
a Chromium mobile viewport demonstration, not native Android or TalkBack.
Run 38424976745 proved all four viewport/scenario/keyboard/text checks and
the Learning transition; recording encoding failed because ffmpeg was absent.
The workflow now installs that encoder; the corrected head must rerun all CI.
The recording uses five frames/second playback; source frames are event driven,
so playback does not measure interaction timing. Missing browser/ffmpeg or
failed assertions fail the job. Artifacts retain screenshots, recording and
JSON for seven days. No login, real purchase or provider mutation is executed.

Merge requires current-head applicable CI including Docker Security Gate and
Domain Governance plus actual browser results. Production health/source and
live UI remain NOT_PROVEN until after ordinary main deployment. Rollback:
revert the scope commit; no data migration or external enablement required.
