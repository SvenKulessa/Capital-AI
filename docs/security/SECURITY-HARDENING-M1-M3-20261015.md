# CAPITAL-AI-TRUST – HTTP, API and External MCP Security Hardening

Date: 2026-10-15. Baseline: main da6a8ab8234870146b0a3c365407c826fefce782.
Authority: AGENTS.md / SOLO_MAINTAINER_FLOW@1.
Domain skill evidence: trust-engineering, trust-advisory, supabase (plugin).

## Finding, scope and evidence

- M1: HTTP CSP in server/index.mjs previously allowed style-src unsafe-inline, img-src https: and full tagmanager host. Security headers were missing COOP/CORP and includeSubDomains. New server/security-headers.mjs removes unsafe-inline, hashes inline CSS/style attributes of emitted server HTML, limits Google script source to gtag.js, limits images to same-origin/data/blob, adds HSTS includeSubDomains (without preload), COOP and CORP. Consent-based GA4 loading already exists in src/utils/consentedAnalytics.ts and is retained.
- Important M1 limitation: runtime React style attributes set after hydration are NOT covered by server-generated hashes. Browser QA and migration from inline styles to classes may be necessary; no claim of complete CSS compatibility. All publicly reachable HTTPS subdomains must be checked before enabling deployment of includeSubDomains; do not add preload without distinct DNS/TLS evidence. Cross-origin social previews/embeds must also be checked because CORP is strict.
- M2: server/api-rate-policy.mjs applies a process-wide, named route-family budget before all /api/* module handlers, including otherwise unlisted routes. Existing local endpoint-specific budgets remain active. This proves a single-instance code boundary and NOT an ingress-wide/distributed rate limit: deploy shared Valkey/Redis fixed-window or gateway limits with atomic semantics before calling it a global multi-replica guarantee. Never derive identity from untrusted X-Forwarded-For. Avoid throttling all accounts by assuming a reverse-proxy socket address identifies the client.
- M3: external HTTP MCP endpoints Metricool and MetricDuck removed from auto-discovered .mcp.json. Use separate, explicit interactive/manual connections only for authorized accounts/scopes. No tokens in this repository; do not add these services to CI, agents with automated publication permissions or production Render workflows. Rotate vendor credentials independently and revoke compromised grants.
- /.well-known/security.txt was already implemented and tested at server/well-known.mjs and server/well-known.test.mjs. The 2027-04-05 expiry is future-dated as of this review. Do not create conflicting duplicate static files.
- Supabase: live security advisor returned 14 RLS-enabled/no-policy informational entries, mostly private/service-only. Do not create permissive policies to clear INFO. Public tables returned by list_tables have RLS enabled. The single auth_leaked_password_protection warning was previously documented as Free-tier limitation in docs/security/SUPABASE-FREE-TIER-HARDENING-20261006.md; do not create or upgrade projects without cost approval. Verify GRANTs and tenant isolation before changing DB access.
- Supabase performance advisor: four unindexed FKs plus unused index suggestions. Assess query/tenant impact before any production DDL; no migrations applied by this change.

## Operation and secret rotation

Record last-rotated dates only in a private operational register, never in code/CI logs. Every 180 days audit Render environment variable names, OAuth client-secret age, Supabase service-role secret key and individual MCP/provider credentials. Rotate only secrets that are actually due, using staged dual-key or restart/reconnect workflows and verified rollback, without exposing values. For OAuth, test redirect URI, refresh flow, revoke old credential AFTER verified new credential. For Render, review service scope and least-privilege, redeploy, and read back health and authorization tests. Shared single-key rotations may require planned downtime: never invalidate before consumers are migrated.

## Acceptance and rollback

Tests: node --test server/security-headers.test.mjs server/api-rate-policy.test.mjs server/security.test.mjs server/well-known.test.mjs
Also run existing frontend/consent and authentication suites, the Docker Security Gate and Domain Governance CI on exact PR head. Check CSP violations using a real browser (login, profile, legal pages, external analytics after consent, CTA/checkout, SEO/article images), cross-origin embed behavior and subdomain HTTPS. Inspect /healthz source SHA after deployment.

Statuses:
- CODE_PRESENT: pending PR CI until accepted.
- SUPABASE_RLS_READBACK: PARTIAL_VERIFIED (read-only advisors and public table inventory).
- GLOBAL_MULTI_INSTANCE_RATELIMIT: NOT_PROVEN.
- RENDER_ENV_LAST_ROTATION: NOT_PROVEN.
- PROD_CSP_BROWSER_QA: NOT_PROVEN.

Rollback: revert the security code PR, then redeploy through ordinary protected main flow; do not disable required checks or change provider credentials during rollback.

## Additional production Supabase read-only checks (2026-10-15)

A read-only `pg_class` + `pg_policies` + `has_table_privilege` inventory against connected production project (ID withheld from document) confirmed:
- `private`: 14 tables, **all 14 RLS-enabled**, seven intentionally without policy, **zero** anon/authenticated table grants.
- `public`: 64 tables, **all 64 RLS-enabled**, seven without policy. Four tables have an anon table privilege and seven have authenticated table privileges, but effective visibility depends on row policies.
- Public tables with grants were `profiles`, `subscriptions`, `usage_log`, `site_metrics`, `security_events`, `privacy_requests`, `user_consents`. RLS readback confirms own-`auth.uid()` or verified-owner SELECT for applicable read paths, or `service_role`-only policies for `usage_log`/`site_metrics`. No blanket data exposure was observed from this policy inspection. Authenticated two-user adversarial access tests remain NOT_PROVEN; do not conflate policy inspection with BOLA-proof.
- Render workspace read-only inventory: current production Capital-AI web service deploys from main after checks, in Frankfurt with one configured instance; dormant NATS and provider bridge resources remain suspended. Shared global multi-instance rate limiting remains NOT_PROVEN, and existing single instance does not guarantee future horizontal scaling.
- No secret values or database contents were retrieved, and no DDL, Render environment updates, login tokens, costful service activations, or secrets rotations were performed.
