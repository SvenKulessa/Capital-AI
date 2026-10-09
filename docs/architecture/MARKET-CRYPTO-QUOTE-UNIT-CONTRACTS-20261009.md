# MARKET — Correct non-ISO crypto quote units without relaxing fiat mapping

Date: 2026-10-09. Base: `main@fb9fbc41232f1815fc6682d275e1511e9d3ce434`.
Authority: `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`.

## Root cause

The live-facing canonical instrument catalogue holds `BTCUSDT` with `quote: USDT`
and a Binance venue, but the typed `AssetIdentitySchema`,
`ProductAssetMappingInputSchema`, `InstrumentMasterSchema`, and the raw
DQ/Liquidity diagnosis initially demanded exactly **three** alphabetic quote
characters. Consequently the existing BTCUSDT instrument could never map
through the canonical nine-class product and DQ research contracts. Replacing
USDT with USD would corrupt the unit and is **not** acceptable.

## Changes

- For canonical `crypto` identities alone, permit uppercase alphanumeric
  quote-unit identifiers of **3–8** characters. Examples: `USD`, `USDT`.
  These are quotation units and do not imply legal-tender or ISO-4217 status.
- All other canonical asset classes and all non-crypto product classes continue
  to require exactly three uppercase alphabetic characters.
- For a crypto instrument master, `currency` must exactly equal
  `quoteAsset`; strict uppercase 3–8 quote-unit validation applies.
- Raw research diagnostics recognize the crypto quote unit in both market
  and liquidity measurements; their existing exact currency equality,
  rights/asset/venue/freshness and zero eligibility defaults remain.
- New negative tests reject fiat `USDT`, mismatched quote asset or
  liquidity quote unit, invalid mixed-case units and attempts to infer
  rights or a score from demo data.

These are **structural mappings**, not source-authenticated asset identities.
No real Binance contract entitlement, data provider, margin/risk policy,
calibrated scorer, L2 feature, runtime session or browser quote is activated.

## Scope and compatibility

The schema retains the existing `currency` property name, avoiding a breaking
DTO shape change. It is class-dependent rather than a blanket relaxation.
The shared `QuoteFactSchema` already accepts 3–6 uppercase alphanumeric
quote-unit values and remains untouched. No older valid 3-letter
instrument is invalidated. Existing scorer engine classes stay at six
and the four not-yet-mappable product classes stay quarantined.

An 8-character crypto quote value might be structurally valid but is
**not** evidence that a corresponding market symbol exists: the actual
`instrumentCatalog`, instrument/provenance contract and rights admission
must still verify venue, pair, units and provider-specific symbol mapping.

## Evidence and cost

Tests run within `src/contracts/__tests__/analysisFoundation.test.ts`,
already included in the existing `npm test` script. GitHub Docker Security
Gate runs full tests, lint, build and Market E2E. Their specific PR result
must be checked before merge. No new fee or API usage is introduced.
Future commercial licensing, exchange coverage, actual feed pricing and
quota limits remain `NOT_PROVEN`.
