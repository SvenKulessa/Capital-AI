# I18N-04 — Production browser evidence and language controls
Base: `main@22ffb122592260b2d4a8f181963403fc917b88ce`, 2026-10-08.
Owner: CAPITAL-AI-GROWTH; related: PRODUCT, PLATFORM, TRUST.

## Code
- Reuse the existing `LanguageSwitcher` on public auth/reset/MFA screens and authenticated account shell.
- Add a read-only *optional* GitHub Actions browser readback for six locale roots in actual headless Chromium at desktop 1440x900 and mobile **emulated** 390x844.
- HTTP checks observe country/cookie vary, manual preference, path override, `Content-Language` and intentionally withheld canonical/hreflang, `noindex` and `/healthz`.
- Browser checks use only public pages; no authenticated actions, provider keys or user-specific data.
- Workflow is independent of Docker Security Gate and Domain Governance. No new required CI check.

## Evidence boundaries
- PR CI tests Production as deployed at test time, not the PR's unmerged UI changes. Auth language selector therefore requires post-merge rerun for proof of live behavior.
- Browser DOM and viewport checks are **not** native Safari/iOS, screenshots, keyboard navigation, human click tests or a true geolocation test.
- CF-IPCountry availability through CDN/Render can only be proven at trusted ingress, not through client-crafted headers or offline tests.
- `/de/`, `/en/`, `/it/`, `/fr/`, `/pt/`, `/es/` stay NOINDEX until full visible content, eligible finance claims, appropriate legal review, correct canonical, structured data and hreflang are available.
- Conservative alternative: continue I18N-03 static server tests without optional browser CI; fewer CI minutes but no external browser evidence.
- GitHub Runner minutes and account-specific prices/quotas: NOT_PROVEN. No package install or paid resource/plan activation.
- Success: GitHub workflow yields PASS against observed Production SHA; no claim of native device or TRUST legal approval.
