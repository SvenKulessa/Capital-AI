# LEGAL_POLICY GitHub App

Standalone GitHub App adapter for the reusable `LEGAL_POLICY` engine.

## Security boundary

The app requests only:

- `Contents: read` for Dependency Review/SBOM and optional `.legal-policy.json` configuration.
- `Checks: write` to publish `LEGAL_POLICY` check runs.
- `Metadata: read` (GitHub App baseline metadata access).

No repository contents are modified. The webhook body is verified with `X-Hub-Signature-256` before JSON parsing.

## Events

- `pull_request`: scans dependency changes for `opened`, `reopened`, and `synchronize`.
- `marketplace_purchase`: sent by the Marketplace listing webhook to the same handler URL for purchase/change/cancellation events. Entitlements are authoritative from GitHub Marketplace API lookup, so billing state is not guessed from cached webhooks.
- `/setup` → `/auth/github/callback`: Marketplace post-install setup starts GitHub user OAuth, verifies signed/expiring state, verifies that the OAuth user can access the installation, then resolves the Marketplace subscription.

## Repository configuration

Runtime dependencies are deliberately fail-closed until the repository declares the distribution model. Example `.legal-policy.json`:

```json
{
  "schemaVersion": 1,
  "defaultUsageClass": "HOSTED_NETWORK_SERVICE",
  "scopeUsageClasses": {
    "development": "BUILD_ONLY",
    "runtime": "HOSTED_NETWORK_SERVICE"
  }
}
```

A project that ships binaries or browser bundles should choose `DISTRIBUTED_BINARY` or `BUNDLED_FRONTEND` instead.

## Environment

- `LEGAL_POLICY_GITHUB_APP_ID`
- `LEGAL_POLICY_GITHUB_PRIVATE_KEY`
- `LEGAL_POLICY_GITHUB_WEBHOOK_SECRET`
- `LEGAL_POLICY_GITHUB_CLIENT_ID`
- `LEGAL_POLICY_GITHUB_CLIENT_SECRET`
- `LEGAL_POLICY_SESSION_SECRET`
- `LEGAL_POLICY_PUBLIC_URL` (canonical HTTPS base URL)
- `PORT` (optional; default `10020`)

## Product behavior

Free and Pro publish a neutral check. Team and Enterprise can enforce the legal-policy decision as a PR gate. Detailed obligation text is a Pro+ capability; evidence history and audit export start at Team; policy profiles/API are Enterprise capabilities.

The registration blueprint subscribes the GitHub App itself only to `pull_request`; the Marketplace listing webhook is configured separately during Marketplace onboarding.

The current PR scanner uses GitHub Dependency Review. Where that API is unavailable (for example because a private repository lacks the required GitHub Code Security capability), the adapter must fail closed rather than infer a clean result. The production hardening track is to add the asynchronous GitHub SBOM flow as a fallback; the legacy synchronous SBOM export should not be used as the long-term design.

The OAuth bootstrap deliberately does not persist or log the returned GitHub user access token; a production account/session store should persist only the minimum account linkage required by the product.

The current adapter does not persist source code. Evidence history should store hashes, component identity, SPDX expressions, policy id/version, decisions, obligation status and timestamps rather than private source contents.
