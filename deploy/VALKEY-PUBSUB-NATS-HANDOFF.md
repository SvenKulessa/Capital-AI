# Valkey Pub/Sub and paid private NATS

Scope: SvenKulessa/Capital-AI, workspace AICapital, Frankfurt. Owner authorized continuation and paid NATS on 2026-09-30. Earlier NATS cost rejection is superseded for this bounded service. No change to Finance or its secrets.

## Implemented behavior

JetStream first acknowledges a validated provider fact. Redis then atomically updates the latest quote and publishes the acknowledged delivery on `capital:quote:events:v1`. Older observations and duplicate evidence IDs do not emit notifications. `MARKET_PUBSUB_ENABLED=false` disables publishing and subscriptions without disabling evidence storage. The `pubsub` health field reports publisher availability, not a durable consumer or delivery SLA.

`subscribeQuotes(listener)` uses one separate connection for all local listeners (maximum 32). Notifications must match the schema, be fresh, and match the replayed JetStream original before callbacks run. At most one notification per instrument is in flight; intermediate notifications can be dropped. Callback failures are isolated. Subscriptions recover during infrastructure reconnect. This interface is for ephemeral backend consumers; it does not add public SSE/WebSocket access. Evidence/replay remains exclusively JetStream. Provider rights remain unverified and `actionable=false`.

## NATS resource and cost

`deploy/render-nats.yaml`: one private Docker service `capital-ai-market-events`, Starter (`0.5c-512mb`), Frankfurt, 5 GB persistent disk at `/var/data`, manual deploy only, no public endpoint. Baseline additional cost: $7/month compute + 5 × $0.25/month disk = $8.25/month, before taxes, workspace charges or usage overages. Valkey stays Free; the existing Capital-AI Starter cost is separate. Sources: https://render.com/pricing and https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses (checked 2026-09-30).

NATS 2.15.0 Alpine is digest-pinned. Startup prepares `/var/data/jetstream` and immediately replaces itself with the server as UID/GID 1000 using pinned `su-exec=0.2-r3`. NATS_TOKEN is mandatory, has no repository value, and must be the same runtime secret on NATS and Capital-AI. No monitoring/cluster/WebSocket listener is configured. JetStream is limited to 2 GB; CAPITAL_FACTS is capped at 1 GB with discard-new and no delete/purge. Capacity exhaustion fails closed and requires an owner-reviewed retention/archive decision. One replica is not HA or WORM.

## Four local validation steps

Run `VALKEY_SERVER_BIN=/path/to/valkey-server NATS_SERVER_BIN=/path/to/nats-server npm run test:market:local`. The harness requires real binaries and never silently skips.

1. Fan-out after durable acknowledgement; ordering, deduplication, forged/demo/schema rejection and wrong NATS token.
2. NATS process shutdown/restart: fail-closed outage, retained evidence and subscriber recovery.
3. Valkey process shutdown/restart: empty cache, retained JetStream evidence, subscriber recovery and unsubscribe.
4. Cache-only connection: no durable write or quote delivery without NATS.

All four passed locally using Valkey 8.1.10 and NATS 2.15.0. Contract tests (5), Docker context tests (2) and TypeScript validation passed. These are synthetic test fixtures, not live provider/Render evidence.

## Production handoff gates

1. Merge this PR via owner review. Run the manual `Private NATS image security` workflow on the exact merge commit; HIGH/CRITICAL scan, pinned image identity, SBOM and non-root mounted-disk smoke must pass. No Docker executable was available locally; these gates remain unverified.
2. Apply `deploy/render-nats.yaml` in AICapital (the connector cannot create private Docker services or disks). Supply a randomly generated NATS_TOKEN as a runtime secret; never put it in chat, a URL, Git or a build argument. Verify the disk path and the running server UID.
3. Read the actual NATS internal hostname/port from Render. Merge-update Capital-AI runtime env with `NATS_URL=nats://<actual-host>:4222`, the same NATS_TOKEN, `NATS_REPLICAS=1` and `MARKET_PUBSUB_ENABLED=true`. Preserve all other environment variables. Env updates can trigger deployments; correlate the exact deployed commit.
4. Verify `/api/market/status`: Redis, NATS, infrastructure and Pub/Sub publisher connected. Verify an actual provider quote has a durable evidence ID and remains non-actionable until rights/eligibility gates pass. Prove replay after NATS restart in a controlled validation window before calling production storage verified.

At preparation time no NATS resource was created, no secret changed and no workflow/deploy started. The Render connector lacks service creation support and no CLI API key is available. A browser fallback requires user approval under the browser tool rules. Disk snapshots alone are not a verified JetStream backup/restore procedure.
