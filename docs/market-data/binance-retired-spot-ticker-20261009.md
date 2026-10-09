# MARKET: Binance Spot `!ticker@arr` retirement fix

Date: 2026-10-09. Source main: `fb9fbc41232f1815fc6682d275e1511e9d3ce434`.
Authority: `AGENTS.md / SOLO_MAINTAINER_FLOW@1`.

## VERIFIED — vendor version evidence

Official Binance Spot API changelog:
https://github.com/binance/binance-spot-api-docs/blob/master/CHANGELOG.md

- 2025-11-14: `!ticker@arr` deprecated; Binance recommended per-symbol
  `<symbol>@ticker` or `!miniTicker@arr`.
- 2026-02-24: announced retirement of `!ticker@arr` for 2026-03-26.
- Public data interfaces are technically reachable without an API key:
  https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md
  This **does not** confer commercial display or derived-data rights.

The provider registry still carried the retired stream URI after the retirement date.
The generic reference URI now uses the documented `!miniTicker@arr` snapshot stream.
The registry's text distinguishes miniTicker snapshots from L2 orderbook / trade ticks.
The existing source-bound `spotWireRequest` for BTCUSDT still subscribes to
`btcusdt@trade` on the separately implemented Binance socket endpoint.
No feature-engineering input or exchange trade timestamp is inferred from miniTicker.

## Unchanged fail-closed boundaries

- `productionAdmission: BLOCKED` remains unchanged in the provider registry.
- `MARKET_SOURCE_POLICY` and the Spot ingestion rights gate remain unchanged.
- Public/commercial market data, derived scores, NATS/Valkey redistribution and
  retention rights remain `NOT_PROVEN`.
- No connection is opened by this patch; no new API request, websocket, data
  display, provider key, service, cost, migration or production activation occurs.
- Only metadata and contract regression tests change.

## Validation / exit

Existing `npm test` exercises the regression from
`src/contracts/__tests__/analysisFoundation.test.ts`.
The Docker required check runs lint, test, build and isolated MARKET suite;
the actual head-specific CI result must be checked before merge.

If the registry is later used for an admitted feed, verify exact stream
semantics, max lifetime, heartbeat, units, event time, reconnection, sampling,
provider contract rights and rate limits. MiniTicker cannot substitute for
full tick, volume, or L2-depth inputs.

Cost: no new paid service or traffic. Future Binance/commercial data licences,
provider tariff, connection limits and CI capacity remain NOT_PROVEN; any new
charge requires the existing owner approval under AGENTS.md.
