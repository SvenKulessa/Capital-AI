# CAPITAL-AI TRUST: Credential Lifecycle Manager

Baseline: `main` at `136bfec79d0beedeee71ab25e01c304a2bc7b453` (15 November 2026). Primary authority: root `AGENTS.md`, `SOLO_MAINTAINER_FLOW@2`.

## Scope and trust boundary

**Repository-only implementation.** A strict, metadata-only inventory exists at `config/credential-lifecycle.inventory.json`, and a bounded LangGraph audit lives at `scripts/growth-agent/credential_lifecycle.py`. It **does not** read provider secrets, call APIs, run OAuth, refresh grants, rotate keys, start timers, write output files, or deploy. Existing provider refresh implementations remain untouched. There is no new scheduler, Required Check, environment variable, cost, or permission.

The inventory deliberately records **unknown** expiry/review dates as `null`, rather than deriving them from key types or previous transient observations. A repository source reference identifies where a credential may be consumed, **not evidence that a provider credential exists or is valid**. A missing observation remains `NOT_PROVEN` (except keyless federation which is distinguished as `KEYLESS`, not proof of successful federation).

Optional input observations use the same schema and include only `id`, `expires_at`, `observed_at`, `evidence_ref`. Every ID must match the curated static inventory; records must be within 24h, cannot be from the future, and carry a constrained evidence reference. Provider-origin authenticity requires an independently trusted collector/owner; these files are **not** a verified source by themselves. The manager never reads tokens or arbitrary fields from observations. Any unsupported/secret-bearing fields, duplicate or unrecognized IDs, ambiguous timestamps, future/stale evidence, arbitrary URLs, or malformed schema fail closed without printing raw inputs.

## State graph and policy

`START -> INVENTORIED -> EVALUATED -> EVIDENCED -> END`. The evidence history includes one of `BLOCKED`, `NOT_PROVEN`, `REVIEW_REQUIRED`, `VERIFIED`. This graph has no adapter, side effect, repair loop, merge, publish, or deployment transition; a `VERIFIED` status means expiry-policy evaluation only, **not** provider connectivity or live token validity.

- `EXPIRED` (`BLOCKED` overall): read-only refresh eligibility or reauthorization investigation, never automatic reauthorization.
- `DUE_30D`, `DUE_14D`, `DUE_7D`, `DUE_3D`, `DUE_1D`: prepare approved rotation; do not auto-rotate.
- `REVIEW_DUE`: administratively assigned review date, **not** provider expiry.
- `NOT_PROVEN`: no expiry or review evidence; request metadata (no green status inferred).
- `KEYLESS`: federation identity, no static credential to rotate, but federation validity remains separately unproven.

Expiration is evaluated at UTC seconds precision. No guessed vendor TTL is introduced. `metadata_only_no_provider_actions` is fixed in every report. Results contain IDs, provider names, status, action names, age band and evidence class only; they contain no token values, confidential URLs, raw provider payloads, or diagnostic exceptions.

## Local commands / CI

```sh
python3 -m unittest discover -s scripts/growth-agent -p 'test_credential_lifecycle.py' -v
# Requires the existing pinned LangGraph environment:
python3 scripts/growth-agent/credential_lifecycle.py --inventory config/credential-lifecycle.inventory.json
# Trusted optional metadata observations (never commit operational readback files):
python3 scripts/growth-agent/credential_lifecycle.py --inventory config/credential-lifecycle.inventory.json --observations /private/credential-metadata.json
```

The **existing** `Google Maintenance and Local Growth Graph` workflow already runs pinned `scripts/growth-agent/requirements.lock` and discovers `test_*.py` under `scripts/growth-agent`; the two new Python files cause the existing path filter to run on the PR. The existing Docker Security Gate and Domain Governance rules are unchanged. No separate scheduled workflow or CI gate is added.

## Verification and outstanding evidence

Local stdlib regression: 13 tests discovered, 12 passed, 1 LangGraph integration test skipped because LangGraph is not installed in the isolated local runner. Pinned CI must execute the graph integration test and its other existing checks; **until actual CI run/exit code and head SHA are read back, CI is `NOT_PROVEN`**.

`NOT_PROVEN`: actual provider key issuance/expiry dates, Google/Stripe/GitHub/Render credential metadata, OAuth refresh outcomes, runtime live status, and any downstream messaging integration. None of these are claimed by repository tests. The existing owner-only X refresh requires separate authorization and paid-API policy, and the YouTube resolver retains its own grant-specific refresh mechanism; neither is invoked by this manager.

Rollback: revert the feature-branch commit(s); no database schema, vendor configuration, GitHub required checks, secrets, or deployment state to reverse. The inventory includes provider usage references for future independently authorized collector integrations, not permission to add such collectors or schedules here.