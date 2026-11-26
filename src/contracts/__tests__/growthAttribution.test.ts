import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GROWTH_ATTRIBUTION_POLICY_VERSION,
  assertAttributionSourceSeparation,
  correlateGrowthAttribution,
} from '../growthAttribution.ts';

const base = {
  policyVersion: GROWTH_ATTRIBUTION_POLICY_VERSION,
  canonicalUrl: 'https://capital-ai.online/',
  occurredAt: '2026-10-06T19:30:00.000Z',
  campaignId: 'launch-2026-10',
  contentId: 'homepage-launch',
} as const;

test('GSC, Umami and social evidence correlate without semantic mixing', () => {
  const bundles = correlateGrowthAttribution([
    {
      ...base,
      source: 'GSC_SEARCH',
      evidenceRef: 'gsc:query:1',
      metrics: [
        { name: 'clicks', value: 12, unit: 'COUNT' },
        { name: 'averagePosition', value: 8.2, unit: 'POSITION' },
      ],
    },
    {
      ...base,
      source: 'UMAMI_PRODUCT',
      evidenceRef: 'umami:event:1',
      metrics: [
        { name: 'sessions', value: 20, unit: 'COUNT' },
        { name: 'signupConversions', value: 3, unit: 'COUNT' },
      ],
    },
    {
      ...base,
      source: 'SOCIAL_PROVIDER',
      providerEntityId: 'post:123',
      evidenceRef: 'social:analytics:1',
      metrics: [
        { name: 'impressions', value: 400, unit: 'COUNT' },
        { name: 'clicks', value: 15, unit: 'COUNT' },
      ],
    },
  ]);

  assert.equal(bundles.length, 1);
  assert.equal(bundles[0].search.length, 1);
  assert.equal(bundles[0].product.length, 1);
  assert.equal(bundles[0].social.length, 1);
  assert.doesNotThrow(() => assertAttributionSourceSeparation(bundles[0]));
});

test('different canonical/campaign/content identities do not merge', () => {
  const bundles = correlateGrowthAttribution([
    {
      ...base,
      source: 'GSC_SEARCH',
      evidenceRef: 'gsc:1',
      metrics: [{ name: 'clicks', value: 1, unit: 'COUNT' }],
    },
    {
      ...base,
      campaignId: 'other-campaign',
      source: 'UMAMI_PRODUCT',
      evidenceRef: 'umami:2',
      metrics: [{ name: 'sessions', value: 1, unit: 'COUNT' }],
    },
  ]);

  assert.equal(bundles.length, 2);
});


const campaign={subjectKey:'a'.repeat(64),campaignId:'capital-ai-growth-20261120',contentId:'CAP-GROW-005'};
const fixture=()=>({
  asOf:'2026-11-24T12:00:00.000Z',start:'2026-11-20T00:00:00.000Z',end:'2026-11-24T00:00:00.000Z',
  consent:[{...campaign,source:'SERVER_CONSENT_LEDGER',receiptSha256:'b'.repeat(64),analytics:true,purpose:'CAMPAIGN_CONVERSION',
    grantedAt:'2026-11-20T00:00:00.000Z',expiresAt:'2026-12-20T00:00:00.000Z',revokedAt:null}],
  registrations:[{...campaign,source:'SUPABASE_AUTH',receiptSha256:'c'.repeat(64),consentSha256:'b'.repeat(64),
    createdAt:'2026-11-21T00:00:00.000Z',confirmedAt:'2026-11-21T00:02:00.000Z'}],
  payments:[{...campaign,source:'STRIPE_INITIAL_INVOICE',receiptSha256:'d'.repeat(64),registrationSha256:'c'.repeat(64),
    subscriptionKey:'e'.repeat(64),invoiceKey:'f'.repeat(64),paidAt:'2026-11-22T00:00:00.000Z',
    observedAt:'2026-11-24T10:00:00.000Z',live:true,paid:true,refunded:false,disputed:false,
    billingReason:'subscription_create',currency:'EUR',amountPaidCents:2500}]
});
test('consent, registration and initial invoice candidates join without exposing identity or authenticating sources',async()=>{
  const {reconcileXConversionCandidates}=await import('../growthAttribution.ts');
  const r=reconcileXConversionCandidates(fixture());
  assert.equal(r.candidateRegistrations,1);assert.equal(r.candidatePaidSubscribers,1);assert.equal(r.candidateInitialInvoiceCents,2500);
  assert.equal(r.registrations,null);assert.equal(r.paidSubscriptions,null);assert.equal(r.revenueCents,null);
  assert.equal(r.providerAuthentication,'NOT_PROVEN');assert.equal(r.publicPublishAllowed,false);
  assert.doesNotMatch(JSON.stringify(r),/a{64}|b{64}|c{64}|d{64}|e{64}|f{64}/);
  const empty=reconcileXConversionCandidates({...fixture(),consent:[],registrations:[],payments:[]});
  assert.equal(empty.candidateRegistrations,null);assert.equal(empty.candidatePaidSubscribers,null);
});
test('conversion join rejects consent, cross-subject, duplicate, trial, refund and timing negatives',async()=>{
  const {reconcileXConversionCandidates}=await import('../growthAttribution.ts');
  const f=fixture();
  for(const raw of [
    {...f,consent:[]},{...f,consent:[{...f.consent[0],analytics:false}]},
    {...f,consent:[{...f.consent[0],revokedAt:'2026-11-23T00:00:00.000Z'}]},
    {...f,consent:[{...f.consent[0],expiresAt:'2026-11-23T00:00:00.000Z'}]},
    {...f,registrations:[{...f.registrations[0],subjectKey:'0'.repeat(64)}]},
    {...f,registrations:[{...f.registrations[0],confirmedAt:'2026-11-20T00:00:00.000Z'}]},
    {...f,payments:[{...f.payments[0],registrationSha256:'0'.repeat(64)}]},
    {...f,payments:[{...f.payments[0],subjectKey:'0'.repeat(64)}]},
    {...f,payments:[{...f.payments[0],live:false}]},{...f,payments:[{...f.payments[0],amountPaidCents:0}]},
    {...f,payments:[{...f.payments[0],refunded:true}]},{...f,payments:[{...f.payments[0],disputed:true}]},
    {...f,payments:[{...f.payments[0],billingReason:'subscription_cycle'}]},
    {...f,payments:[{...f.payments[0],observedAt:'2026-11-22T00:00:00.000Z'}]},
    {...f,payments:[f.payments[0],f.payments[0]]},{...f,payments:[{...f.payments[0],email:'synthetic@example.invalid'}]}
  ])assert.throws(()=>reconcileXConversionCandidates(raw));
});
