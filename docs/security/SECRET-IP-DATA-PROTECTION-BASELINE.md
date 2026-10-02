# Password, Secret, Intellectual-Property and Protected-Data Baseline

Date: 2026-10-02  
Domains: TRUST + PLATFORM

## Data classes

1. **Authentication secrets** — passwords, recovery codes, TOTP seeds, private keys.
2. **Machine secrets** — API keys, OAuth client secrets, SMTP credentials, NATS tokens, database/service-role keys.
3. **Protected intellectual property** — proprietary prompts, unpublished benchmark datasets, model/system configuration, non-public algorithms and commercially sensitive evidence.
4. **Personal/security evidence** — audit actor identifiers, auth events, security incidents.
5. **Public metadata** — component names, versions, SPDX identifiers, public repository URLs and redacted CADS results.

## Passwords

Passwords are never encrypted for later recovery and never logged. Password authorities must use adaptive one-way hashing. For a self-managed password store the preferred baseline is Argon2id; CAPITAL-AI currently delegates user credential storage to the configured identity provider rather than creating a parallel password database.

Password changes require recent authentication or equivalent step-up for sensitive accounts. Known-compromised-password protection is required where the selected provider/plan supports it. Passkeys/WebAuthn remain the preferred phishing-resistant path.

## Secrets

- Runtime secrets exist only in provider secret stores/environment injection, never source, image layers, browser bundles, generated Documentary or benchmark artifacts.
- Service-role or equivalent bypass credentials are server-only.
- Inventory records contain metadata only; a database CHECK explicitly forbids a flag indicating stored secret values.
- Secrets have one owner/use case, bounded blast radius, rotation/revocation path and audit reference.
- Push protection/secret scanning should block supported credentials before protected history receives them.
- Logs redact keys matching secret/token/password/auth/cookie/API-key/private-key/credential semantics.
- Rotations create BACKEND supersession events; UI/public-key changes create FRONTEND supersession events.

## Protected IP / copyrighted data

Do not copy third-party source, datasets, reports, fonts, media or documentation into evidence unless the license/contract permits that exact use. Prefer hashes, identifiers, short metadata, SPDX expressions, source URLs and locally generated benchmark measurements. Store unpublished proprietary inputs in private storage with least-privilege access and separate retention rules; Documentary receives references/hashes instead of raw payloads.

## Protected inventory

Canonical sensitive metadata lives in Supabase schema `private`, not `public`, with grants revoked from `anon`, `authenticated` and `PUBLIC`. The repository carries only the public-safe projection required for reproducibility and UI.

## Current finding

The 2026-10-02 Supabase security advisor reports leaked-password protection disabled. This remains a visible TRUST finding. Enabling it is a provider/security configuration mutation and is not silently changed by this repository slice.

## Append-only audit target

A private Supabase table `private.capital_ai_audit_events` is provisioned as the protected persistence target. `PUBLIC`, `anon` and `authenticated` have no table access; `service_role` receives only SELECT + INSERT, not UPDATE/DELETE. The current runtime logger does not silently claim persistence there: wiring the writer requires a verified server-side credential/configuration path and an explicit retention decision.
