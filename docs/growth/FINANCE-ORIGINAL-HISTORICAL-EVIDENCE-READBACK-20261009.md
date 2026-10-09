# Finance Original-Historical-Evidence Readback — 2026-10-09

**Scope:** GROWTH-Evidence, MARKET score/PIT semantics, TRUST provider rights. Status: **REVIEW_REQUIRED / EMPIRICAL_HISTORICAL_PARITY_NOT_PROVEN**.

**Base:** Capital-AI main 2dd9ed78f34d88044925208d9f0d5d33f05a405e. Finance source pinned to dcef421fe6e350a3a2ade61d0299aad9ecca213c. This report records a bounded repository/connector readback; it is **not** a complete search of all private archives, user accounts or backups.

## Verified observations

| Checked surface | Observation | Consequence |
|---|---|---|
| Finance source main | Commit remains dcef421fe6e350a3a2ade61d0299aad9ecca213c | Original scoring source identity pinned |
| Finance Git tree | 4,252 entries, non-truncated; no CSV, Parquet, NDJSON, JSONL, ZIP, XLSX, compressed or DB market archive candidate by common extension | No original replayable market snapshot located in this tree |
| Finance GitHub releases | Release list returned empty | No release-asset source archive found |
| Connected Google Drive | Candidate documents read and related terms searched; results describe architectures/secondary backtests, not original Finance score exports | No authenticated Finance source-result file located |
| ChatGPT Library | Matching reports/documentation, not raw Finance input/result pairs | No additional original pair located |
| Connected Capital-AI Supabase | public.score_snapshots contains **9,496** records dated 2026-08-04 through 2026-10-02; this is a **target legacy** table without Finance source SHA, model version, provider revision, or input fingerprints | Not evidence of source-origin Finance scoring; **must not** match to historical source by symbol/date alone |
| Connected Capital-AI Supabase | public.finance_research_receipts has **0** rows | No usable research receipt pair |
| Finance research audit | Existing FinanceHistoricalParityAudit is research-only; matching synthetic numbers are NOT proof of source authenticity or PIT | Scoring/ranking/production remain ineligible |

The Supabase readback was **metadata and SQL aggregate only**. No asset scores, personal records, user identifiers, keys or provider payloads were exported.

## Official historical provider publication and revision references

1. **CFTC COT report for 2025-09-30:** the intended publication day was 2025-10-03, but the actual catch-up publication was **2025-11-19**. Its September report values are unavailable to a 2025-10-03 decision. Authority: https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalSpecialAnnouncements/index.htm . The Historical Viewable index explicitly labels dates as report dates, **not** release dates: https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalViewable/index.htm .
2. **EIA This Week in Petroleum 2025-09-24:** EIA has a date-scoped archived HTML page at https://www.eia.gov/petroleum/weekly/archive/2025/250924/includes/hometables_print.php . Its archived URL and reported release date are verified, but exact original 2025 byte integrity, subsequent modifications and acquisition-time snapshots are **NOT_PROVEN**.
3. **EIA Petroleum Supply Monthly revision notice:** https://www.eia.gov/petroleum/supply/monthly/releasenote.php describes post-shutdown changes affecting September/October 2025 exports. A revised current timeseries cannot be assumed to equal a value historically known at the decision timestamp.

**Provider bytes:** the restricted analysis runtime could not download an original response (DNS/network failure). **No provider archive bytes, SHA-256 digest, original release-capture timestamp or revision provenance were saved.** Verified public URLs are *locators*, not an original release-capture archive.

## TRUST rights assessment

EIA's published reuse policy (https://www.eia.gov/about/copyrights_reuse.php) generally allows reuse of U.S. government EIA datasets with source and publication-date acknowledgment. It explicitly cautions that third-party protected material, trademarks and images can carry separate rights. This is **not** a blanket license check for a specific pipeline's commercial Scoring, archival retention and public redistribution scope.

CFTC dataset-specific contractual and website reuse permissions were **not** authoritatively reviewed. **CFTC rights: REVIEW_REQUIRED. Overall Finance archive provider rights for the contemplated pipeline: REVIEW_REQUIRED.** No new paid provider, BYOK request, publication or API activation occurred.

## MARKET source/target comparison

Exactly **0 independently verified original input/score/archive triplets** are available among the examined surfaces. Numeric row-by-row parity has therefore **not** been executed. Do not relabel 9,496 Capital-AI legacy daily snapshots as Finance source original results. Do not interpret source golden fixtures (synthetic) or current revisioned EIA/CFTC pages as original point-in-time evidence.

To run a meaningful pair, supply an immutable Finance-original source result and factor/normalizer inputs with model/source SHA and score output; original provider release/capture bytes with SHA-256, release/revision/availability chronology; target identity and approved rights for that precise dataset and use. Then compare via the existing ScoringEngineService research boundary, at source decimal precision, independently recording coverage/missing factors, mismatches, and fail-closed PIT eligibility.

## Separate TRUST CI finding

Docker Security Gate on 2dd9ed78f34d88044925208d9f0d5d33f05a405e **SUCCESS**. The independent Dependency Version and CVE Watch **FAILED** with SUPPRESSION_REVIEW_DUE. Evidence path: docs/security/evidence/dependency-decisions/typescript-7.0.2.json; exact TypeScript 7.0.2 native compiler suppression reached review date **2026-10-09** and remains classified BINARY_AFFECTED. **Do not remove, broaden or defer this suppression without the applicable TRUST re-evaluation.** That watch failure is not a Docker Security Gate failure.

## Options / next actions

**A (preferred, no new provider charge):** 👋⚙️ Repository Owner identifies existing source-produced immutable Finance exports and historic provider captures from original Finance environment, protected backup or export system. TRUST verifies chain of custody and rights; MARKET runs exact research replay. An encrypted private storage lane is required for non-public records; no repository or shared data-publication dump.

**B (secondary):** Begin a new permitted collection process for public-domain EIA information with immutable byte hashes, collection times, revision checks and source attribution. This only proves what was captured **now**, not a 2025 historical state; original Finance runs remain essential. CPU/storage/egress/API costs and capacity are **NOT_PROVEN** and require review before new paid provisioning.

CI for this documentation PR consumes normal GitHub Actions minutes; remaining quota and any billable overages NOT_PROVEN. No new deployment, scoring code, dependencies, special gates, Provider keys or market data redistribution.
