# Optional code-review pilot

Correlated main: `ac78733bbea7fdbf66b798a9fc379ef71b171e70` (2026-10-07).
This work adds advisory presentation of existing evidence. Required checks remain
Docker Security Gate and Domain Governance. No app installation, PR comments,
automatic approvals, merge, production deployment or additional scanner is added.

## reviewdog: prepared and locally exercised

The manual `Optional reviewdog Pilot` workflow consumes a completed
`.github/workflows/build-security.yml` run from this repository. Enter its numeric
run ID in `source_run_id`. The workflow validates the selected run and single
unexpired `docker-security-<tested SHA>` artifact, verifies the archive digest via
the pinned download action, and binds `source.public.json` to the run and tested SHA.
The converter runs from the dispatch checkout; no source-run code is executed.

Only `contents: read` and `actions: read` are granted. reviewdog uses its local
reporter without a GitHub token. Outputs are a job summary and an advisory artifact.
No privileged `pull_request_target` or automatic `workflow_run` trigger is used.
The workflow becomes dispatchable after it exists on the default branch; it has
not been executed in GitHub Actions yet.

The existing public reports intentionally omit paths, lines, scanner messages and
secret matches. Consequently the pilot cannot provide inline review comments or
diff filtering. It preserves vulnerability identifiers/package versions,
configuration identifiers and secret counts, and never invents line numbers.
Missing/invalid scanner output remains NOT_PROVEN. Advisory diagnostic severity
does not replace the original scanner status or Docker Security Gate.

reviewdog `v0.21.2` Linux x86_64 archive SHA-256:
`30413aa3c7443e9c3c157fe5766cad40e3bb39a32e210ee69b710a8d5c4b8e51`.
Source: https://github.com/reviewdog/reviewdog/releases/tag/v0.21.2.
MIT notice is retained in `reviewdog-LICENSE.txt`.

`reviewdog-runtime-evidence.json` records an actual local run over the downloaded,
hash-verified public artifact from workflow run `37685755516`, artifact
`11510911589`, tested SHA `f9443a06...`. It contains two diagnostic entries.
The timings are one local sample, not CI timings or reviewer-quality measurements.

## PR-Agent: assessed, installation deferred

The checked release is `v0.47.0`, source commit
`8e5a9295973b24af4b70cafd0b660a230811ef9e`.
Upstream source is MIT: https://github.com/The-PR-Agent/pr-agent/blob/v0.47.0/LICENSE.
`pr-agent-assessment.json` binds the lock, manifest, license and Action files by hash.

Concrete findings:

- `action.yaml` builds `Dockerfile.github_action_dockerhub`, whose FROM is the
  mutable `pragent/pr-agent:github_action`. Pinning the Action commit alone does
  not pin the actual reviewer runtime. The source Dockerfile also has mutable
  Python/uv image tags and an apt install; its OCI runtime/SBOM has not been scanned.
- Release tag is `v0.47.0`, but `pyproject.toml` advertises `0.46.0`. Do not use
  reported package version as a substitute for exact source/image identity.
- `pip-audit==2.10.1` queried PyPI advisories for all 185 registry name/version
  entries in `uv.lock`, including optional/dev entries. Duplicate-name alternatives
  were audited separately. The project was not installed or executed.

| Package in lock | Advisory | Fix reported by audit | Dependency scope |
| --- | --- | --- | --- |
| fsspec 2025.12.0 | CVE-2026-104851 / GHSA-27vj-qcqg-25rc | 2026.6.0 | Base: LiteLLM → tokenizers → huggingface-hub |
| multidict 6.7.1 | CVE-2026-104874 / GHSA-54p9-h82j-f925 | 6.9.1 | Base: aiohttp |
| oauthlib 3.3.1 | PYSEC-2026-4114 / GHSA-xpv3-w29h-x7cv | 4.0.0 | Base: atlassian-python-api |
| langgraph-sdk 0.4.2 | CVE-2026-104873 / GHSA-fvww-7h3r-vfhp | 0.4.4 | Outside base dependency closure |

Dependency paths are a conservative graph over locked package dependencies,
not proof that the vulnerable function is called. Python/platform markers were
not resolved into an installed environment. The fsspec alternate lock version
and alternate google-cloud-storage version had no reported advisories in this scan.
Base-image vulnerabilities, exploitability and complete transitive license
compatibility remain unverified. No packages were added to CAPITAL-AI dependencies.

## Frozen benchmark corpus

`benchmark-plan.json` selects three source snapshots: PR #223 Rust worker packaging,
PR #228 TypeScript contracts, and PR #224 Auth/Vault/RLS. These are deliberately
scoped file subsets, not full-PR coverage. `corpus-evidence.json` records the exact
base/head SHAs, generated diff hashes, sizes and file counts. Quality, cost and
token fields are null, not zero: no model review occurred.

Recreate the diffs after fetching the exact commit SHAs listed in the plan:

```sh
node scripts/prepare-code-review-corpus.mjs /tmp/capital-code-review-corpus
```

Before a real benchmark, use a patched, scanned reviewer runtime with an immutable
source/image identity. Select the model/provider and establish labeled reference
findings. Run three repetitions per case with no fallback model. Record coverage,
TP/FP/FN, wall time, token usage and available provider billing evidence separately.
No precision/recall claim is valid before the reference findings are labeled.

PR-Agent's plain-diff CLI supports local JSON output. The future benchmark should
run in an isolated directory without `.git` or repo configuration, without any
GitHub token, using only the frozen diff and explicit trusted settings. This avoids
working-tree enrichment with files from a different source head. Do not run the
upstream Action or install the assessed vulnerable lock for this benchmark.

Required settings for that later runtime: restricted mode; telemetry/callbacks and
external output sinks disabled; no repository settings; explicit model with empty
fallback list; propagate tool errors. Plain-diff mode publishes to local output,
so `publish_output=false` is not a substitute for selecting the local provider.
External model calls send the selected diff to that provider; local models still
require a provisioned runtime. Neither is available in the current execution
environment. No production/Vault secrets are to be reused as reviewer credentials.

## Validation

```sh
node --test scripts/reviewdog-public-report.test.mjs
node --check scripts/reviewdog-source-run.mjs
node --check scripts/prepare-code-review-corpus.mjs
```

Adapter regression tests are included in the existing Docker Security Gate.
