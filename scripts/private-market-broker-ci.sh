#!/usr/bin/env bash
set -euo pipefail
# Disposable loopback brokers and the just-built Rust image; no production endpoints.
image="${PRIVATE_MARKET_BRIDGE_IMAGE:?Required just-built bridge image}"
export NATS_URL=nats://127.0.0.1:44222 REDIS_URL=redis://127.0.0.1:46379
export NATS_APP_USER=fixture-app NATS_APP_PASSWORD=fixture-app-password-0123456789
export NATS_BRIDGE_USER=fixture-bridge NATS_BRIDGE_PASSWORD=fixture-bridge-password-0123456789
export NATS_EXECUTOR_USER=fixture-executor NATS_EXECUTOR_PASSWORD=fixture-executor-password-0123456789
export PRIVATE_MARKET_SMOKE_MODE=DISPOSABLE_ONLY PRIVATE_MARKET_EXTERNAL_RUST_BRIDGE=true
trap 'docker rm -f private-market-rust private-market-nats private-market-valkey >/dev/null 2>&1 || true' EXIT
docker run -d --name private-market-valkey -p 127.0.0.1:46379:6379 \
  valkey/valkey:9.1.2-alpine valkey-server --save '' --appendonly no >/dev/null
# Keep the repository ACLs and replace only the listening test port in a temporary config.
sed 's/0.0.0.0:4222/0.0.0.0:44222/' deploy/nats-server.conf > "$RUNNER_TEMP/private-market-nats.conf"
docker run -d --name private-market-nats --network host --user 65532:65532 \
  --tmpfs /var/data:uid=65532,gid=65532,mode=700 \
  -e NATS_APP_USER -e NATS_APP_PASSWORD -e NATS_BRIDGE_USER -e NATS_BRIDGE_PASSWORD \
  -e NATS_EXECUTOR_USER -e NATS_EXECUTOR_PASSWORD \
  -v "$RUNNER_TEMP/private-market-nats.conf:/etc/nats/nats-server.conf:ro" \
  nats:2.15.0-alpine@sha256:ac8f88a6494bffc2c2a5289a0ca61cb28a9145c11ba5677cf24265d07f46d8d4 \
  --config /etc/nats/nats-server.conf >/dev/null
ready=0
for attempt in $(seq 1 40); do
  if (echo > /dev/tcp/127.0.0.1/44222) 2>/dev/null && (echo > /dev/tcp/127.0.0.1/46379) 2>/dev/null; then ready=1; break; fi
  sleep 0.25
done
test "$ready" = 1
docker run -d --name private-market-rust --network host --read-only --cap-drop ALL \
  --security-opt no-new-privileges -e NATS_URL -e NATS_BRIDGE_USER -e NATS_BRIDGE_PASSWORD "$image" >/dev/null
ready=0
for attempt in $(seq 1 40); do
  if docker exec private-market-rust /usr/local/bin/capital-ai-provider-bridge --healthcheck >/dev/null 2>&1; then ready=1; break; fi
  sleep 0.25
done
test "$ready" = 1
node scripts/private-market-broker-smoke.mjs
