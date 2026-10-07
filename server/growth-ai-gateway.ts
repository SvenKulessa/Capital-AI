import { createHash } from 'node:crypto';

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import {
  GROWTH_AI_PROMOTION_POLICY_VERSION,
  GrowthMarketingDraftSchema,
  assertGrowthCapabilityAllowed,
  type GrowthCapability,
  type GrowthMarketingDraft,
} from '../src/contracts/growthAiPromotion.ts';
import {
  GROWTH_MEDIA_APPROVAL_POLICY_VERSION,
  GrowthGeneratedAssetEvidenceSchema,
  assertGrowthMediaApproval,
  type GrowthGeneratedAssetEvidence,
} from '../src/contracts/growthMediaApproval.ts';
import {
  GrowthImageSizeSchema,
  assertGrowthRequestBudget,
  assertGrowthUrlContextSourceAllowed,
  buildGrowthAiUsageEvidence,
  estimateGrowthRequestCostUsd,
  resolveGrowthModel,
  type GrowthAiUsageEvidence,
  type GrowthRuntimeEnv,
} from '../src/contracts/growthProviderRuntime.ts';
import { assertPromptSafe } from './prompt-injection-guard.mjs';
import { ZERO_COST_API_THRESHOLDS } from '../src/contracts/zeroCostApiThresholds.ts';

export const GrowthAiDraftRequestSchema = z.object({
  productId: z.string().min(1).max(100),
  sourceSha: z.string().regex(/^[a-f0-9]{40,64}$/),
  locale: z.enum(['de-DE', 'en-US', 'en-GB']).default('de-DE'),
  canonicalUrl: z.string().url(),
  channels: z.array(z.enum([
    'WEBSITE',
    'LINKEDIN',
    'YOUTUBE',
    'MASTODON',
    'REDDIT',
    'PODCAST',
    'EMAIL',
  ])).min(1).max(7),
  brief: z.string().min(1).max(6000),
  sourceUrls: z.array(z.string().url()).max(5).default([]),
}).strict();

export type GrowthAiDraftRequest = z.infer<typeof GrowthAiDraftRequestSchema>;

export const GrowthImageDraftRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:5', '5:4']).default('1:1'),
  imageSize: GrowthImageSizeSchema.default('1K'),
}).strict();

export const GrowthTtsDraftRequestSchema = z.object({
  text: z.string().min(1).max(8000),
  voice: z.string().min(1).max(200),
  style: z.string().min(1).max(500).optional(),
  maxAudioSeconds: z.number().int().min(1).max(300).default(60),
}).strict();

export interface GrowthAiDraftResult {
  draft: GrowthMarketingDraft;
  usage: GrowthAiUsageEvidence;
  estimatedPreflightCostUsd: number;
}

export interface GrowthGeneratedAssetResult {
  dataBase64: string;
  evidence: GrowthGeneratedAssetEvidence;
  usage: GrowthAiUsageEvidence;
  estimatedPreflightCostUsd: number;
}

export function parseGrowthMarketingDraftJson(raw: string): GrowthMarketingDraft {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error('GROWTH_AI_INVALID_JSON');
  }

  return GrowthMarketingDraftSchema.parse(decoded);
}

export function assertDraftBoundToRequest(
  draft: GrowthMarketingDraft,
  input: GrowthAiDraftRequest,
  model: string,
): void {
  if (draft.productId !== input.productId ||
      draft.sourceSha !== input.sourceSha ||
      draft.locale !== input.locale ||
      draft.canonicalUrl !== input.canonicalUrl ||
      draft.generatedBy.model !== model) {
    throw new Error('GROWTH_AI_OUTPUT_BINDING_MISMATCH');
  }

  const requestedChannels = [...input.channels].sort();
  const returnedChannels = [...draft.channels].sort();
  if (requestedChannels.length !== returnedChannels.length ||
      requestedChannels.some((channel, index) => channel !== returnedChannels[index])) {
    throw new Error('GROWTH_AI_OUTPUT_BINDING_MISMATCH');
  }

  const allowedEvidenceUrls = new Set([input.canonicalUrl, ...input.sourceUrls]);
  for (const claim of draft.claims) {
    if (claim.evidenceUrls.some((url) => !allowedEvidenceUrls.has(url))) {
      throw new Error('GROWTH_AI_UNBOUND_EVIDENCE_URL');
    }
  }
}

function assertGatewayEnabled(env: GrowthRuntimeEnv): void {
  if (env.GROWTH_AI_ENABLED !== 'true') {
    throw new Error('GROWTH_AI_DISABLED');
  }
}

function assertProductionPolicy(
  capability: GrowthCapability,
  env: GrowthRuntimeEnv,
): void {
  if (env.NODE_ENV !== 'production') return;

  const capabilityPolicy = assertGrowthCapabilityAllowed(capability, 'DRAFT');
  const zeroCostPolicy = ZERO_COST_API_THRESHOLDS.GEMINI_GENERATIVE;
  const paidBudget = zeroCostPolicy.thresholds.paidBudgetEurPerMonth;

  if (!capabilityPolicy.productionEligible ||
      !zeroCostPolicy.defaultEnabled ||
      paidBudget.hardStop <= 0) {
    throw new Error('GROWTH_AI_PRODUCTION_NOT_ADMITTED');
  }
}

function getGeminiClient(env: GrowthRuntimeEnv): GoogleGenAI {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GROWTH_AI_PROVIDER_NOT_CONFIGURED');
  return new GoogleGenAI({ apiKey });
}

function buildDraftPrompt(input: GrowthAiDraftRequest, model: string): string {
  const safeBrief = assertPromptSafe(input.brief);
  const safeUrls = input.sourceUrls.map((url) => assertPromptSafe(url));

  return [
    'Create a factual marketing draft for an owned CAPITAL-AI product.',
    'Return exactly one JSON object and no markdown fences or commentary.',
    `policyVersion must equal ${GROWTH_AI_PROMOTION_POLICY_VERSION}.`,
    `productId: ${input.productId}`,
    `sourceSha: ${input.sourceSha}`,
    `locale: ${input.locale}`,
    `canonicalUrl: ${input.canonicalUrl}`,
    `channels: ${JSON.stringify(input.channels)}`,
    `generatedBy.provider must be "GEMINI" and generatedBy.model must be "${model}".`,
    'Every claim must contain one or more evidenceUrls.',
    'Do not invent performance, regulatory, security, customer, ranking, revenue or investment claims.',
    'Do not claim publication authority. This output is draft-only.',
    'Expected top-level keys: policyVersion, productId, sourceSha, locale, canonicalUrl, channels, headline, summary, callToAction, claims, disclosures, generatedBy.',
    safeUrls.length > 0 ? `Permitted source URLs: ${JSON.stringify(safeUrls)}` : 'No external source URLs were supplied.',
    `Brief: ${safeBrief}`,
  ].join('\n');
}

function assertActualCostWithinConfiguredBudget(
  usage: GrowthAiUsageEvidence,
  preflightEstimateUsd: number,
  env: GrowthRuntimeEnv,
): void {
  const postflightCost = Math.max(usage.estimatedCostUsd, preflightEstimateUsd);
  assertGrowthRequestBudget(postflightCost, env);
}

export async function createGeminiMarketingDraftWithUsage(
  rawInput: GrowthAiDraftRequest,
  env: GrowthRuntimeEnv = process.env,
): Promise<GrowthAiDraftResult> {
  assertGatewayEnabled(env);
  assertGrowthCapabilityAllowed('CONTENT_DRAFTING', 'DRAFT');
  assertProductionPolicy('CONTENT_DRAFTING', env);

  const input = GrowthAiDraftRequestSchema.parse(rawInput);
  const sourceUrls = input.sourceUrls.map((url) => assertGrowthUrlContextSourceAllowed(url).toString());
  const normalizedInput = { ...input, sourceUrls };
  const model = resolveGrowthModel('CONTENT_DRAFTING', env);

  const estimatedPreflightCostUsd = estimateGrowthRequestCostUsd({
    model,
    inputText: buildDraftPrompt(normalizedInput, model),
    maxOutputTokens: 2_048,
    urlContextUrls: normalizedInput.sourceUrls.length,
  });
  assertGrowthRequestBudget(estimatedPreflightCostUsd, env);

  const tools: Array<{ type: 'url_context' }> = [];
  if (normalizedInput.sourceUrls.length > 0) {
    assertGrowthCapabilityAllowed('URL_CONTEXT', 'DRAFT');
    resolveGrowthModel('URL_CONTEXT', env);
    tools.push({ type: 'url_context' });
  }

  const ai = getGeminiClient(env);
  const response = await ai.interactions.create({
    model,
    input: buildDraftPrompt(normalizedInput, model),
    ...(tools.length > 0 ? { tools } : {}),
  });

  const output = response.output_text?.trim();
  if (!output) throw new Error('GROWTH_AI_EMPTY_RESPONSE');

  const draft = parseGrowthMarketingDraftJson(output);
  assertDraftBoundToRequest(draft, normalizedInput, model);

  const usage = buildGrowthAiUsageEvidence(
    model,
    (response as unknown as { usage?: unknown }).usage,
  );
  assertActualCostWithinConfiguredBudget(usage, estimatedPreflightCostUsd, env);

  return { draft, usage, estimatedPreflightCostUsd };
}

export async function createGeminiMarketingDraft(
  rawInput: GrowthAiDraftRequest,
  env: GrowthRuntimeEnv = process.env,
): Promise<GrowthMarketingDraft> {
  return (await createGeminiMarketingDraftWithUsage(rawInput, env)).draft;
}

export async function createGeminiImageDraft(
  rawInput: unknown,
  rawApproval: unknown,
  env: GrowthRuntimeEnv = process.env,
): Promise<GrowthGeneratedAssetResult> {
  assertGatewayEnabled(env);
  assertGrowthCapabilityAllowed('IMAGE_GENERATION', 'DRAFT');
  assertProductionPolicy('IMAGE_GENERATION', env);

  const input = GrowthImageDraftRequestSchema.parse(rawInput);
  const approval = assertGrowthMediaApproval(rawApproval, 'IMAGE_GENERATION');
  const model = resolveGrowthModel('IMAGE_GENERATION', env);

  const estimatedPreflightCostUsd = estimateGrowthRequestCostUsd({
    model,
    inputText: input.prompt,
    imageSize: input.imageSize,
  });
  assertGrowthRequestBudget(estimatedPreflightCostUsd, env);

  const ai = getGeminiClient(env);
  const response = await ai.interactions.create({
    model,
    input: assertPromptSafe(input.prompt),
    response_format: {
      type: 'image',
      mime_type: 'image/png',
      aspect_ratio: input.aspectRatio,
      image_size: input.imageSize,
    },
  } as never);

  const responseView = response as unknown as {
    output_image?: { data?: string; mime_type?: string };
    usage?: unknown;
  };
  const dataBase64 = responseView.output_image?.data;
  if (!dataBase64) throw new Error('GROWTH_AI_IMAGE_EMPTY_RESPONSE');

  const sha256 = createHash('sha256')
    .update(Buffer.from(dataBase64, 'base64'))
    .digest('hex');

  const evidence = GrowthGeneratedAssetEvidenceSchema.parse({
    policyVersion: GROWTH_MEDIA_APPROVAL_POLICY_VERSION,
    capability: 'IMAGE_GENERATION',
    provider: 'GEMINI',
    model,
    mimeType: responseView.output_image?.mime_type ?? 'image/png',
    sha256,
    approvalRef: approval.approvalEvidenceRef,
    sourceRightsEvidenceRef: approval.sourceRightsEvidenceRef,
    outputCommercialUseEvidenceRef: approval.outputCommercialUseEvidenceRef,
    brandApprovalRef: approval.brandApprovalRef,
    generatedAt: new Date().toISOString(),
    draftOnly: true,
  });

  const usage = buildGrowthAiUsageEvidence(model, responseView.usage);
  assertActualCostWithinConfiguredBudget(usage, estimatedPreflightCostUsd, env);

  return { dataBase64, evidence, usage, estimatedPreflightCostUsd };
}

export async function createGeminiTtsDraft(
  rawInput: unknown,
  rawApproval: unknown,
  env: GrowthRuntimeEnv = process.env,
): Promise<GrowthGeneratedAssetResult> {
  assertGatewayEnabled(env);
  assertGrowthCapabilityAllowed('TTS', 'DRAFT');
  assertProductionPolicy('TTS', env);

  const input = GrowthTtsDraftRequestSchema.parse(rawInput);
  const approval = assertGrowthMediaApproval(rawApproval, 'TTS');
  if (approval.voice?.voiceId !== input.voice) {
    throw new Error('GROWTH_TTS_VOICE_BINDING_MISMATCH');
  }

  const model = resolveGrowthModel('TTS', env);
  const estimatedPreflightCostUsd = estimateGrowthRequestCostUsd({
    model,
    inputText: input.text,
    maxAudioSeconds: input.maxAudioSeconds,
  });
  assertGrowthRequestBudget(estimatedPreflightCostUsd, env);

  const ai = getGeminiClient(env);
  const textBlock: Record<string, unknown> = {
    type: 'text',
    text: assertPromptSafe(input.text),
  };
  if (input.style) {
    textBlock.annotations = [{
      type: 'speech_metadata',
      style: assertPromptSafe(input.style),
    }];
  }

  const response = await ai.interactions.create({
    model,
    input: [{
      type: 'user_input',
      content: [textBlock],
    }],
    response_format: { type: 'audio' },
    generation_config: {
      speech_config: [{ voice: input.voice }],
    },
  } as never);

  const responseView = response as unknown as {
    output_audio?: { data?: string; mime_type?: string };
    usage?: unknown;
  };
  const dataBase64 = responseView.output_audio?.data;
  if (!dataBase64) throw new Error('GROWTH_AI_TTS_EMPTY_RESPONSE');

  const sha256 = createHash('sha256')
    .update(Buffer.from(dataBase64, 'base64'))
    .digest('hex');

  const evidence = GrowthGeneratedAssetEvidenceSchema.parse({
    policyVersion: GROWTH_MEDIA_APPROVAL_POLICY_VERSION,
    capability: 'TTS',
    provider: 'GEMINI',
    model,
    mimeType: responseView.output_audio?.mime_type ?? 'audio/wav',
    sha256,
    approvalRef: approval.approvalEvidenceRef,
    sourceRightsEvidenceRef: approval.sourceRightsEvidenceRef,
    outputCommercialUseEvidenceRef: approval.outputCommercialUseEvidenceRef,
    brandApprovalRef: approval.brandApprovalRef,
    generatedAt: new Date().toISOString(),
    draftOnly: true,
  });

  const usage = buildGrowthAiUsageEvidence(model, responseView.usage);
  assertActualCostWithinConfiguredBudget(usage, estimatedPreflightCostUsd, env);

  return { dataBase64, evidence, usage, estimatedPreflightCostUsd };
}
