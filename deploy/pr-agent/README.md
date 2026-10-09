# Isolated PR-Agent benchmark candidate

Prepared against CAPITAL-AI main `19673cf50bf6948ef563126f23bd1d64d9ae6398`.
PR #233 was merged; Docker Security Gate, Domain Governance and CodeQL passed on
its final head `3a94a1e5bebe13c0e6e6e9005ad6191aa8312d02`.

This directory is an independent reviewer build context, not part of the CAPITAL-AI
application image or its dependencies. No GitHub App, production service, model
call, automatic approval or additional required check is installed.

## Dependency remediation

Upstream source: `The-PR-Agent/pr-agent@8e5a9295973b24af4b70cafd0b660a230811ef9e`
(`v0.47.0`). The upstream `pyproject.toml` remains unchanged; its package version
still reads `0.46.0`. Runtime identity must use source SHA and image digests.

The vendored lock was regenerated with upstream's required `uv==0.12.10`:

```sh
uv lock --upgrade-package fsspec --upgrade-package multidict --upgrade-package oauthlib --upgrade-package langgraph-sdk
uv lock --check
```

| Package | Previous vulnerable lock version | Patched lock version |
| --- | --- | --- |
| fsspec | 2025.12.0 | 2026.9.0 |
| multidict | 6.7.1 | 6.9.1 |
| oauthlib | 3.3.1 | 4.0.0 |
| langgraph-sdk | 0.4.2 | 0.4.6 |

The full regenerated lock, including resolver changes, is retained with upstream's
wheel/sdist hashes. `provenance.json` binds the lock, unchanged project manifest
and upstream MIT license by SHA-256. A fresh `pip-audit==2.10.1` scan queried all
184 registry package/version entries, including optional/dev packages and the
Python-specific google-cloud-storage alternative: zero known findings, zero skips.
This is a dated dependency-inventory result, not proof of runtime compatibility,
complete license compatibility or a vulnerability-free image.

## Runtime candidate

### Selected candidate architecture

As of 2026-10-09, Alpine 3.24 is the **primary reviewer runtime candidate**.
The authoritative candidate workflow is `.github/workflows/pr-agent-runtime-evidence.yml`
and it builds `deploy/pr-agent/Dockerfile.alpine`. The workflow keeps the existing
check name `Reviewer candidate build and scan`, verifies the exact upstream SHA and
vendored lock identity, executes imports and the plain-diff smoke offline, and fails
closed on Trivy HIGH/CRITICAL findings or secrets.

Debian 13 remains available only as a **comparison candidate** through
`.github/workflows/pr-agent-debian-runtime-comparison.yml` and
`deploy/pr-agent/Dockerfile`. Its Trivy gate result is recorded as evidence but is
not authoritative for the selected Alpine candidate. This separation does not grant
merge, publish, deployment, OAuth or model-call authority.

Current same-source/same-lock A/B evidence on 2026-10-09:

| Candidate | Runtime | Imports / offline smoke | Trivy | Role |
| --- | --- | --- | --- | --- |
| Alpine | Python 3.14.7 / Alpine 3.24.2 | PASS | 0 vulnerabilities, 0 secrets, 0 blocking | PRIMARY |
| Debian | Python 3.14.7 / Debian 13.7 | PASS | 44 HIGH, 0 secrets | COMPARISON |

The Alpine primary pass was observed on run `37958151189`, artifact
`11631040466`, artifact digest
`sha256:d15d476f6c3f9353f4be53f85f56bb0d1406006f443bc7ca624a1d0cc0951cbc`.
The resolved Python base was
`python@sha256:9e9fde4d32eedce0b661d9ab91e826b62dddf28e928c230ec55f1866cac66b01`.

The primary workflow runs only for candidate-input changes or by manual dispatch. It checks out the exact upstream source SHA, verifies vendored hashes and builds with an isolated context. The Python base is resolved to an immutable digest at run time; uv and BuildKit are digest-pinned. It does not use the upstream mutable `pragent/pr-agent:github_action` image. Alpine applies currently available package upgrades with `apk upgrade --no-cache`; the final runtime removes pip and ensurepip, while uv remains build-stage only.

Dependencies are installed with `uv sync --locked --no-dev --no-install-project`.
The runtime contains only those dependencies, the pinned reviewer source and local
benchmark scripts. It runs as numeric user `10001:10001` from `/bench`, outside any
repository. An offline build-time smoke checks plain-diff parsing and imports;
the full CLI is imported offline as well. This checks imports with the assembled
runtime, without claiming to exercise OAuth authentication or model calls.

The build exports a single-platform OCI archive. Evidence records its platform
manifest digest, config digest and archive checksum separately, and verifies the
non-root user and working directory. Trivy inventories all vulnerability severities
and secrets; HIGH/CRITICAL findings or any secret count fail this optional workflow.
Raw scanner messages/matches are not uploaded. A CycloneDX SBOM and public finding
summary are retained for seven days. No registry publish or deployment occurs.

The initial completed scan on head `0c63da5c...` (tested merge `f31da522...`,
run `37713592967`) produced 211 findings, 55 HIGH and zero secrets; build and
plain-diff smoke passed. Forty-four HIGH findings had no fix version in the scanner.
The dependency-only PyPI audit missed pip's vendored msgpack, setuptools and urllib3.
The public finding inventory and identity are retained in
`docs/benchmarks/code-review-pilot/runtime-scan-20261008.json`.
The subsequent removal of the unused installer and available OS upgrades must pass
a new scan; previous evidence does not clear the revised runtime. No ignore rules
or severity exceptions are added. The local execution environment has neither
Docker/Podman nor model credentials or a local model endpoint.

## Future model benchmark

The entrypoint requires explicit `--model`, `--diff`, and a new `--output` path.
It uses the plain-diff CLI, rejects GitHub tokens/external settings, disables repo
settings, telemetry, callbacks and remote output sinks, and forbids fallback models
and auto-approval. Tool errors propagate. Only the frozen diff is eligible for
model input; no repository code is executed. External models still receive that
diff. Model selection/credentials and labeled reference findings remain open.

Example after a candidate is scanned and materialized locally:

```sh
docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=256m \
  -v /absolute/frozen-corpus:/inputs:ro -v /absolute/results:/outputs \
  <verified-image-at-digest> \
  --model <explicit-model> --diff /inputs/pr228-typescript.diff \
  --output /outputs/pr228-typescript-1.json
```

Use a dedicated reviewer model key where needed; never production/Vault credentials.
Run the three frozen samples from `docs/benchmarks/code-review-pilot/benchmark-plan.json`
three times each. Record exact runtime/model/diff identity, wall time, tokens and
provider billing evidence. Report TP/FP/FN only after human labeling. Quality,
tokens and costs currently remain unmeasured.

## reviewdog pilot dispatch

The pilot is now available on Main. A verified completed source run is
`37711908410` (tested SHA `19673cf50...`, artifact `11521224882`). The GitHub connector
available in this session exposes reads/reruns but no manual workflow-dispatch
operation. The GitHub pilot run itself remains NOT_RUN.

In GitHub Actions, select **Optional reviewdog Pilot**, branch **main**, and enter
`37711908410` as `source_run_id`. This is an advisory run with read-only permissions.
