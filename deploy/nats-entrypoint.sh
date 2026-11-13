#!/bin/sh
set -eu
test -n "${NATS_APP_USER:-}" || { echo 'NATS_APP_USER is required' >&2; exit 1; }
test -n "${NATS_APP_PASSWORD:-}" || { echo 'NATS_APP_PASSWORD is required' >&2; exit 1; }
test -n "${NATS_BRIDGE_USER:-}" || { echo 'NATS_BRIDGE_USER is required' >&2; exit 1; }
test -n "${NATS_BRIDGE_PASSWORD:-}" || { echo 'NATS_BRIDGE_PASSWORD is required' >&2; exit 1; }
test "${#NATS_BRIDGE_PASSWORD}" -ge 24 || { echo 'NATS_BRIDGE_PASSWORD is too short' >&2; exit 1; }
test -n "${NATS_EXECUTOR_USER:-}" || { echo 'NATS_EXECUTOR_USER is required' >&2; exit 1; }
test -n "${NATS_EXECUTOR_PASSWORD:-}" || { echo 'NATS_EXECUTOR_PASSWORD is required' >&2; exit 1; }
test "${#NATS_EXECUTOR_PASSWORD}" -ge 24 || { echo 'NATS_EXECUTOR_PASSWORD is too short' >&2; exit 1; }
# A mounted Render disk can hide image-owned directories. Never elevate or
# silently re-own existing customer data at process startup.
if [ "$(id -u)" != 1000 ] || [ "$(id -g)" != 1000 ]; then
  echo 'NATS_ROOTLESS_ID_REQUIRED: expected UID/GID 1000' >&2
  exit 1
fi
if [ -L /var/data ] || [ -L /var/data/jetstream ] || [ ! -d /var/data/jetstream ]; then
  echo 'NATS_STORE_PREPROVISION_REQUIRED: expected a real /var/data/jetstream directory' >&2
  exit 1
fi
if [ "$(stat -c '%u:%g' /var/data/jetstream)" != 1000:1000 ] ||
   [ "$(stat -c '%a' /var/data/jetstream)" != 700 ] ||
   [ ! -w /var/data/jetstream ]; then
  echo 'NATS_STORE_OWNERSHIP_REQUIRED: UID/GID 1000 and mode 0700 required' >&2
  exit 1
fi
umask 077
# Credentials are expanded by nats-server from the environment and never added to argv.
exec /usr/local/bin/nats-server --config /etc/nats/nats-server.conf
