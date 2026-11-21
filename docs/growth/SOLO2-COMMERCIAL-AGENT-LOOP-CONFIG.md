# SOLO2 Commercial Agent Loop configuration

`CAPITAL_AI_SOLO2_COMMERCIAL_POLICY@1` adds a product-facing policy layer to the existing validated SOLO2 runtime profile.

## Defaults

- Draft pull requests may be promoted to **Ready for review** by the agent loop (`autoReadyDrafts: true`).
- Customers/operators may disable only that transition with `autoReadyDrafts: false`.
- Base synchronization, exact-current-head validation and required checks stay mandatory.
- Merge method is fixed to `REBASE` in this contract.
- `SOLO_MAINTAINER_FLOW@2` and the five CAPITAL-AI domain policy references are exported as deterministic system variables.

## Safety boundary

This configuration is declarative. It does not itself grant GitHub authority, provider permissions, secrets, paid-resource rights, publishing rights, licensing rights or deployment authority. Runtime adapters must independently verify their provider authorization and repository rules.

`autoReadyDrafts` is intentionally independent from merge admission. Disabling or enabling it cannot disable required checks, current-head validation or base synchronization.

## Product integration

Import `shared/solo2-commercial-policy.mjs`, create the commercial policy from an already-valid SOLO2 profile, validate it at the configuration boundary, and derive `solo2CommercialSystemVariables()` for the runtime adapter. The returned variables contain policy identifiers and booleans only, never credentials.
