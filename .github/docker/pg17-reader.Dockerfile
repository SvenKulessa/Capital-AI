# syntax=docker/dockerfile:1
FROM postgres:17.11-bookworm@sha256:73bedc9eaa0121b92b9b26bb52e5141b3f6f37479c7ef913c0160455763ca80a

USER root
ENV DEBIAN_FRONTEND=noninteractive

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    set -eux; \
    printf '%s\n' 'deb [signed-by=/usr/local/share/keyrings/postgres.gpg.asc] https://apt-archive.postgresql.org/pub/repos/apt bookworm-pgdg-archive main' > /etc/apt/sources.list.d/pgdg-archive.list; \
    apt-get update -qq; \
    apt-mark hold postgresql-17 postgresql-client-17; \
    apt-get install -y --no-install-recommends \
      ca-certificates git build-essential postgresql-server-dev-17=17.11-1.pgdg12+2 \
      libcurl4-openssl-dev python3 ripgrep; \
    test "$(/usr/lib/postgresql/17/bin/postgres --version)" = 'postgres (PostgreSQL) 17.11 (Debian 17.11-1.pgdg12+2)'; \
    test "$(dpkg-query -W -f='${Version}' postgresql-server-dev-17)" = '17.11-1.pgdg12+2'

RUN --mount=type=cache,target=/tmp/build-cache,sharing=locked \
    set -eux; \
    git clone https://github.com/supabase/pg_net.git /tmp/pg_net; \
    git -C /tmp/pg_net checkout 698fb055f666366a78c112b0578b0a5652ddbcfa; \
    make -C /tmp/pg_net PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config; \
    make -C /tmp/pg_net PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config install; \
    git clone https://github.com/citusdata/pg_cron.git /tmp/pg_cron; \
    git -C /tmp/pg_cron checkout 9490f9cc9803f75105f2f7d89839a998f011f8d8; \
    make -C /tmp/pg_cron PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config; \
    make -C /tmp/pg_cron PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config install; \
    rm -rf /tmp/pg_net /tmp/pg_cron

USER postgres
