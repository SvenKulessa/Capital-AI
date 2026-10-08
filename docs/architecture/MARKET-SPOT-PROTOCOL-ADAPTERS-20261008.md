# CAPITAL-AI TRUST · Commercial spot provider wire adapters

Date: 2026-10-08
Authority: `AGENTS.md`; domain collaboration MARKET + PLATFORM + PRODUCT + TRUST.
Branch: `capital-ai-trust/spot-provider-wire-adapters-20261008`.

## What is implemented

- `server/spot-provider-wire.mjs`: strict, source-specific REST/WS market-data normalizers for **Binance BTCUSDT** and **Kraken BTCUSD**. These are provider-format implementations, **not admitted or enabled feeds**.
- Binance: `GET https://api.binance.com/api/v3/trades?symbol=BTCUSDT&limit=1`; WebSocket `wss://stream.binance.com:9443/ws`, `btcusdt@trade`. Last trade's exchange `time` / `T` is required.
- Kraken: `GET https://api.kraken.com/0/public/Trades?pair=BTC%2FUSD`; WebSocket v2 `wss://ws.kraken.com/v2` ticker channel and provider RFC3339 timestamp. REST pair aliases must identify BTC/USD, never ETH/USD or an arbitrary response key.
- `fetchAdmittedSpotRest`: checks source rights, runtime flag and NATS/Valkey connectivity before HTTP; exact HTTPS origins, no credentials, redirect disabled, 5s timeout, JSON content-type and 64KiB streamed response cap; no automatic schedule.
- `startAdmittedSpotWebSocket`: checks identical rights before instantiating the socket; bounded messages, one in-flight delivery, 30-minute session expiry, explicit stop, no autoconnect/reconnect loops; no browser-accessible auth keys.
- Both ingestion entrypoints invoke the existing `ingestAdmittedSpotQuote` that requires `QuoteFactSchema` and persisted JetStream PubAck + replay before producing a canonical informational output. No scores, ranks or trading eligibility.
- `server/spot-provider-wire.test.mjs` validates provider payloads, exchange timestamps, symbol mapping, bounded frames and absence of external/network/broker I/O while unlicensed. Default tests and `test:market` include the suite.
- Explicit Dockerfile and `.dockerignore` additions preserve the current secure build allowlist.

## Provider and data-use evidence (primary documents)

| Source / use case | Public REST | Spot WS | Commercial data redistribution/display |
| --- | --- | --- | --- |
| ECB daily reference FX | Yes | Not realtime | Existing 20 source-admitted reference pairs only |
| Kraken Spot | Yes | Yes | Prior permission explicitly required for certain non-personal commercial uses; **NOT AUTHORIZED** |
| Binance Spot | Yes | Yes | API access alone does not grant public redistribution; **NOT PROVEN**. The separate Binance Vision historical dataset is CC BY-NC-SA 4.0 with separate enterprise license for commercial use, and does not cover Spot WS entitlement |
| Coinbase Spot | Yes | Yes | Written consent needed for third-party redistribution and display under 2026-08-07 terms; **NOT AUTHORIZED** |
| Stocks, indices, commodities | Varies | Varies | No source and per-instrument external display/redistribution rights validated for the 50-per-class target |

- Official Kraken public API notice: https://docs-legacy.kraken.com/api/docs/guides/global-intro/
- Kraken v2 ticker format: https://docs.kraken.com/api/docs/websocket-v2/ticker
- Kraken REST Trades format: https://docs.kraken.com/api/docs/rest-api/get-recent-trades
- Coinbase Market Data Terms, 2026-08-07: https://www.coinbase.com/legal/market_data
- Binance Spot REST docs: https://developers.binance.com/en/docs/products/spot/rest-api
- Binance Spot Streams docs: https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md
- Binance Vision dataset Terms, dated 2026-08-26: https://github.com/binance/binance-public-data
- Software client CCXT MIT, Cryptofeed AGPL are separate license domains from vendor market-data rights.

## Target and current measured production evidence

Only the 20 ECB daily currency reference records have full production evidence (20 PubAcks, 20 cache writes, 20 reads, individual hash-verified replay and Chrome UI readback). They are **not** realtime. `MARKET_MINIMUM_ASSETS_PER_CLASS=50` for KRYPTO, AKTIEN, INDIZIES, FOREX and ROHSTOFFE; the current source-admitted instrument count is 0/0/0/20/0. No simulated or private account data can count toward the 250 goal.

## What is still required to activate a specific live Spot adapter

1. Secure written commercial rights per provider, instrument and usage: public web/mobile display, cache, JetStream publication, replay, retention, attribution and derived analytics. These are legal/contractual facts, not automated approval workflows.
2. Bind rights and 50+ eligible symbols per asset class in the existing `MARKET_SOURCE_POLICY` and `instrumentCatalog` with provider IDs and source links.
3. Add provider secret scopes when strictly necessary, but never use private BYOK account query tokens as market-data redistribution grants.
4. Install the approved worker execution schedule, bounded quotas, reconnect/backoff and release budget limits based on actual provider contract. Start *only* admitted symbols on the owned worker and verify 50/50 per class through 250 PubAcks, evidence replay, Valkey read and browser.
5. The existing Rust private provider bridge worker is a separate user-specific query service. Don't conflate Rust worker availability with public-feed subscription.
6. Keep trading and scoring off pending independent feature/DQ, operational and regulatory assessments.

## Commercial and infrastructure cost notice

No fee is incurred by the dormant adapters alone beyond normal CI. Production of 250 streams may require additional Render CPU/memory, NATS JetStream disk, outbound internet traffic and provider exchange redistribution licenses. Current applicable quotas and paid tier amounts are NOT_PROVEN; no new paid service is provisioned by this PR. Existing NATS, Redis/Valkey, web and Rust worker are not redeployed just because Git HEAD changed.

## Private user-Vault BYOK — architectural decision (user confirmed 2026-10-08)

**All provider API keys used by CAPITAL-AI are owned by individual users and stored exclusively in their private user Vault connections.** API credentials are never configured as global public-market data keys and never sent to the browser, PR logs, public Redis quote channels or shared NATS quote subjects.

Separate **data scopes**:

1. **`USER_PRIVATE_MARKET_DATA`**: authenticated `POST /api/profile/provider-query` with `market.spot_trade` and a mandatory allowlisted symbol. Existing same-origin session verifies the actual user; signed, expiring NATS private query envelope binds `userRef`, provider, operation, request ID and parameters; Supabase durable claim imposes replay protection, rate and cost limits; Vault retrieves only this `userRef`'s credential and verifies provider read/withdrawal permissions before an outbound market read. The source response is projected to a bounded price + observed timestamp without secrets, with no-store and explicit `publicDisplayAllowed=false`, `sharedCacheAllowed=false`, `redistributionAllowed=false`, `jetStreamPublicationAllowed=false`, `executionEnabled=false`. No global source admission is inherited.
2. **`USER_PRIVATE_ACCOUNT_DATA`**: existing private account/balance/orders operations through the same Vault and private NATS query bus, still non-public.
3. **`OPEN_SOURCE_OPEN_DATA_ADMITTED` public catalog**: independent ECB reference data, with separately reviewed original source rights and `CAPITAL_FACTS` replay proof. The user's BYOK access NEVER makes vendor-restricted private or public Spot data eligible for this global/shared lane.

`market.spot_trade` currently supports a single Binance BTCUSDT trade and a single Kraken BTC/USD trade as private REST snapshots, **only when `PRIVATE_PROVIDER_BRIDGE_ENABLED=true` and the user's own Vault connection and runtime are configured**. This PR does not set that flag or touch any live secret, so private production roundtrip is NOT_PROVEN. Both underlying public Spot market endpoints require no key on the HTTP trade request; the user's Vault key is nevertheless checked server-side to authorize the user's private provider connection. Do not claim the public market HTTP request is API-key-authenticated.

Private WebSocket session support will require the same user-bound identity + tenant-scoped lifecycle and rate/cost limits with no public broker/cache fanout. In this PR vendor WebSocket parsers and fixed endpoint subscriptions are available but **no per-user WebSocket session is enabled**.

**Important:** BYOK ownership and private display avoid CAPITAL-AI publicly distributing a pooled market-data feed, but do not automatically grant a hosted commercial service unlimited rights to use, cache, derive, display, relay or serve proprietary vendor data. Actual subscription/terms/IP rights still apply per provider and use case. Public 50-per-class coverage cannot count any private per-user BYOK session or account data.

The private path can be tested and improved without demanding a global public-market redistributor contract. Rate limits, user isolation and quotas are real technical constraints; no new abstract human admission or extra Required Check is introduced.
