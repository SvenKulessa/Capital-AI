import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import {
  GROWTH_AI_PROMOTION_POLICY_VERSION,
  GrowthMarketingDraftSchema,
  assertGrowthCapabilityAllowed,
  type GrowthMarketingDraft,
} from '../src/contracts/growthAiPromotion.ts';
import { assertPromptSafe } from './prompt-injection-guard.mjs';
import { ZERO_COST_API_THRESHOLDS } from '../src/contracts/zeroCostApiThresholds.ts';

const DEFAULT_MODEL = 'gemini-3.8-flash';
const ALLOWED_MODELS = new Set([DEFAULT_MODEL]);

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
  sourceUrls: z.array(z.string().url()).max(20).default([]),
}).strict();

export type GrowthAiDraftRequest = z.infer<typeof GrowthAiDraftRequestSchema>;

export function parseGrowthMarketingDraftJson(raw: string): GrowthMarketingDraft {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error('GROWTH_AI_INVALID_JSON');
  }

  return GrowthMarketingDraftSchema.parse(decoded);
}

function resolveModel(): string {
  const configured = process.env.GROWTH_AI_MODEL?.trim() || DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(configured)) {
    throw new Error('GROWTH_AI_MODEL_NOT_ADMITTED');
  }
  return configured;
}

function assertGatewayEnabled(): void {
  if (process.env.GROWTH_AI_ENABLED !== 'true') {
    throw new Error('GROWTH_AI_DISABLED');
  }
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

export async function createGeminiMarketingDraft(
  rawInput: GrowthAiDraftRequest,
): Promise<GrowthMarketingDraft> {
  assertGatewayEnabled();
  const contentPolicy = assertGrowthCapabilityAllowed('CONTENT_DRAFTING', 'DRAFT');
  if (process.env.NODE_ENV === 'production') {
    const zeroCostPolicy = ZERO_COST_API_THRESHOLDS.GEMINI_GENERATIVE;
    const paidBudget = zeroCostPolicy.thresholds.paidBudgetEurPerMonth;
    if (!contentPolicy.productionEligible ||
        !zeroCostPolicy.defaultEnabled ||
        paidBudget.hardStop <= 0) {
      throw new Error('GROWTH_AI_PRODUCTION_NOT_ADMITTED');
    }
  }

  const input = GrowthAiDraftRequestSchema.parse(rawInput);
  const model = resolveModel();
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('GROWTH_AI_PROVIDER_NOT_CONFIGURED');
  }

  const tools: Array<{ type: 'url_context' }> = [];
  if (input.sourceUrls.length > 0) {
    assertGrowthCapabilityAllowed('URL_CONTEXT', 'DRAFT');
    tools.push({ type: 'url_context' });
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.interactions.create({
    model,
    input: buildDraftPrompt(input, model),
    ...(tools.length > 0 ? { tools } : {}),
  });

  const output = response.output_text?.trim();
  if (!output) {
    throw new Error('GROWTH_AI_EMPTY_RESPONSE');
  }

  return parseGrowthMarketingDraftJson(output);
}
