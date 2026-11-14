# GitHub Actions Caching Strategy

## Overview

This document describes the caching approach used in CAPITAL-AI CI workflows to reduce build and test times while maintaining isolation and security.

## Docker Layer Caching

Workflows that build custom images (e.g. `backup-reader-pg17.yml`) use Docker Buildx with the GitHub Actions cache backend:

```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
    load: true
```

- `mode=max` caches all layers, including intermediate ones.
- Cache is scoped to the repository and automatically managed by GitHub.

## npm Caching

Node.js workflows should use the built-in cache of `actions/setup-node`:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

This keys the cache on the lockfile and restores `~/.npm` plus `node_modules` when possible.

## Guidelines

- Prefer `actions/setup-node` cache over manual `actions/cache` for npm.
- Never cache secrets, credentials, or production data.
- Use `restore-keys` only when a partial cache hit is acceptable.
- Monitor cache hit rates in workflow logs and adjust keys if hit rates are low.
- Docker caches are most effective for fixture images that change infrequently.

## Related Workflows

- `.github/workflows/backup-reader-pg17.yml` — Docker layer caching for PG17 fixture
- Node-based test workflows — npm cache via `setup-node`
