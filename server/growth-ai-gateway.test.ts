import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GrowthAiDraftRequestSchema,
  createGeminiMarketingDraft,
  parseGrowthMarketingDraftJson,
} from './growth-ai-gateway.ts';
import { GROWTH_AI_PROMOTION_POLICY_VERSION } from '../src/contracts/growthAiPromotion.ts';

const validDraft = {
  policyVersion: GROWTH_AI_PROMOTION_POLICY_VERSION,
  productId: 'capital-ai',
  sourceSha: 'c13de16d8af006c37b08db616d1016173c99e7db',
  locale: 'de-DE',
  canonicalUrl: 'https://capital-ai.online/',
  channels: ['WEBSITE'],
  headline: 'CAPITAL-AI',
  summary: 'Evidence-bound draft.',
  callToAction: 'Mehr erfahren.',
  claims: [{
    text: 'CAPITAL-AI veröffentlicht technische Dokumentation.',
    kind: 'PRODUCT_FACT',
    evidenceUrls: ['https://capital-ai.online/documentary'],
  }],
  disclosures: ['Draft-only.'],
  generatedBy: {
    provider: 'GEMINI',
    model: 'gemini-3.8-flash',
  },
};

test('growth AI request is strict and bounds URL Context input to twenty URLs', () => {
  const parsed = GrowthAiDraftRequestSchema.parse({
    productId: 'capital-ai',
    sourceSha: validDraft.sourceSha,
    locale: 'de-DE',
    canonicalUrl: validDraft.canonicalUrl,
    channels: ['WEBSITE'],
    brief: 'Create a concise product summary.',
    sourceUrls: ['https://capital-ai.online/documentary'],
  });

  assert.equal(parsed.sourceUrls.length, 1);

  assert.throws(() => GrowthAiDraftRequestSchema.parse({
    ...parsed,
    unexpectedField: true,
  }));

  assert.throws(() => GrowthAiDraftRequestSchema.parse({
    ...parsed,
    sourceUrls: Array.from({ length: 21 }, (_, index) => `https://example.com/${index}`),
  }));
});

test('Gemini output parser rejects non-JSON, unknown fields and evidence-free claims', () => {
  assert.equal(
    parseGrowthMarketingDraftJson(JSON.stringify(validDraft)).generatedBy.provider,
    'GEMINI',
  );

  assert.throws(
    () => parseGrowthMarketingDraftJson('not-json'),
    /GROWTH_AI_INVALID_JSON/,
  );

  assert.throws(() => parseGrowthMarketingDraftJson(JSON.stringify({
    ...validDraft,
    publicationAuthority: true,
  })));

  assert.throws(() => parseGrowthMarketingDraftJson(JSON.stringify({
    ...validDraft,
    claims: [{
      text: 'Unsupported statement',
      kind: 'MARKETING',
      evidenceUrls: [],
    }],
  })));
});


test('production Gemini calls stay blocked while zero-cost policy is not admitted', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnabled = process.env.GROWTH_AI_ENABLED;
  const previousKey = process.env.GEMINI_API_KEY;
  try {
    process.env.NODE_ENV = 'production';
    process.env.GROWTH_AI_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
    await assert.rejects(
      () => createGeminiMarketingDraft({
        productId: 'capital-ai',
        sourceSha: validDraft.sourceSha,
        locale: 'de-DE',
        canonicalUrl: validDraft.canonicalUrl,
        channels: ['WEBSITE'],
        brief: 'Draft only.',
        sourceUrls: [],
      }),
      /GROWTH_AI_PRODUCTION_NOT_ADMITTED/,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
    if (previousEnabled === undefined) delete process.env.GROWTH_AI_ENABLED; else process.env.GROWTH_AI_ENABLED = previousEnabled;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
  }
});
