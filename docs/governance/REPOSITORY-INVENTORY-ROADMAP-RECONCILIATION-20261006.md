# Repository Inventory & Cross-Domain Roadmap Reconciliation — 2026-10-06

Status: **evidence-oriented working baseline; no Production/Security/License approval**

## Correlation baseline

- Repository: `SvenKulessa/Capital-AI`
- Default branch: `main`
- Current main SHA: `cef1d11f607778f5226ca1df97376ba408652c69`
- PR #216 is merged and provides the current CADS Website-Commerce slice.
- PR #215 is merged and contributes the JaJa/Agent-Core boundary without changing the CADS commerce authority.
- PR #214 remains open and is not counted as main evidence.

Exact historical tree/file counts from the earlier `0bf052c` scan are intentionally not reused after the two main-branch merges.

## Domain correlation

### PRODUCT

- CADS Website-Commerce exists through existing Starter/Pro/Enterprise Stripe subscriptions.
- GitHub Marketplace is a separate distribution/billing channel and remains fail-closed.
- CADS remains evidence/benchmark functionality; benchmark output is not production or trading authority.
- Multi-agent/LangGraph work in PR #214 remains PR-scoped until merged and re-correlated.

### MARKET

- Private-provider query, vault and Rust/NATS bridge from PR #212 remain main evidence.
- Provider/data-rights, DQ and scoring gates remain independent from CADS commercial entitlements.
- No paid product grants raw-data redistribution or decision eligibility.

### PLATFORM

- Existing Docker/Render/NATS/Valkey and observability paths remain unchanged by this PR.
- Grafana Cloud + Supabase is operator-confirmed as connected.
- Repository/runtime readback, redaction, retention and tenant-boundary evidence remain separate operational gates.

### TRUST

- Security, licensing, provider rights, source identity and production release stay independent authorities.
- The LEGAL_POLICY GitHub App provides reusable Marketplace architecture only; it is not CADS Marketplace admission evidence.
- Marketplace cancellation requires explicit lifecycle and deletion evidence; event acceptance alone is insufficient.

### GROWTH

- Marketplace listing copy, screenshots/brand assets and SEO are downstream of product, rights and listing-evidence gates.

## CADS monetization state after PR #216

The canonical product registry keeps CADS in `WEB_SAAS_ENTITLEMENT_SLICE`.

No synthetic global readiness percentage is assigned. The earlier percentage was invalidated by material implementation changes and remains `null` until a complete weighted re-measurement is performed.

### Present

- Existing Stripe Starter/Pro/Enterprise catalog and checkout.
- Server-side paid-tier resolution.
- CADS capability projection from the benchmark authority.
- Authenticated CADS entitlement endpoint.
- Benchmark/CADS observability and tests.

### Still open

- Real website subscription/runtime evidence.
- Real four-way benchmark execution and release correlation.
- CADS-specific GitHub App/listing identity.
- Verified-publisher and installation-threshold evidence.
- Marketplace webhook + idempotent purchase/change/cancel lifecycle.
- Cancellation cleanup and <=30-day customer-data deletion evidence.
- Marketplace plan IDs and approved monthly/annual USD pricing.
- Authoritative Marketplace subscription readback.
- Customer-facing CADS report/history surface.

## Conservative next sequence

1. Close website entitlement runtime evidence without changing current Stripe SKUs.
2. Keep GitHub Marketplace as a separate fail-closed channel.
3. Establish the CADS GitHub App identity and least-privilege permission matrix.
4. Establish Marketplace listing/webhook/publisher/install evidence.
5. Implement and test purchase/change/cancel plus deletion lifecycle.
6. Map capabilities to plans.
7. Owner assigns Marketplace prices/plan IDs only after the preceding gates.
8. Re-run release/security/license/evidence gates before Marketplace review.
