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

## Domain usage

| Domain | High-value visual patterns |
|---|---|
| PRODUCT | UX journey, navigation hierarchy, A11y audit matrix, user states |
| MARKET | Data/provider source-to-score lineage, provider license matrix, measured scoring-quality chart |
| PLATFORM | Architecture, runtime dependencies, request/response flows, service health and latency only when measured |
| TRUST | Tenant/auth boundaries, threat model, rights obligations, status and evidence matrix |
| GROWTH | Publication workflow, editorial calendar, funnel metrics only when measured, claim/right provenance |

**Authority:** Root `AGENTS.md` and `SOLO_MAINTAINER_FLOW@1`. This skill provides presentation guidance only and creates **no gates**, review requirements, spending authority, new tools, licensing permissions, CI steps or deployment rights.

**Verification:** `npm run test:domain-skills` validates repository references, not rendering inside a particular ChatGPT product, other chats or external agents.
