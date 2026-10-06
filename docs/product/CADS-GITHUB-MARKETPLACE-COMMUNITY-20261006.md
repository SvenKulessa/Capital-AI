# CADS GitHub Marketplace — Community-first Slice

Primary Domain: **PRODUCT**  
Assurance: **TRUST**  
Implementation baseline: `cef1d11f607778f5226ca1df97376ba408652c69`  
Status: **COMMUNITY_CONTRACT_IMPLEMENTED / LISTING_EVIDENCE_OPEN**

## Decision

CAPITAL-AI follows the Community-first path for the CADS GitHub Marketplace integration.

The Marketplace Community plan is a separate entitlement authority from the existing
website/Stripe CADS subscription model.

```text
GitHub Marketplace Community
  -> FREE
  -> standard CADS profiles
  -> neutral GitHub check
  -> bounded run summary
  -> source-bound evidence references
  -> no paid capability escalation

capital-ai.online
  -> Stripe Starter / Pro / Enterprise
  -> separate website entitlement authority
```

A Stripe subscription is never interpreted as a GitHub Marketplace entitlement, and
a free Marketplace entitlement is never interpreted as a paid website entitlement.

## Community capabilities

Included:

- Standard CADS profiles.
- Neutral GitHub Check.
- Bounded benchmark/run summary.
- Source-bound evidence references.

Explicitly excluded:

- Persistent evidence history.
- Regression detection.
- Evidence export.
- Custom profiles or thresholds.
- Enforced PR gate.
- API product access.
- Self-hosted runner.

## Permission boundary

The target GitHub App registration requests only:

- Metadata: read.
- Contents: read.
- Pull requests: read.
- Checks: write.

No Actions, Administration, Secrets, Members, Deployments, Packages or workflow-write
permission is part of the Community contract.

The Marketplace plan-change webhook is configured separately on the Marketplace draft
listing; it is not conflated with the repository webhook subscription.

## Free-listing lifecycle

The Community-only lifecycle recognizes:

- `purchased` -> Community entitlement active.
- `cancelled` -> Community entitlement revoked.

`changed` is fail-closed while no paid Marketplace plan exists. Free-only apps do not
need upgrade/downgrade handling until paid plans are introduced.

## Data minimization

The Community contract does not require persistence of:

- source code,
- secrets,
- evidence history,
- private customer data.

Later history/export features require a separate retention and tenant-isolation gate.

## Commercial boundary

The free Marketplace user cannot be charged for use of the Community plan.

CAPITAL-AI already has a paid CADS path outside Marketplace through the website. GitHub's
current Marketplace policy allows a free listing, but if a paid service exists outside
Marketplace, a paid Marketplace plan must be offered after the listing meets the paid-app
requirements. Paid Marketplace expansion therefore remains a later gated phase.

## Remaining listing evidence

- actual CADS GitHub App registration and App ID,
- live webhook URL and HMAC secret handoff,
- Marketplace draft listing,
- privacy link,
- support/contact link,
- screenshots/listing copy,
- installation/readback smoke,
- Community `marketplace_purchase` purchase/cancel smoke.

Paid expansion additionally requires the then-current paid Marketplace requirements,
publisher/financial onboarding and explicit plan/pricing authority.

A successful test or Marketplace installation is not a Production, Security or License approval.
