# TinyFish owner readback – operator-only CLI

Scope: TRUST/GROWTH, repository `SvenKulessa/Capital-AI`. This is **not** a public HTTP endpoint, MCP registration, publishing adapter, Meta OAuth replacement, or tenant capability.

## Usage

In an authorized local operator environment only, supply the following server-side environment variables using an existing secret store (never commit actual values):

- `CAPITAL_AI_TINYFISH_READBACK_ENABLED=true` – fail-closed opt-in, absent by default.
- `TINYFISH_API_KEY` – TinyFish API key; do not print or put in `VITE_` variables.
- `TINYFISH_PROFILE_ID` – explicit owner-controlled Browser Context Profile ID (not a browser engine profile).

Run `node scripts/tinyfish-owner-readback.mjs instagram` or `node scripts/tinyfish-owner-readback.mjs facebook`. No arbitrary URLs, goals, profile overrides, browser credentials or user IDs may be passed as CLI arguments. The command has **usage-based TinyFish charges**; the owner must deliberately enable and invoke it. It does not run on boot or CI.

## Security boundary

The operator-only CLI is not callable from a customer route. It never loads a public browser bundle, saves secrets, forwards upstream error messages, or relays raw screenshots, cookies, tokens, goals or page content. Output is an enum/handle allowlist plus opaque run ID.

**Caution:** A read-only natural-language goal does **not** make a browser agent technically incapable of clicking mutation controls. Use this tool only for an owner-maintained session after explicitly accepting that residual third-party automation risk. No publishing, permissions or Meta account changes are implemented. Do not share saved browser profiles between tenants.

`REPORTED` means the provider claimed authenticated structured results; it does **not** independently verify Meta access. Login walls, failed runs, incomplete output and unknown access remain `BLOCKED` or `NOT_PROVEN`.

SSE supports fragments, CRLF, size/volume limits, `STARTED`/ `COMPLETE` state and recovery by `GET /v1/runs/{run_id}` after stream loss. Recovery never submits a second paid POST. Unknown states fail closed. No HTML/streaming URLs are surfaced to users.

## Evidence and rollback

Synthetics: `node --test scripts/tinyfish-owner-readback.test.mjs`. The tests are also imported by `scripts/mcp-isolation.test.mjs`, already exercised in the existing Docker Security Gate and `test:security`. Tests use synthetic credentials and mocked fetch; they do not contact TinyFish or Meta.

Rollback: unset `CAPITAL_AI_TINYFISH_READBACK_ENABLED` (default); remove CLI files/revert the commit if required. No database schema, public route, persistent state, social publish flags, or additional CI required checks are created.

The separate existing Instagram Facebook Login contract remains the authority for OAuth. The TinyFish profile sign-in is *not* proof of a successfully connected Instagram account.
