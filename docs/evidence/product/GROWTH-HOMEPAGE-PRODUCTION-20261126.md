# Growth Intelligence Homepage – Production Evidence 2026-11-26

## Owner-provided AcodeX observation
- Public anonymous GET /healthz: HTTP 200, status ok; TTFB 0.255635 s, total 0.257335 s. Single Android terminal request, not homepage LCP, CLS, INP or population p75. Transcript supplied 2026-11-26; exact measurement timestamp not recorded.
- Runtime and unattested Render Git build SHA: 28dec454c626712c97449fe065f8d3b3a2c01404. BuildIdentity bound=false, sourceSha=null; no OCI attestation.
- Ingress fail_closed; quotes disabled; infrastructure unavailable; scoring display disabled. HTTP 200 does not imply complete subsystem health.
- Render AICapital deploy dep-dc42g2m0tbcc73cgfa3g live, finished 2026-11-26T12:40:50.977496Z, same SHA as observed Main. #971 merge 2f3994c2650d359c14e979aa1b4b3dd3db400d7f is ancestor (20 commits ahead, zero behind).
- #943 merged; reuse its Chromium CDP harness. #971 browser run 45631740567 is isolated software-WebGL, not native device or live homepage proof.

## Reproduction
Run with existing Node with built-in WebSocket support and Chromium on an authorized network-connected host. Use actual Render live SHA; not a stale Main SHA. Explicit production-home mode reads public homepage, canonical globe image, and /healthz only; fresh anonymous profile, necessary-only consent, no login. Identity checked before/after; mismatch is NOT_PROVEN. No extra workflow, scheduler, provider, payment or deploy.

```sh
CAPITAL_EXPECTED_MAIN_SHA=28dec454c626712c97449fe065f8d3b3a2c01404 CAPITAL_AI_CHROME_BIN=chromium \
  node scripts/product-accessibility-browser.mjs https://capital-ai.online/ --production-home
```

## Evidence boundaries
- LCP, CLS and TTFB: initial navigation lab observations before consent/scripted input; emulated viewports, unthrottled network/CPU, production cache disabled. Scripted Event Timing maximum is a diagnostic sample, never field INP. Missing values remain null.
- Complete article, seven pipeline badges/buttons, original globe, named touch targets and overflow checked. Existing isolated CI reuses the same structural check. Production-only mode adds all stage keyboard selections, asset SHA-256, observed software-WebGL frame change, pause control state and poster return.
- Native Android GPU/TalkBack, full WCAG conformance and real-user p75 remain NOT_PROVEN. No screenshots persisted by the production mode. Audit-only rollback via PR revert; no runtime, IAM, DB, provider or pricing changes.
