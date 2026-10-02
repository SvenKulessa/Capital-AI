# Capital-AI Private Android

Private Android surface for the canonical CAPITAL-AI Enterprise Scorer.

## Runtime boundary

The APK/AAB never receives NATS or Valkey credentials. It connects only to the HTTPS application origin and opens /mobile-scorer.

Server-side flow:

1. canonical Top-400 crypto universe is loaded;
2. a score request is sent to the canonical Enterprise Scorer origin;
3. a successful canonical result is durably appended to NATS JetStream stream CAPITAL_SCORES;
4. only after the JetStream acknowledgement is the result cached and published through Valkey/Redis Pub/Sub on capital:score:events:v1;
5. the mobile UI receives live refreshes through a bounded SSE bridge. JetStream remains the evidence authority; Pub/Sub is ephemeral.

## Top-400 universe

The canonical registry is preferred. If it contains fewer than 400 crypto assets, the private bundle may use CoinGecko market-cap data as an attribution-required universe fallback unless MOBILE_CRYPTO_UNIVERSE_FALLBACK=false. The fallback defines selection/order only; it has no scoring authority.

## Required runtime variables

- NATS_URL
- NATS_TOKEN
- NATS_REPLICAS
- REDIS_URL
- CAPITAL_AI_SCORER_ORIGIN
- optional COINGECKO_DEMO_API_KEY
- optional MOBILE_CRYPTO_UNIVERSE_FALLBACK
- optional MOBILE_SCORE_CACHE_TTL_MS

Never place broker tokens, provider keys, signing keys or passwords in the Android application.

## Build

Use a local Android SDK/JDK 17+ or the repository Android workflow. Release distribution should use an owner-controlled signing key outside Git.
