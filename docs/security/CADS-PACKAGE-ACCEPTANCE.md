# CADS Package Acceptance — Capital-AI Staging Gate

Status: **IN VALIDATION**

Purpose: Validate the CADS package **inside SvenKulessa/Capital-AI before export** into a dedicated
organization repository and before GitHub Marketplace submission.

## Acceptance identity

The accepted unit is not “latest CADS”. It is one exact Capital-AI source commit plus:

- export provenance manifest with Git blob SHA and SHA-256 per exported file;
- CADS package benchmark report;
- CADS contract/security tests;
- Docker Security evidence for the containing Capital-AI candidate;
- exact license and third-party notice set;
- Marketplace installation/configuration runbook.

Any source change after acceptance invalidates the export identity and requires revalidation.

## Gate A — Functional contract

Required PASS:

- benchmark-core tests;
- CADS marketplace tests;
- CADS commerce tests;
- Marketplace migration tests;
- production plan/registration manifest drift tests;
- CADS package acceptance tests.

## Gate B — Security

Required PASS/evidence:

- HMAC verification before webhook processing;
- signed/expiring OAuth state;
- open-redirect-safe login return;
- temporary buyer OAuth token revoked and not persisted;
- authoritative Marketplace API readback before purchase/plan activation;
- service-role-only Supabase RPC/table boundary;
- idempotent delivery ledger;
- cancellation deactivation and <30-day cleanup path;
- source/secret scan;
- Docker image scan;
- non-root/read-only runtime evidence where the exported deployment image is built.

**Security approval remains a separate TRUST decision.**

## Gate C — Supply chain and licensing

Required:

- `docs/licenses/CADS-PRODUCT-LICENSE.md`;
- `docs/licenses/CADS-THIRD-PARTY-NOTICES.md`;
- exact export provenance;
- release SBOM and runtime license inventory for any distributed image;
- no unrelated Capital-AI assets/dependencies copied into the standalone repository.

**License approval remains separate from test success.**

## Gate D — Benchmark

`npm run benchmark:cads-package` must emit `CAPITAL_AI_CADS_PACKAGE_BENCHMARK@1`.

Measured microbenchmarks:

- tier entitlement lookup;
- benchmark evidence validation;
- Marketplace plan mapping;
- signed OAuth-state roundtrip.

Additionally, `npm run benchmark:cads-b2b` runs the real CADS Marketplace HMAC/JWT/readback/store
application path for `purchased`, `changed` and `cancelled` with deterministic mocked network
boundaries. This measures the package logic without claiming a real GitHub/Supabase E2E.

The thresholds are regression guards, not customer SLA claims. Benchmark PASS cannot grant Security,
License, Marketplace or Production approval.

## Gate E — Marketplace readiness

Repository-side readiness requires:

- Starter/Pro/Enterprise capability parity;
- monthly + yearly billing declaration;
- USD authority stays GitHub Marketplace;
- real plan IDs remain runtime-bound, never invented in source;
- install/setup/callback/webhook documentation;
- privacy/support/terms artifacts for the listing.

External evidence still required:

- organization-owned app;
- verified publisher;
- minimum installation threshold;
- financial onboarding;
- listing review/approval;
- real Marketplace plan IDs and prices;
- real purchased/changed/cancelled E2E;
- real installation/uninstall and deletion smoke.

**Marketplace approval remains a separate GitHub/external state.**

## Gate F — Production/export handoff

Only after A–E are materially satisfied may the exact accepted source identity be exported to the
dedicated `CADS` organization repository.

After export:

1. reproduce the provenance hashes in the new repository;
2. run the standalone CADS CI again;
3. build a dedicated CADS artifact/container;
4. generate a standalone SBOM and license inventory;
5. rerun security scans against that exact artifact;
6. bind GitHub App/listing configuration to the dedicated deployment;
7. request Marketplace review only after external publisher/billing requirements are satisfied.

**Production approval remains a separate owner/TRUST handoff.**
