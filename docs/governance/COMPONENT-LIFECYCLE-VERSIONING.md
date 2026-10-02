# External Component Lifecycle, Versioning & CADS

Status: proposed implementation baseline  
Domains: PLATFORM + TRUST, consumers PRODUCT/MARKET/GROWTH

## Scope

This policy covers architecture-significant third-party applications, managed services, runtimes, infrastructure components and OSS tools. Transitive package dependencies remain exhaustively tracked by lockfiles/SBOM and are not duplicated as individual dashboard applications.

## Five-phase wording

1. **DISCOVERED** — candidate identified; origin, license and use case recorded.
2. **BENCHMARKED** — same-workload benchmark and security/provenance review exist.
3. **APPROVED** — owner/governance decision exists, but the component is not necessarily live.
4. **ACTIVE** — runtime/control-plane readback proves the version or managed identity in use.
5. **SUPERSEDED** — historical evidence remains, but the component/version is non-authorizing.

Only two supersession scopes are used: **FRONTEND** and **BACKEND**.

## CADS_PROFILE@2

Owner priorities sum to 130 rather than 100. To preserve the intended ratios without silently dropping a criterion, runtime scoring normalizes them to 100:

| Dimension | Raw priority | Normalized |
|---|---:|---:|
| Security | 25 | 19.23% |
| Correctness | 25 | 19.23% |
| Performance | 25 | 19.23% |
| Reliability | 20 | 15.38% |
| Maintainability | 10 | 7.69% |
| License | 5 | 3.85% |
| Observability | 20 | 15.38% |

Portability/Cost is a non-compensable gate: OSS or a sufficiently capable freemium path is acceptable; cost-producing adoption requires a specific owner decision in chat. Security, correctness and license/provenance failures remain BLOCKED independent of the numerical score.

Calibration follows **BASELINE → OBSERVE → CALIBRATE → CHALLENGE → PROMOTE**. A profile may learn from measured outcomes, but every promoted profile is versioned, reproducible and reversible.

## Version cycle

- Security release/advisory: evaluate immediately.
- Patch: weekly inventory readback; bundle only when risk remains low.
- Minor: monthly benchmark delta for architecture-significant components.
- Major: isolated migration with full CADS + rollback.
- Managed SaaS: record provider identity/configuration state and dated readback because a package version may not exist.
- Runtime/container components: exact version plus immutable digest.
- Quarterly: re-run architecture challengers and retire stale candidates.

No release is promoted solely because a newer version exists.
