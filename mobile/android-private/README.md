# Capital-AI Private Android

Private Android surface for the canonical CAPITAL-AI Enterprise Scorer.

## OIDC / mobile session

The identity-provider page is never opened inside the WebView.

1. The WebView emits `capitalai-private://login`.
2. The native activity creates a random verifier and opens `/api/auth/mobile-login` in the external browser with a SHA-256 challenge.
3. The existing server-side OIDC confidential client completes PKCE with ZITADEL in the browser.
4. The callback returns a one-time app transfer code through `capitalai-private://auth/callback`.
5. The app posts the transfer code plus its verifier to `/api/auth/mobile-exchange`.
6. Only a valid one-time transfer receives the server-side `__Host-capital_session` cookie.

OIDC client secrets and tokens never enter the APK.

## Runtime boundary

The APK/AAB never receives NATS or Valkey credentials. It connects only to the HTTPS application origin and opens `/mobile-scorer`.

Server-side flow:

1. the private Top-400 research universe is loaded;
2. a score request is sent to the explicitly configured canonical Enterprise Scorer origin;
3. a successful canonical result is durably appended to NATS JetStream stream `CAPITAL_SCORES`;
4. only after the JetStream acknowledgement is the result cached and published through Valkey/Redis Pub/Sub on `capital:score:events:v1`;
5. the mobile UI receives live refreshes through a bounded SSE bridge.

JetStream remains the evidence authority; Pub/Sub is ephemeral.

## Top-400 research universe

The canonical registry is preferred. An explicitly configured internal OSS universe adapter can enrich it. For the private research build only, `MOBILE_CRYPTO_BINANCE_RESEARCH=true` enables a deterministic fallback that ranks unique active Binance Spot/USDT base assets by 24h USDT quote volume.

This is **not market-cap ranking** and does not grant redistribution, trading or scoring rights. The endpoint remains fail-closed unless exactly 400 validated entries are available.

## Required runtime variables

- `NATS_URL`
- `NATS_TOKEN`
- `NATS_REPLICAS`
- `REDIS_URL`
- `CAPITAL_AI_SCORER_ORIGIN` — mandatory, HTTPS, and must not equal `PUBLIC_APP_ORIGIN`
- optional `CAPITAL_AI_SCORER_SERVICE_TOKEN`
- optional `CAPITAL_AI_OSS_CRYPTO_UNIVERSE_URL`
- optional `MOBILE_CRYPTO_UNIVERSE_FALLBACK`
- optional `MOBILE_CRYPTO_BINANCE_RESEARCH`
- optional `MOBILE_SCORE_CACHE_TTL_MS`

No CoinGecko endpoint or API key is used.

## Build and signing

The repository workflow produces a debug APK, an unsigned release APK and a release AAB. Production/private distribution signing uses an owner-controlled signing key outside Git. Never commit keystores, passwords, provider keys or broker credentials.
