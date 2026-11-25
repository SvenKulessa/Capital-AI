# Private Growth Tool Discovery
Contract: GROWTH_TOOL_DISCOVERY@1. Scope: Owner/operator only; no customer-facing provider access.

The public repository contains only provider names, public capabilities and integration contracts. Never commit account identifiers, account observations, campaign data, tokens or raw prompts. The existing owner-only repository catalog reads config/tool-catalog-integrations.json at one immutable main SHA. Candidate rows are documentation, not runtime evidence or permission.

| Provider | Intended use | Runtime | Commercial service / output rights |
| --- | --- | --- | --- |
| HYPD Google Tag Manager | Live tag, trigger, workspace audit | NOT_PROVEN in engine | NOT_PROVEN |
| HYPD Paid Ads & Analytics | Campaign analytics | NOT_PROVEN in engine | NOT_PROVEN |
| ChatGPT Ads Manager | Owner analysis and explicitly approved drafts | NOT_PROVEN in engine | NOT_PROVEN |
| Supermetrics Marketing Agent | Cross-channel metrics, existing sources first | NOT_PROVEN in engine | NOT_PROVEN |
| Windsor.ai | Alternative cross-channel reporting | NOT_PROVEN in engine | NOT_PROVEN |
| OpenSEO | Candidate for SEO research | NOT_PROVEN | NOT_PROVEN |

Each generated chat/next-round draft in the changed generators carries a discovery instruction. The explicit private operator function buildPrivateNextRoundDrafts performs public GitHub metadata discovery for each represented domain, with fixed topic queries, bounded concurrency and responses, and attaches domain-specific research results to each draft. No raw task text is transmitted. The daily existing radar and offline deterministic build are unchanged. GitHub results are not a ChatGPT plugin directory, and plugin availability must be independently checked in the authorized chat environment. No auto-installation, automatic costs or publication.

To run the private operator path, from a trusted checkout, provide an explicit next-steps section on stdin:
```sh
node scripts/growth/next-round-planner.mjs --private-tool-discovery < private-next-steps.txt
```
Output is private operator evidence; do not commit it or send it to public CI. Unknown routes have no generated prompt. If discovery fails the relevant prompt is marked NOT_PROVEN, not verified. The tool radar does not provide commercial rights or current account credentials. Do not activate providers until exact service/API terms, data processing, cost, identities and rights are independently confirmed.

The catalog lists the known integrations after merge. Continuous persistence of dynamic suggestions into the owner catalog, authorized provider runtime adapters, and live coverage of other prompt generators are not established by this slice. Reuse the existing owner-only growth data layer and LangGraph, not a competing runtime or scheduler.

Rollback: revert the scoped branch changes; no database, account, credential, advertising, or billing mutations.
