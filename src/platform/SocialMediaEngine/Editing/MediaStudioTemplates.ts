import {
  MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
  MEDIA_PROJECT_SCHEMA_VERSION,
  type MediaProjectV2,
} from '../Contracts/MediaProject';
import { validateMediaProjectV2 } from '../Contracts/MediaProjectValidation';
import {
  MEDIA_STUDIO_CANVAS_PRESETS,
  type MediaStudioCanvasPreset,
} from './MediaProjectEditing';

export interface CreateMediaStudioProjectOptions {
  title?: string;
  slug?: string;
  aspectRatio?: MediaStudioCanvasPreset;
  durationSeconds?: number;
}

function assertValid(project: MediaProjectV2, templateName: string): MediaProjectV2 {
  const validation = validateMediaProjectV2(project);
  if (!validation.ok) {
    throw new Error(`${templateName} template is invalid: ${validation.errors.map((error) => error.code).join(', ')}`);
  }
  return project;
}

/**
 * Provider-neutral Social Media Engine draft.
 * No TTS/ASR model, provider credential, product-price claim or publication authority is embedded.
 */
export function createCapitalAiMediaStudioProject(
  options: CreateMediaStudioProjectOptions = {},
): MediaProjectV2 {
  const fps = 30;
  const durationSeconds = Math.min(60, Math.max(5, Math.round(options.durationSeconds ?? 30)));
  const aspectRatio = options.aspectRatio ?? '16:9';

  return assertValid({
    schemaVersion: MEDIA_PROJECT_SCHEMA_VERSION,
    projectId: 'capital-ai-media-studio-draft',
    slug: options.slug ?? 'capital-ai-media-studio-draft',
    title: options.title ?? 'CAPITAL-AI Media Studio Draft',
    description: 'Deterministic provider-neutral draft project for CAPITAL-AI.',
    timebase: { numerator: fps, denominator: 1 },
    canvas: structuredClone(MEDIA_STUDIO_CANVAS_PRESETS[aspectRatio]),
    durationFrames: durationSeconds * fps,
    tracks: [
      {
        id: 'graphics-main',
        kind: 'graphics',
        name: 'Primary Story',
        enabled: true,
        layers: [
          {
            id: 'scene-01',
            kind: 'scene',
            name: 'Opening Scene',
            enabled: true,
            range: { startFrame: 0, durationFrames: durationSeconds * fps },
            kicker: 'CAPITAL-AI',
            title: 'MARKET INTELLIGENCE',
            body: 'DATA → EVIDENCE → ANALYSIS → RISK → INTELLIGENCE',
            disclaimer: 'Draft preview. Human approval is required before publication.',
          },
        ],
      },
    ],
    assets: [],
    transitions: [],
    renderRecipe: {
      templateId: 'capital-ai-media-studio',
      templateVersion: '2.0.0',
      rendererProfile: 'media-project-v2-preview',
      brandTokenSource: MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
      brandTextMode: 'deterministic',
      networkPolicy: 'offline',
      publishReady: false,
    },
    source: {
      type: 'manual',
      reference: 'media-studio',
    },
    disclosure: {
      defaultDisclaimer: 'Draft preview. Human approval is required before publication.',
      requireAtProjectEdges: true,
    },
    metadata: {
      editor: 'capital-ai-media-studio',
      draftOnly: true,
      activeTtsModel: null,
      activeAsrModel: null,
    },
  }, 'Media Studio');
}
