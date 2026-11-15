# GitHub Actions Caching Strategy

## Overview

This document describes the caching approach used in CAPITAL-AI CI workflows to reduce build and test times while maintaining isolation and security.

## Docker Layer Caching

Workflows that build custom images (e.g. `backup-reader-pg17.yml`) use Docker Buildx with the GitHub Actions cache backend:

```yaml
- uses: docker/setup-buildx-action@f87e5991a6d7451dcb8d9637bfbc97413f497069 # v4.4.1
- uses: docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc # v7.4.0
  with:
    cache-from: type=gha,scope=pg17-reader-pr-${{ github.event.pull_request.number || 'manual' }}
    cache-to: type=gha,mode=max,scope=pg17-reader-pr-${{ github.event.pull_request.number || 'manual' }}
    load: true
```

- `mode=max` caches all layers, including intermediate ones.
- The PG17 fixture uses an explicit per-PR Buildx scope. GitHub Actions also enforces cache access by git ref (including pull-request merge refs); a scope string alone is not a security boundary.
- Do not export the privileged shared Docker Security Gate cache from pull requests. Only the trusted main push may export its existing `capital-ai-verified-build` scope.
- A successful cached build is not evidence of a reproducible cold build; upstream Debian dependencies not pinned to immutable snapshots may change.

## npm Caching

Node.js workflows should use the built-in cache of `actions/setup-node`:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

This keys the package-manager download cache on the dependency lockfile (and runner configuration). For npm, `setup-node` caches npm's package download cache, **not** `node_modules`; `npm ci` still installs dependencies.

## Guidelines

- Prefer `actions/setup-node` cache over manual `actions/cache` for npm.
- Never cache secrets, credentials, or production data.
- Pin workflow actions to verified immutable commit SHAs; update only with validated replacements.
- Trigger the PG17 contract on changes to its Dockerfile or the workflow itself.
- Treat APT TLS and repository index errors as build failures; bootstrap CA certificates before adding HTTPS-only package sources.
- Use `restore-keys` only when a partial cache hit is acceptable.
- Monitor cache hit rates in workflow logs and adjust keys if hit rates are low.
- Docker caches are most effective for fixture images that change infrequently.

## Related Workflows

- `.github/workflows/backup-reader-pg17.yml` — Docker layer caching for PG17 fixture
- Node-based test workflows — npm cache via `setup-node`
