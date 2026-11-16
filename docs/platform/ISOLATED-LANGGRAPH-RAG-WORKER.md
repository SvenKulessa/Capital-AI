# Isolated LangGraph / RAG worker — candidate only

Scope: PLATFORM, TRUST. Root `AGENTS.md` governs all authorization. This document
is non-authorizing architecture evidence. No Render resource, paid provider,
production credential, scheduler, NATS or provider bridge is activated.

## Existing code and separation

- Reuse `scripts/growth-agent/auto_loop.py` and its existing
  `execute_durable` SQLite checkpointer for trusted, separately authorized PR
  execution. No new merge adapter or authority model.
- `isolated_rag_worker.py` is a **separate, offline** LangGraph graph with
  planner, allowlisted lexical retriever and evidence reviewer agents.
  It never executes retrieved instructions, calls an LLM, embeds external data,
  publishes content or obtains provider credentials. Source identifiers and
  content hashes are preserved; `EVIDENCE_ONLY` is not a factual answer or approval.
- `test_isolated_rag_worker.py` checks evidence binding, empty retrieval,
  malicious retrieved instructions, malformed documents, symlinks, permissive
  directories, missing root and mount enforcement.
- Existing `test_process_restart.py` separately tests actual Python process
  restart and exactly-once synthetic action reconciliation for the durable
  execution graph.

## Proposed deployment contract (NOT DEPLOYED)

- **Dedicated single-instance** Render Background Worker, not the suspended
  Rust provider bridge and not the web service. Do not share the web disk.
- Private persistent disk mounted **exactly** at
  `/var/lib/capital-ai-agent`; do not use an ephemeral root filesystem.
  Directories `checkpoints` and `approvals` must be mode `0700` and owned
  by the runtime's unprivileged UID; SQLite files and approvals mode `0600`.
  Root directory itself must also be `0700`, same UID.
- Startup must fail closed if `validate_private_root(require_mount=True)`
  fails. Local `ismount` is necessary but not sufficient to establish
  provider-level persistence; correlate the disk ID and mount path with
  provider metadata and prove survival across a real restart.
- **Restart policy:** require a documented service-supervisor restart contract
  and provider event evidence; no claim that Docker `HEALTHCHECK` alone
  restarts a Render Background Worker. Require separate-process synthetic
  resume, no duplicate mutations and safe shutdown tests before activation.
- No task polling, open HTTP ingress, network retrieval, or remote actions in
  this candidate. A supervised durable task queue and authenticated enqueue
  contract are still required before unattended operation.
- RAG documents must be explicitly allowlisted and rights-cleared, tenant
  scoped and version/hash bound. Production retrieval, vector embeddings,
  model inference and external tools are **not implemented**.
- GitHub observation uses a read-only GitHub App installation token where
  possible. A separate short-lived write identity may only be provisioned
  after authority review and exact-head CI gates. Never copy a broad token
  into the read-only worker. No secrets in repository or checkpoint payloads.

## Acceptance and rollback

`python3 -m unittest discover -s scripts/growth-agent -p 'test_*.py'`
is covered by the existing Google Maintenance and Local Growth Graph CI.
No new required check is introduced. This repository change alone does not
prove host UID, mount persistence, provider restart behavior, runtime
provenance, credentials or actual multi-agent production execution.

**GO:** only after direct host readback, provider disk correlation, restart
and fail-closed negative tests, least-privilege review, costs/rights approval
and existing GitHub gates. **Current decision: NOT_PROVEN / NO DEPLOY.**
Rollback: revert this isolated candidate; do not touch existing checkpoints
or provider data.
