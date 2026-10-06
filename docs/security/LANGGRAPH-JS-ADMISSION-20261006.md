# LangGraph.js Admission — 2026-10-06

Status: **BENCHMARK_PIN_ALLOWED / PRODUCTION_BLOCKED**

Candidate: `@langchain/langgraph@1.4.19`

## Entscheidung

Die exakte Version 1.4.19 darf ausschließlich für einen isolierten, nicht-produktiven CAPITAL-AI Benchmark gepinnt werden. Eine Production-Runtime-Promotion wird daraus nicht abgeleitet.

## Verifizierte Source-Provenance

- Repository: `langchain-ai/langgraphjs`
- Release-Commit: `1cee82d0c48fbaeb2d71433211b03113992cc114`
- Commit-Signatur: verifiziert
- `libs/langgraph-core/package.json`: Git blob `678c88a3d2f52962db3f3e29c7177f34de07035b`
- `libs/langgraph-core/LICENSE`: Git blob `e7530f5e9e106a7c0a3f71c11754daaa7fc47eb0`
- Lizenz: MIT
- Node Engine: >=18

## Release-Source Dependency Inventory

- `@langchain/langgraph-checkpoint` → Release-Source 1.1.5
- `@langchain/langgraph-sdk` → Release-Source 1.12.1
- `@langchain/protocol` → Release-Lock 0.0.19
- `@standard-schema/spec` → Release-Lock 1.1.0
- Peer `@langchain/core ^1.1.48` → exakte CAPITAL-AI-Auflösung erst im Benchmark-Lockfile
- Peer `zod ^3.25.32 || ^4.2.0` → vorhandenes CAPITAL-AI `zod 4.6.5` liegt im Range

## Security-Grenzen

- `GHSA-j87f-x5h5-gr75`: High, JsonPlusSerializer/RCE. Gepatchte Floors: LangGraph 1.4.12, Checkpoint 1.1.4. Kandidat 1.4.19 / Release-Checkpoint 1.1.5 liegt darüber.
- `GHSA-98xf-r82g-9mhx`: MongoDBSaver. Der optionale MongoDB-Checkpointer wird nicht zugelassen.
- `GHSA-5mx2-w598-339m`: RedisSaver. Der optionale Redis-Checkpointer wird nicht zugelassen.

## Verbleibende Gates vor realem Benchmark

1. exakten npm-Lock erzeugen und Readback aller Transitives sichern,
2. npm audit + CAPITAL-AI License Engine,
3. identischen Workload gegen Shadow Router und realen LangGraph StateGraph,
4. Checkpoint/Replay/Authority-Regression,
5. Docker Security.

Bis dahin bleibt LangGraph außerhalb des finalen Runtime-Images.
