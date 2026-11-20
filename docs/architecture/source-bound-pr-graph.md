# Source-bound PR dependency graph (non-authorizing candidate)

The strategy-2026 live inventory remains the read-only source of observed PRs and paths. This additional graph never grants merge or production permissions.

## Command
`node scripts/architecture/strategy-2026-source-graph.mjs` (read-only GitHub GETs only, protected GH_TOKEN/GITHUB_TOKEN when needed). This opt-in graph runs after the existing live inventory. Source analysis is capped at 24 changed source files across the snapshot, 100 KB per file and 500 transitive review paths.

## Evidence
- Immutable GitHub Contents API `?ref=PR_HEAD_SHA`, verified Git blob SHA-1, recorded SHA-256 content fingerprint.
- Parses *only* literal relative JavaScript/TypeScript imports, explicit SQL table names in CREATE/ALTER/REFERENCES, and direct package.json dependency names. It does **not** prove full semantic analysis, implicit dependencies, alias resolution, git ancestry, package-lock state or merge order.
- Direct edges are `REVIEW_REQUIRED`; transitive paths are undirected review candidates, not conflicts. Evidence is source-limited: a cap returns `PARTIAL_LIMIT` and no completeness assertion.
- Reads source bytes into memory without printing source contents. Credentials come from a protected process environment and are absent from reports.

## Boundaries
GitHub Rulesets, checks, CodeQL, Root AGENTS.md, Owner permissions, licensing and post-merge deployment Evidence remain authoritative. Existing Docker Security Gate executes synthetic positive/negative tests, without new required checks. No Supabase changes, OAuth changes, external paid sources, secrets, deployment or publishing.

Rollback: revert the isolated PR commit; existing correlation and inventory output contracts remain unchanged.
