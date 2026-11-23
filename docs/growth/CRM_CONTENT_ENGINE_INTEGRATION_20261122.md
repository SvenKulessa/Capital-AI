# GROWTH CRM-neutraler Sales × Content Engine Bridge

Stand: 2026-11-23. Owner Auftrag: GLOBAL_PRODUCTIZATION_GROWTH_SALES@1, CAPITAL-AI Root AGENTS.md / SOLO_MAINTAINER_FLOW@2. GROWTH implementation, TRUST/PRODUCT advisory review. No independent admission gate.

## Existing components reused
- src/contracts/contentEngine.ts: ContentCampaignBriefSchema, planContentCampaign including CADS technical checks.
- src/contracts/contentSocialPackage.ts: SHA-256-bound original TEXT draft manifest with no approvals/deliveries.
- Current Social Publisher and Growth attribution contracts remain independent and unchanged.
- New src/contracts/growthSalesCrm.ts: private-by-default product dossier to CRM-neutral opportunity + copy/graphics brief.
- scripts/growth/sales-crm-drafts.mjs: local dry-run; reads explicit JSON file and writes JSON to stdout only.

## Integration flow

Owner-reviewed product candidate (PUBLIC_PRODUCT_METADATA only)
  -> strict PRODUCT_SALES_CANDIDATE@1 validation
  -> economic contribution check (not profitability or market validation)
  -> CRM_PRODUCT_OPPORTUNITY_DRAFT@1 (TWENTY_CLOUD_PENDING, NOT_CONNECTED, writeAllowed=false)
  -> CAPITAL-AI branded ContentCampaignBrief (only with verified HTTPS origin capital-ai.online)
  -> existing planContentCampaign and buildDraftContentSocialPackage
  -> SHA-256-bound text draft + original graphics brief (no generated graphic bytes)
  -> reviewed marketing/product documentation in product-specific Drive Sales_Enablement folder

Device-Care-KI may explicitly export only public product data through its repository-local script; its output remains isolated and manually reviewed. BRAND_ADAPTER_PENDING prevents applying CAPITAL-AI Universe branding or originating public campaigns for DeviceCare. No device observations, customer lists, credentials or production data are imported.

## CRM design and Twenty Cloud mapping (pending provider connection)

Proposed entities:
- Product: projectId + productId + sourceSha256, versioned description/rights status.
- Product Catalog / Pricebook: product version, EUR price, price proof and license state.
- Lead: only after lawful collection, consent and source/readback; never generated from crawler speculation.
- Account / Contact: authoritative verified CRM identities only, not fabricated from product metadata.
- Opportunity: requires verified AccountId, StageName, CloseDate, actual owner, explicit deal evidence and authorized CRM connector. The local draft does NOT populate or write these fields.
- Campaign: link campaignId/contentId/asset SHA to opt-in analytics, keeping GA4 and CRM source semantics separate.
- Asset: original creative bytes SHA-256, owner commercial grant, distribution scope, editorial approval.
- AuditReceipt: source digest, validation version, reviewer, consent, target account, provider change id, time and readback; no secrets.

Pipeline: IDEA -> EVIDENCE_REVIEW -> PRICING_REVIEW -> CONTENT_DRAFT -> CRM_READY -> OWNER_APPROVED -> RELEASED. Current run stops at DRAFT/HOLD; no transition from text alone.

Revenue/growth metrics to instrument after consent and provider readback: lead source, opt-in MQL->SQL conversion, qualified pipeline EUR, attributed bookings, CAC, customer LTV, unit contribution and monthly recurring revenue. Until authoritative CRM/Stripe/GA4 data exists, output NOT_PROVEN rather than fabricated ROI.

## Local reproduction

Run tests with the existing repository test selection (the new assertions are in src/contracts/__tests__/contentEngine.test.ts):

~~~sh
node --import tsx --test src/contracts/__tests__/contentEngine.test.ts
node --import tsx scripts/growth/sales-crm-drafts.mjs --input /path/to/reviewed-product-candidate.json
~~~

To capture output, redirect it to a path you control after inspection. Do not commit real customer/lead/product-secret data. No automatic Drive upload, campaign scheduling, image generation, paid provider invocation, CRM write or publication is triggered.

## Security and rights acceptance

Strict input schema rejects unknown fields (incl. email, AccountId, write approvals), invalid digests and unsupported classifications. Only HTTPS URL without embedded credentials, query or fragment, and CAPITAL-AI origin for branded campaign drafts. VERIFIED rights requires a real evidence reference but is not itself verified by the draft generator. Exact asset bytes are hashed. License record and graphic bytes remain NOT_PROVEN, public publishing remains false, CRM writeAllowed=false, commercial release HOLD.

Twenty Cloud adapter next step after connection: provider readback + mapping validation; dry-run field-level diff and idempotency; explicit owner approval to mutate real records; commit receipt and readback. Keep OAuth/tokens in the provider secret store, never exports.

DeviceCare next step: explicitly branded design adapter and offline legal evidence, no cross-project credentials or shared runtime. Use project-specific Drive documents and mark transfer only after file readback.

## Rollback and evidence

Rollback removes the new feature files and scoped test additions through the PR branch; no database/CRM state was changed. GitHub CI must be checked at the exact PR head SHA; local drafts alone do not prove production integrations.


## Twenty Cloud read-only migration (2026-11-23)

Owner-selected workspace: `https://capital-ai.twenty.com`. The Products Fields UI is `/settings/objects/products#fields`; it does not prove any API field schema or permission.

- `server/twenty/cloud-readonly.mjs`: fixed-origin, token-protected, metadata-only GraphQL query to `/metadata`; rejects URL spoofing, redirects, HTTP errors, malformed or oversized responses, GraphQL errors, duplicate/missing Products object identity. All output explicitly `fieldsStatus=NOT_PROVEN`, `mappingStatus=BLOCKED`, `writeAllowed=false`.
- `server/twenty/cloud-readonly.test.mjs`: synthetic positive and negative tests; wired into the existing npm test suite.
- Retired Salesforce-only adapter, tests and CLI from this branch; no Salesforce provider route is part of the target implementation.
- This is an **offline-tested candidate**, not a live connected Twenty integration. The metadata query and object naming need authenticated readback against the real workspace. The object list is bounded to 100 entries; missing Products is fail-closed and does not prove absence if pagination exists.
- Existing `src/contracts/growthSalesCrm.ts` and Content Engine draft contracts remain CRM-neutral. No live product record reads, no customer data, no write permissions, no provider activation or billing.

### Reproduction and gates

```sh
node --test server/twenty/cloud-readonly.test.mjs
npm run test:twenty-cloud-readonly
```

Required: exact-head Docker Security Gate, Domain Governance, all active Rulesets, readback provenance and Owner-authorized Twenty credentials/permissions before provider connection. Schema/field mapping and digest-bound live product identity remain **NOT_PROVEN**. MERGE=BLOCKED until verified. Rollback: revert scoped PR commits; no CRM mutations occurred.

Official Twenty documentation: https://docs.twenty.com/l/de/developers/extend/apps/logic-functions


### Twenty Cloud API schema, tenancy and rights hardening (2026-11-23)

Official Twenty docs (verified publicly, **not** workspace-specific):
- https://docs.twenty.com/developers/extend/api — Twenty Cloud API origin is \`https://api.twenty.com/\`, not the user-facing \`capital-ai.twenty.com\` UI origin. The metadata GraphQL API lives at \`/metadata\`, metadata REST at \`/rest/metadata/\`; API contracts are generated separately per workspace.
- https://docs.twenty.com/developers/extend/apps/logic/logic-functions — \`MetadataApiClient\` documents read-only \`objects(filter:{},paging:{first:N})\` GraphQL query and fields \`id\`, \`nameSingular\`, \`namePlural\`, \`labelSingular\`, \`isCustom\`.
- https://docs.twenty.com/developers/extend/oauth — OAuth \`api\` scope grants **read/write** API access; it does *not* prove a read-only role. An API key must be restricted by the actual Twenty Workspace role assignment.
- https://docs.twenty.com/user-guide/settings/capabilities/community-settings — new metadata REST field response differs from old \`data.fields\` wrapper; unsupported or paginated shapes fail closed.
- Twenty upstream source reads \`currentWorkspace { id workspaceUrls { subdomainUrl customUrl } }\` against \`/metadata\`. No unsupported workspace URL to API-host equality assumption is made.

Scoped controls on this PR branch:
- \`server/twenty/cloud-readonly.mjs\`: fixed \`https://api.twenty.com\` API origin, separately pinned \`https://capital-ai.twenty.com\` expected Workspace UI identity, query-only GraphQL POST, read-only REST metadata field GET, redirect/HTTP/body-byte limits, no Core API, no POST mutation and no customer record reads.
- The first metadata query obtains workspace UUID and canonical workspace URL from the *authenticated provider response*. Products discovery uses the documented object query, bounded to 100. Incomplete/ambiguous object lists are rejected.
- \`readProductsFieldSchema(requiredFields)\` performs a schema **candidate** match only; requires one active Products object, object-bound UUID fields and explicit expected field name/type map, unique field IDs/names, and complete \`/rest/metadata/fields\` response. Unknown response forms, pagination and mismatched fields fail closed, not silent partial success.
- \`validateProductEvidence()\` requires a nonserializable in-process provider readback and its paired field schema evidence. It checks exact tenant workspace UUID, Products object UUID, project isolation (\`CAPITAL_AI\` only), SHA-256 of *asset bytes/text*, and equality of candidate source SHA and content package source SHA. Raw caller-supplied \`fieldSchemaVerified: true\` and user-supplied observed tenant strings are no longer accepted as evidence.
- All successful local matches still return \`writeAllowed=false\`, \`publicationAllowed=false\`, \`commercialRelease=HOLD\`. They do **not** confirm Twenty API-key role privileges, workspace Products field values or a real product record mapping. No product record operations were implemented.

Evidence separation:
- \`CONTROL_PRESENT\`: branch code and negative tests.
- \`NOT_PROVEN\`: current Twenty Cloud live workspace metadata, actual Products field names/types, API-key role mapping, paging/response-shape compatibility, real product identity/tenant/asset bind and provider installation. Synthetic fixtures are not live proof.
- \`BLOCKED\`: live provider activation, productive CRM writes, license grants, publishing, deployment and PR merge under the owner task. CI must be read back on the exact **new** head; old CI evidence does not transfer.

Reproduce:
\`\`\`sh
node --test server/twenty/cloud-readonly.test.mjs
node --import tsx --test src/contracts/__tests__/contentEngine.test.ts
\`\`\`

Rollback: revert this PR branch's scoped commits only; no real Twenty workspace provider settings or records have been changed.
