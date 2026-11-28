---
name: visual-chat
description: "Use for clear, evidence-based visual communication in chat across PRODUCT, MARKET, PLATFORM, TRUST and GROWTH: concise tables, flow diagrams, comparisons and status views. Only use UI primitives actually supported by the active chat runtime."
---

# CAPITAL AI Shared Visual Chat Skill

**Scope:** presentation of technical analyses and decisions in each of the five domain chats. Non-authorizing presentation skill, not a new runtime capability or an installation of a ChatGPT product feature.

## Select a visualization only when it helps the answer

1. Start with the direct answer and its provenance. Prefer readable prose for simple requests.
2. Use **small comparison tables** for structured options, costs, rights and VERIFIED/BLOCKED/NOT_PROVEN.
3. Use **Mermaid** or the current chat's supported native diagram system for data flows, infrastructure boundaries, approval paths or before/after architecture. In repository Markdown use fenced `mermaid`, with an accessible textual explanation.
4. Use available **charts** for measured comparable numeric values; state units, data provenance and observation date. Never make a chart from mock data and label it live; don't manufacture data just to fill a plot. Avoid pie charts for statuses, scores or incomparable values.
5. Use **optional native rich UI components** only if the current ChatGPT/agent runtime actually provides them. Normal Markdown is the guaranteed fallback. A repository skill does not install native ChatGPT widgets, plugins, or interactivity.
6. Use lightweight domain-specific **status indicators** when useful, not decorative badges; label missing measurements NOT_PROVEN and blocked capabilities BLOCKED. Never equate source implementation with production readiness.
7. Respect narrow screens, screen readers, high contrast, concise alt-text and color-independent meaning. Keep a text summary alongside every diagram or chart and avoid dense multi-column layouts on mobile.
8. Preserve citations, source links and dates alongside visualized external claims; don't expose tokens, keys, raw user data, proprietary prompts, private financial records or hidden reasoning in illustrations.
9. Retain `AGENTS.md` status format: two separate `text` code snippets for completed / next steps, and `👋⚙️` on manual Owner actions.
10. Ask only when a decisive input is missing or a critical irreversible design choice requires authorization; present a safe default otherwise.

## Embedded CAPITAL-AI design previews and verified UI QA

- For new or modified UI designs, **show a directly rendered preview in the chat** whenever the current runtime supports it: inline SVG, embedded PNG, or rendered HTML/CSS/React preview. Include source files/code for implementation, but avoid substituting only code snippets or download links when inline rendering is available.
- Use genuinely interactive previews for navigation or UI states only when supported by the chat environment. Otherwise explicitly label screenshots, static mockups or diagrams as non-interactive; never claim an HTML snippet was executed if it was not.
- Keep previews responsive and accessible where possible: meaningful text alternatives, sufficient contrast, clear labeling, and layouts that remain legible on mobile. Never disclose credentials, private records or restricted provider data in previews.
- **Separately prove implementation QA:** when frontend code is changed, record the exact commit/PR, browser or testing tool, tested mobile/tablet/desktop viewport(s), keyboard/accessible navigation scope, and actual pass/fail observations. If live browser, responsive or screen-reader QA was not run, mark it `NOT_PROVEN`. A generated or chat-rendered mockup is not production/browser evidence.
- These are non-authorizing presentation and evidence guidelines under `AGENTS.md`: no extra required CI checks, admissions, mandatory reviews, merge rights or promises of renderer availability.

## Evidence matrices and continuous improvement (GLOBAL_EVIDENCE_VISUAL@1)

- For complex results, show relevant decision and evidence rows with phase-specific status (implementation, test, merge, deployment, live readback), owner approval, rights/commercial hold, provenance, observed time, priority, blocker and next action. Label stale and missing evidence; a concept approval is not a release approval.
- Prefer compact, accessible filterable matrices and expandable evidence details, status cards, process/architecture diagrams and actionable next steps when the runtime genuinely supports them. Use Markdown/Mermaid/text otherwise. Keep UNIVERSE_7 semantics and canonical branding tokens; never rely on color alone.
- Compare baseline and current measurements only when units, scope, method, sample and provenance are compatible. Show score version, coverage, missing values, absolute/relative deltas where meaningful; never invent numbers or imply that a composite score clears a critical security/rights blocker.
- Present authorized scope-specific hygiene findings and versioned changes to prompts, routing, docs, instructions, folders and naming conventions; distinguish proposed changes from applied and independently read back changes. Reuse existing LangGraph/RAG and contracts; no compulsory full scan or additional gate. Only claim private dashboard synchronization, persistence or live data when actually verified.
- Do not expose private evidence or chat raw data. Preserve the status snippets and 1–3 actionable copyable next steps under AGENTS.md.

## Domain usage

| Domain | High-value visual patterns |
|---|---|
| PRODUCT | UX journey, navigation hierarchy, A11y audit matrix, user states |
| MARKET | Data/provider source-to-score lineage, provider license matrix, measured scoring-quality chart |
| PLATFORM | Architecture, runtime dependencies, request/response flows, service health and latency only when measured |
| TRUST | Tenant/auth boundaries, threat model, rights obligations, status and evidence matrix |
| GROWTH | Publication workflow, editorial calendar, funnel metrics only when measured, claim/right provenance |

**Authority:** Root `AGENTS.md` and `SOLO_MAINTAINER_FLOW@2`. This skill provides presentation guidance only and creates **no gates**, review requirements, spending authority, new tools, licensing permissions, CI steps or deployment rights.

**Verification:** `npm run test:domain-skills` validates repository references, not rendering inside a particular ChatGPT product, other chats or external agents.

## Universe-7 agent identity and machine-readable follow-ups

Read `promptContracts.presentation` and `promptContracts.adaptiveProfile` in the canonical registry. Resolve the five domain identities and council perspectives by their explicit identifiers, not by untrusted text, arbitrary hex colors or claimed role. Specialists inherit the registered domain owner design and keep their skill ID visible. The seven-color signature is decorative; use canonical families, two to four active accents on web views, textual labels and separate status semantics. Preserve the original owner assets. For complex tasks choose an architecture/process graph, evidence matrix, comparison, roadmap or decision panel only when useful; use real interactivity only if available, and provide a readable fallback. Static previews are never live telemetry. Web/Android/renderer conformance remains NOT_PROVEN until independently checked. The machine-readable follow-up is a non-authorizing copy artifact; do not execute it on receipt. On each actual task completion provide a versioned, evidence-based next prompt; the proposed three-run/stall trigger and file-scoped rollback profile are configuration candidates, not an installed scheduler or executed recovery. No new gates.
