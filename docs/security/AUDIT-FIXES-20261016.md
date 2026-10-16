# Audit fixes: SHA-256, executable tests and internal glossary indexing

Baseline: `50255bcc20d4661021e010efb19224982430ce80` (Main, 2026-10-16).
Implementation status: repository changes; merge, production deployment and search-engine recrawl remain separate observations.

## Integrity

`sha256Sync` retains its synchronous browser/Node API. It now encodes strings as UTF-8 and creates a fully zero-initialized, correctly padded message with both length words. Sparse message words previously introduced `undefined`/`NaN` into the schedule, even for `abc`. UTF-16 code units were also incorrectly treated as bytes.

`src/utils/merkleTree.test.ts` checks fixed standard vectors (including a million ASCII `a` characters), padding/block boundaries, Unicode and lone-surrogate encoding against Node and Web Crypto. Independently computed odd-leaf Merkle roots and tampering failures check the calling convention. Existing leaf/parent serialization is preserved.

Previously generated roots from the defective routine differ and must not be described as standard SHA-256 evidence. There is no silent legacy-verification fallback or automatic rewriting of stored evidence. The identified consumer is the paper-trading engine; this is not a claim of a production signature compromise.

Alternative considered: native asynchronous Web Crypto. It would require changing synchronous Merkle/paper-trading callers. Correcting the existing bounded implementation and checking it against both native engines avoids that unrelated API migration and adds no crypto dependency.

## Test execution and causality

The audit's 25 wiring candidates comprise 23 Node test files plus two export-only suites. `test:audit-regressions` runs the 23 files, the new hash/guard tests and the changed dependency-policy regressions. The existing contract collector now calls and checks Storage and Merkle/Paper Trading alongside its previous suites.

The existing **Docker Security Gate** runs the additional command in its already-built, pinned dev image. Read-only source/fixture mounts preserve the minimized image context; network access is disabled, capabilities are dropped, and no second installer/toolchain is introduced. Existing broker integration cases retain their prerequisites and skip without test infrastructure. NATS/Rust services are not activated or deployed by this change.

The legal SSR test disables browser-only dependency discovery. Otherwise Vite starts an unnecessary asynchronous Three.js prebundle, filling the bounded CI cache after the SSR assertions have finished. The actual legal rendering assertions remain unchanged; only Vite's config loader has a bounded writable temporary cache.

`verify-test-wiring.mjs` discovers own Node tests under scripts, server, src, apps, packages and .agents, and resolves workflow/Docker commands, package-script chains, explicit/glob file selection and relative TypeScript imports. It rejects unreferenced files and imported legacy `run*Suite`/`run*Tests` exports without calls. Fixtures distinguish COPY/comments/file reads, erased type imports, unused functions and unused manual aliases from execution references.

This is a reference guard, not a general shell interpreter, whole-program execution proof or record of conditional CI completion. Python and Rust retain their existing language-specific workflows. No new Required Check, ruleset, approval or domain handoff is introduced. The live ruleset still needs to be respected independently.

## TypeScript 7 review

See [the reviewed artifact](evidence/dependency-decisions/typescript-7.0.2-review-20261016.json).
The wrapper/native archive integrities still match the exact known-blocked 7.0.2 candidate. The native archive's SHA-512 was checked; the extracted compiler's SHA-256 is now persisted. Its embedded metadata still identifies Go 1.26.4 and x/text 0.38.0. A current Trivy 0.75.0 rootfs scan with an explicit Go-binary pattern recognizes ten compiler packages and retains **13 HIGH findings**.

The initial filesystem scan had no binary coverage and was not accepted as clean. Historical symbol reachability is retained for the identical archive; no fresh govulncheck or `not_affected` claim is made. The downloaded compiler was not executed.

TypeScript **6.0.3 remains installed**, 7.0.2 remains **BLOCKED**, and the suppression remains exact-version-only. The reviewed decision now expires on **2026-10-30**. Renewal validation binds the deadline and evaluation time to the reviewed integrities, binary digest and nonempty scan coverage; merely moving the date fails its regression test. Actual expiry is still monitored by the existing daily workflow, rather than adding a calendar-based block to every normal PR.

## Targeted SEO behavior

All 29 current `/vocabulary/capital-*` definitions remain readable with HTTP 200, but the central policy classifies the family as NOINDEX. Server and client consume that policy. The indexable content/AI-search manifest and XML sitemap omit those entries; server HTML emits noindex without URL-specific canonical/JSON-LD promotion. Existing agent-discovery links continue to use the admitted public inventory.

The glossary remains at 305 public terms; 276 terms remain eligible for the indexable inventory. General finance lessons and former Quant/Pro definitions remain public and indexable. `/pricing` and `/marketscreener/dokumentation` retain their existing NOINDEX rationale. No product/checkout eligibility is inferred from this cleanup. NOINDEX is search-engine guidance, not an access-control mechanism.

HTTP regressions check every capital term plus the unchanged glossary/commerce boundaries. Source-provenance check remains deterministic; no leaf-content hash changed and no unrelated provenance rewrite was needed. Rankings, de-indexing and real GA4 leads require later live observations.

Local Chromium navigation also exposed missing JSON-LD after returning from NOINDEX to Learning. Browser SEO now lazily reuses the server's schema generator, removes stale route schema, and cancels superseded updates. Regressions cover ordinary terms, capital NOINDEX, return to Learning and rapid consecutive navigation; the full manifest remains outside the initial UI import graph.

## Reproduction and roadmap scope

- `node --run test:audit-regressions`
- `node --import tsx scripts/validate-contract-suites.mjs`
- `node --test scripts/seo-content-manifest.test.mjs scripts/seo-metadata.test.mjs server/seo-indexing-policy.test.mjs scripts/seo-source-provenance-drift.test.mjs`
- `node scripts/verify-dependency-suppressions.mjs`
- `node --run lint`; `node --run test`; `node --run build`
- `node scripts/refresh-seo-source-provenance.mjs --check`

The existing `AP-QA-01`, `CA-TRUST-DAILY-SUPPLY-CHAIN` and `CA-GROWTH-SEO-ARCHITECTURE` remain the relevant roadmap scopes. This patch closes the specific source defects; it does not mark the entire QA, compliance or SEO programs complete. The open course-attribution PR #524 and roadmap/login PR #523 are separate changes. Required checks and actual tested head are recorded in the implementation PR.
