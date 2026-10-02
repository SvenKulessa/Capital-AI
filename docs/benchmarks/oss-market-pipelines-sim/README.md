# OSS Market Pipeline Simulation & Benchmark

Stand: 2026-10-02  
Primary Domain: CAPITAL-AI-MARKET · Cross-Domain: PRODUCT / TRUST / PLATFORM

## Scope

This slice registers open-source alternatives for market ingress and adjacent layers without creating a second provider authority. Existing NATS/JetStream and Valkey remain canonical transport/cache. The candidates are CCXT, Hummingbot, Cryptofeed, OpenBB, DefiLlama API SDK, yfinance and fdnpy/FinancialData.Net. Adjacent OSS candidates cover analytics (DuckDB/ClickHouse), observability (OpenTelemetry/Prometheus), vector retrieval (Qdrant) and license compliance (ORT/ScanCode).

## Rights boundary

Software licenses never grant market-data rights. Exchange/provider terms, display, redistribution, derived-data, retention and resale permissions remain evaluated by the existing market-data-rights contracts and LEGAL_POLICY@1. yfinance is explicitly research-only until Yahoo data rights are independently evidenced.

## Simulation engine

`src/services/openSourcePipelineSimulation.ts` enumerates every currently valid combination of:

- registered OSS ingress candidate with an explicit simulation profile;
- supported REST/WebSocket/hybrid mode;
- canonical NATS transport;
- canonical Valkey cache;
- DuckDB or ClickHouse analytics;
- OpenTelemetry/Prometheus observability.

The engine emits deterministic synthetic metrics and a DATA_PIPELINE@1-compatible CADS score. It intentionally marks every result `decisionEligible:false` because synthetic measurements are architecture evidence, not live provider SLAs. fdnpy/FinancialData.Net is deliberately listed as `unbenchmarkedIngress` until measured profile values exist; no latency, throughput, recovery or SLA values are invented for it.

## Validation

1. CURRENT_MAIN + AGENTS policy read before writes.
2. License/data-rights distinction encoded in registry.
3. Existing authority boundaries preserved: NATS, Valkey, provider-rights and CADS stay canonical.
4. Simulation outputs are explicitly synthetic and fail closed for production decisions.
5. UI exposure is additive under existing OSS/research surfaces; no production provider is silently activated.

## Next live benchmark gate

A later isolated run may replace synthetic latency/throughput with measured p50/p95/p99, message loss, reconnect time, CPU/RSS and NATS replay metrics. That run must use exact versions/digests, identical fixtures and provider rights that permit the tested workload.
