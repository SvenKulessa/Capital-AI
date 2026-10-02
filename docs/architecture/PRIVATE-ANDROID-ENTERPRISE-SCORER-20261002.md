# Private Android Enterprise Scorer — 2026-10-02

## Baseline

- Repository: `SvenKulessa/Capital-AI`
- CURRENT_MAIN at branch creation: `b5dc0e06648f63cfcd55a7aee6834c2102a43d17`
- Branch: `capital-ai-market/android-enterprise-scorer-bundle-20261002`
- Scope: additive private Android bundle plus bounded server bridge.
- No direct-main write and no production mutation.

## Decision

The Android application must not contain NATS, Valkey/Redis, provider, OIDC client-secret or signing credentials.

The app therefore connects only to the HTTPS application origin. The server bridge owns broker access and follows this path:

```text
Android WebView
  -> HTTPS /mobile-scorer
  -> OIDC session gate for score/event endpoints
  -> canonical Enterprise Scorer origin
  -> canonical score response
  -> NATS JetStream CAPITAL_SCORES acknowledgement
  -> Valkey cache + Redis Pub/Sub capital:score:events:v1
  -> bounded SSE projection back to the Android surface
```

JetStream is durable evidence. Valkey/Redis Pub/Sub is ephemeral delivery and never evidence authority.

## Top-400 crypto universe

The mobile universe contract requests exactly 400 crypto assets.

1. The canonical CAPITAL-AI registry is loaded first.
2. Market-cap rank metadata is added from the configured CoinGecko fallback when available.
3. The final set is ordered by market-cap rank, then deterministic symbol ordering.
4. CoinGecko is universe metadata only and has no score, eligibility, ranking or trade authority.
5. If fewer than 400 assets can be validated, the endpoint reports `DEGRADED`; it does not fabricate filler assets.

The CoinGecko Demo/public fallback is intended only for this private research surface and requires attribution. Commercial redistribution remains outside this change and must be covered by separate provider-rights evidence.

## Broker contracts

### NATS

- stream: `CAPITAL_SCORES`
- subject: `capital.scores.crypto.*`
- storage: file
- deny_delete: true
- deny_purge: true
- duplicate protection through deterministic payload hash / message ID
- score cache is written only after JetStream acknowledgement

### Valkey / Redis

- score key: `capital:score:v1:<SYMBOL>`
- channel: `capital:score:events:v1`
- bounded TTL: 10 seconds to 60 minutes, default 5 minutes
- Pub/Sub payload is treated as ephemeral and is never the durable source of truth

## Private access

`POST /api/mobile/enterprise-score` and `GET /api/mobile/scorer/events` require the existing server-side OIDC session. No hard-coded mobile bearer token is introduced.

The shell, status and universe endpoints contain no broker credentials or private secret material.

## Android security boundary

- cleartext disabled
- only `https://capital-ai.online` is accepted inside the WebView
- third-party cookies disabled
- file/content access disabled
- mixed content blocked
- TLS errors cancel the navigation
- NATS/Redis credentials never enter the APK/AAB

## Five validation steps

1. **Identity & transport** — OIDC session required for score/SSE; HTTPS-only Android boundary.
2. **Universe integrity** — requested=400, deterministic de-duplication, no fabricated filler, source/attribution visible.
3. **Canonical scoring** — mobile bridge never calculates its own financial score; it calls the configured canonical scorer.
4. **Evidence ordering** — canonical response -> JetStream ACK -> Valkey cache/PubSub; no unacknowledged result becomes mobile-live.
5. **Recovery & presentation** — cached score is replay-verified against JetStream; SSE is presentation-only and failures do not grant trade authority.

## Build / release gate

The workflow `.github/workflows/android-private-bundle.yml` is `workflow_dispatch` only. This change does not start it.

Expected artifacts after an owner-approved build:

- `mobile/android-private/app/build/outputs/apk/debug/app-debug.apk`
- `mobile/android-private/app/build/outputs/bundle/release/app-release.aab`

The release AAB is intentionally unsigned by an owner production key in repository automation. A private release signing key must remain outside Git.
