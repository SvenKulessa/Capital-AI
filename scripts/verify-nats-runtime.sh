#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  docker logs capital-nats-smoke > security-reports/nats-smoke.log 2>&1 || true
  docker rm -f capital-nats-smoke || true
  docker volume rm capital-nats-smoke-data || true
}
trap cleanup EXIT

docker volume create capital-nats-smoke-data

docker run -d \
  --name capital-nats-smoke \
  --read-only \
  --cap-drop ALL \
  --cap-add CHOWN \
  --cap-add FOWNER \
  --cap-add SETUID \
  --cap-add SETGID \
  --security-opt no-new-privileges \
  -e NATS_APP_USER=capital-ai-market-runtime \
  -e NATS_APP_PASSWORD=local-ci-password \
  -e NATS_BRIDGE_USER=capital-ai-provider-bridge \
  -e NATS_BRIDGE_PASSWORD=local-ci-bridge-password-123456 \
  -e NATS_EXECUTOR_USER=capital-ai-provider-executor \
  -e NATS_EXECUTOR_PASSWORD=local-ci-executor-password-123456 \
  -v capital-nats-smoke-data:/var/data \
  capital-nats:${GITHUB_SHA:?GITHUB_SHA required}

ready=false
for attempt in $(seq 1 30); do
  if docker logs capital-nats-smoke 2>&1 | grep -q 'Server is ready'; then
    ready=true
    break
  fi
  if test "$(docker inspect --format '{{.State.Running}}' capital-nats-smoke 2>/dev/null || true)" != "true"; then
    break
  fi
  sleep 1
done

if test "$ready" != "true"; then
  echo 'NATS smoke did not reach ready state' >&2
  docker logs capital-nats-smoke >&2 || true
  exit 1
fi

# Validate the committed authority file, not expanded credential values.
test "$(docker exec capital-nats-smoke grep -Fc 'user: $NATS_BRIDGE_USER' /etc/nats/nats-server.conf)" = 1
test "$(docker exec capital-nats-smoke grep -Fc 'user: $NATS_EXECUTOR_USER' /etc/nats/nats-server.conf)" = 1
test "$(docker exec capital-nats-smoke grep -Fc 'capital.private.provider.query.v1' /etc/nats/nats-server.conf)" = 2
test "$(docker exec capital-nats-smoke grep -Fc 'capital.private.provider.execute.v1' /etc/nats/nats-server.conf)" = 2

docker exec capital-nats-smoke sh -c '
  test "$(id -u)" = 0
  grep -Eq "^Uid:[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000$" /proc/1/status
  test "$(stat -c %u /var/data/jetstream)" = 1000
'

docker restart capital-nats-smoke
for attempt in $(seq 1 30); do
  if docker exec capital-nats-smoke grep -Eq '^Uid:[[:space:]]+1000[[:space:]]+1000' /proc/1/status; then
    break
  fi
  sleep 1
done

docker exec capital-nats-smoke grep -Eq '^Uid:[[:space:]]+1000[[:space:]]+1000' /proc/1/status
docker exec capital-nats-smoke sh -c '
  grep -Eq "^Gid:[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000$" /proc/1/status
  grep -Eq "^CapEff:[[:space:]]+0+$" /proc/1/status
'
