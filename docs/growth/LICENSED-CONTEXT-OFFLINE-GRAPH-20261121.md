# Offline LangGraph for licensed Growth Context Round
Stand 2026-11-21. Root AGENTS.md / SOLO_MAINTAINER_FLOW@2 is the only repo policy.

JS buildLicensedContextRound remains sole source-rights/consent admission.
projectLicensedContextForGraph emits only SHA-bound source, image, logo and
candidate metadata; no URLs, source text, feedback, approval or credentials.
An authenticated server caller must recompute the JS round and independently
pass a trusted refresh_current callback for every run/replay. A caller-provided
boolean is not authorization.

Python licensed_context_offline_graph.py uses existing checkpoint_store.py,
locked LangGraph StateGraph and private SQLite persistence: admission,
source-bound digest context, TRUST and independent QUALITY. The deterministic
tenant+task+projection thread and graphRunId identify an actual offline
execution only after a fresh SQLite checkpoint readback. Changing rights,
source, brand or consent creates a new thread; stale templates never promote.
No model, provider, crawler, network, paid resource, social publishing or
production database is invoked. RAG execution remains NOT_PROVEN.

Tests (existing CI):
  node --import tsx --test scripts/growth/brand-kit-graph-drafts.test.mjs
  python3 -m unittest discover -s scripts/growth-agent -p test_licensed_context_offline_graph.py -v
Existing optional candidate CI runs actual pinned LangGraph offline, no network.
Docker Security Gate, Domain Governance, CodeQL remain existing required checks.

TRUST negatives: cross-tenant and unauthorized callback, missing license hash,
prompt-injection plaintext, tampered projection/source hash, unsafe checkpoints.
QUALITY: deterministic restart with no replay writes, consent revoke creates
a different checkpoint, immutable candidate-only templates, no publication.

Rollback: revert feature PR; no migration, secret, token, Render, provider or
publishing changes. Local checkpoint files remain operator-managed private evidence.
