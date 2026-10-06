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
mkdir -p /var/data/jetstream
chown 1000:1000 /var/data/jetstream
chmod 0700 /var/data/jetstream
# Credentials are expanded by nats-server from the environment and never added to argv.
exec su-exec 1000:1000 /usr/local/bin/nats-server --config /etc/nats/nats-server.conf
