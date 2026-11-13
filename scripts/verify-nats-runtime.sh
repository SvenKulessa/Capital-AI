#!/usr/bin/env bash
set -euo pipefail

# Disposable Docker-only smoke test; never touches a Render disk.
image="capital-nats:${GITHUB_SHA:?GITHUB_SHA required}"
name=capital-nats-smoke
volume=capital-nats-smoke-data
tmp="$(mktemp -d)"
chmod 0755 "$tmp"
cleanup() {
  docker rm -f "$name" capital-nats-negative >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
  # Fixture directories are deliberately owned by UID 1000 or root.
  # Only remove this freshly allocated runner-local temp path, never a mounted production disk.
  sudo rm -rf -- "$tmp"
}
trap cleanup EXIT
fail() { printf 'FAIL %s\n' "$*" >&2; exit 1; }
args=(--read-only --network none --cap-drop ALL --security-opt no-new-privileges --pids-limit 150 --memory 256m)
envs=(-e NATS_APP_USER=capital-ai-market-runtime
      -e NATS_APP_PASSWORD=local-ci-password
      -e NATS_BRIDGE_USER=capital-ai-provider-bridge
      -e NATS_BRIDGE_PASSWORD=local-ci-bridge-password-123456
      -e NATS_EXECUTOR_USER=capital-ai-provider-executor
      -e NATS_EXECUTOR_PASSWORD=local-ci-executor-password-123456)
test "$(docker image inspect --format '{{.Config.User}}' "$image")" = 1000:1000 ||
  fail 'final image must declare UID/GID 1000'
docker volume create "$volume" >/dev/null

start() {
  docker run -d --name "$name" "${args[@]}" "${envs[@]}" -v "$1:/var/data" "$image" >/dev/null
}
ready() {
  for i in $(seq 1 30); do
    if test "$(docker inspect --format '{{.State.Running}}' "$name" 2>/dev/null || true)" = true &&
       docker logs "$name" 2>&1 | grep -q 'Server is ready'; then return 0; fi
    sleep 1
  done
  fail "NATS not ready ($name)"
}
check_runtime() {
  docker exec "$name" sh -ec '
    test "$(id -u):$(id -g)" = 1000:1000
    test "$(stat -c %u:%g /var/data/jetstream)" = 1000:1000
    test "$(stat -c %a /var/data/jetstream)" = 700
    grep -Eq "^Uid:[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000$" /proc/1/status
    grep -Eq "^Gid:[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000[[:space:]]+1000$" /proc/1/status
    grep -Eq "^CapEff:[[:space:]]+0+$" /proc/1/status
    pidof nats-server >/dev/null
  '
  test "$(docker exec "$name" grep -Fc 'user: $NATS_BRIDGE_USER' /etc/nats/nats-server.conf)" = 1
  test "$(docker exec "$name" grep -Fc 'user: $NATS_EXECUTOR_USER' /etc/nats/nats-server.conf)" = 1
  test "$(docker exec "$name" grep -Fc 'capital.private.provider.query.v1' /etc/nats/nats-server.conf)" = 2
  test "$(docker exec "$name" grep -Fc 'capital.private.provider.execute.v1' /etc/nats/nats-server.conf)" = 2
}

# Fresh named volume: copy-up uses the preowned /var/data/jetstream image directory.
start "$volume"
ready
check_runtime
docker exec "$name" sh -ec 'printf "retained\n" > /var/data/jetstream/rootless-smoke.marker'
docker restart "$name" >/dev/null
ready
check_runtime
docker exec "$name" grep -qx retained /var/data/jetstream/rootless-smoke.marker
printf 'PASS fresh named volume, restart, UID/GID 1000, CapEff=0\n'
docker rm -f "$name" >/dev/null
start "$volume"
ready
check_runtime
docker exec "$name" grep -qx retained /var/data/jetstream/rootless-smoke.marker
docker rm -f "$name" >/dev/null
printf 'PASS recreation retains previously written JetStream bytes\n'

# Host sudo is used only for disposable fixture setup, NEVER in the final image.
sudo install -d -m 0755 "$tmp/valid"
sudo install -d -o 1000 -g 1000 -m 0700 "$tmp/valid/jetstream"
start "$tmp/valid"
ready
check_runtime
docker rm -f "$name" >/dev/null
printf 'PASS preprovisioned bind mount, no root/chown or added container capabilities\n'

sudo install -d -m 0755 "$tmp/missing"
sudo install -d -m 0755 "$tmp/root-owned"
sudo install -d -o 0 -g 0 -m 0700 "$tmp/root-owned/jetstream"
sudo install -d -m 0755 "$tmp/insecure"
sudo install -d -o 1000 -g 1000 -m 0755 "$tmp/insecure/jetstream"
sudo install -d -m 0755 "$tmp/symlink"
sudo ln -s /tmp "$tmp/symlink/jetstream"

expect_denied() {
  local label=$1 expected=$2 source=$3
  shift 3
  local out rc=0
  out="$(timeout --signal=TERM --kill-after=2s 12s docker run --rm \
    --name capital-nats-negative "${args[@]}" "${envs[@]}" -v "$source:/var/data" \
    "$@" "$image" 2>&1)" || rc=$?
  docker rm -f capital-nats-negative >/dev/null 2>&1 || true
  if test "$rc" -eq 0 || test "$rc" -eq 124 || test "$rc" -eq 137; then
    fail "$label must fail promptly (rc=$rc)"
  fi
  case "$out" in *"$expected"*) printf 'PASS negative: %s\n' "$label";;
    *) fail "$label wrong error class (rc=$rc)";; esac
}
expect_denied 'missing directory' NATS_STORE_PREPROVISION_REQUIRED "$tmp/missing"
expect_denied 'foreign owner' NATS_STORE_OWNERSHIP_REQUIRED "$tmp/root-owned"
expect_denied 'unsafe permissions' NATS_STORE_OWNERSHIP_REQUIRED "$tmp/insecure"
expect_denied 'symlink' NATS_STORE_PREPROVISION_REQUIRED "$tmp/symlink"
expect_denied 'root override' NATS_ROOTLESS_ID_REQUIRED "$tmp/valid" --user 0:0
expect_denied 'missing bridge password' 'NATS_BRIDGE_PASSWORD is required' "$tmp/valid" -e NATS_BRIDGE_PASSWORD=
expect_denied 'short executor password' 'NATS_EXECUTOR_PASSWORD is too short' "$tmp/valid" -e NATS_EXECUTOR_PASSWORD=too-short
printf 'PASS isolated rootless NATS positive/negative contract\n'