# CADS Package Acceptance — Capital-AI Staging Gate

Status: **SOURCE PACKAGE VALIDATION / STANDALONE TARGET EXISTS**

Purpose: Validate the CADS source package inside `SvenKulessa/Capital-AI` before synchronizing an
accepted delta into the dedicated organization repository:

`capital-ai-online/CADS`

The initial standalone export was merged in organization PR #1 at
`c8e8d91a4c988e75b93f587c4bf6e592016bcb71` from Capital-AI source
`0276d389412f806d2727c6b7b65d8215c703dbb1`.

Later Capital-AI changes require a new delta acceptance and standalone revalidation.

## Acceptance identity

The accepted unit is not “latest CADS”. It is one exact Capital-AI source commit plus:

- export provenance manifest with Git blob SHA and SHA-256 per source candidate file;
- CADS functional/Marketplace contract tests;
- bounded package-regression evidence;
- Docker Security evidence where the containing Capital-AI candidate is used as source evidence;
- exact license and third-party notice set;
- Marketplace installation/configuration runbook.

Any source change after acceptance invalidates that source identity and requires revalidation.

## Gate A — Functional contract

Required PASS:

- source-side CADS tier/capability contract tests;
- CADS marketplace tests;
- CADS commerce tests;
- Marketplace migration tests;
- production plan/registration manifest drift tests;
- CADS package acceptance tests.

The standalone repository may deliberately transform the source-side capability module. The target
transformation must be explicit in its own provenance manifest and independently tested.

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
- Docker/image scan when a deployable artifact is built;
- non-root/read-only runtime evidence where applicable.

**Security approval remains a separate TRUST decision.**

## Gate C — Supply chain and licensing

Required:

- `docs/licenses/CADS-PRODUCT-LICENSE.md`;
- `docs/licenses/CADS-THIRD-PARTY-NOTICES.md`;
- exact source/export provenance;
- release SBOM and runtime license inventory for any distributed image;
- no unrelated Capital-AI assets/dependencies copied into the standalone repository.

**License approval remains separate from test success.**

## Gate D — Package regression evidence

Source-side microbenchmarks or mocked B2B lifecycle measurements may be retained as bounded
regression evidence, but they are **not infrastructure comparison acceptance**.

In particular:

- no NATS-vs-Kafka PASS is inferred;
- no Go/Golang PASS is inferred;
- no Rust-vs-Node PASS is inferred;
- the unsuccessful NATS/Go path is not CADS Release/Marketplace/Production evidence.

Any retained thresholds are regression guards, not customer SLAs.

A package-regression PASS cannot grant Security, License, Marketplace or Production approval.

## Gate E — Marketplace readiness

Repository-side readiness requires:

- Starter/Pro/Enterprise capability parity;
- monthly + yearly billing declaration;
- USD authority remains GitHub Marketplace;
- real plan IDs remain runtime-bound, never invented in source;
- install/setup/callback/webhook documentation;
- privacy/support/terms artifacts for the listing.

External evidence still required:

- organization-owned app;
- verified publisher;
- current GitHub paid-listing eligibility requirements;
- financial onboarding;
- listing review/approval;
- real Marketplace plan IDs and prices;
- real purchased/changed/cancelled E2E;
- real installation/uninstall and deletion smoke.

**Marketplace approval remains a separate GitHub/external state.**

## Gate F — Standalone delta handoff

The target is:

`capital-ai-online/CADS`

For every later accepted Capital-AI delta:

1. correlate against the exact current `capital-ai-online/CADS@main`;
2. export only the admitted delta;
3. record byte-identical versus transformed files explicitly;
4. run standalone CADS CI again;
5. build a dedicated artifact/container if required;
6. generate standalone SBOM and runtime license inventory;
7. rerun security scans against the exact artifact;
8. bind real GitHub App/listing configuration only after external admission;
9. request Marketplace review only after the external publisher/billing requirements are satisfied.

The initial organization export is already merged; this gate now governs **subsequent synchronization**.

**Production approval remains a separate OWNER/TRUST handoff.**
