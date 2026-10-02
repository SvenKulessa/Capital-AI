# Mobile OIDC / Top-400 Decision Evidence — 2026-10-02

Baseline: `main@b60367e8e54b190a83e2e8d6556eb59ded699434`
Branch: `capital-ai-trust/mobile-oidc-top400-signing-20261002`

## Scope

Private Android research application: authentication handoff, canonical scorer authority, Top-400 crypto universe and stable release signing.

## OIDC candidates

| Candidate | Security / Trust | Integration | Result |
|---|---|---|---|
| Embedded IdP inside WebView | Browser isolation is weakened and the current host allowlist blocks the provider redirect | Small code change | **BLOCKED** |
| Separate native AppAuth public client | Strong native OAuth model with external user-agent and PKCE | Requires a second ZITADEL native/public client, redirect registration and an additional Android dependency | **HELD for later native-client migration** |
| External browser + existing server-side confidential client + one-time app PKCE transfer | Preserves the existing confidential OIDC authority, keeps provider pages outside WebView, binds callback transfer to an app-held verifier and rejects replay | No second OIDC authority or Android OAuth dependency | **SELECTED for this slice** |

Selected invariants:
- ZITADEL never loads inside the WebView.
- OIDC client secret/tokens never enter the APK.
- Provider callback stays on the already controlled HTTPS application origin.
- The custom-scheme transfer code is one-time, 60-second bounded and useless without the app verifier.
- Server session remains HttpOnly + Secure + SameSite=Strict.

## Top-400 candidates

| Candidate | Ranking semantics | Licensing / rights | Operational behavior | Result |
|---|---|---|---|---|
| Internal OSS universe adapter | Adapter-defined, can preserve canonical rank | Preferred when deployed and rights-evidenced | No public-provider fallback dependency | **PRIMARY** |
| CoinPaprika public API | Market-cap rank | Private research only in this implementation; attribution surfaced; commercial/redistribution remains a separate gate | Live validation returned 400 unique ranked assets | **SELECTED RESEARCH FALLBACK** |
| Binance public Spot endpoints | 24h USDT quote-volume liquidity rank, **not market cap** | Exchange-data terms remain separate | First live runner probe produced no usable universe | **SECONDARY / DEGRADED FALLBACK** |

No CoinGecko path exists.

## Scorer authority

Repository evidence in `SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c` mounts `createCryptoRouter()` at `/api/crypto` and owns `POST /score`.

Live readback:
- `https://capital-ai.online/api/crypto/score` -> HTTP 400 for deliberately incomplete JSON: route contract reached.
- `https://finance-7clq.onrender.com/api/crypto/score` -> HTTP 404: disabled/non-authoritative public Render subdomain.
- `https://capital-ai-uvsl.onrender.com/api/crypto/score` -> HTTP 405: not the canonical score route.

Therefore the canonical public scorer origin for this slice is `https://capital-ai.online`. Same-origin use requires the explicit `CAPITAL_AI_SCORER_ALLOW_SAME_ORIGIN=true` runtime gate so accidental self-routing cannot silently pass.

## Signing decision

The repository produces unsigned release artifacts only. A single owner-controlled keystore is generated outside Git and reused across releases. The key and password are never committed or uploaded as repository evidence. APK identity must be verified after signing and its SHA-256 recorded.

## Remaining production boundary

This decision evidence does not mutate Render environment variables, DNS or Production. Runtime activation still requires post-merge configuration/readback and the normal production handoff.
