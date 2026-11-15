# Homepage „Marktnews verstehen“ — Daily freshness / four-hour scoring

Stand: 2026-11-15 · Primary Domain: GROWTH · Supporting: TRUST
Baseline: main `d99da2ba58f12233299579c646f38e0b600a3b9a`
Status: implementation proposal on feature branch; no public edition change, merge or deployment evidenced.

## Inventory and scheduler authority

- The public page renders the bundled `src/features/home/homeEditorialEdition.json` (three articles with independently created infographics); it does **not** fetch live data.
- Existing ChatGPT automation `Automation_a48f1586a1748191aeed145d9b687968` was already enabled daily at 08:00 Europe/Berlin and is the **single owner** of this cadence.
- Keep one recurring schedule: every four hours at 00:00, 04:00, 08:00, 12:00, 16:00 and 20:00 Europe/Berlin. Each invocation scores candidates as a **read-only draft**. Only the 08:00 invocation performs full daily freshness checks of all visible stories and official correction/update notices.
- Do **not** add GitHub Actions cron, Render Cron, Supabase Cron or another ChatGPT task. Existing `merge-milestones.yml` remains event-driven and DRAFT_ONLY; it is not a homepage scheduler. GitHub scheduling and ChatGPT scheduling must not both be active for this content.
- DST: scheduling must use Europe/Berlin, not fixed UTC offsets. Real firing times and missed runs remain scheduler-provider evidence, not repository-test evidence.

## Candidate scoring and provenance

Run locally with Node 22+ from the repository root, using a manually collected JSON array of candidate articles:

```bash
node --test scripts/growth/home-editorial-edition.test.mjs
node scripts/growth/home-editorial-edition.mjs --score 2026-11-15 /path/to/candidates.json
```

The script is read-only and emits machine-readable `CAPITAL_AI_HOME_CANDIDATE_SCORING@1`: score, source, SHA-256 content identity, reason and `publicationAllowed:false`.
Source URLs must use HTTPS on the exact official allowlist (XRPL, Solana, Polygon), without query strings or credentials. Dates cannot be future-dated. The existing score rule is unchanged: recency up to 30 minus 2/day, relevance up to 40 and impact up to 30, minimum score 65; replacements must be strictly newer and better than an existing article. Duplicate IDs, titles and URLs fail eligibility. Each story requires its own text, infographic and source URL. An official URL is **not** proof of source verification, image ownership, publication approval or commercial rights.

The score does not call a crawler or external provider. A reviewer must independently validate primary-source facts and corrections, commercial reuse limits, originality of the article and graphic, content/infographic consistency, accessibility and the Content Engine `planContentCampaign` / CADS draft output. CADS technical PASS does not lift `editorialReview=REVIEW_REQUIRED` or grant publishing rights. Disallowed: unlicensed assets, unverified prices, trading advice, paywalled/restricted providers, confidential material and screenshots with unclear reuse rights.

## Explicit review + proposed edition (no write)

Only a **separately supplied Owner-reviewed manifest**, exact `CAPITAL_AI_HOME_EDITORIAL_APPROVALS@1`, can permit a candidate to enter the generated **proposal**. Each approval must bind exact candidate ID, source URL, source date, SHA-256 story digest, owner review (within 7 days), VERIFIED primary facts, `LINK_ONLY` source-rights assessment and `ORIGINAL` infographic rights. No manifest, duplicate review, modified bytes, invalid rights, future/expired review or review from any other authority → fail closed (retain current edition). Candidate-contained approval flags are ignored. **Important trust boundary:** a JSON field `reviewer: OWNER` is a content-bound review assertion, not cryptographic proof of the Owner's identity. Before any publication, confirm the human review or authorized approval in trusted GitHub evidence; the automation may not create its own Owner approval manifest.

```bash
node scripts/growth/home-editorial-edition.mjs --propose 2026-11-15 \
  /path/to/candidates.json /path/to/owner-reviewed-approvals.json \
  > /tmp/homeEditorialEdition.proposed.json
```

`--propose` only prints JSON. It never writes into the repository or calls GitHub, Render or a publisher. A matched approval is preserved with each newly proposed article as provenance. The separately prepared proposal needs normal PR review, relevant CI, current head/base verification and explicit publication authority before changing the publicly bundled JSON. Do not publish a new article merely because the automated classifier reports a higher score.

## Failure modes and acceptance

| Case | Expected result |
| --- | --- |
| No new/better candidate | Original edition unchanged; no PR |
| No independent approval, forged/expired/duplicate review | Original edition unchanged; no publish |
| Source host spoof, future date, invalid visual | Reject input |
| Correct approval for strictly newer/higher-score candidate | Proposal only; preserve text + original graphic + source + approval digest |
| Providers unavailable, source/rights disputed | BLOCKED/NOT_PROVEN; existing visible content remains, correction flagged for human assessment |
| Simultaneous four-hour invocation | Single automation owner; no second scheduler, deduplicate candidates by ID/source/title |
| Changed live page | NOT_PROVEN until linked merged commit, actual deployment SHA and readback all agree |

## Evidence scope

Local source inspection (main `d99da2ba58f12233299579c646f38e0b600a3b9a`) verified the static edition, existing selection rule, tests and absence of homepage cron under `.github/workflows/`. The original ChatGPT daily automation was read and found active. Node tests and GitHub CI must be reported with **actual** exit codes/run IDs separately; existence of a test is not a PASS. Runtime and license approvals are NOT_PROVEN unless externally checked. Revert the feature branch to roll back proposed code; never rollback by overwriting public content.
