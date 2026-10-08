# Enterprise Analysis UI — Audit before implementation

Source: main `71fe8ba6a26925cce5d0b8bf629ccba8c37ad253`, 2026-10-08.

## Inventory and gaps

React 19 / TypeScript / Vite / Tailwind, existing dark navy, amber and cyan branding.
Routing uses `AppRoutes`, `appNavigation`, `useHubTab`. State is hooks and the external market store.
535 application/server/service/database files inventoried; entrypoints, feature surfaces,
contracts, provider registry, runner, configuration, evidence and server boundaries inspected.
No nested AGENTS.md. Root AGENTS.md is authoritative.

Existing: 50-component registry, 13 canonical domains, Zod DTOs, provider adapter interface,
feature store, deterministic scoring, eight-stage shadow pipeline, config schema,
content-addressed evidence and replay. Three raw research gate diagnostics exist separately;
they do not constitute active normalized scorers. Registry references and runner implementations
are incomplete. Canonical asset taxonomy is narrower than nine product asset classes.

UI gaps: only basic protected registry table; no public component explorer, dependency view,
policy details or staged UI flags. Sentiment and whale surfaces show only unavailable text.
Studio analytics/console/benchmark are disabled behind `false`. Scorer has no results when
its intentionally empty public adapter registry fails. Screener items are empty; filters
and columns incomplete. Explainability drawer lacks dialog focus handling and source input
rendering. Static provider health/latency/budget fields are examples, not live telemetry.

Backend: Node server routes market, auth, scorer proxy, mobile scorer, profile vault,
private batch queries and evidence. Rust bridge/NATS/Valkey remain infrastructure boundaries.
Supabase migrations contain score snapshots, IAM, private vault and user analysis bindings.
No authoritative public endpoint serves all 50 scoring results; no runtime provider fetch
will be invented for UI. Public provider adapter registry starts empty by design.
Environment settings are server-owned; browser VITE flags control presentation only.
Demo data must remain separate, opt-in and non-actionable.

## Additive design and alternative

Chosen: reusable registry-driven explorer in existing screener and protected Control Center;
policy/dependency drilldown instead of 50 empty cards. German methodology panels in existing
sentiment/whale surfaces. Protected console uses actual immutable shadow baseline, session-only
version history and existing offline replay engine, clearly separated from production telemetry.
Alternative: standalone dashboard and duplicate component catalogue. Rejected for duplicated
status authority, routing churn and maintenance. No added dependency or provider/API spend.
Normal CI and hosting use their existing resources; quotas are not measured by this work.

## Boundaries and dependency graph

provider-registry → market-data → asset-master → data-quality → feature-store
→ market-intelligence → scoring → ranking → evidence → ui-explainability.
Risk-controls veto scoring/ranking. Pipeline-configurator versions policies;
observability reports measured execution. Existing contracts remain the source of truth.
Registry dependencies are metadata, never evidence that a provider is connected.

## Planned files

Add `src/features/analysis/*`: projection, flags, explorer, methodology surfaces,
protected console, shared status/dialog UI and projection tests.
Modify existing screener/dashboard/drawer, sentiment and whale surfaces,
ControlCenter, Studio and AppRoutes to integrate these modules. Add npm test wiring.
Document final file list, component states and unresolved dependencies from the actual registry.

Do not touch: provider credentials, server production activation, IAM/RLS, database migrations,
billing, trading, NATS/Valkey/Render config, landing structure, branding or existing market cards.
No destructive refactor or migration is proposed. Browser session history is not a durable
production audit store. Production readiness remains blocked by real source/feature/runner gaps.

## Main correlation during implementation

Rebased onto `12fc92e779500420025cef118dc180814f1a2720` (including #292–#294).
No file conflicts. Fresh AGENTS.md visual-chat presentation rule read and applied.
Final validation runs use this integrated tree.
