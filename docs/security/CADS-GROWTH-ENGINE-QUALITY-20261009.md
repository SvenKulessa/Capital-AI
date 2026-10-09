# CAPITAL-AI CADS × Content Engine × SocialMediaEngine — technical assurance slice

**Date:** 2026-10-09 · **PR:** #340 · **Status:** DRAFT / NOT_PROVEN until hosted check conclusions.

## Intent

Reuse the existing first-party CADS benchmark-core and canonical Content-/Social contracts.
The `CAPITAL_AI_CADS_GROWTH_QUALITY@1` contract checks mechanically verifiable
boundaries, without inventing a new security gate, parallel publisher, paid CADS service,
or implying commercial CADS entitlement for end users.

### Data flow

```mermaid
flowchart TD
 A["ContentCampaignBrief / source SHA"] --> B["ContentEngine planner"]
 B --> C["CADS draft quality report"]
 C --> D["Content Studio evidence display"]
 E["MediaProjectV2 + RenderedAsset"] --> F["SocialMediaEngine Publisher Bridge"]
 F --> G["CADS media and asset identity checks"]
 G --> H["Existing hash-bound Social Publisher Handoff"]
 H --> I["Existing human approval + real provider gates"]
 J["Local brand token manifest"] --> K["3 SVG asset bytes"]
 K --> L["CADS hash-tamper + SVG-surface tests"]
 ```

### Contracts and test cases

| Area | Verifiable technical condition | Scope boundary |
| --- | --- | --- |
| Content identity | source commit SHA, campaign ID, audience, channels | URLs checked for HTTPS syntax only, **not actual source authority** |
| Media draft | official brand token source, `publishReady=false`, disclosure | Renderer byte identity and actual ownership **NOT_PROVEN** |
| Asset | source SHA/content ID correlation, digest format, MIME allowlist | checksum field alone is **not** evidence that actual bytes match |
| Static badge | actual SVG byte SHA256 equals manifest, accessible title/desc, no external imports/scripting | format-level check only; browser/mobile and license **NOT_PROVEN** |
| Mutation | invalid HTTPS, source mismatch, content mismatch, weak signatures, brand changes | does not claim penetration testing |
| Measurement | Node.js microbenchmark samples with p95 printed | **informational, not SLO or production latency** |

The real byte-to-digest comparison is limited to the repository's three
new static screener badges. Future runtime media rendering still requires
a trusted byte-level hash computed by the renderer, not just the manifest string.

### Code surface

- `packages/benchmark-core/growth-quality.mjs`: pure CADS checks reused by both engines.
- `src/contracts/contentEngine.ts`: evaluates and attaches `cadsQuality` on draft campaign planning.
- `src/platform/SocialMediaEngine/Publishing/MediaProjectPublisherBridge.ts`: evaluates project boundary and asset identity before bridging to existing publisher.
- `src/features/studio/ContentStudioPanel.tsx`: displays scope-limited CADS status; **not** a full CADS enterprise app.
- `scripts/cads-growth-quality.test.mjs`: contract, tamper, property/mutation, hash and measured p95 tests.
- `package.json`: `npm run test:cads-growth` and inclusion in `npm test`.
- `Dockerfile` / `.dockerignore`: include new growth test scripts in the existing isolated build. No dependency, IAM, secrets, new cloud service or provider mutation.

### Trust / IP / compliance

All scores are separate from `CADS` code quality diagnostics; CADS is not
the market Scorer and cannot affect factor weighting or rank authority.
CADS PASS is not security, license, marketplace, regulatory or production approval.
Product license and third-party notices remain separately scoped.
No personal analytics or provider BYOK data is processed in these CADS checks.

### Modern practice alignment (2026-10-09)

- OWASP ASVS 5.0: allowlist validation, limits, input trust boundaries, error/data leakage controls.
  https://github.com/OWASP/ASVS
- W3C WCAG 2.2: text alternatives and accessible data visualization.
  https://www.w3.org/TR/WCAG22/
- Artifact provenance: digest binding to actual bytes rather than merely a string.
  https://slsa.dev/spec/v1.0/provenance

The test suite is an initial targeted contract/negative-test layer, not a claim of
independent audit, fuzz certification, full browser penetration testing, formal
coverage percentage or trusted production report.

## Costs / alternative

Reuses existing Node, `node:test`, TSX, Docker, CI and CADS core; no new dependency
or paid account. GitHub Actions and Docker CI execution consume ordinary quota and
remaining free minutes are **NOT_PROVEN**.
Alternative: run independent standalone CADS endpoint/service; rejected for this
slice because it adds network, IAM, paid-runtime and tenant-rights complexity.
