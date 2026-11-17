# CAPITAL-AI Agent Operations Suite – Commercial Pilot (unpublished)

Status: **IMPLEMENTED_SOURCE_ONLY / SYNTHETIC_DEMO / PRODUCTION_NOT_PROVEN**
Baseline: main c1eded10a59864472a739e767084c273551444d5
Contract: root AGENTS.md, SOLO_MAINTAINER_FLOW@2

## Customer workflows

| Workflow | Skills | Source-bounded result | Trust limit |
|---|---|---|---|
| ci-evidence | platform-engineering + trust-engineering | Compares self-supplied CI states and commit SHA | No live GitHub readback |
| credential-expiry | trust-engineering + incident-response | Checks self-supplied credential *metadata* expiry | No secrets or provider API |
| media-rights | growth-engineering + legal-compliance | Flags rights, source and attribution gaps | No legally effective clearance |

The 26 canonical skills remain in .agents/skills/registry.json. A separately tested, *real* Python LangGraph integration reuses scripts/growth-agent/auto_loop.py as a read-only StateGraph. The Node HTTP preview is a distinct deterministic execution slice; it does not invoke the Python worker. There is no assertion of a running customer agent worker.

## API, security and costs

- Public: GET /api/agent-operations-pilot/readiness; safe capability information only.
- Authenticated POST: POST /api/agent-operations-pilot/runs. Requires verified Supabase session, existing Stripe-backed paid entitlement via auth.resolvePaidTier, exact same-origin, bounded schema and validated input.
- Authenticated read: GET /api/agent-operations-pilot/runs/:id. Receipt belongs solely to the server-verified creator. Supplied tenantId or userId fields are forbidden.
- Deployment opt-in: AGENT_OPERATIONS_PILOT_ENABLED=true. Default disabled. Do not enable on production without separate runtime/economic evidence.
- Daily limits per verified account: Starter 2, Pro 10, Enterprise 30; all per-process, not durable or horizontally safe.
- Idempotency keys, SHA-256 input/result/receipt digests, 24h process-local receipt retention. No external token/model/API calls, no new licenses, no new cloud services, no billing changes.
- Security caveat: process-local quotas and volatile receipts are NOT suitable for paying multi-instance production customers; persistent, tenant-scoped usage ledger is a P0 next step.

## BYOK: safe reference only

No raw key, provider token, OAuth secret or credential storage. The optional byok vault_reference contract requires a separately trusted per-user metadata resolver and explicit AGENT_OPERATIONS_PILOT_BYOK_METADATA_ENABLED=true. It is disabled by default; external calls are always zero in this slice. Secret strings and unknown fields are rejected. Live BYOK retrieval, encryption, provider agreements and costs remain NOT_PROVEN.

## Unpublished funnel

docs/product/agent-operations-pilot-preview.html is a private HTML concept, not routed in the public application. Three local, offline demo cards and data-funnel-event intent labels are present; no network requests or email collection occur. Owner-approved rollout later should reuse the existing contact endpoint (server/learning-inquiry.mjs) and consented GA4 event pipeline, with no unconsented tracking. Responsive/keyboard/mobile QA remains needed.

## Rights and commercial guardrails

- Existing first-party source and brand rights are reused. Main logo provenance: docs/licenses/Capital-AI-BRANDING.md; related Hero asset: public/branding/universe/hero-universe-orbit.svg.
- Existing pinned langgraph==1.2.14 is used; its upstream source is MIT, subject to locked dependency/SBOM/license-acknowledgement review. No extra stock photos, voices, fonts, audio, model or API licenses added.
- Google Gemini Notebook Enterprise documents licensed preview API audio-overview creation; no open consumer API for complete video podcasts or Shorts established. New API, provider, license and IAM activation require a separate authorization.
- AI-generated license manifests are drafts, not legal clearance. Original source, brand, voice, audio and distribution rights require distinct evidence.
- Existing Stripe Starter/Pro/Enterprise prices remain canonical; no new price/SKU activated.

## Reproduction

1. Node positive/negative paths: node --test server/agent-operations-pilot.test.mjs
2. LangGraph read-only tests: python3 -m unittest discover -s scripts/growth-agent -p 'test_agent_operations_pilot.py'
3. Docker Security Gate includes Node suite; Google Maintenance and Local Growth Graph includes Python discovery. No new required checks.
4. Existing CI, Docker Security Gate, Domain Governance, code SHA/readback, owner/legal/licensing rights must all be verified before customer launch.
5. Rollback: revert pilot module/test, Python adapter/test, private preview/readiness docs, and server/index.mjs/Dockerfile integrations. No production SQL mutation required.

## Official references

- https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-audio-overview
- https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks
- https://docs.cloud.google.com/gemini/enterprise/docs/release-notes
- https://cloud.google.com/terms/service-terms
- https://github.com/langchain-ai/langgraph/blob/main/LICENSE
