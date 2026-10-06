# Repository Inventory & Cross-Domain Roadmap Reconciliation — 2026-10-06

Status: **evidence-oriented working baseline; no Production/Security/License approval**

## Correlation baseline

- Repository: `SvenKulessa/Capital-AI`
- Default branch: `main`
- Main SHA: `0bf052cbc8f7774db29cc77493f6f24bb28bd93b`
- Main commit: `[CAPITAL-AI-MARKET] Rust/NATS Private-Provider-Bridge read-only integrieren (#212)`
- Recursive tree: 1,236 entries, 1,063 blobs/files, 173 trees/directories.
- Dominant areas: `docs` 329, `src` 270, `public` 132, `scripts` 104, `supabase` 104, `server` 66, `contracts` 41.
- Dominant file classes: Markdown 190, MJS 184, JSON 147, TypeScript 125, SQL 102, TSX 98.
- Active repository ruleset: `main-production-protection`.

## Open pull requests at reconciliation time

| PR | Domain | State | Observation |
|---|---|---|---|
| #214 | PRODUCT | open | Multi-agent roadmap / trajectory preparation; now marked ready for review, but still not `main` evidence. |
| #215 | PRODUCT | draft | JaJa Universe Buddy on the compliant PRODUCT branch/title path. |

Open PRs are not treated as `main` evidence until merged and re-correlated.

## Application and repository inventory

### PRODUCT
- React 19 + Vite + TypeScript 6 frontend.
- Pricing/monetization surfaces, Learning Portal, Control Center and agent-oriented UI assets.
- Vocabulary product has a live Stripe SKU/Price and entitlement flow.
- CADS has internal decision evidence, observability and tests, but no CADS-specific Marketplace listing or purchase authority.
- Multi-agent/LangGraph trajectory work remains PR-scoped (#214), therefore is not yet a `main` capability.

### MARKET
- Canonical market-data contracts and evidence gates.
- NATS/JetStream and Valkey/Redis-compatible infrastructure.
- ECB/reference-rate work, source-rights governance and the merged Rust/NATS private-provider read-only bridge (#212), including authenticated HTTP boundaries, vault-backed execution, NATS role separation, replay protection and Binance/Kraken read-only query gates.
- Production scoring remains fail-closed where rights, data-quality or scoring evidence is incomplete.

### PLATFORM
- Docker/OCI, Render descriptors, GHCR/release evidence, server runtime and CI/CD.
- Structured observability and Prometheus-compatible metrics exist.
- Grafana Cloud + Supabase is **operator-confirmed as already connected**. Repository/runtime readback, export path, retention and redaction evidence still need binding before marking the integration VERIFIED.
- OTel/collector selection remains an optimization/evidence question; it is not a prerequisite for acknowledging the existing Grafana Cloud connection.

### TRUST
- Truth/Authority gates, zero-cost thresholds, public-artifact policy, prompt-injection guard, supply-chain/license evidence and release-readiness logic.
- CADS is Decision Evidence, never an automatic release, license or security approval.
- GitHub Marketplace lifecycle primitives already exist in `apps/legal-policy-github-app`: HMAC webhook verification, OAuth state binding, Marketplace subscription readback, entitlements, evidence retention and uninstall cleanup.

### GROWTH
- SEO, social and content work packages exist.
- Social publishing/provider admission and consent-based outreach stay gated by rights, consent and evidence.

## Roadmap reconciliation

1. Keep PRODUCT, MARKET, PLATFORM, TRUST and GROWTH as orientation, not artificial team silos.
2. Use `main @ 0bf052c` as the evidence baseline; open PRs are future candidates only.
3. Record Grafana Cloud + Supabase as an operator-confirmed existing integration while keeping technical readback/retention/export evidence OPEN.
4. Move CADS commercial product ownership to **PRODUCT** and retain **TRUST** as assurance/gate authority.
5. Reuse proven Marketplace lifecycle patterns from the LEGAL_POLICY GitHub App without conflating the two product identities.
6. Do not infer CADS pricing, listing, purchase or entitlement activation from technical readiness.

## CADS monetization state

Canonical readiness authority: `src/data/cadsCommercialReadiness.ts`

Conservative readiness: **50%** under the existing registry weighting:
- Definition: 100/100 × 15%
- User/customer surface: 20/100 × 25%
- Commercial path: 40/100 × 25%
- Compliance gate: 60/100 × 20%
- Production evidence: 53/100 × 15%

The rounded result is 50%. This number is product-readiness evidence only.

### Present
- CADS governance and benchmarking semantics.
- CADS operation telemetry and Prometheus metrics.
- CADS tests.
- Internal `/api/internal/cads` surface.
- Release-readiness references.
- Reusable GitHub Marketplace webhook/OAuth/subscription/entitlement pattern in LEGAL_POLICY.

### Sale blockers
- CADS-specific GitHub App/listing identity.
- Marketplace plan IDs.
- Approved pricing authority.
- Privacy/support/listing publisher evidence.
- CADS-specific authoritative Marketplace entitlement mapping.
- Customer-facing CADS report/history surface.
- Exact released-app artifact and runtime evidence correlation.

## Next sequence

1. **PRODUCT + TRUST:** CADS GitHub App/listing identity and least-privilege permission matrix.
2. **PRODUCT:** capability matrix without assigning prices yet.
3. **TRUST:** privacy/support/data-retention and Marketplace-entitlement authority.
4. **PRODUCT + PLATFORM:** CADS app packaging and customer report surface.
5. **PLATFORM:** Grafana/telemetry export evidence plus released artifact digest.
6. **TRUST:** supply-chain, security, license and public-claim gates.
7. **PRODUCT/Owner:** only then Marketplace plan IDs and pricing.
8. **GROWTH:** listing copy/SEO only after product claims are evidence-backed.
