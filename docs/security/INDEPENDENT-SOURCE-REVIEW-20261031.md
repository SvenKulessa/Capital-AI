# Independent AI / ZIP review – reproducible source provenance (2026-10-31)

Scope: external AI review of **public, immutable Git source**, not production attestation. Governing policy: `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`. Related existing contract: `contracts/trust/SOURCE_PROVENANCE@1.yaml`. This document adds **no new Required Check** and no publishing authority.

## Reproduce in any AI app or terminal

1. Select the *exact commit SHA* from GitHub, not the mutable `main` label. For the 2026-10-31 milestone #545 the verified merge commit was `a799d7416eaca8c399098ec5eff2f3bee6e6e0dc`. Compare a ZIP or third-party report against its actual archive source commit; an archive filename/date is not evidence of identity.
2. Run `node scripts/independent-review-manifest.mjs > source-review.json` from the checked-out commit. This hashes **Git HEAD blobs**, not potentially modified local working copies. The JSON contains only a fixed list of public file paths, byte counts and SHA-256 hashes, a Git commit/tree identity, an inventory hash, and explicit external `NOT_VERIFIED` statuses. No source contents, runtime values, keys, private customer records or audit token are exported.
3. Re-run `node --test scripts/independent-review-manifest.test.mjs` and verify the hash of each selected blob with `git show HEAD:<path> | sha256sum`. Compare the `inventorySha256` after canonical JSON serialization of the ordered `files` array. Keep the manifest beside the ZIP in your private auditor workspace.
4. Ask the independent AI to output each claim as `CLAIM / SOURCE_COMMIT / PATH / LINE_OR_HASH / EVIDENCE_TYPE / REPRODUCTION / STATUS / RISK / NEXT_STEP`. Missing source hashes, registry or live evidence mean `NOT_PROVEN`, not PASS. Reject suggested secrets, data downloads, deployment changes or automatic publishing.
5. For image digests, installed dependency versions, live Stripe objects, Render runtime, GA4, X or YouTube, perform **separate authorized read-only provider checks**. Never treat the source manifest as proof of external state.

## External ZIP review reconciliation

| Observation | Evidence / conclusion | Required follow-up |
| --- | --- | --- |
| Product `prod_VNTsrtlf2ZL8ja` with EUR 19 and EUR 25 Price IDs | Stripe CAPITAL-AI **livemode GET** on 2026-10-31 confirmed the product is active and has EUR 25 `price_1UOqkoPKr4joNbEcRaagaZT4` as default. Historical EUR 19 `price_1UMiuIPKr4joNbEclpn8AwFW` is also active. Both belong to the same product. This is **not by itself** proof of a faulty purchase. | Check whether any active Checkout/Payment Link can sell the historical EUR 19 price. Do not replace IDs, invalidate past receipts or alter live prices based on source strings. |
| Checkout runtime | `server/vocabulary-checkout.mjs` validates current EUR 25 fixed one-time SKU against configured price, product, currency and active status; legacy purchase receipts are retained. `src/data/pricingCatalog.ts` explicitly marks EUR 19 historical. | Independent live anonymous offer/authorized synthetic checkout readback; no real charge without separate authorization. |
| npm/Rust/Python version suggestions | ZIP and external registry report are dated snapshots; `package-lock.json`, `Cargo.lock`, `uv.lock` must be checked at exact current HEAD and compared to official advisories. | Separate patch-only and minor PRs, version-aligned regression, Docker security scan; TypeScript major independently. |
| Workflow permissions | `.github/workflows/google-cloud-admin.yml` requests `contents: read` and `id-token: write` for GitHub OIDC; `.github/workflows/merge-milestones.yml` uses `contents: read` at top level and separately scoped GitHub App token for milestone branch writes. | Audit every workflow, job, token/pull_request_target and tool permission; never claim global least privilege from one grep. |
| Child processes | `server/google-maintenance-api.mjs` uses fixed executable `gcloud` with a fixed argument array under an explicit ADC opt-in; `server/google-analytics-mcp.mjs` spawns a fixed absolute `/opt/ga4-mcp/bin/analytics-mcp` with a narrowly constructed child environment and read-only allowlisted tools. | Verify reachable HTTP callers, availability gates, timeout, process cleanup, fixed binary provenance, stderr handling and resource limits separately. |
| Google Cloud Operator / YouTube OAuth | `.github/workflows/google-cloud-admin.yml` is manual `main`-only federated **read-only Service Usage**. Its success cannot replace Google OAuth consent-screen verification or demonstrate `youtube.readonly` / `youtube.upload` user behavior. | Run the exact operator workflow via `workflow_dispatch`, correlate run SHA and `CLOUD_OPERATOR_SERVICE_USAGE_READ_PASS`, then complete separate YouTube app-verification evidence, scopes, policy and demo video. |
| Marketing pipeline | PR-merge drafts flow through `scripts/growth/pr-merge-social-batch.mjs`. `src/contracts/marketingOutreachPolicy.ts` denies mailing absent recorded permission, valid GDPR basis, suppression/unsubscribe checks and explicit runtime enablement. | Build newsletter sending only atop auditable consent/suppression records, origin-scoped source evidence, anti-duplication and opt-out; X and YouTube remain separate publish authorities. |

## Provenance model for future commercial content

```text
Verified Git merge / public source URL
 -> SOURCE_PROVENANCE@1: immutable SHA + license / rights review
 -> independent source-review manifest (file hashes only)
 -> scoped AI / Firecrawl draft worker with budget & untrusted-content limits
 -> CADS / accessibility / claim & attribution checks
 -> private editorial approval, branded media and consent evidence
 -> separate channel approvals:
      WEBSITE blog | EMAIL newsletter | X API | YouTube upload
 -> signed output receipts, timestamps, provider response IDs, revoke/rollback trail
```

No private JaJa notes, personal Notion data, vault credentials or unpublished partner information may enter source/news content. A technical PASS is not an editorial, contractual, Google verification or GDPR consent approval.

## Privacy and independent audit

Do not upload production `.env`, DB backups, tokens, user files, client lists, internal service-account JSON, or logs with IPs, emails or OAuth parameters to third-party AI apps. For external reviewers, use the public source commit and this hash-only manifest. Any additional private artifact requires a separate scoped, redacted export and rights review.

**Status at authoring:** static source methodology IMPLEMENTED_ON_BRANCH; provider readbacks documented where directly observed; external newsletter delivery, actual X/YouTube publish, WIF dispatch success on current main, live Stripe Checkout/Payment Links and cross-AI verdict remain NOT_PROVEN. No runtime/publisher mutation is part of this change.
