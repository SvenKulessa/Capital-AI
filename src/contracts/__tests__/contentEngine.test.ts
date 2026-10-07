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
