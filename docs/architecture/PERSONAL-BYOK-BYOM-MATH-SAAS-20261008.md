# Personal Intelligence Workspace — BYOK/BYOM / Scoring as a Service

Stand: 2026-10-08
Primary Domain: TRUST; Fachperspektiven PRODUCT / MARKET / PLATFORM
Status: implementation slice for user-specific binding configuration; not a production, model-runtime or data-license approval.

## Commercial model

CAPITAL AI sells its own mathematical analysis algorithms, calculation methods, explainability, scoring and visualization. End users optionally supply **their own** licensed data access and model inference budgets. Provider fees and model-token charges are not included in the CAPITAL AI subscription without an explicit separate commercial agreement. No CAPITAL-AI on-chain token, payment, wallet or consumption accounting is activated by this change.

Being a personal subscriber does **not** necessarily authorize handling licensed data on CAPITAL AI's multi-tenant commercial servers. Rights vary by dataset, tariff, provider and processing use (display, internal processing, derived data, hosting, AI model input, caching, sharing). Actual permission must be evidenced before runtime execution. A click-through declaration is not equivalent to an upstream license.

Official terms checked 2026-10-08:
- Massive market data: https://massive.com/legal/market-data-terms-of-service — individual/non-business use may disallow third-party app service operation and redistribution.
- Massive individual terms: https://massive.com/legal/individuals-terms-of-service
- Kraken API: https://docs-legacy.kraken.com/api/docs/guides/global-intro/ — some commercial market-data use requires prior authorization.
- Supabase Vault: https://supabase.com/docs/guides/database/vault

## Delivered scope (configuration only)

1. Existing /profile/key-vault still stores *provider credentials* encrypted and server-side, owned by the authenticated user.
2. New /profile/workspace lists seven module configurations, existing VERIFIED own providers, optional model provider + model identifier, and explicit binding state.
3. Data is stored in private.user_analysis_bindings; RPC grants are service_role only, API access requires a verified server session. SQL checks user-ownership of verified credential before referencing it.
4. No API key, model secret or token is accepted by this workspace API; unknown JSON fields fail validation.
5. execution_enabled is hard-forced to false by DB CHECK and server response. Saved bindings DO NOT call scoring, models, provider APIs or billing.
6. The page and API carry no-store/private SEO state. No sharing or cross-user use.

## Trust boundary

```text
Browser (authenticated, HttpOnly session)
  -> /api/profile/analysis-bindings (verify session + same-origin mutations)
  -> service_role RPC (user_id strictly from verified session)
  -> private.user_analysis_bindings (private metadata only)
                      |
                      +--> existing user_provider_connections (owner/status check)
                      +--> no direct access to decrypted Vault payload in this path

Future (NOT ENABLED):
  user analysis action -> entitlement + provider tariff/usage-purpose decision
   -> private tenant-scoped provider query -> deterministic feature set
   -> mathematical scoring engine -> private owner-only result
   -> optional BYOM gateway with individually consented allowed feature projection
```

## Separate execution design (later; not silently activated)

- **Data rights**: derive provider/product/license/specific operation in a machine-readable purpose matrix; deny unknown or personal-only tiers whose conditions exclude server-side multi-tenant processing. Retain license evidence / provenance without credentials.
- **Provider route**: user-scoped read-only query through the current Rust Bridge, tenant-specific NATS request/response subjects and Valkey keys. Do not copy private data into public CAPITAL_FACTS or public screener endpoints. TTL/retention follow rights, default ephemeral.
- **Scoring**: data-contract validation, deterministic math version, observedAt/receivedAt timestamps, DQ/eligibility gates, immutable sanitized input hashes, user-isolated results. Raw third-party payloads never cross to another tenant.
- **BYOM**: separate encrypted user model credentials in Vault; allowlisted vendor/model catalog, no arbitrary client-defined URLs/SSRF; prompt minimization, consent per module, retention policy, output sanitization, budgets, timeouts, provider key quotas. External prompts and model features never automatically include account holdings or proprietary raw market data.
- **Future credits/tokens**: off-chain metered billing ledger only after separate product/legal/technical decision; separate subscriptions (math/analysis) from model/provider pass-through usage; verify Stripe webhooks and idempotency. A cryptocurrency token or token economy is **not** assumed.
- **Cost safety**: provider call ceilings, per-user concurrency, token estimates / caps and usage audit (no secret leakage), fail-closed on missing quotas. No paid external operation without explicit owner / end-user consent and tariff evidence.
- **Deletion**: deletion of a user account cascades metadata rows; revoke/delete associated Vault secrets using the already governed Vault process; avoid retaining user data in JetStream, logs or shared caches.

## Acceptance / verification status

| Criterion | State |
| --- | --- |
| Private workspace routing and model/provider configuration code | IMPLEMENTED_ON_BRANCH |
| Per-user SQL/RPC contract with forced execution_enabled=false | IMPLEMENTED_ON_BRANCH |
| Session, CSRF, schema validation unit tests | ADDED_NOT_YET_EXECUTED |
| Supabase migration actually applied, RLS readback in hosted instance | NOT_PROVEN |
| Live UI / browser evidence for multiple users | NOT_PROVEN |
| Kraken/Massive tariff rights for hosted scoring use | NOT_PROVEN; fail-closed |
| Model API-key Vault integration and inference / token charging | NOT_IMPLEMENTED |
| Scoring / NATS JetStream / Valkey / Rust execution integration | NOT_IMPLEMENTED |
| Product subscriptions and algorithm IP pricing | UNCHANGED |

Main branch and production remain unchanged until approved PR merge, migration and deployment. Required checks: Docker Security Gate and Domain Governance. Test success is neither license nor production authority.
