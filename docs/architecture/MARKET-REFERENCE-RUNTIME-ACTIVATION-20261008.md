# CAPITAL-AI Market Reference Quotes: production activation evidence

Date: 2026-10-08
Primary domain: TRUST; implementation spans MARKET / PLATFORM / PRODUCT.
Repository authority: `AGENTS.md` (SOLO_MAINTAINER_FLOW@1).

## Observed connected-service inventory

- Render workspace: `AICapital`; production web `Capital-AI` (`srv-dau1rp893c1s73cdhm1g`), branch `main`, Frankfurt, checksPass auto-deploy.
- Private NATS JetStream: `capital-ai-market-events` (`srv-dauhcoojo6nc738eedjg`) with port 4222 and a 5 GB persistent disk; do not redeploy NATS just because main changes.
- Private Rust provider-bridge background worker: `capital-ai-provider-bridge` (`srv-db3d8mui0phs739mfq20`); startup log confirms subscription only, **not** a provider I/O success.
- Valkey 8.1.10: `capital-ai-market-cache` (`red-dau61kvavr4c73fr1plg`), free, available, non-persistent. Available service does not establish application connectivity.
- Supabase `AIFINANCIAL` / Postgres 17: provider-query claim RPC `public.capital_ai_claim_provider_query` exists, SECURITY INVOKER, EXECUTE for service_role only; anon/authenticated denied. Supabase Vault remains server-only.
- The selected ECB source has existing, repository-recorded Open-Data rights and runtime eligibility, restricted to EUR daily FX reference values; NOT trade prices or trading recommendations.

## Data path

```text
ECB Daily XML (HTTPS, Last-Modified)
  -> 20 manifest-backed EUR FX instruments
  -> QuoteFactSchema + reference-time semantics and freshness
  -> NATS JetStream CAPITAL_FACTS (PubAck)
  -> Hash verification + replay
  -> Valkey hot-cache (never evidence authority)
  -> GET /api/market/values (CAPITAL_AI_ASSET_VALUES@1)
  -> React useSyncExternalStore (one batch / 60 seconds)
  -> MarketOverview, AllMarketsModal, ScreenerTable informational FX panel
```

Only admitted replay-verified canonical values can be displayed. Missing, stale, duplicated, or malformed values are discarded; no synthetic quotes, sparklines, confidence, score, ranking or executable quote is derived.

The separate `Rust -> NATS -> Node executor -> Supabase Vault -> private provider` path is a user-scoped account-query path, **not** authorization to redistribute privately fetched provider prices to the public screener. `PRIVATE_PROVIDER_BRIDGE_ENABLED=false` and probe remains false on this rollout.

## Exact merge/deployment sequence

1. Run GitHub Required Checks on this feature-branch PR and `npm run test:market`. No production change from the feature branch.
2. Human owner reviews/merges the PR. Production only from `main`.
3. Confirm whether the existing Render web service is Blueprint-managed. A checked-in `render.yaml` does **not by itself** prove its environment variables were applied. Sync the managed Blueprint, or merge-update **only** these three non-secret values on the existing web service (preserve all secrets and other environment values):
   - `MARKET_SYMBOLS=EUR/USD,EUR/JPY,EUR/CZK,EUR/DKK,EUR/GBP,EUR/HUF,EUR/PLN,EUR/RON,EUR/SEK,EUR/CHF,EUR/ISK,EUR/NOK,EUR/TRY,EUR/AUD,EUR/BRL,EUR/CAD,EUR/CNY,EUR/HKD,EUR/IDR,EUR/ILS`
   - `MARKET_QUOTES_ENABLED=true`
   - `MARKET_ECB_REFERENCE_RATES_ENABLED=true`
4. Correlate web runtime `sourceSha`/`RENDER_GIT_COMMIT` to merged main. Do not trigger NATS or Rust-worker redeploy from a web HEAD change.
5. Read `GET /api/market/status`: expect `quotesEnabled=true`, `infrastructure.status=connected`, `redis=connected`, `nats=connected`, `referenceDataState=ready`. Successful `/healthz` is only liveness.
6. Read `GET /api/market/values`: expect 20 canonical `EUR/*` records (or fail closed if ECB unavailable), each `sourceAdmission=OPEN_SOURCE_OPEN_DATA_ADMITTED`, `replayVerified=true`, `scoreEligible=false`, `decisionEligible=false`, and valid `CAPITAL_FACTS` evidence ID. Replay at least one `GET /api/market/evidence?id=...` and compare fact/hash.
7. Browser verify `/marketscreener`, `/screener`, market overview, all-markets modal: reference values, source, date and evidence visible; **no** synthetic change%, live badges, scores, rankings or trade execution.
8. If production broker or ECB ingestion fails, keep explicit unavailable status; rollback only web release/config. Preserve JetStream evidence and existing service Secrets.

## Security, costs, limits

- Existing Render compute/network and durable disk can incur continued charges; Valkey free may throttle/evict; no new resource created by this PR.
- ECB public reference data needs no BYOK credentials, but is daily and source/rights obligations apply. Current live HTTP publication proof, provider quotas, cache/evidence replay and browser display still require post-merge verification.
- NATS single replica and Valkey non-persistence do not constitute HA or disaster recovery.
- Supabase advisor separately reports `auth_leaked_password_protection` warning; it is **not** an excuse to weaken Auth/RLS.
- Private source policies and user secrets must not enter browser bundles or open-data streams.
