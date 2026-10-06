# Chat Buddy – Core/Brand Boundary

Status: source-level boundary enforced.

## Reusable agent core

Path: `src/core/`

- `nlu.ts`
- `graph.ts`
- `research.ts`
- `reversible.ts`
- `types.ts`

This layer contains no JaJa ownership, seat pricing, trademark/imprint policy, voice preset, or provider credential handling.

**License status: MIT (scoped to `src/core/` only).** `src/core/LICENSE`, `src/core/NOTICE.md` and `src/core/LICENSE-EVIDENCE.json` define scope, provenance and exclusions. This grant does not include JaJa or CAPITAL-AI brand rights.

## Proprietary PRODUCT layer

Everything in `src/` outside `src/core/` remains product-specific. In particular:

- `brain.ts`: JaJa persona/system prompt and product answer composition
- `i18n.ts`: JaJa/Capital-AI product copy
- `voice.ts`: JaJa voice preset and browser speech UX
- `license.ts`: proprietary imprint, seats, pricing and transfer rules
- `providers.ts`: product-facing provider catalogue
- `index.ts`: PRODUCT facade joining brand/product behavior to the reusable core

`PROPRIETARY.md` governs the JaJa name, character, voice/imprint and PRODUCT-specific commercial rules. It must not be interpreted as an OSS license for the core.

## Authority boundary

Neither layer grants trading, write, publication, legal, provider-secret or credential authority. Those remain behind CAPITAL-AI capability, approval, truth and domain gates.
