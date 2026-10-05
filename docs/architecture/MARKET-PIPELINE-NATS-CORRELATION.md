# MARKET Pipeline ↔ NATS Correlation

Status: **CORRELATED / INTEGRATION BLOCKED**  
Domains: MARKET + PLATFORM + TRUST  
Branch: `capital-ai-market/enterprise-pipeline-part2-20261005`

## Current durable runtime path

```text
provider observation
  -> server/market.mjs admission gate
  -> QuoteFactSchema
  -> MarketInfrastructure.persist()
  -> NATS JetStream CAPITAL_FACTS
       subject capital.facts.quote.<symbol>
  -> PubAck
  -> CAPITAL_FACTS:<seq>:<sha256> evidence identity
  -> Valkey latest-state cache
  -> optional Valkey Pub/Sub notification
  -> replay verification before delivery
```

The existing runtime correctly treats JetStream as durable quote evidence and Valkey/PubSub as non-authoritative cache/fan-out.

## PART 2 canonical scoring path

```text
stage_01_ingestion
  -> stage_02_normalization
  -> stage_03_validation
  -> stage_04_feature_engineering
  -> stage_05_scoring
  -> stage_06_ranking
  -> stage_07_evidence
  -> stage_08_delivery
```

The scoring path uses `AssetIdentity`, `DataProvenance`, `FeatureValue`, `PipelineSnapshot` and deterministic `EVD-<sha256>` shadow evidence.

## Correlation matrix

| Runtime evidence | PART 2 stage | Current correlation | Gate |
| --- | --- | --- | --- |
| `QuoteFactSchema` | stage_01 ingestion | partial | BLOCKED |
| JetStream `CAPITAL_FACTS` | raw capture / replay | durable quote-level evidence | PASS for transport semantics only |
| `instrumentCatalog` | stage_02 normalization | legacy fixed mapping only | BLOCKED |
| quote freshness/schema checks | stage_03 validation | partial | BLOCKED |
| `rawFeatureCalculator.ts` | stage_04 feature engineering | offline formulas exist | BLOCKED for production |
| `ScoringEngineService.computeShadowScore` | stage_05 scoring | deterministic shadow | PASS for isolated shadow semantics |
| cross-sectional rank | stage_06 ranking | no production rank path | BLOCKED |
| `ShadowPipelineService` | stage_07 evidence | content-addressed deterministic replay | PASS for offline shadow only |
| Control Center configurator | stage_08 delivery/control | read-only views | PASS as non-authorizing UI |

## Exact integration gaps

### 1. QuoteFact is not yet canonical DataProvenance

The runtime quote envelope currently does not carry every `DataProvenance` field required by PART 2, including:

- `providerDataset`
- `publishedAt`
- measured `latencyMs`
- a rights-qualified `licenseScope`

Therefore a `QuoteFact` must not be silently cast to a canonical `FeatureValue` or `PipelineSnapshot`.

### 2. Asset normalization is not a production AssetIdentity resolver

`shared/market-contracts.mjs` contains a fixed legacy instrument catalog. It is adequate for validating the quarantined quote transport but is not the canonical multi-asset instrument manifest required for production scoring.

### 3. Quote evidence and score evidence are separate identities

`CAPITAL_FACTS:<seq>:<sha256>` proves the stored quote envelope.  
`EVD-<sha256>` proves a complete deterministic PART 2 shadow evaluation bundle.

A score Evidence ID must reference its raw-input evidence IDs; it must never replace or reinterpret the JetStream evidence identity.

### 4. Feature engineering is not connected to live transport

Existing raw formulas are offline and rights-aware. They intentionally return non-score-eligible raw calculated features until normalization/calibration/component admission is complete.

### 5. Legacy provider paths remain quarantined

`server/open-source-market-policy.mjs` has zero admitted quote/scoring sources. Consequently:

- `quotesEnabled=false` unless a qualifying source is admitted,
- legacy Binance/Kraken/Twelve Data/Polygon paths cannot start,
- current transport evidence must not be treated as current source-rights admission.

## Required canonical bridge before production

A future bridge must be additive and must preserve both evidence identities:

```text
JetStream quote evidence ID
  -> canonical ingestion envelope
  -> AssetIdentity resolution
  -> DataProvenance enrichment
  -> dataset/use-case rights lookup
  -> validation
  -> FeatureValue calculation
  -> PipelineSnapshot.rawInputReferences[]
  -> shadow scorer
  -> EVD score evidence ID
```

The owner approved Option B. The additive bridge contract and persistence path are now implemented on this branch with `CAPITAL_CANONICAL` and `capital.market.canonical.<assetClass>.<assetId>`. Production activation remains blocked until a provider/dataset passes the existing Open-Source/Open-Data admission policy. No environment variables, secrets or runtime deployments are changed here.

## Telemetry correlation

Existing measured operations:

- `nats-jetstream / quote.publish_ack`
- `storage / quote.replay`
- `valkey / quote.atomic_set_publish`
- `valkey / quote.read`
- NATS and Valkey connection operations

PART 2 shadow telemetry currently measures:

- `stage_03_validation`
- `stage_05_scoring`
- `stage_07_evidence`

These telemetry classes must remain operational telemetry and must not enter deterministic evidence bodies unless explicitly represented as immutable measured input data.

## Production decision

```text
NATS transport semantics:       VALIDATED BY EXISTING CODE/TEST EVIDENCE
NATS runtime on this branch:    NOT RE-EXECUTED
Canonical normalization bridge: IMPLEMENTED / SOURCE-ADMISSION BLOCKED
Production feature bridge:      BLOCKED
Production score/rank delivery: BLOCKED
Provider rights admission:      BLOCKED
```
