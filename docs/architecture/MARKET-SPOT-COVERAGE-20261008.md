# MARKET Spot multi-provider rollout and 50-per-class coverage

Status: source-code preparation / not a production market-data admission
Date: 2026-10-08
Primary domain: TRUST; MARKET, PLATFORM and PRODUCT concerns covered in the same PR.
Repository authority: AGENTS.md / SOLO_MAINTAINER_FLOW@1.

## Actual baseline (no invented feeds)

| UI class | Commercially admitted source-backed instruments | Requested minimum | Shortfall |
| --- | ---: | ---: | ---: |
| KRYPTO | 0 | 50 | 50 |
| AKTIEN | 0 | 50 | 50 |
| INDIZIES | 0 | 50 | 50 |
| FOREX | 20 daily ECB EUR reference pairs | 50 | 30 |
| ROHSTOFFE | 0 | 50 | 50 |

This is instrument **eligibility**, not proof that the quote was published, replayed, received or displayed. Live verified values may be fewer. A 50-symbol mocked test, synthetic prices or an exchange's public API do not meet the requirement.

## Source rights and technical integrations (reviewed 2026-10-08)

- ECB: the sole currently admitted FX reference-rate public data source in source policy. Only daily, attributed reference information; not realtime, an execution price, score or decision.
- Kraken: public Spot REST and WebSocket exist; official API introduction says non-personal commercial public-endpoint data use requires **prior permission**. No such permission has been supplied: public screener BLOCKED.
  Reference: https://docs-legacy.kraken.com/api/docs/guides/global-intro/
- Coinbase: public Spot feeds exist but Market Data Terms updated 2026-08-07 disallow redistribution/display to third parties without prior express written consent. Public screener BLOCKED.
  Reference: https://www.coinbase.com/legal/market_data
- Binance: official Spot WebSocket and REST endpoints exist, but protocol openness is NOT public commercial market-data permission. Permissions for redistribution, retained storage, derivation and public display NOT_PROVEN: public screener BLOCKED.
  Reference: https://github.com/binance/binance-spot-api-docs
- CCXT, Hummingbot, Cryptofeed, OpenBB: source-available adapter software is not a sublicense of third-party exchange/market data. An MIT/Apache/AGPL adapter cannot change source-data rights. Commercial/source-distribution requirements of each dependency still apply.
- Frankfurter: MIT-licensed software, but underlying central-bank data retain source rights. Commercial republishing of individual feeds is NOT automatically granted by the MIT software license.
  Reference: https://frankfurter.dev/license/

No new payment subscription, API key read, BYOK migration, backend provider entitlement, new container service or websocket connection has been made by this PR.

## Prepared transport trust boundary

`server/market-spot-ingestion.mjs` provides `evaluateSpotIngestion` for both REST snapshots and WebSocket spot messages and an evidence-bound `ingestAdmittedSpotQuote` boundary. It refuses any I/O when the runtime flag is absent, market-data source is not admitted for both quote use AND realtime data, mapped instrument is unknown, configured symbol is missing, or infrastructure is not connected.

For admitted inputs, it validates `QuoteFactSchema`, enforces 30-second realtime freshness and immutable evidence, calls NATS JetStream PubAck through existing `infrastructure.persist`, replays the stored fact and returns only informational/nonactionable delivery metadata. It does not retain tokens or construct third-party hostnames from runtime inputs.

This is **not** a live vendor-specific transport client. Each connector still needs a provider-specific, tested REST/WS protocol mapper, egress allowlist, reconnect/backoff/429 policy, quotas, license coverage, entitlement tests, and worker ownership before external connections are enabled.

`GET /api/market/status` includes `assetCoverage` with the 50-target actual source-admitted instrument counts and `spotIngestion` configured/admitted status; it does not call a third party.

## Exact acceptance sequence

1. Finish any pending PR #271/main production deployment and verify Render `sourceSha`, Redis and NATS state. Do not redeploy private NATS or provider Rust worker just because main changed.
2. Observe successful ECB HTTP fetch with official `Last-Modified`, 20 acknowledged records, JetStream evidence and valid replay, `GET /api/market/values` 20/20, and browser MarketOverview plus Screener. If unavailable, keep fail-closed.
3. For each requested new commercial Spot source, capture permitted **public web display, mobile display, server processing, JetStream publication, replay, cache, retention, attribution, data derivation** and eligible symbols against the provider's actual contract. Only then update existing `MARKET_SOURCE_POLICY` and instrument catalog.
4. Implement bounded provider-specific REST/WS mappers; enforce symbol allowlists, source identity, WebSocket heartbeat/reconnect backoff, message size/time budgets, cost/quota budgets and server-only auth. Never publish private Vault/account data into the public quote subject.
5. Provision/validate 50 distinct admitted and quote-delivered instruments for EACH class, not just a provider-symbol list. Observe successful 250/250 replay-verified values and browser display with freshness and latency metrics. Separate reference FX data from realtime and score eligibility.
6. Never infer scoring, trading, provider-paid-plan, redistribution or BYOK license approval from CI tests.

## Trade-offs and costs

The least-cost path reuses existing Node Web, NATS JetStream, Rust worker and Valkey but may hit memory, CPU, ingress/egress and JetStream retention limits at 250 active streams. A separate dedicated ingestion worker can isolate WebSocket session ownership and crashes, at additional Render compute cost. Provider-paid real-time rights, exchange data packages and per-user API quotas are NOT_PROVEN. No new billable resource is authorized or provisioned by this PR.
