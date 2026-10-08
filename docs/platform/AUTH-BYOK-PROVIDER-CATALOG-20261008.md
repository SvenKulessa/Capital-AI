# CAPITAL-AI: private BYOK-Provider-Katalog (2026-10-08)

Basis: `main@4d76280bbace820aa9463452148f88b0cb614ae9`. Owner PRODUCT (UI), MARKET (Provider/Datennutzung), TRUST (Vault/Auth).

## Zustand

- **VERIFIED IN SOURCE:** Google-PKCE-OAuth inkl. Callback / Erstregistrierung, TOTP-Enroll/Verify/Login, serverseitige Session-Cookies, nutzerbezogene Vault-RPCs.
- **VERIFIED IN DB (read-only):** `private.user_provider_connections.provider` erlaubt ausschließlich `kraken` und `binance`; die RPCs sind nur per `service_role` ausführbar, nicht per `authenticated`.
- **IMPLEMENTED / NOT LIVE-PROVEN:** UI-Auswahl für 20 namentlich benannte APIs. `kraken` / `binance` nutzen bestehende serverseitige Konto- und Auth-Readbacks. Ein echter Live-Key-Test mit einem Nutzer-Secret erfolgte nicht.
- **NOT PROVEN:** Supabase-Google-Provider-Settings, MFA-Settings, Redirect-Allowlist, Benutzer-E2E, Provider-Tarife, Datenrechte und Kosten der 18 Kandidaten.
- **TRUST FOLLOW-UP:** E-Mail-Registrierung persistiert die Terms-/Privacy-Akzeptanz über `handle_new_user()`; der vorhandene Google-OAuth-PKCE-Callback setzt dagegen keine entsprechenden Metadaten/Consent-Evidence für ein neu erstelltes Konto. Consent-Parität für Google-Erstregistrierung muss vor einer vollständigen rechtlichen Freigabe separat belegt bzw. konservativ nachgerüstet werden. Die UI-Beschriftung allein ist keine E2E-Abnahme.

## Fail-closed-Lifecycle

```text
PROFILE /profile/key-vault
  -> active? (kraken | binance)
      -> same-origin + verified Supabase session / AAL2 if enrolled
      -> authenticated PUT (key + secret transient)
      -> fixed server adapter / permissions & funding checks
      -> service_role-only RPC -> Supabase Vault secret
      -> metadata/fingerprint only back to browser
  -> planned? -> form disabled, save guard, NO secret submission
```

No browser-side provider fetch, no log of credentials, no shared data cache or JetStream publication, no unlocked trade execution. A personal BYOK key is never permission to reuse data for public MarketScreener quotes or redistribute provider outputs. Provider-specific commercial display rights need independent verification.

## Next adapters (not active)

- `coinbase` – Coinbase Advanced (Crypto-Börsen); **NOT_PROVEN**
- `bitstamp` – Bitstamp (Crypto-Börsen); **NOT_PROVEN**
- `bybit` – Bybit (Crypto-Börsen); **NOT_PROVEN**
- `okx` – OKX (Crypto-Börsen); **NOT_PROVEN**
- `alpha_vantage` – Alpha Vantage (Aktien & Marktdaten); **NOT_PROVEN**
- `twelve_data` – Twelve Data (Aktien & Marktdaten); **NOT_PROVEN**
- `finnhub` – Finnhub (Aktien & Marktdaten); **NOT_PROVEN**
- `financial_modeling_prep` – Financial Modeling Prep (Aktien & Marktdaten); **NOT_PROVEN**
- `massive` – Massive (Polygon.io) (Aktien & Marktdaten); **NOT_PROVEN**
- `tiingo` – Tiingo (Aktien & Marktdaten); **NOT_PROVEN**
- `eodhd` – EODHD (Aktien & Marktdaten); **NOT_PROVEN**
- `marketstack` – Marketstack (Aktien & Marktdaten); **NOT_PROVEN**
- `fred` – FRED (Makro & Referenzdaten); **NOT_PROVEN**
- `nasdaq_data_link` – Nasdaq Data Link (Makro & Referenzdaten); **NOT_PROVEN**
- `coingecko` – CoinGecko (Crypto-Daten); **NOT_PROVEN**
- `coinmarketcap` – CoinMarketCap (Crypto-Daten); **NOT_PROVEN**
- `cryptocompare` – CryptoCompare (Crypto-Daten); **NOT_PROVEN**
- `alchemy` – Alchemy (Web3 / RPC); **NOT_PROVEN**

Every adapter must specify a fixed provider host, authentication mode, read-only permission probe, rate/cost budget and timeout, error masking, output schema, provider license/data use policy, and negative tests before its status can transition to `active`. No arbitrary URL or header injection from browser input. Do not expand the Vault allowlist before such adapters have passed tests and a reviewed migration is ready. Confirm plan/usage prices and rights with each API vendor; free tiers and account holdings cannot be presumed redistributable or cost-free.

## Production

This change deliberately does not alter Supabase Auth settings, database constraints, Render secrets, NATS, OCI images or production services. Required GitHub Checks and owner merge/normal main deployment precede live activation. No extra governance gates are created by this document.

## Google OAuth registration consent hardening

- The explicit **Google registration** button uses a same-origin POST only after required Terms and Privacy checkboxes are selected; marketing is optional and defaults to `false`.
- The server validates checkbox intent, validates the existence of a server-only Supabase admin credential, and carries consent **only within signed, HttpOnly, short-lived PKCE state**.
- Following the verified Google callback, the server writes `terms`, `privacy` and `marketing` evidence to the existing `user_consents` table via a service-role-only PostgREST call with ignore-duplicates semantics. A persistence error returns 503 before an application session is issued.
- Read-only Supabase schema verification confirmed `user_consents_subject_document_uq` on `(user_id, consent_type, document_version)`. No SQL migration is required.
- **Residual limitation:** the original Google **login** URL remains backward compatible; on a Google account created via login-first flow, Supabase may auto-create an account without explicit registration consent. A future controlled onboarding/consent interstitial is required if all login-first registrations must be prevented. Do not mistake explicit-signup parity for universal signup-policy enforcement.
