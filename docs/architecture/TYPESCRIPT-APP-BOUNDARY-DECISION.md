# TypeScript / Browser App Boundary Decision

Date: 2026-10-02  
Domains: PLATFORM + TRUST  
Decision: keep the deterministic application/browser boundary on the stable TypeScript 6 parser path until a safe replacement is proven.

## Current boundary

`scripts/verify-browser-boundary.mjs` scans built browser artifacts and rejects:
- server-only secret identifiers;
- Telegram server endpoints;
- `@google/genai`;
- server-only advisor handlers;
- executable `process.env` access parsed through the TypeScript compiler API.

This boundary is independent from the TypeScript type-checking version as a security objective, but the current parser implementation uses the TypeScript 6 JavaScript compiler API.

## Go/native TypeScript 7

TypeScript 7.0.2 is the native Go implementation and is materially faster for full type-check/build workloads according to upstream measurements. It is **not currently promoted in CAPITAL-AI** because the exact native compiler artifact previously produced blocking binary/supply-chain evidence. Performance cannot compensate for that TRUST gate.

The Go compiler is therefore a benchmark candidate for compile/type-check performance, not permission to remove the browser boundary.

## Candidate path

1. Keep TypeScript 6 boundary active and regression-tested.
2. Re-evaluate each new TypeScript 7 patch/minor native artifact with exact provenance, binary reachability and current vulnerability evidence.
3. Benchmark native TypeScript type-check against the stable baseline.
4. Benchmark Oxc/Oxlint or another stable parser/linter boundary against the same positive/negative fixtures.
5. Promote only when correctness/security parity is demonstrated and CADS_PROFILE@2 CHALLENGE passes.

No permanent compatibility bridge is treated as the target architecture. No TypeScript major upgrade is promoted solely for speed.
