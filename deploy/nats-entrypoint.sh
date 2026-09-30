#!/bin/sh
set -eu
test -n "${NATS_TOKEN:-}" || { echo 'NATS_TOKEN is required' >&2; exit 1; }
mkdir -p /var/data/jetstream
chown 1000:1000 /var/data/jetstream
chmod 0700 /var/data/jetstream
# Preserve the runtime token without interpolating it into command arguments.
exec su-exec 1000:1000 /usr/local/bin/nats-server --config /etc/nats/nats-server.conf
