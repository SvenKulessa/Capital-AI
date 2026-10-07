# Control Center: Repository Tool & Application Catalog

**Scope:** PRODUCT UI with read-only GitHub provenance across PRODUCT, MARKET, PLATFORM, TRUST and GROWTH.

## Navigation

Owner login → Control Center → **Tools & Anwendungen** (deep link: /control-center?tab=tools).

The existing **Komponenten & CADS** panel remains a separate curated assessment. No CADS score or runtime admission is inferred by the new catalog.

## Read-only data contract

- GET /api/internal/repository-tools: owner-only, same authorizeIamRole owner control as the existing Control Center observability API.
- CAPITAL_AI_REPOSITORY_TOOL_CATALOG@1: repository, branch, sourceSha, deployedSha, observedAt, freshness, total, entries.
- Backend reads only fixed URLs for SvenKulessa/Capital-AI via the public GitHub API and exact-SHA raw manifests, not arbitrary client-supplied URLs.
- The current main commit SHA is fetched once, then all catalog data is read against **that same immutable SHA**. No repository data is written.
- In-process refresh TTL: five minutes. Concurrent requests coalesce. When GitHub fails after a successful read, previous data is marked **STALE**, not silently presented as live. Without cache: HTTP 503.
- Server-side requests have timeouts, byte ceilings, a bounded row count, and fail on a truncated Git tree. No token or provider credential is sent to the browser.
- No additional secret or database migration is needed for the public repository; a private-repository migration would require a separately reviewed read-only GitHub credential integration.

## Catalog sources and version semantics

| Item type | Version evidence | Meaning |
|---|---|---|
| Capital AI application | package.json | Web application release version |
| Direct npm package | package-lock.json package resolution; declaration fallback | Exact locked version vs. explicit unresolved range |
| Isolierte npm Runtime- und Build-Patch-Dependencies | deploy/runtime und deploy/npm-security-patches package.json/-lock.json | Individuell gelockte Deployment-Boundary und npm Security-Patches |
| Rust bridge + direct crates | services/provider-bridge-rs/Cargo.toml | Declared crate versions; not a compiled-binary attestation |
| Rust/Android Build-Toolchain | rust-toolchain.toml und mobile/android-private/build.gradle | Pinned Build-Version, kein Runtime-Proof |
| Android Private App | mobile/android-private/app/build.gradle | Private App-Version, getrennt von der Web-Distribution |
| Python / FFmpeg Social Renderer | renderer-requirements.txt und ffmpeg-build-profile.json | Hash-pinned Pillow und FFmpeg-Source-Policy; FFmpeg weiterhin nicht produktiv freigegeben |
| npm CLI | Dockerfile | Build-Pin; explizit nicht Bestandteil der Web-Runtime |
| OCI base images | Dockerfile, deploy/Dockerfile* | Image tag plus pinned digest, not live Render image |
| Internal UI/API/service modules | Actual GitHub file tree + web app version | Inherited app version, not an independent module version |
| Scripts and GitHub workflows | Actual GitHub file tree + web app version | Source-controlled tool/automation, inherited release only |
| External providers/managed tools | config/tool-catalog-integrations.json with existing source path | Presence of a repository binding or documented integration; live version **unknown** |

Transitive dependencies are **not** marketed as individually deployed applications: their exhaustive dependency closure belongs in package locks, Cargo.lock and SBOM. Versions of managed services cannot be verified from repository manifests alone. A live Render/Supabase/NATS/Valkey version requires provider/runtime readback with timestamp and immutable identity evidence. A current GitHub main SHA must not be mistaken for the currently deployed web SHA.

## Source files

- server/repository-tool-catalog.mjs: server-side bounded GitHub reader, version/provenance projection and cache.
- server/repository-tool-catalog.test.mjs: parsing, lock resolution, stale/fail-closed behavior and immutable SHA tests.
- src/components/RepositoryToolCatalogDashboard.tsx: owner dashboard with search, domain/type filter, pagination, SHA and repo links.
- src/components/ControlCenterPage.tsx: new tab only; existing CADS catalog unchanged.
- server/index.mjs: owner-only API route.
- config/tool-catalog-integrations.json: curated cross-domain external tool names, use cases and source paths.

## Acceptance

1. Docker offline Node tests pass and the React TypeScript/Vite build succeeds.
2. Unauthenticated or non-owner requests to /api/internal/repository-tools return 404 and cannot fetch repo contents.
3. Owner request returns a coherent same-SHA snapshot; dependencies resolve against lockfile, with unknown versions explicitly marked.
4. GitHub outage produces 503 or a clearly labeled STALE cached snapshot.
5. The UI displays name, version/version basis, repository path, application area and domain; filtering and pagination work on mobile and desktop.
6. Docker runtime includes the new server module; no NATS or Valkey redeployment is triggered.

**Important:** Before the PR is merged and deployed, the feature exists only on its feature branch; neither the GitHub API's availability nor the productive website integration should be treated as verified runtime behavior.
