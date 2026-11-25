import { z } from 'zod';

export const GROWTH_ATTRIBUTION_POLICY_VERSION = 'GROWTH_ATTRIBUTION_POLICY@1' as const;

export const GrowthAttributionSourceSchema = z.enum([
  'GSC_SEARCH',
  'UMAMI_PRODUCT',
  'SOCIAL_PROVIDER',
]);

export const GrowthAttributionMetricSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.number().finite(),
  unit: z.enum([
    'COUNT',
    'PERCENT',
    'POSITION',
    'SECONDS',
    'EUR',
    'USD',
  ]),
}).strict();

export const GrowthAttributionEventSchema = z.object({
  policyVersion: z.literal(GROWTH_ATTRIBUTION_POLICY_VERSION),
  source: GrowthAttributionSourceSchema,
  canonicalUrl: z.string().url(),
  occurredAt: z.string().datetime(),
  campaignId: z.string().min(1).max(200).optional(),
  contentId: z.string().min(1).max(200).optional(),
  providerEntityId: z.string().min(1).max(300).optional(),
  evidenceRef: z.string().min(1),
  metrics: z.array(GrowthAttributionMetricSchema).min(1).max(50),
}).strict();

export type GrowthAttributionEvent = z.infer<typeof GrowthAttributionEventSchema>;

export const GrowthAttributionBundleSchema = z.object({
  policyVersion: z.literal(GROWTH_ATTRIBUTION_POLICY_VERSION),
  canonicalUrl: z.string().url(),
  campaignId: z.string().min(1).max(200).optional(),
  contentId: z.string().min(1).max(200).optional(),
  search: z.array(GrowthAttributionEventSchema).max(100),
  product: z.array(GrowthAttributionEventSchema).max(100),
  social: z.array(GrowthAttributionEventSchema).max(100),
}).strict();

export type GrowthAttributionBundle = z.infer<typeof GrowthAttributionBundleSchema>;

export function correlateGrowthAttribution(
  rawEvents: readonly unknown[],
): GrowthAttributionBundle[] {
  const events = rawEvents.map((event) => GrowthAttributionEventSchema.parse(event));
  const groups = new Map<string, GrowthAttributionBundle>();

  for (const event of events) {
    const key = [
      event.canonicalUrl,
      event.campaignId ?? '',
      event.contentId ?? '',
    ].join('|');

    const current = groups.get(key) ?? {
      policyVersion: GROWTH_ATTRIBUTION_POLICY_VERSION,
      canonicalUrl: event.canonicalUrl,
      ...(event.campaignId ? { campaignId: event.campaignId } : {}),
      ...(event.contentId ? { contentId: event.contentId } : {}),
      search: [],
      product: [],
      social: [],
    };

    if (event.source === 'GSC_SEARCH') current.search.push(event);
    if (event.source === 'UMAMI_PRODUCT') current.product.push(event);
    if (event.source === 'SOCIAL_PROVIDER') current.social.push(event);

    groups.set(key, current);
  }

  return [...groups.values()].map((bundle) => GrowthAttributionBundleSchema.parse(bundle));
}

export function assertAttributionSourceSeparation(bundle: GrowthAttributionBundle): void {
  if (bundle.search.some((event) => event.source !== 'GSC_SEARCH')) {
    throw new Error('GROWTH_ATTRIBUTION_SEARCH_SOURCE_MIXED');
  }
  if (bundle.product.some((event) => event.source !== 'UMAMI_PRODUCT')) {
    throw new Error('GROWTH_ATTRIBUTION_PRODUCT_SOURCE_MIXED');
  }
  if (bundle.social.some((event) => event.source !== 'SOCIAL_PROVIDER')) {
    throw new Error('GROWTH_ATTRIBUTION_SOCIAL_SOURCE_MIXED');
  }
}


// Server-side/offline reconciliation input only. Imported receipts never
// authenticate providers, authorize tracking, or grant billing/publishing rights.
const conversionDigest=z.string().regex(/^[a-f0-9]{64}$/);
const conversionTime=z.string().datetime();
const conversionSubject=z.object({subjectKey:conversionDigest,campaignId:z.literal('capital-ai-growth-20261120'),
  contentId:z.literal('CAP-GROW-005')});
const conversionConsent=conversionSubject.extend({source:z.literal('SERVER_CONSENT_LEDGER'),receiptSha256:conversionDigest,
  analytics:z.literal(true),purpose:z.literal('CAMPAIGN_CONVERSION'),grantedAt:conversionTime,
  expiresAt:conversionTime,revokedAt:conversionTime.nullable()}).strict();
const conversionSignup=conversionSubject.extend({source:z.literal('SUPABASE_AUTH'),receiptSha256:conversionDigest,
  consentSha256:conversionDigest,createdAt:conversionTime,confirmedAt:conversionTime}).strict();
const conversionPayment=conversionSubject.extend({source:z.literal('STRIPE_INITIAL_INVOICE'),receiptSha256:conversionDigest,
  registrationSha256:conversionDigest,subscriptionKey:conversionDigest,invoiceKey:conversionDigest,
  paidAt:conversionTime,observedAt:conversionTime,live:z.literal(true),paid:z.literal(true),
  refunded:z.literal(false),disputed:z.literal(false),billingReason:z.literal('subscription_create'),
  currency:z.literal('EUR'),amountPaidCents:z.number().int().positive().max(100000000)}).strict();
const conversionInput=z.object({asOf:conversionTime,start:conversionTime,end:conversionTime,
  consent:z.array(conversionConsent).max(1000),registrations:z.array(conversionSignup).max(1000),
  payments:z.array(conversionPayment).max(1000)}).strict();

/** Pure server-side candidate join. Keys are scoped HMAC pseudonyms from a future
 * trusted adapter, not browser IDs. No DB or Stripe calls, no identity output.
 * Counts are recorded candidates only, never live KPIs or a causal claim. */
export function reconcileXConversionCandidates(raw:unknown) {
  const d=conversionInput.parse(raw);
  const asOf=Date.parse(d.asOf),start=Date.parse(d.start),end=Date.parse(d.end);
  const day=86400000;
  if(!(start<end&&end<=asOf&&end-start<=30*day))throw Error('X_CONVERSION_WINDOW_INVALID');
  const unique=(values:string[])=>{if(new Set(values).size!==values.length)throw Error('X_CONVERSION_DUPLICATE');};
  unique(d.consent.map(c=>c.subjectKey));unique(d.registrations.map(r=>r.subjectKey));
  unique(d.payments.map(p=>p.subjectKey));unique(d.payments.map(p=>p.invoiceKey));unique(d.payments.map(p=>p.subscriptionKey));
  unique([...d.consent,...d.registrations,...d.payments].map(r=>r.receiptSha256));
  const consent=new Map(d.consent.map(c=>[c.subjectKey,c]));
  const valid=new Map<string,z.infer<typeof conversionSignup>>();
  for(const r of d.registrations){
    const c=consent.get(r.subjectKey);
    const created=Date.parse(r.createdAt),confirmed=Date.parse(r.confirmedAt);
    if(!c||c.receiptSha256!==r.consentSha256||c.revokedAt!==null||
       Date.parse(c.grantedAt)>created||Date.parse(c.expiresAt)<=asOf||
       Date.parse(c.expiresAt)-Date.parse(c.grantedAt)>180*day||
       created<start||created>=end||confirmed<created||confirmed>=end)
      throw Error('X_CONVERSION_CONSENT_OR_SIGNUP_INVALID');
    valid.set(r.subjectKey,r);
  }
  let cents=0;
  for(const p of d.payments){
    const r=valid.get(p.subjectKey);
    const paid=Date.parse(p.paidAt),observed=Date.parse(p.observedAt);
    if(!r||p.registrationSha256!==r.receiptSha256||paid<Date.parse(r.confirmedAt)||
       paid>=end||observed<paid||observed>asOf||asOf-observed>day)
      throw Error('X_CONVERSION_PAYMENT_INVALID');
    cents+=p.amountPaidCents;
  }
  return Object.freeze({contractVersion:'CAPITAL_AI_X_CONVERSION_CANDIDATES@1' as const,
    campaignId:'capital-ai-growth-20261120',contentId:'CAP-GROW-005',
    start:d.start,end:d.end,asOf:d.asOf,
    status:'SOURCE_RECORDED_NOT_AUTHENTICATED' as const,
    candidateRegistrations:valid.size||null,candidatePaidSubscribers:d.payments.length||null,
    candidateInitialInvoiceCents:d.payments.length?cents:null,
    registrations:null,paidSubscriptions:null,revenueCents:null,
    providerAuthentication:'NOT_PROVEN',publicPublishAllowed:false,costActivationAllowed:false,
    providerCalls:0,automaticChanges:false});
}
