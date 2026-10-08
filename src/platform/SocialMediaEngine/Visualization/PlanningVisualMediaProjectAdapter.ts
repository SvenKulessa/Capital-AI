import {
  MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
  MEDIA_PROJECT_SCHEMA_VERSION,
  type MediaJsonValue,
  type MediaProjectV2,
} from '../Contracts/MediaProject';
import { validateMediaProjectV2 } from '../Contracts/MediaProjectValidation';
import { layoutPlanningVisualWithD3 } from './D3PlanningVisualAdapter';
import {
  validatePlanningVisualSpec,
  type PlanningVisualSpec,
} from './PlanningVisual';

export interface PlanningVisualMediaProjectOptions {
  projectId?: string;
  slug?: string;
  durationSeconds?: number;
}

function asMediaJson(value: unknown): MediaJsonValue {
  return JSON.parse(JSON.stringify(value)) as MediaJsonValue;
}

function safeSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return normalized || 'planning-visual';
}

export function createPlanningVisualMediaProject(
  spec: PlanningVisualSpec,
  options: PlanningVisualMediaProjectOptions = {},
): MediaProjectV2 {
  const planningValidation = validatePlanningVisualSpec(spec);
  if (!planningValidation.ok) {
    throw new Error(
      `PLANNING_VISUAL_INVALID:${planningValidation.errors.map((error) => error.code).join(',')}`,
    );
  }

  const geometry = layoutPlanningVisualWithD3(spec);
  const fps = 30;
  const durationSeconds = Math.min(60, Math.max(5, Math.round(options.durationSeconds ?? 12)));
  const slug = options.slug ? safeSlug(options.slug) : safeSlug(spec.title);
  const projectId = options.projectId ?? `planning-${slug}`;

  const project: MediaProjectV2 = {
    schemaVersion: MEDIA_PROJECT_SCHEMA_VERSION,
    projectId,
    slug,
    title: spec.title,
    description: spec.description ?? 'Deterministic planning visual generated from PlanningVisualSpec.',
    timebase: { numerator: fps, denominator: 1 },
    canvas: {
      width: geometry.canvas.width,
      height: geometry.canvas.height,
      aspectRatio: spec.render.aspectRatio === '4:5' ? 'custom' : spec.render.aspectRatio,
    },
    durationFrames: durationSeconds * fps,
    tracks: [
      {
        id: 'planning-visual',
        kind: 'graphics',
        name: 'Planning Visual',
        enabled: true,
        layers: [
          {
            id: 'planning-scene',
            kind: 'scene',
            name: 'Planning Visual Scene',
            enabled: true,
            range: { startFrame: 0, durationFrames: durationSeconds * fps },
            kicker: 'CAPITAL-AI · PLANNING VISUAL',
            title: spec.title,
            body: `${spec.nodes.length} Knoten · ${spec.edges.length} Verbindungen · ${spec.kind}`,
            disclaimer: 'Deterministische Draft-Projektion. Veröffentlichung erfordert separate Human-/Provider-Freigabe.',
            metadata: {
              planningVisualSchemaVersion: spec.schemaVersion,
              planningVisualRendererProvider: 'd3',
              planningVisualRendererProfile: spec.render.rendererProfile,
              planningVisualSpec: asMediaJson(spec),
              planningVisualGeometry: asMediaJson(geometry),
            },
          },
        ],
      },
    ],
    assets: [],
    transitions: [],
    renderRecipe: {
      templateId: 'capital-ai-planning-visual',
      templateVersion: '1.0.0',
      rendererProfile: 'planning-visual-d3-v1',
      brandTokenSource: MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
      brandTextMode: 'deterministic',
      networkPolicy: 'offline',
      publishReady: false,
    },
    source: {
      type: 'manual',
      reference: `planning-visual/${slug}`,
    },
    disclosure: {
      defaultDisclaimer: 'Deterministische Draft-Projektion. Veröffentlichung erfordert separate Human-/Provider-Freigabe.',
      requireAtProjectEdges: true,
    },
    metadata: {
      editor: 'capital-ai-planning-visual-toolkit',
      planningVisualRendererProvider: 'd3',
      draftOnly: true,
    },
  };

  const validation = validateMediaProjectV2(project);
  if (!validation.ok) {
    throw new Error(
      `PLANNING_VISUAL_MEDIA_PROJECT_INVALID:${validation.errors.map((error) => error.code).join(',')}`,
    );
  }

  return project;
}
