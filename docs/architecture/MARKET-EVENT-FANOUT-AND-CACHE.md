# Market Event Fan-out, JetStream Evidence and Valkey Cache

Date: 2026-10-02  
Domains: MARKET + PLATFORM + TRUST

## Current main truth

The runtime defaults to exactly **3 allowed symbols** when `MARKET_SYMBOLS` is not overridden: `BTCUSDT`, `BTCUSD`, `AAPL`. Therefore no claim of 100 crypto + 100 equity assets is currently valid.

### Durable path

Provider observation → schema/freshness validation → JetStream `CAPITAL_FACTS` → PubAck → evidence ID/hash → Valkey cache → optional Valkey Pub/Sub notification.

JetStream:
- NATS server 2.15.0, file storage.
- Subject: `capital.facts.quote.*`.
- Stream max bytes: 1 GiB.
- Message max: 256 KiB.
- Replicas: 1 by default; accepted configuration values 1/3/5.
- Delete/purge denied; discard-new; no age expiry.
- NATS server max connections: 50.

### Cache / fan-out path

Valkey 8.1.10:
- key: `capital:quote:v1:<symbol>`;
- TTL is bounded by quote freshness and never exceeds the remaining 30-second fact lifetime;
- Pub/Sub channel: `capital:quote:events:v1`;
- Pub/Sub is explicitly ephemeral and never evidence;
- each notification is replay-verified against JetStream before listeners receive it;
- maximum in-process listeners: **32**;
- duplicate/in-flight notification per symbol is bounded by `pendingSymbols`.

There is no architecture-level hard asset count in NATS or Valkey. Current simultaneous asset coverage is constrained by MARKET_SYMBOLS/provider adapters and runtime/provider quotas, not by a declared 3/100/400 cache constant.

## Benchmark gap

A production-representative benchmark is still missing. Required matrix:
- Valkey 8.1.10 vs Redis-compatible OSS challengers using the same SET/GET/PUBLISH workload;
- concurrency 1/10/20/50 clients;
- payloads 256 B, 1 KiB and representative quote payload;
- pipeline 1/10;
- persistence off vs approved durable modes when comparable;
- p50/p95/p99 latency, requests/s, CPU, memory and reconnect recovery;
- NATS Core vs JetStream PubAck/replay with 1/10/32 consumers;
- fan-out at 3, 100, 200 and 400 symbols using synthetic facts only.

Do not compare vendor benchmark numbers as if they were CAPITAL-AI measurements.
