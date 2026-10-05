# ADR — Canonical Market Event Path (Option B)

Status: **OWNER APPROVED / IMPLEMENTED ON BRANCH / NOT PRODUCTION ACTIVATED**  
Date: 2026-10-05  
Primary Domain: MARKET  
Related Domains: PLATFORM, TRUST, PRODUCT

## Owner decision

The owner approved **Option B**: keep the existing raw quote evidence stream unchanged and introduce a separate canonical market-event stream for normalized market observations.

## Decision

Raw transport and normalized canonical events are separate authorities:

```text
CAPITAL_FACTS
capital.facts.quote.<symbol>
        |
        | rawInputEvidenceId
        v
normalization + identity + rights verification
        |
        v
CAPITAL_CANONICAL
capital.market.canonical.<assetClass>.<assetId>
```

### Raw authority

- Stream: `CAPITAL_FACTS`
- Subject: `capital.facts.quote.*`
- Evidence ID: `CAPITAL_FACTS:<seq>:<sha256>`
- Purpose: immutable provider/raw-payload evidence.

### Canonical authority

- Stream: `CAPITAL_CANONICAL`
- Subject: `capital.market.canonical.<assetClass>.<assetId>`
- Evidence ID: `CAPITAL_CANONICAL:<seq>:<sha256>`
- Purpose: normalized, identity-bound and rights-bound market observations.

The canonical event never replaces the raw evidence. It contains and preserves the exact raw evidence reference.

## Mandatory canonical gates

A canonical event is rejected unless all of the following are true:

1. the raw `CAPITAL_FACTS` evidence ID is syntactically valid and replayable;
2. provider, symbol, venue, currency, timestamps and quote values match the replayed raw fact;
3. `AssetIdentity` is supplied explicitly and matches the raw fact;
4. `providerDataset` is supplied explicitly;
5. `instrumentManifestReference` is supplied explicitly;
6. provider rights evidence is supplied explicitly;
7. the provider is admitted by the existing Open-Source/Open-Data runtime policy for market quotes;
8. the event rights-evidence reference and instrument-manifest reference equal the admitted source references;
9. provenance timing is internally consistent;
10. `scoreEligible=false` and `decisionEligible=false`.

No field is inferred from a provider name alone.

## Stream safety

`CAPITAL_CANONICAL` uses the same bounded safety profile as raw quote evidence:

- file storage;
- discard-new;
- delete denied;
- purge denied;
- no age expiry;
- bounded max bytes;
- bounded message size;
- replica count restricted to 1, 3 or 5;
- duplicate window enabled.

This does not establish HA, backup, archival or regulatory WORM properties.

## Deterministic lineage

```text
provider raw payload
  -> CAPITAL_FACTS:<seq>:<sha256>
  -> CanonicalMarketEvent.rawInputEvidenceId
  -> CAPITAL_CANONICAL:<seq>:<sha256>
  -> future FeatureValue / PipelineSnapshot.rawInputReferences[]
  -> EVD-<sha256> score evidence
```

Every evidence layer remains independently verifiable.

## Current fail-closed state

The current source policy has no production-admitted market-quote or scoring-price source. Therefore the canonical persistence path exists, but no current provider can pass its admission gate.

ECB evidence on current main permits several reuse classes with obligations, but `derived_scoring_research` remains unresolved. This ADR does not upgrade ECB to scoring admission.

## Rollback

The change is additive:

- `CAPITAL_FACTS` contract and subject remain unchanged;
- legacy delivery remains unchanged;
- canonical code can be reverted without rewriting raw evidence;
- no existing provider is activated;
- no runtime environment variable or secret is changed;
- no deployment is triggered by this branch.

If the canonical stream has already been created in a later approved deployment, rollback must preserve historical canonical evidence until the applicable retention/rollback policy explicitly authorizes its disposition.

## Production activation prerequisites

Before canonical events may feed production scoring:

1. provider/dataset admission PASS;
2. real instrument manifest PASS;
3. canonical bridge tests PASS on exact source SHA;
4. NATS PubAck + replay readback PASS on exact artifact;
5. feature normalization/calibration PASS;
6. score replay evidence PASS;
7. 3 VALIDATE PASS;
8. 5 APPROVE PASS.
