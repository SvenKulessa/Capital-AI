# X OAuth Edge Vault — Security and rollout contract

Status: DESIGN / NOT_DEPLOYED. Branch: `capital-ai-growth/x-edge-vault-20261013`.

## Scope
Move **only X OAuth state persistence, atomic state consumption, encrypted token upsert and token-free status readback** from Render's privileged PostgREST access to a Supabase Edge Function. Do not change Supabase Auth login provider or other service-role consumers (commerce, privacy, vault, etc.). No production secret is moved by this document.

## Required security boundary
1. The function must verify a real Supabase Auth user JWT, reject expired/revoked tokens, and independently check the verified-email and IAM owner role in the database. Never trust user ID, role, owner claim or account ID from an HTTP request body.
2. The function must verify a dedicated Render-to-Edge workload credential **in addition** to the user identity. This credential is separate from the Supabase secret/service-role key; provision and rotate through approved secret stores. No anonymous requests, no caller-controlled SQL/table names.
3. Prefer X token exchange and AES-256-GCM encryption inside the Edge Function so X tokens and the encryption key do not traverse Render. Alternatively, if encryption remains in Render, document that Render still holds the token encryption key and X credentials, and enforce authenticated, bounded, TLS-only transfer.
4. Generate and persist PKCE verifier and state digest server-side. State consumption must be atomic, one-time, owner-bound, exact redirect URI-bound and expire quickly. Do not expose verifier, OAuth codes, refresh tokens, ciphertext or provider secrets in HTTP responses, logs, tracing or analytics.
5. Constrain endpoints to explicit operations: `start`, `consume`, `status`; strict request schema and method, rate limits, no redirects to arbitrary origins, request body limits, no-cache and no-referrer. Do not expose raw tables or generic SQL proxies.
6. Keep all privileged Supabase keys inside Supabase-managed Edge secrets. Edge Function JWT verification must be correctly configured for the chosen token type; don't disable `verify_jwt` without a reviewed equivalent in-function verification and abuse protection.
7. Test denied anonymous/non-owner, cross-user, wrong origin, malformed state, replay, expired state, revoked identity, invalid scopes, X token failure, encryption failure, DB failure and provider readback. Check no token leakage and rollback. Avoid live billable X calls in automated tests.
8. Keep `SOCIAL_X_OAUTH_CONNECT_ENABLED` fail-closed until production deployment, JWT + workload credential provisioning, CI PASS, owner connection and readback verification. Keep public publishing disabled.

## Compatibility and rollout
- Existing Render OAuth endpoints must remain unavailable or fail-closed until the Edge adapter is live; no partial switching of callback, start and status.
- Do not delete or rotate `SUPABASE_SECRET_KEY` in Render yet: other server features use it. Only remove it after a separate cross-domain migration and successful regression evidence.
- No X posts or purchases are authorized by this work. API connection/readback was approved; usage should be bounded and audited.
- Required checks: Docker Security Gate, Domain Governance; merge only with current-head passing evidence per AGENTS.md.

## Acceptance
- Edge source, Render adapter, tests and deployment config committed and reviewed.
- No privileged Supabase key needed by the X OAuth Render path.
- Production Edge function deployed with correctly configured identity and workload verification.
- Owner-only X connect and status confirmed; no credentials in responses.
- Rollback verified; publishing remains OFF.
