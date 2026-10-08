# Private Kraken/Polygon-Massive batches — 2026-10-08

Primary Domain: MARKET. User selected private Core NATS request/reply plus a short-lived user/connection-scoped encrypted Valkey cache. Base main: `04f9d1a7c6a60366720525ad30161a70fb03cec8`.

## Implemented scope

| Class | Provider | Reference and batch source | Maximum |
| --- | --- | --- | --- |
| KRYPTO | Kraken | Currency AssetPairs, distinct non-fiat bases with USD quote, bulk Ticker | 50 crypto pairs |
| AKTIEN | Massive (formerly Polygon) | Active common-stock tickers, unified snapshot | 50 stocks |
| INDIZIES | Massive | Active index tickers, index snapshot | 50 indices |
| FOREX | Massive | Active FX tickers, unified snapshot | 50 pairs |
| ROHSTOFFE | Massive | Commodity products, active single contracts, futures snapshot | 50 contracts, not necessarily 50 distinct commodities |

Fixed HTTPS origins; bearer authorization for Massive, no provider keys in query strings. Exact ticker/product binding and deduplication; bounded response sizes and deadlines, no pagination/retries or automatic polling. The server returns actual counts and shortfall instead of inventing coverage. Kraken Ticker lacks an exchange timestamp: observedAt=null, receipt timestamp is separate. Session prices never inherit another trade's realtime label. No new scoring or trading eligibility.

Massive is active in the private provider catalog. Vault setup requires explicit approval of private market access and the 30-second cache. Reference verification only proves the key works for reference data; snapshots still require the user's actual entitlement. Existing Kraken/Binance account operations remain available.

## Broker, cache, security

The existing NATS query/execute/inbox ACLs support the batch operation. Core NATS carries signed user-bound requests, never credentials, and transient private replies. No private quote is published into CAPITAL_FACTS, public streams or JetStream. Existing 256-KiB NATS payload limit is sufficient; no NATS configuration/deployment change required.

Valkey uses opaque HMAC keys scoped to user, provider, credential fingerprint and asset class. Payloads use HKDF-derived AES-256-GCM keys with the full context as authenticated data. Cache entries expire within 30 seconds. Vault connection status and consent are checked before every cache read; Kraken also rechecks forbidden funding/withdrawal permissions. Deleted or revoked connections fail closed. Tamper, unavailable cache, missing signing secret and malformed upstream responses never fall back to shared data.

Atomic Valkey Lua budgets apply across replicas and classes: Massive 5 upstream requests/minute per user/connection; Kraken 10, including key-permission probes. A Massive class costs 2 upstream calls (commodity futures 3); five is a conservative limit, so all four Massive classes may require more than one minute. A cache hit needs no Massive call. These limits do not prove entitlement, remaining quota, license or cost approval.

## Verification

- Local npm test passed, including new five-class batch fixtures, exact source binding, entitlement/429 handling and encrypted cache isolation.
- Native NATS 2.15.0 (official release archive verified SHA256) and locally compiled Valkey 9.1.2 ran the real application HTTP request/reply and cache code: 50 records in all five classes, private cache hits, two-owner different values, revoke/delete enforcement, encrypted storage, bounded payload. Local bridge was a routing fixture; provider HTTP, Supabase Vault and query-state were fixtures. No live keys or paid provider requests.
- `scripts/private-market-broker-ci.sh` repeats those roundtrips through the actual just-built Rust bridge image under read-only/non-root/capability restrictions, using the repository NATS ACLs and disposable brokers. Existing bridge CI also runs locked Rust tests, audit, deny, Docker lint, OCI vulnerability/secret/license scans and SBOM.
- `Private Market PostgreSQL Contract` replays actual old and new Vault migrations into disposable PostgreSQL, checks both owners, rotation/deletion, Kraken/Binance compatibility and denied anon/authenticated RPC/table privileges. Its Vault fixture proves function signatures and database isolation, not production Vault encryption.
- PR check results and immutable head are available on the PR itself; workflow definitions alone are not runtime PASS evidence.

## Rollout and remaining live proof

Production remains on main. The new migration must be applied to the intended Supabase project after merge. Deploy the Rust bridge from merged main because the operation contract is compiled into its binary. Deploy the application through main checksPass. Existing NATS does not need redeployment merely for the repository SHA.

Only after the deployed app/bridge and Vault schema match should PRIVATE_PROVIDER_BRIDGE_ENABLED=true be set for the existing app and verified. Keep the existing private-network boundary and scoped credentials; no new paid resources or public listeners. Do not run migration fixture files on production.

Owner supplies personal Kraken and Massive credentials in Key Vault and accepts provider/data rights. Verify real returned counts per class and actual snapshot entitlement, timestamp/delay, quotas and two-user isolation. Until then, actual production 50/50 coverage, private live roundtrips and provider rights remain NOT_PROVEN. No Qwen/Chatterbox changes.

Official references checked 2026-10-08: [Polygon becomes Massive](https://massive.com/blog/polygon-is-now-massive), [REST quickstart](https://massive.com/docs/rest/quickstart), [all tickers](https://massive.com/docs/rest/stocks/tickers/all-tickers), [unified snapshot](https://massive.com/docs/rest/stocks/snapshots/unified-snapshot), [futures](https://massive.com/docs/rest/futures/overview), [Kraken AssetPairs](https://docs.kraken.com/api/docs/rest-api/get-tradable-asset-pairs/), [Kraken Ticker](https://docs.kraken.com/api/docs/rest-api/get-ticker-information/), [Valkey SET](https://valkey.io/commands/set/), [NATS request/reply](https://docs.nats.io/nats-concepts/core-nats/reqreply), [Supabase Vault](https://supabase.com/docs/guides/database/vault).
