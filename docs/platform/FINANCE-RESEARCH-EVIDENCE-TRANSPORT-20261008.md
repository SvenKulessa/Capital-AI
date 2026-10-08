# Finance Research Evidence Transport — PLATFORM / MARKET / TRUST

Date: 2026-10-08
Status: CODE STAGED, RUNTIME DISABLED, NOT PROVEN LIVE.
Base: `main@44ce0b4b727a857809595619709ee23366367ab9`.

## Verified existing boundaries

- `ScoringEngineService.inspectFinanceModelResearch` is the sole existing TypeScript Finance research evaluation boundary. Its output is RESEARCH_EVALUATED or BLOCKED; eligibility flags remain false.
- `server/scorer-bus.mjs` already provides crypto-only `CAPITAL_SCORES` JetStream and Valkey Pub/Sub, but does not write Supabase.
- `services/provider-bridge-rs` is a read-only Core NATS query relay to the private provider executor, **not** the scoring engine.
- `server/private-market-batch.mjs` explicitly marks user-private Kraken/Massive data `jetStreamPublicationAllowed:false`; the encrypted private Valkey cache must not be generalized into a shared cache.
- `public.score_snapshots` is legacy daily score/price history; it is not proof that Finance models or the Rust bridge produce approved scores.

## New conservative transport

```text
Approved, non-private market source + verified rights
   → Capital-AI ScoringEngineService.inspectFinanceModelResearch(...)
   → RESEARCH_EVALUATED (NOT a trade/public score)
   → application-owned admission / internal call only
   → projectFinanceResearchReceipt(...)
       ├─ no prices, scores, signals, feature values, API secrets, user IDs or raw payload
       └─ model/source/feature/weight/rights SHA-256 fingerprints only
   → NATS CAPITAL_FINANCE_RESEARCH / capital.research.score.<assetClass>
   → JetStream PubAck + exact server-side replay verification + event SHA-256
   → Supabase public.finance_research_receipts (service role only, RLS)
   → Valkey ephemeral receipt cache (60s) + Pub/Sub notification
```

**Explicitly not connected:** No public API route or browser client invokes this transport. Call the Node adapter only from a trusted server-side orchestrator after real upstream rights validation and matching Finance-model inputs. This branch does not introduce a second scorer, copy Finance provider keys, modify `score_snapshots`, auto-promote models, send BYOK data to NATS or trigger orders.

## Deployment and transition

1. Review and merge the PR via the required checks and owner approval.
2. Apply the versioned Supabase migration through the normal reviewed deployment process; check `anon` and `authenticated` have no privileges and the server role has SELECT/INSERT only.
3. **NATS config changed in this PR**: deploy the NATS service only after explicitly validating its new ACL and coordinating with PLATFORM. Do NOT redeploy NATS solely because repository HEAD changed. Confirm existing `CAPITAL_FACTS`/`CAPITAL_SCORES` and private bridge user ACLs still work.
4. Verify `CAPITAL_FINANCE_RESEARCH` JetStream with test messages containing **fabricated non-private metadata only**, including PubAck/replay, retention, upper byte limits and replica count.
5. Configure `FINANCE_RESEARCH_TRANSPORT_ENABLED=true` only on the intended application service after migrations, NATS ACL verification and readback. No setting is applied by this PR.
6. Run private Rust Bridge query-to-executor read-only tests **separately**; BYOK outputs must remain private and must never be submitted to this adapter.
7. Wire the actual approved provider-to-feature/Finance-model evaluation chain in a subsequent MARKET change. Keep scoreEligible, rankEligible, productionEligible, decisionEligible false until separately supported.

## Security, cost and failure semantics

- The adapter rejects tenant identifiers, any extra context properties, private data scope, missing explicit admission, unsafe/partial research results and missing service-role configuration before publishing.
- NATS ACL is narrowed to the new subject + four stream management operations. No wildcard bridge publication, stream purge or stream delete grant.
- On NATS PubAck/replay failure or absent Supabase confirmation, the Valkey cache and Pub/Sub do not update. Postgres retry conflict is accepted only on matching event ID/hash/JetStream sequence.
- New stream consumes up to 64 MiB of the existing NATS file budget; one transient 60-second Valkey metadata key per unique event; Postgres metadata rows accrue indefinitely until an explicit retention policy is approved. Costs, quotas, budget and disk headroom: NOT_PROVEN. No new paid plan automatically activated.
- No live end-to-end evidence, new commercial redistribution grant, approved production score, model promotion or provider execution is claimed.

## 2026-10-08 follow-up: value-sensitive replay and internal scorer handoff

The canonical Finance evaluator was extended by the merged Finance replay change to include
`researchReplayFingerprint` over actual normalized factor values, provenance, version and
effective weights. Prior receipt validation rejected this new field and older receipt identities
would not distinguish numerically changed factors. The follow-up makes this fingerprint
mandatory in **new application records** and persists it in a nullable, additive column so
previous append-only records remain unchanged. Historical NULL does not mean replay verified.

`src/services/financeResearchReceiptOrchestrator.ts` is the new internal MARKET orchestration
boundary. It calls `ScoringEngineService.inspectFinanceModelResearch` and can submit
RESEARCH_EVALUATED results to an internal receipt sink, only after exact current
open-source/open-data policy admission, per-provider feed/venue matching and full rights
checks. It refuses private Kraken/Massive BYOK, demo, future timestamps and unimplemented
provider obligations. The currently admitted ECB reference source carries mandatory
obligations, so no production receipts are emitted until fulfilment is demonstrated.

The sink is dependency-injected; the new code does not mount an HTTP endpoint, activate
provider keys, grant licences or enable a new production process. The Node receipt transport
remains behind `FINANCE_RESEARCH_TRANSPORT_ENABLED=true` and must only be wired from a
trusted, server-side orchestrator through an approved build/runtime boundary. No browser
imports or frontend connection are allowed.

Supabase: apply `20261008173500_finance_research_value_replay_fingerprint.sql` using
the reviewed migration flow. Previous migration `20261008161645` was already applied
on 2026-10-08; verify the new column and check grants/RLS after the new merge.

NATS: deployment `4fa3e3f9` remains the live NATS base at the time of this readback,
while `main` includes new `capital.research.score.*` ACL. NATS configuration really
changed but NATS must be deployed only after a targeted ACL/disk/rollback review.
It must never follow generic repository HEAD changes. The private Rust bridge deploy
`acb328b5` is not proof of a live credential-bound Provider→Scoring roundtrip.

No test in this branch claims actual licensed provider data, verified source obligations,
live scoring, user-specific private score storage, or Supabase/JetStream production roundtrips.
