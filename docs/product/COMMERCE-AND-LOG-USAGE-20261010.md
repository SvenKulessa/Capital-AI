# Commerce and Supabase usage correction

Observed 2026-10-10. Main base: a8731c2. PR #344 is merged; this is a follow-up.
Google Play Billing is explicitly excluded by the Owner.

## Verified price and payment findings

- Live `/api/billing/vocabulary/offer`: Learning Portal, EUR 25 once; configured Product/Price IDs null (inline price).
- Most recent live Learning Portal Checkout Session: EUR 25, one-time payment, default payment-method configuration, `allow_promotion_codes` absent.
- Latest normal subscription sessions: same default payment-method configuration, `allow_promotion_codes=true`.
- Live catalog product `prod_VNTsrtlf2ZL8ja`: Capital-AI Market Vocabulary, default active legacy price `price_1UMiuIPKr4joNbEclpn8AwFW`, EUR 19.
- Home `CommerceEntrySection` still imported that legacy catalog. It now uses the current VOCABULARY_OFFER (EUR 25) and Learning Portal route. Historical receipt IDs and prices remain valid.
- Discounted fulfillment now verifies the original EUR 25 subtotal, provider-reported discount arithmetic, completed payment mode and account identity. Partial discounts and completed 100% discounts grant access; unpaid, open or inconsistent totals fail closed. No coupon was created.
- Learning Portal Checkout now enables `allow_promotion_codes=true`. Existing sessions do not acquire this field retroactively; a new Checkout is needed after deployment. Codes must still be active and eligible for the selected product. ENTERPRISE3 is an Enterprise campaign, not a Learning Portal discount.
- Google Pay, PayPal, Amazon Pay, Link and card are on/available in default config `pmc_1TbfHpPKr4joNbEcWel594JS`. Learning and subscriptions both use that config; neither code path specifies a restrictive payment-method list.
- Actual session method lists differ: one-time includes Bancontact/EPS/pay-by-bank; subscription list excludes these. Hosted Checkout filters dynamically by purchase mode, amount, country and customer/device eligibility. The previously seen unnamed payment option cannot be identified from the Supabase screenshot.
- Wallets are not standalone `google_pay` Checkout payment-method types; Google Pay is a card wallet. Enabled config does not prove rendering on the buyer's device. No Google Pay transaction or buyer-device visibility test has been performed. Shared payment help now explains wallet requirements and offers Stripe's diagnostic page; no payment button is fabricated.

### Prepared live catalog change — approval required

Create a new nonrecurring Price on existing product `prod_VNTsrtlf2ZL8ja`: EUR, unit_amount 2500, tax_behavior inclusive, lookup_key `capital_ai_learning_portal_once_20261010`, metadata sku=learning-portal. Then rename this product to Capital-AI Learning Portal and set its default_price to the new Price. Verify Price/Product readback and Stripe-managed catalog sync. Existing EUR 19 Price, receipts and grants are preserved; no subscription, coupon, wallet setting or billing-cycle mutation is proposed. Creating a catalog object does not purchase anything; existing Stripe transaction fees apply to future purchases.

No live catalog mutation was performed in this investigation. The prepared parameters must be read back before any retry to avoid duplicate Prices. Product default-price changes affect catalog presentation; the server's existing EUR 25 inline Checkout remains authoritative until an approved persistent Price is configured. Set STRIPE_LEARNING_PORTAL_PRICE_ID and STRIPE_LEARNING_PORTAL_PRODUCT_ID together after live Price readback; this binds product-scoped codes to the persistent product and avoids relying on per-session inline products. This runtime change also requires Owner approval.

## Supabase: two separate meters

Screenshot: database 124/500 MB, ingest 0.52/1 GB, Log Query 107.2/100 GB.
Live PostgreSQL measurement: 108,877,491 bytes (~104 MiB); dashboard billing size uses its own measurement and update timing. PostgreSQL is below the free database-size limit. No upgrade is needed on the measured size alone.

Largest relations:

| Relation | Total allocated bytes | Observed role |
| --- | ---: | --- |
| cron.job_run_details | 71,811,072 | Dominant stored operational history |
| stripe._sync_obj_runs | 7,815,168 | Provider-managed sync history; left untouched |
| public.score_snapshots | 1,720,320 | Business/scoring evidence; left untouched |
| public.security_events | 1,597,440 | Security evidence; left untouched |

`stripe-sync-worker` runs once per minute: 1,440 successful runs in the last day, zero failures, 103,023 successful runs since July 30. Approximately 93,000 completed successful entries are older than seven days. The second active cron job is daily privacy retention. Average cron history command length is 515 bytes; command text was deliberately not projected because provider credentials might be embedded. Connection/disconnection logging and cron statement logging are on. Statement logging is DDL and pgAudit log is none, with the existing security-auditor role retained. No audit configuration was disabled.

### Stored history proposal — approval required

`scripts/supabase-cron-history-retention.sql` is an **operator-reviewed SQL proposal**, not an applied migration. It prunes only the Stripe sync worker's history and its own cleanup history: successful executions older than seven days, failures older than thirty days. Other cron jobs, recent/running entries, private entitlements, payments, subscriptions, sync receipts, business data and security audit are excluded. Each call is capped at 5,000 rows and uses SKIP LOCKED. A daily named job at 03:47 UTC is idempotently scheduled. The Stripe sync schedule is unchanged.

At 1,440 new Stripe worker rows/day, the cleanup capacity of 5,000/day exceeds measured inflow. Existing backlog drains gradually; no unbounded initial delete is included. Normal autovacuum enables space reuse, so allocated database size may not immediately shrink. No VACUUM FULL, TRUNCATE, forced rewrite or paid resource is proposed. Stopping the cron job stops future cleanup; deleted rows are not recoverable without a backup. Conservative alternative: retain successful runs 30 days and failed runs 90 days (larger history footprint).

Isolated PGlite/PostgreSQL test validates batch size, idempotency, privileges and preservation of failed/recent/running/other-job rows. It does not prove production scheduling or autovacuum. Apply only after Owner approval, then verify the named cleanup job, deleted count, retained failures, unchanged successful Stripe sync, table dead tuples and database growth. Use catalog/statistics SQL for these checks; do not repeatedly scan hosted Logs.

### Log Query allowance

Log Query measures data scanned when reading hosted logs, repeatedly; it is not database storage. Deleting cron rows cannot subtract past scans from the monthly meter. No hosted `query_logs` call was made for this investigation; metadata SQL was sufficient. Repository searches found no automated hosted Supabase logs API polling. Studio/MCP/debugging scans remain a plausible cause of the allowance overrun, but specific caller attribution is **NOT_PROVEN** with the available API evidence.

The current official public docs confirm Free's 100 GB allowance and explain scan-based usage. The MCP documentation search returned an older inconsistent 1,000 GB/per-GB billing description; that snapshot is superseded by the current public docs. Public docs presently say enforcement starts after the grace period at the start of 2027 and Log Query is not separately billed. Do not infer a database-full state or buy a plan from the screenshot.

To keep future scan growth low: start with a five-minute window and one source, expand only for a concrete investigation; project only required fields; reuse the result instead of polling; disable dashboard auto-refresh when not investigating; use existing application health/status metrics for regular monitoring. LIMIT reduces returned rows, not scan window. The month already exceeded 100 GB; it cannot be brought retroactively under that meter by deletion. Verify a flatter usage trend over subsequent days and the next billing-cycle reset. Do not enable a paid Log Drain or upgrade without a separate cost decision.

Keep the database comfortably below its separate 500 MB limit: metadata-size warning at 400,000,000 bytes, review largest-table growth and cleanup throughput, investigate any excess before applying data deletion. Other tables can grow independently; this specific history policy is not a guarantee for arbitrary future workloads.

## Official references

- https://docs.stripe.com/google-pay?platform=web
- https://docs.stripe.com/testing/wallets
- https://supabase.com/docs/guides/platform/manage-your-usage/logs-query
- https://supabase.com/docs/guides/database/postgres/postgres-log-config
- https://supabase.com/docs/guides/database/postgres/data-deletion

No production database deletion, catalog-price mutation, logging reduction, Play Billing setup, merge or deploy was performed.

## Owner-approved implementation in PR #351

On 2026-10-10 the Owner approved Option A and requested all implementation changes directly in this PR before merge. The persistent live Price is `price_1UOqkoPKr4joNbEcRaagaZT4` (EUR 25, one-time, inclusive), on `prod_VNTsrtlf2ZL8ja`; Stripe now reports it as the Learning Portal default Price. Legacy EUR 19 receipts remain supported. `render.yaml` contains both non-secret runtime bindings. The retention definition and named daily schedule are included as `supabase/migrations/20261010031623_stripe_cron_history_retention_20261010.sql`, with the same bounded SQL tested in isolated PostgreSQL. Earlier sections describe the pre-approval investigation snapshot; rollout readback follows separately. No Play Billing is introduced.


Migration-history correction: the production database already records this exact SQL as version `20261010031623` (name `stripe_cron_history_retention_20261010`). The repository filename previously used `20261010032000`, causing the Supabase integration to reject main with “Remote migration versions not found in local migrations directory.” The filename now matches the applied version. SQL is unchanged; no retention execution, database-history repair, or production data change is part of this correction. Read-only comparison confirmed identical SQL and complete matching of all 113 migration versions. The live Supabase check and Render rollout remain subject to post-merge verification.
