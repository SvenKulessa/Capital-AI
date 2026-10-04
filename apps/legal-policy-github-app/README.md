# LEGAL_POLICY GitHub App

Standalone GitHub App adapter for the reusable `LEGAL_POLICY` engine.

## Security boundary

The app requests only `Contents: read`, `Checks: write` and baseline `Metadata: read`. It does not modify repository contents. Webhook bodies are HMAC-SHA256 verified before JSON parsing.

## Evidence path

```text
pull_request
  -> Dependency Review diff
  -> if unavailable: asynchronous GitHub SBOM request
     -> 201 sbom_url
     -> 202 while processing
     -> 302 temporary SPDX download
  -> SPDX/license classification
  -> LEGAL_POLICY decision
  -> source-SHA/evidence validation
  -> optional Team/Enterprise evidence persistence
  -> GitHub Check Run
```

The async repository SBOM is never treated as proof for a PR head unless its repository package is bound to the exact `pull_request.head.sha`. A completed but unbound SBOM can enrich evidence, but Team/Enterprise gating remains `LEGAL_REVIEW_REQUIRED`.

The temporary SBOM download request does not receive the GitHub installation token.

## Evidence History

Team and Enterprise require durable evidence history. The server stores only metadata required for auditability: repository/installation identity, source SHA, policy ID, release/gate decisions, component/package identity, SPDX data, obligation state, timestamps and a canonical SHA-256 evidence hash. Source code and GitHub OAuth access tokens are not persisted.

`evidence-schema.sql` provisions an append-only Supabase/Postgres table. RLS is enabled; `anon`, `authenticated` and `PUBLIC` have no table privileges. Server access uses a Supabase Secret Key and the database `service_role` only.

Retention is explicit deployment configuration via `LEGAL_POLICY_TEAM_RETENTION_DAYS` and `LEGAL_POLICY_ENTERPRISE_RETENTION_DAYS`; there is no silent default. Expired evidence is purged before paid-plan writes and through authenticated `POST /maintenance/retention`. GitHub `installation.deleted` deletes all evidence for that installation; deletion failures return 5xx so GitHub can retry the webhook.

## Events

- `pull_request`: `opened`, `reopened`, `synchronize`.
- `installation`: deletion cleanup for evidence history.
- `marketplace_purchase`: Marketplace listing webhook, configured separately; entitlements are still resolved authoritatively through the Marketplace API.
- `/setup` -> `/auth/github/callback`: user OAuth bootstrap with signed/expiring state and installation ownership verification.

## Repository configuration

```json
{
  "schemaVersion": 1,
  "defaultUsageClass": "HOSTED_NETWORK_SERVICE",
  "scopeUsageClasses": {
    "development": "BUILD_ONLY",
    "runtime": "HOSTED_NETWORK_SERVICE"
  },
  "sbomUsageClass": "HOSTED_NETWORK_SERVICE"
}
```

A project that ships binaries or browser bundles should use `DISTRIBUTED_BINARY` or `BUNDLED_FRONTEND`. Missing runtime/SBOM usage classification stays fail-closed.

## Environment

GitHub/App:
- `LEGAL_POLICY_GITHUB_APP_ID`
- `LEGAL_POLICY_GITHUB_PRIVATE_KEY`
- `LEGAL_POLICY_GITHUB_WEBHOOK_SECRET`
- `LEGAL_POLICY_GITHUB_CLIENT_ID`
- `LEGAL_POLICY_GITHUB_CLIENT_SECRET`
- `LEGAL_POLICY_SESSION_SECRET`
- `LEGAL_POLICY_PUBLIC_URL`

Evidence/retention for Team/Enterprise:
- `LEGAL_POLICY_SUPABASE_URL`
- `LEGAL_POLICY_SUPABASE_SECRET_KEY`
- `LEGAL_POLICY_TEAM_RETENTION_DAYS`
- `LEGAL_POLICY_ENTERPRISE_RETENTION_DAYS`
- `LEGAL_POLICY_MAINTENANCE_SECRET`

Bounded async SBOM polling (optional):
- `LEGAL_POLICY_SBOM_POLL_ATTEMPTS` (bounded to max 5)
- `LEGAL_POLICY_SBOM_POLL_DELAY_MS` (bounded to max 1000 ms)
- `PORT` (default `10020`)

## Product behavior

Free/Pro publish a neutral check. Team/Enterprise enforce the effective gate decision. A legal classification of `ALLOW` is not sufficient for a green paid gate when the evidence cannot be bound to the exact source SHA or required evidence history cannot be persisted.
