# GROWTH CRM-neutraler Sales × Content Engine Bridge

Stand: 2026-11-22. Owner Auftrag: GLOBAL_PRODUCTIZATION_GROWTH_SALES@1, CAPITAL-AI Root AGENTS.md / SOLO_MAINTAINER_FLOW@2. GROWTH implementation, TRUST/PRODUCT advisory review. No independent admission gate.

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
  -> CRM_PRODUCT_OPPORTUNITY_DRAFT@1 (SALESFORCE_OPTIONAL, NOT_CONNECTED, writeAllowed=false)
  -> CAPITAL-AI branded ContentCampaignBrief (only with verified HTTPS origin capital-ai.online)
  -> existing planContentCampaign and buildDraftContentSocialPackage
  -> SHA-256-bound text draft + original graphics brief (no generated graphic bytes)
  -> reviewed marketing/product documentation in product-specific Drive Sales_Enablement folder

Device-Care-KI may explicitly export only public product data through its repository-local script; its output remains isolated and manually reviewed. BRAND_ADAPTER_PENDING prevents applying CAPITAL-AI Universe branding or originating public campaigns for DeviceCare. No device observations, customer lists, credentials or production data are imported.

## CRM design and Salesforce mapping (pending provider connection)

Proposed entities:
- Product: projectId + productId + sourceSha256, versioned description/rights status.
- Product Catalog / Pricebook: product version, EUR price, price proof and license state.
- Lead: only after lawful collection, consent and source/readback; never generated from crawler speculation.
- Account / Contact: authoritative Salesforce identities only, not fabricated from product metadata.
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

To capture output, redirect it to a path you control after inspection. Do not commit real customer/lead/product-secret data. No automatic Drive upload, campaign scheduling, image generation, paid provider invocation, Salesforce write or publication is triggered.

## Security and rights acceptance

Strict input schema rejects unknown fields (incl. email, AccountId, write approvals), invalid digests and unsupported classifications. Only HTTPS URL without embedded credentials, query or fragment, and CAPITAL-AI origin for branded campaign drafts. VERIFIED rights requires a real evidence reference but is not itself verified by the draft generator. Exact asset bytes are hashed. License record and graphic bytes remain NOT_PROVEN, public publishing remains false, CRM writeAllowed=false, commercial release HOLD.

Salesforce adapter next step after connection: provider readback + mapping validation; dry-run field-level diff and idempotency; explicit owner approval to mutate real records; commit receipt and readback. Keep OAuth/tokens in the provider secret store, never exports.

DeviceCare next step: explicitly branded design adapter and offline legal evidence, no cross-project credentials or shared runtime. Use project-specific Drive documents and mark transfer only after file readback.

## Rollback and evidence

Rollback removes the new feature files and scoped test additions through the PR branch; no database/CRM state was changed. GitHub CI must be checked at the exact PR head SHA; local drafts alone do not prove production integrations.


## Salesforce sandbox readback implementation (2026-11-22)

Files:
- server/salesforce/sandbox-readonly.mjs: GET-only client with sandbox My Domain host allowlist, no redirects, bounded requests and output, dynamic describe field validation, Organization.IsSandbox=true proof, unique Product2.ProductCode matching, PricebookEntry cross-record integrity and SHA-256 provider readback projection.
- server/salesforce/sandbox-readonly.test.mjs: synthetic positive + security negative tests, embedded in existing npm test script.
- scripts/growth/salesforce-sandbox-readback.mjs: owner-operated CLI with no CRM writes. Optionally imports an existing validated ContentSocialPackageManifest; approved TEXT asset identity and rights evidence must match before internal draft linking.
- No OAuth secret or customer/lead data is stored or exported.

Field mapping:
PUBLIC_PRODUCT_METADATA.projectId + productId -> Product2.ProductCode with exact PROJECT_ID:slug.
productName -> Product2.Name; Product2.Id and IsActive are read-only identity/availability.
PricebookEntry.Product2Id -> Product2.Id, Pricebook2Id -> pricebook identity, UnitPrice -> advisory unapproved sandbox amount, CurrencyIsoCode when present.
ContentSocialPackage.contentId, sourceSha, text asset SHA-256 and matching approval references -> internal CRM_CONTENT_PRODUCT_BINDING@1 preview. Does not attach a file to Salesforce.

All provider calls use GET /services/data/vXX.0/query?q=... or GET /services/data/vXX.0/sobjects/{Product2|PricebookEntry}/describe. Salesforce Organization.IsSandbox is checked before product reads. Production URLs, foreign hosts, invalid IDs, duplicate ProductCodes, truncated pages, missing fields, unsigned/unapproved packages, unsafe URLs and HTTP failures are rejected or held. Sandbox Product2 data are not proof of publication rights or real commercial pricing.

Setup: Connect Salesforce sandbox through the approved provider integration or OAuth out-of-band using a dedicated least-privilege sandbox user. The direct ChatGPT Salesforce app was administratively disabled at inspection; Windsor.ai Salesforce connector is available but no Salesforce account was connected. Do not paste tokens into ChatGPT, GitHub, Drive or logs. Do not copy signed connection URLs into source-controlled documentation.

Run only from an authenticated owner-controlled runtime with protected environment variables:
- SALESFORCE_SANDBOX_INSTANCE_URL (HTTPS sandbox My Domain host returned by Salesforce)
- SALESFORCE_SANDBOX_API_VERSION (for example v66.0; verify compatibility with sandbox)
- SALESFORCE_SANDBOX_ACCESS_TOKEN (secret, session-scoped)

Commands:
    npm run test:salesforce-sandbox-readonly
    node --import tsx scripts/growth/salesforce-sandbox-readback.mjs --input /private/reviewed-public-product-candidate.json
    node --import tsx scripts/growth/salesforce-sandbox-readback.mjs --input /private/reviewed-public-product-candidate.json --approved-manifest /private/reviewed-approved-content-manifest.json

This is a manual readback, no scheduled polling and no external mutation. No customer CRM writes, OAuth credential activation, publication or paid provider activation. Backend/production readback cannot be proven without an actual connected sandbox. Any metadata-based approval is a local claim requiring independent evidence verification before commercial use.

Official references:
- https://developer.salesforce.com/docs/platform/api-rest/guide/resources-sobject-describe.html
- https://developer.salesforce.com/docs/platform/api-rest/guide/dome-query.html
- https://developer.salesforce.com/docs/platform/object-reference/references/standard-objects/object-product2.html
- https://developer.salesforce.com/docs/platform/object-reference/references/standard-objects/object-pricebookentry.html
- https://developer.salesforce.com/docs/platform/field-reference/references/field-reference/salesforce-field-reference-organization.html

Status: CONTROL_PRESENT on feature branch; local standalone tests require CI at exact current HEAD. CRM_CONNECTION=NOT_CONNECTED; LIVE_SANDBOX_READBACK=NOT_PROVEN; DEVICE_CARE_KI_CROSS_PROJECT_RUNTIME=NONE; COMMERCIAL_RELEASE=HOLD. Rollback: revert the scoped PR branch commits; no Salesforce record was changed.
