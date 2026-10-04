#!/usr/bin/env bash
set -euo pipefail
cleanup() {
  docker logs capital-nats-smoke > security-reports/nats-smoke.log 2>&1 || true
  docker rm -f capital-nats-smoke || true
  docker volume rm capital-nats-smoke-data || true
}
trap cleanup EXIT
docker volume create capital-nats-smoke-data
docker run -d --name capital-nats-smoke --read-only --cap-drop ALL --cap-add CHOWN --cap-add FOWNER --cap-add SETUID --cap-add SETGID --security-opt no-new-privileges -e NATS_APP_USER=capital-ai-market-runtime -e NATS_APP_PASSWORD=local-ci-password -v capital-nats-smoke-data:/var/data capital-nats:${GITHUB_SHA:?GITHUB_SHA required}
for attempt in $(seq 1 30); do
  if docker logs capital-nats-smoke 2>&1 | grep -q 'Server is ready'; then break; fi
  sleep 1
done
docker logs capital-nats-smoke 2>&1 | grep -q 'Server is ready'
docker exec capital-nats-smoke sh -c 'test "$(id -u)" = 0; grep -Eq "^Uid:[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000$" /proc/1/status; test "$(stat -c %u /var/data/jetstream)" = 1000'
docker restart capital-nats-smoke
for attempt in $(seq 1 30); do
  if docker exec capital-nats-smoke grep -Eq '^Uid:[[:space:]]+1000[[:space:]]+1000' /proc/1/status; then break; fi
  sleep 1
done
docker exec capital-nats-smoke grep -Eq '^Uid:[[:space:]]+1000[[:space:]]+1000' /proc/1/status
docker exec capital-nats-smoke sh -c 'grep -Eq "^Gid:[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000$" /proc/1/status; grep -Eq "^CapEff:[[:space:]]+0+$" /proc/1/status'
