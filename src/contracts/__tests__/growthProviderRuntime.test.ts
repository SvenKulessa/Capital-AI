import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertGrowthProviderEnabled,
  assertGrowthRequestBudget,
  assertGrowthUrlContextSourceAllowed,
  assertVeoProductionAdmitted,
  buildGrowthAiUsageEvidence,
  estimateGrowthRequestCostUsd,
  resolveGrowthModel,
} from '../growthProviderRuntime.ts';

test('provider kill switch and model router fail closed', () => {
  assert.throws(
    () => assertGrowthProviderEnabled('GEMINI', { GROWTH_AI_KILL_SWITCH: 'true' }),
    /GLOBAL_KILL_SWITCH/,
  );

  assert.equal(
    resolveGrowthModel('CONTENT_DRAFTING', {}),
    'gemini-3.8-flash',
  );

  assert.equal(
    resolveGrowthModel('TTS', { GROWTH_AI_TTS_MODEL: 'gemini-3.8-flash-lite-tts' }),
    'gemini-3.8-flash-lite-tts',
  );

  assert.equal(
    resolveGrowthModel('IMAGE_GENERATION', {}),
    'gemini-3.1-flash-lite-image',
  );

  assert.equal(
    resolveGrowthModel('IMAGE_GENERATION', {
      GROWTH_AI_IMAGE_MODEL: 'gemini-nano-banana-2.1',
    }),
    'gemini-nano-banana-2.1',
  );

  assert.throws(
    () => resolveGrowthModel('TTS', { GROWTH_AI_TTS_MODEL: 'gemini-3.8-flash' }),
    /MODEL_NOT_ADMITTED/,
  );

  assert.throws(
    () => resolveGrowthModel('CONTENT_DRAFTING', {
      GROWTH_AI_DISABLED_MODELS: 'gemini-3.8-flash',
    }),
    /MODEL_KILLED/,
  );
});

test('request and monthly budgets are required and bounded', () => {
  assert.throws(
    () => assertGrowthRequestBudget(0.01, {}),
    /BUDGET_NOT_ADMITTED/,
  );

  const env = {
    GROWTH_AI_MAX_REQUEST_USD: '0.10',
    GROWTH_AI_MONTHLY_BUDGET_USD: '2.00',
    GROWTH_AI_MONTHLY_SPEND_USD: '1.50',
  };
  assert.equal(assertGrowthRequestBudget(0.09, env).remainingMonthlyUsd, 0.5);
  assert.throws(() => assertGrowthRequestBudget(0.11, env), /REQUEST_BUDGET_EXCEEDED/);
  assert.throws(
    () => assertGrowthRequestBudget(0.60, {
      ...env,
      GROWTH_AI_MAX_REQUEST_USD: '1.00',
    }),
    /MONTHLY_BUDGET_EXCEEDED/,
  );
});

test('cost estimates cover text, image, TTS and Veo', () => {
  const textCost = estimateGrowthRequestCostUsd({
    model: 'gemini-3.8-flash',
    inputText: 'x'.repeat(4_000),
    maxOutputTokens: 1_000,
  });
  assert.ok(textCost > 0);

  assert.equal(
    estimateGrowthRequestCostUsd({
      model: 'gemini-3.1-flash-lite-image',
      inputText: 'asset',
      imageSize: '1K',
    }) > 0.0336,
    true,
  );

  assert.throws(
    () => estimateGrowthRequestCostUsd({
      model: 'gemini-3.1-flash-lite-image',
      inputText: 'asset',
      imageSize: '2K',
    }),
    /IMAGE_SIZE_NOT_SUPPORTED/,
  );

  assert.throws(
    () => estimateGrowthRequestCostUsd({
      model: 'gemini-nano-banana-2.1',
      inputText: 'asset',
      imageSize: '2K',
    }),
    /PRICEBOOK_NOT_VERIFIED/,
  );

  assert.equal(
    estimateGrowthRequestCostUsd({
      model: 'veo-3.1-generate-preview',
      videoSeconds: 8,
      videoResolution: '720p',
    }),
    3.2,
  );
});

test('usage evidence meters URL Context tool tokens separately', () => {
  const evidence = buildGrowthAiUsageEvidence('gemini-3.8-flash', {
    input_tokens: 1_000,
    output_tokens: 500,
    tool_use_input_tokens: 10_000,
  });

  assert.equal(evidence.inputTokens, 1_000);
  assert.equal(evidence.toolUseInputTokens, 10_000);
  assert.ok(evidence.estimatedCostUsd > 0);
});

test('URL Context is limited to public CAPITAL-AI sources and immutable GitHub refs', () => {
  assert.equal(
    assertGrowthUrlContextSourceAllowed('https://capital-ai.online/documentary').hostname,
    'capital-ai.online',
  );

  assert.throws(
    () => assertGrowthUrlContextSourceAllowed('https://capital-ai.online/profile'),
    /PRIVATE_PATH/,
  );

  assert.throws(
    () => assertGrowthUrlContextSourceAllowed(
      'https://github.com/SvenKulessa/Capital-AI/blob/main/README.md',
    ),
    /GITHUB_SHA_REQUIRED/,
  );

  assert.equal(
    assertGrowthUrlContextSourceAllowed(
      'https://github.com/SvenKulessa/Capital-AI/blob/4fa3e3f92547cd6356f46490a38e9b7515f69a6d/README.md',
    ).hostname,
    'github.com',
  );

  assert.throws(
    () => assertGrowthUrlContextSourceAllowed('https://example.com/'),
    /SOURCE_NOT_ALLOWED/,
  );
});

test('Veo production admission requires complete current evidence', () => {
  assert.throws(() => assertVeoProductionAdmitted({
    model: 'veo-3.1-generate-preview',
    productionAllowed: true,
  }));

  const admitted = assertVeoProductionAdmitted({
    model: 'veo-3.1-generate-preview',
    providerStatusVerifiedAt: '2026-10-06T19:30:00.000Z',
    pricingVerifiedAt: '2026-10-06T19:30:00.000Z',
    termsVerifiedAt: '2026-10-06T19:30:00.000Z',
    budgetEvidenceRef: 'cost:veo:2026-10-06',
    rightsEvidenceRef: 'rights:asset:123',
    ownerApprovalRef: 'owner:approval:123',
    productionAllowed: true,
  });

  assert.equal(admitted.productionAllowed, true);
});
