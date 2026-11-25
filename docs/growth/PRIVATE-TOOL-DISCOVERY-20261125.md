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

The changed chat follow-up, private frontend and next-round generators carry a discovery instruction. Owner UI paths invoke the protected discovery endpoint, and the explicit private operator function buildPrivateNextRoundDrafts queries public GitHub and the official MCP Registry per represented domain, with fixed topic queries, bounded concurrency and responses. The existing Growth graph exposes an explicit --private-tool-discovery plan option. No raw task text is transmitted. The daily existing radar and offline deterministic build are unchanged. GitHub results are not a ChatGPT plugin directory, and plugin availability must be independently checked in the authorized chat environment. No auto-installation, automatic costs or publication.

To run the private operator path, from a trusted checkout, provide an explicit next-steps section on stdin:
```sh
node scripts/growth/next-round-planner.mjs --private-tool-discovery < private-next-steps.txt
```
Output is private operator evidence; do not commit it or send it to public CI. Unknown routes have no generated prompt. If discovery fails the relevant prompt is marked NOT_PROVEN, not verified. The tool radar does not provide commercial rights or current account credentials. Do not activate providers until exact service/API terms, data processing, cost, identities and rights are independently confirmed.

The static catalog lists known integrations after merge. GET/POST /api/internal/growth-tool-candidates implements owner-only retrieval and discovery, same-origin POST, and deduplicated encrypted archive snapshots on the existing persistent disk. Archive writes remain gated by the existing archive enable/recovery flags and GROWTH_TOOL_CATALOG_RECOVERY_VERIFIED. No new database or scheduler. CLI/graph results are returned as evidence; their automatic central persistence is not established. The existing archive capacity is bounded; exhaustive retention is not established. Public MCP registry metadata does not establish ChatGPT directory availability, installation, current runtime, costs or commercial rights. The owner UI keeps discovered candidates separate from the immutable repository catalog.

Rollback: revert the scoped branch changes; no database, account, credential, advertising, or billing mutations.

## Provider references and activation boundary

- HYPD remote MCP client setup: https://feedback.hypd.ai/en/help/articles/8454256-use-hypd-with-other-mcp-clients-copilot-codex-cursor-and — documented OAuth for supported remote clients; separate engine authorization required. The documented client URL is not an authenticated runtime receipt. Commercial account-specific terms and plan not verified: https://www.hypd.ai/terms.
- OpenAI Advertiser API: https://developers.openai.com/ads/api-overview — separate ad-account-scoped key in Ads Manager settings; approved API access only. https://openai.com/policies/advertising-terms/ and https://openai.com/policies/ad-tools-terms/. No API key issued or copied, no spend or campaign change. Customer-facing redistribution is outside scope.
- Additional alternative: https://www.hypd.ai/openai-ads-mcp — candidate only; exact artifact, license, execution permissions and cost not yet independently verified. Prefer native existing account access before adding redundant adapters.
- OpenSEO catalog entry is a research candidate; runtime installation and rights are separate. Supermetrics and Windsor.ai are alternatives, not additional attribution authorities. Keep sources and provider metrics separate.

## Source implementation and evidence boundary

- GET /api/profile/growth-intelligence/private-provider-status is owner-only and no-store. Both adapters are default-disabled. HYPD requires GROWTH_HYPD_READ_ENABLED, GROWTH_HYPD_MCP_ACCESS_TOKEN and GROWTH_HYPD_GTM_PUBLIC_ID; Ads requires GROWTH_OPENAI_ADS_READ_ENABLED, OPENAI_ADS_API_KEY and GROWTH_OPENAI_ADS_ACCOUNT_ID. Keep identities and keys exclusively in protected runtime configuration. HYPD uses an externally authorized access token; OAuth issuance and refresh are not implemented. The Ads adapter reads account identity and a bounded campaign page; HYPD reads the GTM container list. No campaign writes, publication or spend.
- Official registry API: https://registry.modelcontextprotocol.io/docs ; query only public topic terms, never raw private prompts. Catalog entries retain source and declared version where available, with unresolved costs, rights and alternatives explicitly unknown.
- Focused local provider test: five synthetic cases passed using source blob 544d16d9d98e26088a6db59281a86290842e16d2 and test blob 4f6822db7def39a89b851b5e141af992e6cee1ff. This is not live provider evidence. Full checkout/build and CI, live credentials, isolated archive recovery, and authenticated deployment readback remain unverified. No production flags changed.
