# Capital-AI Google maintenance and local marketing graph

Date: 2026-10-10. Source baseline: `a613aff57f26f19d994a89a6927aeb8b381c416b`.
Status: REPO_IMPLEMENTED; LIVE_GOOGLE_ADMIN_NOT_PROVEN.

## What is implemented

A separate stdio MCP server calls allowlisted Google REST APIs from a trusted local or cloud worker. It is bound to Cloud project `aifinancial-500208`, GA4 property `548187678` and Search Console property `sc-domain:capital-ai.online`. No public HTTP listener or raw browser/admin proxy is added. The existing owner-session Render readback and official GA4 MCP reader remain unchanged.

The new entry `capital-ai-google-maintenance` in `.mcp.json` starts `node scripts/google-maintenance-mcp.mjs`. Repository MCP configuration becomes available only to a client that loads that file; it does not install itself as a ChatGPT connector.

| Tool | Operation |
| --- | --- |
| google_maintenance_status | Configuration flags; no claim of authenticated provider readiness |
| gcp_get_project | Exact project's metadata |
| gcp_list_enabled_services | Enabled API inventory; first 200, truncation reported |
| ga4_get_property | Exact property settings |
| ga4_list_data_streams | Streams and explicit HTTPS capital-ai.online association evidence |
| ga4_country_report | Aggregated 1–90-day country reports for Germany, Italy, Spain, Portugal and UK |
| gsc_list_sitemaps | Exact property's sitemap status |
| gsc_country_report | Final-data top 20 landing pages per target country; five bounded readonly API calls |
| ga4_plan_property_update | Inspect proposed displayName/timeZone/currencyCode change |
| ga4_apply_property_update | Apply one-use, five-minute plan and verify changed settings |

GA4 settings writes are disabled by the default MCP configuration. When enabled for a suitably authorized worker, only the three listed fields are supported. The adapter detects changes already visible before PATCH; Google does not provide an atomic compare-and-swap guarantee here. Currency and timezone changes can affect reporting. A provider response failure does not justify repeating a write automatically.

## Authentication and exact access requirements

Choose an existing approved identity; never create or paste private keys for this setup.

- A trusted worker may receive a short-lived `GOOGLE_MAINTENANCE_ACCESS_TOKEN` through its private secret/identity mechanism.
- Alternatively, set `GOOGLE_MAINTENANCE_USE_ADC=true` on a worker with an already configured `gcloud` ADC identity. The adapter invokes only `gcloud auth application-default print-access-token`; it does not log in or change CLI profiles.
- The worker owns token refresh/lifecycle. This program never persists tokens or returns them in MCP results.
- For GA4 reads: Analytics Viewer on exact property 548187678 and `analytics.readonly` OAuth scope. For the explicit GA4 settings tools: Analytics Editor on that property and `analytics.edit` scope. Google Cloud project Owner is not necessary for GA4.
- For GSC: appropriate user access to the exact Search Console property and `webmasters.readonly`.
- For Cloud inventory: permission to read the exact project and enabled-service inventory, typically Browser plus Service Usage Viewer scoped to that project, and a token authorized for Cloud API reads. Do not grant project Owner merely to inspect enabled APIs.
- The existing GitHub OIDC reader requests readonly scopes. It is not silently upgraded to Editor and does not authenticate a separate worker.
- Live ADC/token identity, effective Google permissions and API enablement are not verified in this session. No IAM/Analytics role changes were performed.

To enable the settings tools in an authorized MCP client, change its worker configuration value `GOOGLE_MAINTENANCE_GA4_WRITES_ENABLED` to `true`; the repository entry sets it to false by default. First read the exact property and inspect a plan. No billing, account deletion, access-binding change, Workspace administration, Ads launch or arbitrary URL/command execution is provided.

## Local LangGraph marketing infrastructure

LangGraph 1.2.14 (MIT; upstream release published 2026-10-06) coordinates four parallel deterministic domain workers and joins their findings into an actionable plan:

1. SEO worker inspects canonical/indexing source.
2. Privacy worker checks disabled tracking source and identifies required consent/tag tests.
3. Google worker optionally invokes only the new readonly MCP tools.
4. Marketing worker plans separate B2B fintech, trader and learner/community content for DE/IT/ES/PT/GB.

These workers are rule-based, not paid-model AI inference. Source-only execution requires no provider account. Hosted tracing is disabled before imports. The graph never applies GA4 plans, publishes content, writes production files, creates campaigns, upgrades hosting or opens a Cloud browser session.

```sh
python3 -m venv .venv-growth
.venv-growth/bin/python -m pip install -r scripts/growth-agent/requirements.lock
.venv-growth/bin/python scripts/growth-agent/graph.py
# Only on an authenticated trusted worker; private Google reports stay there:
.venv-growth/bin/python scripts/growth-agent/graph.py --google-reads
```

Top-level and currently resolved transitive Python package versions are pinned in the lock file. They are not installed into the production Node image. This is a local execution snapshot, not a hash-verified wheel supply-chain lock or blanket license/security approval. The dedicated PR workflow runs the real graph and mocked API tests without Google secrets. No new required merge check is introduced.

## Tags, cookies and automation boundary

GA4 browser measurement in the current application is disabled. This change preserves that behavior. The privacy worker produces a source observation, not a browser consent attestation. Before enabling GA4/Ads tags, implement and test accept/reject/withdrawal, no tag loading before applicable consent, SPA page-view deduplication and removal of private account/user input from measurement.

Ads customer ID and budget limit remain absent. User asked for an open-source/free budget: no ads, paid model calls, new hosting resources or paid browser infrastructure are activated. LangGraph has no license fee, but machine time, Google quotas, GitHub plan limits, network and future models are not universally free. Use existing local hardware; Google reads consume API quotas and five GSC reporting calls per graph run. Remain inside the owner's existing limits.

## Evidence

- Node API/MCP tests: 12 passed; mocked providers, no live Google authorization proof.
- Python tests: 5 passed with installed LangGraph 1.2.14, including malformed worker responses, domain association and private-payload redaction.
- Source-only graph executed against the cloned Capital-AI repository, four workers joined.
- Live public homepage returned HTTP 200, canonical https://capital-ai.online/, and no Google tag in the initial response. This is an HTML snapshot, not a browser/network/cookie audit.
- No Google credentials, role changes, runtime deployment or ad spend performed.
- Owner merge to main remains required under AGENTS.md.

## Official references checked / implementation contracts

- https://github.com/langchain-ai/langgraph/releases/tag/1.2.14
- https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/patch
- https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams/list
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://cloud.google.com/resource-manager/reference/rest/v3/projects/get
- https://cloud.google.com/service-usage/docs/reference/rest/v1/services/list

Rollback: remove the new MCP config entry, server/scripts/workflow and optional local virtual environment; disable the worker write flag and revoke its token/Google property assignment separately. Existing GA4 readback remains available.
