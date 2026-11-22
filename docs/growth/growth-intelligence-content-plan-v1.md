# CAPITAL-AI Growth Intelligence Content Plan v1 – implemented draft integration

- Source of truth: CAPITAL-AI-GROWTH/growth-intelligence/content-plan-v1.json, snapshot 2026-11-20.
- Domain/authority: GROWTH, Root AGENTS.md / SOLO_MAINTAINER_FLOW@2.
- Mode: DRAFT_ONLY. No provider access, automatic scheduling, publishing or campaign spend.
- Exact source identities are in the input JSON; GA4 snapshots are historical, not live feeds.

## Existing-contract integration

Commands:

    npm run test:growth-intelligence
    npm run growth:intelligence:dry-run

The second command emits a deterministic JSON bundle to stdout for the Social Content Engine; it does not create or publish a post. The new module src/contracts/growthIntelligenceContent.ts composes:

1. src/contracts/contentEngine.ts – ContentCampaignBriefSchema and planContentCampaign with CADS technical evaluation.
2. src/contracts/contentSocialPackage.ts – buildDraftContentSocialPackage, SHA-256-bound TEXT bytes, no approvals/deliveries.
3. src/contracts/growthAttribution.ts – GrowthAttributionEventSchema, correlateGrowthAttribution and assertAttributionSourceSeparation.
4. src/contracts/socialPublisherAdapter.ts – existing publisher gate remains authoritative, disabled by default.

The bundle's sourceSha256 is the hash of the exact imported JSON. Each draft sourceSha is a SHA-256 hash of the snapshot-derived insight and recommendation, not a Git commit SHA. Rights are NOT_PROVEN. Only deterministic text assets exist; no images, video or audio are generated or approved.

## Analytical evidence and limitations

- GA4/Supermetrics, property 548187678, 2026-10-20..2026-11-18 versus 2026-09-20..2026-10-19: 15 versus 47 recorded sessions; 2 versus 38 engaged sessions.
- GA4 source/medium: 14 direct and 1 google organic session. No identifiable social campaign in the returned sample; this is not proof of zero social visitors.
- Landing pages: / = 12, /learning = 2, /vocabulary/learning-kappa-architecture = 1. Small sample, no statistical claim about product preference.
- Instagram Insights: BLOCKED_EXPIRED_TOKEN. Instagram performance numbers cannot be validated.
- Windsor Search Console: BLOCKED_INVALID_GRANT; HYPD has no selected property.
- ChatGPT Ads Manager: account exists; no campaigns/insight rows in the analyzed period. No spend/conversion performance inferred.
- Priorities are heuristic editorial scores, not predicted impact.

## Consent, rights and publisher isolation

- No provider OAuth tokens or secrets in the snapshot or generated bundle.
- No coercion of GA4 events into UMAMI_PRODUCT. This canonical attribution contract has no GA4 source enum; live GA4 ingestion requires a separately approved versioned adapter.
- growthDraftUtmUrl verifies the exact HTTPS origin and manifest identity, rejects embedded credentials and foreign ports, and permits campaign UTMs only for external social channel drafts. Internal WEBSITE navigation fails closed (GROWTH_INTERNAL_UTM_FORBIDDEN) rather than fabricating an internal acquisition campaign. No measurement requests are dispatched. Actual website measurement remains consent-governed.
- correlateGrowthContentReadback fails closed without consent, matching campaign/content/canonical identity, suitable provider identity and a supported canonical event source. Tests use only synthetic events.
- The existing Social package approvals and deliveries are both empty. VERIFIED_READ means the historical source query succeeded, never public publication approval.
- Studio/Podcast remains a text draft until commercial voice/media rights and media QA are proven. No paid service activation.

## Tests

- Schema positives: original seven recommendations, priority sums, insight provenance, deterministic package bytes and canonical Content/Social contract structure.
- Schema negatives: duplicated/missing insight references, tampered weights and priorities, unknown authority fields, invalid KPI types, unknown sprint IDs.
- Security negatives: unapproved rights, disabled publisher, wrong canonical origin, missing consent, cross-content attribution, wrong provider identity and unsupported GA4 source.
- This test is included in the existing npm test command; no new Required CI checks are introduced.

The snapshot is reproducible but the GA4/Instagram/GSC metrics are NOT refreshed by the CLI. Any future live integration must first verify the account identity, provider rights, consent, freshness and the canonical event/identity contracts. Technical PASS never represents editorial, legal or publication approval.
