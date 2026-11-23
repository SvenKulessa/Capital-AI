import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ContentCampaignBriefSchema, planContentCampaign } from './contentEngine.ts';
import { buildDraftContentSocialPackage } from './contentSocialPackage.ts';

/**
 * CRM-neutral, DRAFT_ONLY productization bridge.
 * Never queries contacts, reads devices, writes CRM, invokes providers or publishes.
 * DeviceCare may supply a separately reviewed, public-product-metadata-only brief.
 */
export const GROWTH_SALES_CRM_CONTRACT_VERSION = 'GLOBAL_PRODUCTIZATION_GROWTH_SALES_CRM@1' as const;

export const ProductSalesCandidateSchema = z.object({
  contractVersion: z.literal('PRODUCT_SALES_CANDIDATE@1'),
  projectId: z.enum(['CAPITAL_AI', 'DEVICE_CARE_KI']),
  productId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  productName: z.string().min(3).max(120),
  valueProposition: z.string().min(10).max(400),
  audience: z.array(z.string().min(3).max(120)).min(1).max(5),
  differentiators: z.array(z.string().min(3).max(240)).max(5),
  canonicalUrl: z.string().url().optional(),
  channels: z.array(z.enum(['WEBSITE', 'LINKEDIN', 'EMAIL', 'X', 'INSTAGRAM'])).min(1).max(5),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  sourceEvidenceRef: z.string().min(3).max(240),
  rightsStatus: z.enum(['VERIFIED', 'NOT_PROVEN', 'BLOCKED']),
  rightsEvidenceRef: z.string().min(3).max(240).optional(),
  economics: z.object({
    priceEurCents: z.number().int().nonnegative().nullable(),
    variableCostEurCents: z.number().int().nonnegative().nullable(),
    evidenceRef: z.string().min(3).max(240).nullable(),
  }).strict(),
  dataClassification: z.literal('PUBLIC_PRODUCT_METADATA'),
}).strict().superRefine((value, ctx) => {
  if (value.rightsStatus === 'VERIFIED' && !value.rightsEvidenceRef) {
    ctx.addIssue({ code: 'custom', path: ['rightsEvidenceRef'], message: 'RIGHTS_EVIDENCE_REQUIRED' });
  }
});

export type ProductSalesCandidate = z.infer<typeof ProductSalesCandidateSchema>;

function checkedUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) {
    throw new Error('GROWTH_SALES_CANONICAL_URL_UNSAFE');
  }
  return url.href;
}

export function buildGrowthSalesCrmDraft(raw: unknown) {
  const candidate = ProductSalesCandidateSchema.parse(raw);
  const canonicalUrl = candidate.canonicalUrl ? checkedUrl(candidate.canonicalUrl) : null;

  // Never attach the CAPITAL-AI branded visual identity to a DeviceCare product.
  if (candidate.projectId === 'CAPITAL_AI' && canonicalUrl
      && new URL(canonicalUrl).origin !== 'https://capital-ai.online') {
    throw new Error('GROWTH_SALES_CANONICAL_ORIGIN_INVALID');
  }

  const draftText = [
    candidate.productName,
    candidate.valueProposition,
    'Zielgruppe: ' + candidate.audience.join(', '),
    ...candidate.differentiators.map(item => 'Produktmerkmal: ' + item),
    'Status: interner Marketingentwurf; keine freigegebene Veröffentlichung.',
  ].join('\n');
  const contentId = candidate.productId + '-sales-draft';
  const campaignId = candidate.projectId.toLowerCase().replaceAll('_', '-') + '-' + candidate.productId + '-sales';
  const contentDraftEnabled = candidate.projectId === 'CAPITAL_AI' && canonicalUrl !== null;
  const campaign = contentDraftEnabled
    ? ContentCampaignBriefSchema.parse({
      campaignId,
      productId: candidate.productId,
      sourceSha: candidate.sourceSha256,
      canonicalUrl,
      locale: 'de-DE',
      objective: candidate.valueProposition,
      audience: candidate.audience,
      channels: candidate.channels,
      outputs: ['TEXT', 'IMAGE'],
      sourceUrls: [canonicalUrl],
    })
    : null;
  const contentPlan = campaign ? planContentCampaign(campaign) : null;
  const assetSha256 = createHash('sha256').update(draftText, 'utf8').digest('hex');
  const socialPackage = campaign ? buildDraftContentSocialPackage({
    campaign,
    contentId,
    assets: [{
      assetId: contentId + '-text',
      contentId,
      kind: 'TEXT',
      sha256: assetSha256,
      mimeType: 'text/plain',
      sourceSha: candidate.sourceSha256,
      evidenceRef: candidate.sourceEvidenceRef,
    }],
  }) : null;
  if (contentPlan?.publication.publicPublishAllowed || socialPackage?.approvals.length || socialPackage?.deliveries.length) {
    throw new Error('GROWTH_SALES_DRAFT_AUTHORITY_VIOLATION');
  }

  const { priceEurCents, variableCostEurCents, evidenceRef } = candidate.economics;
  const unitContributionEurCents = priceEurCents !== null && variableCostEurCents !== null
    ? priceEurCents - variableCostEurCents : null;
  const economicsVerified = unitContributionEurCents !== null && Boolean(evidenceRef);
  // A unit contribution is never treated as a proven market forecast or profit.
  const economicStatus = !economicsVerified ? 'NOT_PROVEN'
    : unitContributionEurCents < 0 ? 'HOLD' : 'REVIEW_REQUIRED';

  // No AccountId, person, email address, CRM stage, guessed revenue or live CRM objects.
  const crmDraft = {
    schema: 'CRM_PRODUCT_OPPORTUNITY_DRAFT@1',
    provider: 'TWENTY_CLOUD_PENDING',
    connection: 'NOT_CONNECTED',
    idempotencyKey: createHash('sha256').update(JSON.stringify([
      candidate.projectId, candidate.productId, candidate.sourceSha256,
    ])).digest('hex'),
    product: {
      projectId: candidate.projectId,
      productId: candidate.productId,
      name: candidate.productName,
      valueProposition: candidate.valueProposition,
      audience: candidate.audience,
      differentiators: candidate.differentiators,
      canonicalUrl,
    },
    economics: { unitContributionEurCents, status: economicStatus, evidenceRef },
    stage: 'HOLD',
    accountId: null,
    opportunityId: null,
    writeAllowed: false,
    externalOutreachAllowed: false,
  } as const;

  return {
    contractVersion: GROWTH_SALES_CRM_CONTRACT_VERSION,
    projectId: candidate.projectId,
    sourceSha256: candidate.sourceSha256,
    rights: { status: candidate.rightsStatus, evidenceRef: candidate.rightsEvidenceRef ?? null },
    asset: { contentId, kind: 'TEXT', sha256: assetSha256, text: draftText },
    graphicBrief: {
      mode: 'ORIGINAL_DESIGN_DRAFT',
      requirements: ['project-specific branding', 'readable alt text', 'provenance and owner license'],
      assetBytes: 'NOT_PROVEN',
      rights: candidate.rightsStatus,
      sha256: null,
    },
    contentIntegration: contentDraftEnabled ? 'CAPITAL_AI_EXISTING_CONTENT_ENGINE_DRAFT'
      : candidate.projectId === 'DEVICE_CARE_KI' ? 'DEVICECARE_BRAND_ADAPTER_PENDING'
        : 'CANONICAL_URL_NOT_PROVEN',
    contentPlan,
    socialPackage,
    crmDraft,
    commercialRelease: 'HOLD',
    externalActions: 'NONE',
  } as const;
}
