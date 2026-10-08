# CAPITAL AI — Private Render Provider Dashboard

Status: SOURCE_IMPLEMENTED / RUNTIME_NOT_PROVEN (2026-10-08)
Domain: PLATFORM (owner-only server environment), PRODUCT (profile tab), TRUST (AuthZ), MARKET (read-only data tests).

## Intended boundary

- The existing end-user BYOK Vault remains unchanged and owner-tenant isolated by Supabase user ID.
- Render-wide provider environment secrets are **not** user-managed BYOK secrets. They are platform-owned server secrets and are never listed by value or exposed to a browser.
- The Render owner dashboard is a separate opt-in feature. It returns only allowlisted provider presence flags, read-only reference checks and a deliberately requested Massive previous-day price.
- No auto-refresh, private-to-public publishing, trading, buy/sell operation, shared Valkey cache, NATS subject or JetStream event is introduced.
- The public screener must not source prices from this dashboard or from these Render secrets.

## Required Render service configuration

Configure these **only on the CAPITAL-AI web service** (not NATS, the Rust bridge, the frontend build or a public VITE_/NEXT_PUBLIC_ variable):

```dotenv
CAPITAL_AI_RENDER_OWNER_USER_ID=<verified Supabase auth.users.id>
CAPITAL_AI_RENDER_OWNER_EMAIL=<the verified Supabase email address>
```

Both are required and compared against the server-verified user on each request. The server also requires Supabase's `email_confirmed_at` and the existing `owner` IAM role. Without them all routes fail closed with 404. The real owner UUID and email are intentionally absent from repository source and tests.

Recognized provider key names:

```text
KRAKEN_API_KEY + KRAKEN_API_SECRET
KRAKEN_SPOT_API_KEY + KRAKEN_SPOT_API_SECRET
MASSIVE_API_KEY | POLYGON_API_KEY | POLYGON_MASSIVE_API_KEY
BINANCE_API_KEY + BINANCE_API_SECRET
ALPACA_API_KEY + ALPACA_SECRET_KEY
COINGECKO_API_KEY
COINMARKETCAP_API_KEY
FINNHUB_API_KEY
TWELVE_DATA_API_KEY | TWELVEDATA_API_KEY
ALPHA_VANTAGE_API_KEY
FRED_API_KEY
EODHD_API_KEY
```

A configured presence flag is **not** proof of successful login, entitlement, quota or data license. Read-only authenticated probes exist for Kraken (`GetApiKeyInfo`) and Massive (one reference-ticker readback). Massive sample uses `GET /v2/aggs/ticker/{symbol}/prev` with only `X:BTCUSD`, `AAPL` or `C:EURUSD`. Upstream credentials travel in a server-only authorization header; never in a browser or URL query. Other key bindings are inventory-only until reviewed adapters are implemented.

## Verification and rollout

1. Review this PR and all GitHub Required Checks.
2. Check the exact Env names attached to the Render **web service** without reading or logging their values. Check whether a shared Render environment group would make the same keys available to unintended services.
3. Add both owner-binding configuration variables server-side; do not rewrite provider credentials or export their values.
4. After an approved main merge, verify owner sees `/profile/render-dashboard`; anonymous/second accounts must receive HTTP 404 on its backend and document route.
5. Explicitly request a Kraken/Massive reference probe and, only with permitted data entitlements, one Massive previous-day sample. Confirm 429 cooldown, no-cache, no secret in HTTP/console/logs and no cross-tenant broker/cache publication.
6. Extend from metadata/probes to real Scoring/Analysis bindings **only** via an audited private execution context that cannot mix with regular BYOK tenants.

## Costs, licensing and operations

- Read-only test calls may incur metering and consume provider quotas even if no live subscription is enabled. A successful technical response does not prove rights to retransmit or redistribute data.
- Nothing in this change creates a paid Render resource or deploys NATS/Valkey/Rust.
- The in-process 60-second action cooldown covers the current single web instance only; a scale-out deployment needs a private, user-scoped shared quota limiter before higher-volume API reads.
- No runtime credentials, balances or financial account positions are logged or persisted by this feature.
