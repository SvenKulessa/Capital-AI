import test from 'node:test';
import assert from 'node:assert/strict';
import { planContentCampaign } from '../contentEngine.ts';

const base = {
  campaignId: 'capital-ai-score-builder-20261007',
  productId: 'capital-ai-market-screener',
  sourceSha: '71881d789246f5d382643dce8cc7eaa6daec582f',
  canonicalUrl: 'https://capital-ai.online/',
  locale: 'de-DE',
  objective: 'CAPITAL-AI als modularen BYOK Scoring- und Screener-Baukasten erklären.',
  audience: ['FinTech Builder', 'quantitativ interessierte Privatanleger'],
  channels: ['WEBSITE', 'LINKEDIN', 'YOUTUBE', 'REDDIT'],
  outputs: ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'ANALYTICS'],
  sourceUrls: ['https://capital-ai.online/'],
};

test('Content Engine komponiert vorhandene Growth Tools ohne Publication Authority', () => {
  const plan = planContentCampaign(base);
  const modules = plan.modules.map((entry) => entry.module);

  for (const expected of ['COPY', 'URL_CONTEXT', 'IMAGE', 'TTS', 'VIDEO', 'ATTRIBUTION', 'PUBLISHER'] as const) {
    assert.ok(modules.includes(expected));
  }

  assert.equal(plan.publication.adapter, 'SOCIAL_MEDIA_ENGINE');
  assert.equal(plan.publication.state, 'INTEGRATION_PENDING');
  assert.equal(plan.publication.publicPublishAllowed, false);
});

test('Content Engine erfindet keine Discovery-Module ohne Discovery-Output', () => {
  const plan = planContentCampaign(base);
  assert.equal(plan.modules.some((entry) => entry.module === 'DISCOVERY'), false);
  assert.equal(plan.modules.some((entry) => entry.module === 'ENRICHMENT'), false);
});

test('Discovery wird nur explizit in den Plan aufgenommen und bleibt vom Outreach getrennt', () => {
  const plan = planContentCampaign({...base, outputs: [...base.outputs, 'DISCOVERY']});
  assert.ok(plan.modules.some((entry) => entry.module === 'DISCOVERY'));
  assert.ok(plan.modules.some((entry) => entry.module === 'ENRICHMENT'));
  assert.equal(plan.modules.some((entry) => entry.capability === 'OUTREACH_DELIVERY'), false);
});

import { buildGrowthSalesCrmDraft } from '../growthSalesCrm.ts';

const baseSales = {
  contractVersion: 'PRODUCT_SALES_CANDIDATE@1',
  projectId: 'CAPITAL_AI',
  productId: 'growth-loop-product',
  productName: 'Growth Loop Product',
  valueProposition: 'Reproduzierbare, nachvollziehbare Automatisierung von Content-Entwürfen.',
  audience: ['B2B Produktteams'],
  differentiators: ['Digestgebundene Entwürfe', 'Keine automatische Veröffentlichung'],
  canonicalUrl: 'https://capital-ai.online/',
  channels: ['LINKEDIN', 'EMAIL'],
  sourceSha256: 'a'.repeat(64),
  sourceEvidenceRef: 'synthetic:test-product',
  rightsStatus: 'NOT_PROVEN',
  economics: { priceEurCents: null, variableCostEurCents: null, evidenceRef: null },
  dataClassification: 'PUBLIC_PRODUCT_METADATA',
};

test('CRM bridge reuses Content Engine and Social drafts without publication rights', () => {
  const bundle = buildGrowthSalesCrmDraft(baseSales);
  assert.equal(bundle.contentIntegration, 'CAPITAL_AI_EXISTING_CONTENT_ENGINE_DRAFT');
  assert.ok(bundle.contentPlan?.modules.some(module => module.module === 'IMAGE'));
  assert.equal(bundle.contentPlan?.publication.publicPublishAllowed, false);
  assert.equal(bundle.socialPackage?.assets[0].sha256, bundle.asset.sha256);
  assert.deepEqual(bundle.socialPackage?.approvals, []);
  assert.deepEqual(bundle.socialPackage?.deliveries, []);
  assert.equal(bundle.crmDraft.provider, 'TWENTY_CLOUD_PENDING');
  assert.equal(bundle.crmDraft.writeAllowed, false);
  assert.equal(bundle.crmDraft.externalOutreachAllowed, false);
  assert.equal(bundle.commercialRelease, 'HOLD');
  assert.equal(bundle.externalActions, 'NONE');
  assert.equal(bundle.graphicBrief.assetBytes, 'NOT_PROVEN');
  assert.equal(bundle.crmDraft.economics.status, 'NOT_PROVEN');
  assert.equal(bundle.crmDraft.accountId, null);
});

test('DeviceCare produces only isolated public-product-metadata draft without CAPITAL-AI branding', () => {
  const bundle = buildGrowthSalesCrmDraft({
    ...baseSales, projectId: 'DEVICE_CARE_KI', canonicalUrl: undefined,
  });
  assert.equal(bundle.contentIntegration, 'DEVICECARE_BRAND_ADAPTER_PENDING');
  assert.equal(bundle.contentPlan, null);
  assert.equal(bundle.socialPackage, null);
  assert.equal(bundle.crmDraft.product.projectId, 'DEVICE_CARE_KI');
  assert.equal(bundle.commercialRelease, 'HOLD');
});

test('CRM bridge fails closed on injection fields, personal fields, bad identities and unsafe URLs', () => {
  for (const change of [
    { email: 'lead@example.test' },
    { AccountId: '001NOTALLOWED' },
    { publicPublishAllowed: true },
    { dataClassification: 'DEVICE_DIAGNOSTICS' },
    { sourceSha256: 'invalid' },
    { rightsStatus: 'VERIFIED' },
    { canonicalUrl: 'https://capital-ai.online/?token=secret' },
    { canonicalUrl: 'https://capital-ai.online:8443/' },
    { canonicalUrl: 'https://someone.example/' },
  ]) {
    assert.throws(() => buildGrowthSalesCrmDraft({ ...baseSales, ...change }));
  }
});

test('unit contribution is conditional and never authorizes CRM writes or commercial release', () => {
  const bundle = buildGrowthSalesCrmDraft({
    ...baseSales,
    economics: { priceEurCents: 25000, variableCostEurCents: 9000, evidenceRef: 'synthetic:cost-fixture' },
  });
  assert.equal(bundle.crmDraft.economics.unitContributionEurCents, 16000);
  assert.equal(bundle.crmDraft.economics.status, 'REVIEW_REQUIRED');
  assert.equal(bundle.crmDraft.writeAllowed, false);
  assert.equal(bundle.commercialRelease, 'HOLD');
});
