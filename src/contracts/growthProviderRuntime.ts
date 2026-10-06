import { z } from 'zod';

import type { GrowthCapability } from './growthAiPromotion.ts';

export const GROWTH_PROVIDER_RUNTIME_POLICY_VERSION = 'GROWTH_PROVIDER_RUNTIME_POLICY@1' as const;
export const GROWTH_AI_PRICEBOOK_VERSION = 'GROWTH_AI_PRICEBOOK@2026-10-06' as const;

export const GrowthModelIdSchema = z.enum([
  'gemini-3.8-flash',
  'gemini-nano-banana-2.1',
  'gemini-3.1-flash-lite-image',
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts',
  'veo-3.1-generate-preview',
]);
export type GrowthModelId = z.infer<typeof GrowthModelIdSchema>;

export const GrowthImageSizeSchema = z.enum(['0.5K', '1K', '2K', '4K']);
export type GrowthImageSize = z.infer<typeof GrowthImageSizeSchema>;

export const GrowthVideoResolutionSchema = z.enum(['720p', '1080p', '4k']);
export type GrowthVideoResolution = z.infer<typeof GrowthVideoResolutionSchema>;

export const GROWTH_MODEL_ROUTER = {
  CONTENT_DRAFTING: {
    preferred: 'gemini-3.8-flash',
    allowed: ['gemini-3.8-flash'],
    envKey: 'GROWTH_AI_CONTENT_MODEL',
  },
  URL_CONTEXT: {
    preferred: 'gemini-3.8-flash',
    allowed: ['gemini-3.8-flash'],
    envKey: 'GROWTH_AI_URL_CONTEXT_MODEL',
  },
  IMAGE_GENERATION: {
    preferred: 'gemini-3.1-flash-lite-image',
    allowed: ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1'],
    envKey: 'GROWTH_AI_IMAGE_MODEL',
  },
  TTS: {
    preferred: 'gemini-3.8-flash-tts',
    allowed: ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'],
    envKey: 'GROWTH_AI_TTS_MODEL',
  },
  VIDEO_GENERATION: {
    preferred: 'veo-3.1-generate-preview',
    allowed: ['veo-3.1-generate-preview'],
    envKey: 'GROWTH_AI_VIDEO_MODEL',
  },
} as const satisfies Partial<Record<GrowthCapability, {
  preferred: GrowthModelId;
  allowed: readonly GrowthModelId[];
  envKey: string;
}>>;

export const GROWTH_AI_PRICEBOOK = {
  'gemini-3.8-flash': {
    inputUsdPerMillionTokens: 0.75,
    outputUsdPerMillionTokens: 3.75,
  },
  'gemini-nano-banana-2.1': {
    priceState: 'UNVERIFIED_ON_2026-10-06',
  },
  'gemini-3.1-flash-lite-image': {
    inputUsdPerMillionTokens: 0.25,
    textOutputUsdPerMillionTokens: 1.50,
    imageOutputUsd: {
      '1K': 0.0336,
    },
  },
  'gemini-3.8-flash-tts': {
    inputUsdPerMillionTokens: 0.50,
    audioOutputUsdPerMillionTokens: 9.00,
    audioTokensPerSecond: 25,
  },
  'gemini-3.8-flash-lite-tts': {
    inputUsdPerMillionTokens: 0.50,
    audioOutputUsdPerMillionTokens: 6.00,
    audioTokensPerSecond: 25,
  },
  'veo-3.1-generate-preview': {
    videoUsdPerSecond: {
      '720p': 0.40,
      '1080p': 0.40,
      '4k': 0.60,
    },
  },
} as const;

export type GrowthRuntimeEnv = Record<string, string | undefined>;

function parseFiniteNonNegative(value: string | undefined, fallback = 0): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('GROWTH_AI_INVALID_BUDGET_CONFIG');
  return parsed;
}

function csvSet(value: string | undefined): Set<string> {
  return new Set((value ?? '').split(',').map((item) => item.trim()).filter(Boolean));
}

export function assertGrowthProviderEnabled(
  provider: 'GEMINI',
  env: GrowthRuntimeEnv = process.env,
): void {
  if (env.GROWTH_AI_KILL_SWITCH === 'true') {
    throw new Error('GROWTH_AI_GLOBAL_KILL_SWITCH');
  }

  if (csvSet(env.GROWTH_AI_DISABLED_PROVIDERS).has(provider)) {
    throw new Error('GROWTH_AI_PROVIDER_KILLED');
  }
}

export function resolveGrowthModel(
  capability: GrowthCapability,
  env: GrowthRuntimeEnv = process.env,
): GrowthModelId {
  assertGrowthProviderEnabled('GEMINI', env);
  const route = GROWTH_MODEL_ROUTER[capability as keyof typeof GROWTH_MODEL_ROUTER];
  if (!route) throw new Error('GROWTH_AI_CAPABILITY_HAS_NO_MODEL_ROUTE');

  const configured = env[route.envKey]?.trim() || route.preferred;
  const parsed = GrowthModelIdSchema.parse(configured);

  if (!(route.allowed as readonly string[]).includes(parsed)) {
    throw new Error('GROWTH_AI_MODEL_NOT_ADMITTED');
  }

  if (csvSet(env.GROWTH_AI_DISABLED_MODELS).has(parsed)) {
    throw new Error('GROWTH_AI_MODEL_KILLED');
  }

  return parsed;
}

export interface GrowthRequestBudget {
  maxRequestUsd: number;
  monthlyBudgetUsd: number;
  monthlySpendUsd: number;
  remainingMonthlyUsd: number;
}

export function readGrowthRequestBudget(
  env: GrowthRuntimeEnv = process.env,
): GrowthRequestBudget {
  const maxRequestUsd = parseFiniteNonNegative(env.GROWTH_AI_MAX_REQUEST_USD);
  const monthlyBudgetUsd = parseFiniteNonNegative(env.GROWTH_AI_MONTHLY_BUDGET_USD);
  const monthlySpendUsd = parseFiniteNonNegative(env.GROWTH_AI_MONTHLY_SPEND_USD);

  return {
    maxRequestUsd,
    monthlyBudgetUsd,
    monthlySpendUsd,
    remainingMonthlyUsd: Math.max(0, monthlyBudgetUsd - monthlySpendUsd),
  };
}

export function assertGrowthRequestBudget(
  estimatedCostUsd: number,
  env: GrowthRuntimeEnv = process.env,
): GrowthRequestBudget {
  if (!Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) {
    throw new Error('GROWTH_AI_INVALID_COST_ESTIMATE');
  }

  const budget = readGrowthRequestBudget(env);
  if (budget.maxRequestUsd <= 0 || budget.monthlyBudgetUsd <= 0) {
    throw new Error('GROWTH_AI_BUDGET_NOT_ADMITTED');
  }
  if (estimatedCostUsd > budget.maxRequestUsd) {
    throw new Error('GROWTH_AI_REQUEST_BUDGET_EXCEEDED');
  }
  if (estimatedCostUsd > budget.remainingMonthlyUsd) {
    throw new Error('GROWTH_AI_MONTHLY_BUDGET_EXCEEDED');
  }
  return budget;
}

export function estimateTextTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateGrowthRequestCostUsd(input: {
  model: GrowthModelId;
  inputText?: string;
  maxOutputTokens?: number;
  urlContextUrls?: number;
  imageSize?: GrowthImageSize;
  maxAudioSeconds?: number;
  videoSeconds?: number;
  videoResolution?: GrowthVideoResolution;
}): number {
  const inputTokens = estimateTextTokens(input.inputText ?? '');
  const urlToolTokens = Math.max(0, input.urlContextUrls ?? 0) * 100_000;

  switch (input.model) {
    case 'gemini-3.8-flash': {
      const price = GROWTH_AI_PRICEBOOK[input.model];
      return ((inputTokens + urlToolTokens) / 1_000_000) * price.inputUsdPerMillionTokens
        + (Math.max(0, input.maxOutputTokens ?? 2048) / 1_000_000) * price.outputUsdPerMillionTokens;
    }
    case 'gemini-nano-banana-2.1':
      throw new Error('GROWTH_AI_PRICEBOOK_NOT_VERIFIED');
    case 'gemini-3.1-flash-lite-image': {
      const price = GROWTH_AI_PRICEBOOK[input.model];
      const imageSize = input.imageSize ?? '1K';
      if (imageSize !== '1K') throw new Error('GROWTH_AI_IMAGE_SIZE_NOT_SUPPORTED');
      return ((inputTokens + urlToolTokens) / 1_000_000) * price.inputUsdPerMillionTokens
        + price.imageOutputUsd['1K'];
    }
    case 'gemini-3.8-flash-tts':
    case 'gemini-3.8-flash-lite-tts': {
      const price = GROWTH_AI_PRICEBOOK[input.model];
      const audioTokens = Math.max(0, input.maxAudioSeconds ?? 30) * price.audioTokensPerSecond;
      return (inputTokens / 1_000_000) * price.inputUsdPerMillionTokens
        + (audioTokens / 1_000_000) * price.audioOutputUsdPerMillionTokens;
    }
    case 'veo-3.1-generate-preview': {
      const price = GROWTH_AI_PRICEBOOK[input.model];
      const resolution = input.videoResolution ?? '720p';
      return Math.max(0, input.videoSeconds ?? 8) * price.videoUsdPerSecond[resolution];
    }
  }
}

export interface GrowthAiUsageEvidence {
  policyVersion: typeof GROWTH_PROVIDER_RUNTIME_POLICY_VERSION;
  pricebookVersion: typeof GROWTH_AI_PRICEBOOK_VERSION;
  provider: 'GEMINI';
  model: GrowthModelId;
  inputTokens: number;
  outputTokens: number;
  toolUseInputTokens: number;
  estimatedCostUsd: number;
}

function readNumber(record: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}

export function buildGrowthAiUsageEvidence(
  model: GrowthModelId,
  usage: unknown,
): GrowthAiUsageEvidence {
  const record = (usage && typeof usage === 'object' ? usage : {}) as Record<string, unknown>;
  const inputTokens = readNumber(record, ['input_tokens', 'inputTokens', 'promptTokenCount']);
  const outputTokens = readNumber(record, ['output_tokens', 'outputTokens', 'candidatesTokenCount']);
  const toolUseInputTokens = readNumber(record, ['tool_use_input_tokens', 'toolUseInputTokens']);

  let estimatedCostUsd = 0;
  if (model === 'gemini-3.8-flash') {
    const price = GROWTH_AI_PRICEBOOK[model];
    estimatedCostUsd =
      ((inputTokens + toolUseInputTokens) / 1_000_000) * price.inputUsdPerMillionTokens
      + (outputTokens / 1_000_000) * price.outputUsdPerMillionTokens;
  } else if (model === 'gemini-3.8-flash-tts' || model === 'gemini-3.8-flash-lite-tts') {
    const price = GROWTH_AI_PRICEBOOK[model];
    estimatedCostUsd =
      (inputTokens / 1_000_000) * price.inputUsdPerMillionTokens
      + (outputTokens / 1_000_000) * price.audioOutputUsdPerMillionTokens;
  }

  return {
    policyVersion: GROWTH_PROVIDER_RUNTIME_POLICY_VERSION,
    pricebookVersion: GROWTH_AI_PRICEBOOK_VERSION,
    provider: 'GEMINI',
    model,
    inputTokens,
    outputTokens,
    toolUseInputTokens,
    estimatedCostUsd,
  };
}

const CAPITAL_AI_PRIVATE_PATH_PREFIXES = [
  '/api',
  '/auth',
  '/login',
  '/profile',
  '/account',
  '/admin',
  '/settings',
  '/checkout',
] as const;

export function assertGrowthUrlContextSourceAllowed(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('GROWTH_URL_CONTEXT_SOURCE_NOT_ALLOWED');
  }

  const host = url.hostname.toLowerCase();
  if (host === 'capital-ai.online' || host === 'www.capital-ai.online') {
    if (CAPITAL_AI_PRIVATE_PATH_PREFIXES.some((prefix) =>
      url.pathname === prefix || url.pathname.startsWith(prefix + '/'))) {
      throw new Error('GROWTH_URL_CONTEXT_PRIVATE_PATH');
    }
    return url;
  }

  if (host === 'github.com') {
    const match = url.pathname.match(
      /^\/SvenKulessa\/Capital-AI\/(?:blob|commit)\/([a-f0-9]{40})\/(?:.+)$/i,
    );
    if (!match) throw new Error('GROWTH_URL_CONTEXT_GITHUB_SHA_REQUIRED');
    return url;
  }

  if (host === 'raw.githubusercontent.com') {
    const match = url.pathname.match(
      /^\/SvenKulessa\/Capital-AI\/([a-f0-9]{40})\/(?:.+)$/i,
    );
    if (!match) throw new Error('GROWTH_URL_CONTEXT_GITHUB_SHA_REQUIRED');
    return url;
  }

  throw new Error('GROWTH_URL_CONTEXT_SOURCE_NOT_ALLOWED');
}

export const VeoProductionAdmissionSchema = z.object({
  model: z.literal('veo-3.1-generate-preview'),
  providerStatusVerifiedAt: z.string().datetime(),
  pricingVerifiedAt: z.string().datetime(),
  termsVerifiedAt: z.string().datetime(),
  budgetEvidenceRef: z.string().min(1),
  rightsEvidenceRef: z.string().min(1),
  ownerApprovalRef: z.string().min(1),
  productionAllowed: z.literal(true),
}).strict();

export type VeoProductionAdmission = z.infer<typeof VeoProductionAdmissionSchema>;

export function assertVeoProductionAdmitted(value: unknown): VeoProductionAdmission {
  return VeoProductionAdmissionSchema.parse(value);
}
