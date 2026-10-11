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
    description: 'Deterministic draft project created by the CAPITAL-AI Media Studio MVP.',
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
            title: 'QUANTITATIVE INTELLIGENCE',
            body: 'DATA → EVIDENCE → MODELS → RISK → INTELLIGENCE',
            disclaimer: 'Draft preview. Human approval is required before publication.',
          },
        ],
      },
    ],
    assets: [],
    transitions: [],
    renderRecipe: {
      templateId: 'capital-ai-media-studio',
      templateVersion: '1.1.0',
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
      editor: 'capital-ai-media-studio-mvp',
      draftOnly: true,
    },
  }, 'Media Studio');
}

/**
 * Canonical coupon-promo draft. It deliberately reuses MediaProjectV2 and the
 * same design-token authority as every other Social Media Engine render.
 * Branding Manifest v6.2 is therefore inherited from the canonical token source:
 * Dark Black + AIF Gold lead generic content; Cyan is reserved for semantic data visualization.
 * No generative image is a template authority for this campaign.
 */
export function createCapitalAiProTrialCouponProject(
  options: CreateMediaStudioProjectOptions = {},
): MediaProjectV2 {
  const fps = 30;
  const durationSeconds = Math.min(30, Math.max(5, Math.round(options.durationSeconds ?? 12)));
  const aspectRatio = options.aspectRatio ?? '1:1';

  return assertValid({
    schemaVersion: MEDIA_PROJECT_SCHEMA_VERSION,
    projectId: 'capital-ai-pro-trial-coupon-draft',
    slug: options.slug ?? 'capital-ai-pro-trial-coupon',
    title: options.title ?? 'CAPITAL-AI · 3 Tage Trial Pro Abonnement',
    description: 'Brand-controlled coupon promo draft for the three-day Pro trial campaign.',
    timebase: { numerator: fps, denominator: 1 },
    canvas: structuredClone(MEDIA_STUDIO_CANVAS_PRESETS[aspectRatio]),
    durationFrames: durationSeconds * fps,
    tracks: [
      {
        id: 'graphics-main',
        kind: 'graphics',
        name: 'Coupon Promo',
        enabled: true,
        layers: [
          {
            id: 'coupon-scene-01',
            kind: 'scene',
            name: '3 Tage Trial',
            enabled: true,
            range: { startFrame: 0, durationFrames: durationSeconds * fps },
            kicker: 'CAPITAL-AI · COUPON PROMO',
            title: '3 TAGE TRIAL · PRO ABONNEMENT',
            body: 'Pro drei Tage testen · Enterprise Universum Scorer · CAPITAL-AI',
            disclaimer: 'Nur Informations- und Bildungszwecke. Keine Anlageberatung oder Empfehlung. Bedingungen des Angebots beachten.',
          },
        ],
      },
    ],
    assets: [],
    transitions: [],
    renderRecipe: {
      templateId: 'capital-ai-pro-trial-coupon',
      templateVersion: '1.1.0',
      rendererProfile: 'media-project-v2-preview',
      brandTokenSource: MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
      brandTextMode: 'deterministic',
      networkPolicy: 'offline',
      publishReady: false,
    },
    source: {
      type: 'manual',
      reference: 'media-studio/coupon-promo/pro-trial-3d',
    },
    disclosure: {
      defaultDisclaimer: 'Nur Informations- und Bildungszwecke. Keine Anlageberatung oder Empfehlung. Bedingungen des Angebots beachten.',
      requireAtProjectEdges: true,
    },
    metadata: {
      editor: 'capital-ai-media-studio-mvp',
      draftOnly: true,
      campaign: 'pro-trial-3d',
      designAuthority: MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
    },
  }, 'Pro Trial Coupon');
}


/**
 * An editable, rights-safe homepage product-video story for the native Social
 * Media Engine. Scenes are fully local and renderable without LLM calls.
 * Gemini is the requested voice provider, NOT an attached/generated recording.
 * An audio layer may only be added after a real authenticated synthesis readback,
 * verified asset digest, quota evidence and the existing approval workflow.
 */
export const CAPITAL_AI_LANDING_VOICEOVER_DE = [
  'CAPITAL-AI. Analysen verstehen, statt fremden Signalen blind zu folgen.',
  'Eine vernetzte Welt der Daten, mit transparenten Methoden und nachvollziehbaren Modellen.',
  'Entdecke Blueprint-Bundles für Scoring, Datenmodelle und dokumentierte Analyseabläufe.',
  'Alle gezeigten Scores sind synthetische Demodaten. Keine Live-Signale und keine Anlageberatung.',
  'Blueprint-Vorschau und Learning Portal auf capital-ai.online entdecken.',
].join(' ');

export function createCapitalAiLandingBlueprintVideoProject(): MediaProjectV2 {
  const fps = 30;
  const sceneSeconds = 6;
  const chapters = [
    {
      kicker: 'CAPITAL-AI / HOMEPAGE',
      title: 'MARKTDATEN VERSTEHEN',
      body: 'Finanzanalyse und Methoden verständlich erleben.',
    },
    {
      kicker: 'DESIGN / FOUR-COLOR ORBIT',
      title: 'GLOBALE PERSPEKTIVEN',
      body: 'Gold · Grün · Magenta · Violett / Pulsierendes 3D-Netz.',
    },
    {
      kicker: 'CAPITAL-AI / BLUEPRINT BUNDLES',
      title: 'MATHEMATIK ALS PRODUKT',
      body: 'Scoring-Playbooks · Datenmodelle · Evidence · Lernpfade.',
    },
    {
      kicker: 'DEMO / FINANCIAL DISCLOSURE',
      title: 'SCORES SIND DEMODATEN',
      body: 'Synthetische Beispielwerte. Keine Live-Signale oder Performanceversprechen.',
    },
    {
      kicker: 'CAPITAL-AI / NEXT STEP',
      title: 'BLUEPRINTS ENTDECKEN',
      body: 'capital-ai.online/marketscreener/dokumentation · Produktvorschau',
    },
  ] as const;
  const durationFrames = chapters.length * sceneSeconds * fps;
  return assertValid({
    schemaVersion: MEDIA_PROJECT_SCHEMA_VERSION,
    projectId: 'capital-ai-landing-blueprint-video-20261011',
    slug: 'capital-ai-landing-blueprint-video',
    title: 'CAPITAL-AI · Homepage und Blueprint-Bundles',
    description: 'Fünfteiliger, editierbarer 30s-Produktvideo-Entwurf mit originalem Earth-Asset und transparenten Demo-Claims.',
    contentPackageId: 'capital-ai-homepage-blueprint-20261011',
    timebase: { numerator: fps, denominator: 1 },
    canvas: structuredClone(MEDIA_STUDIO_CANVAS_PRESETS['16:9']),
    durationFrames,
    tracks: [
      {
        id: 'landing-earth-artwork',
        kind: 'video',
        enabled: true,
        layers: [{
          id: 'landing-earth-image',
          kind: 'image',
          enabled: true,
          assetRefId: 'landing-earth-reference',
          fit: 'contain',
          range: { startFrame: 0, durationFrames },
        }],
      },
      {
        id: 'landing-scenes',
        kind: 'graphics',
        name: 'Homepage Product Story',
        enabled: true,
        layers: chapters.map((chapter, index) => ({
          id: 'landing-scene-' + String(index + 1).padStart(2, '0'),
          kind: 'scene' as const,
          enabled: true,
          range: { startFrame: index * sceneSeconds * fps, durationFrames: sceneSeconds * fps },
          ...chapter,
          disclaimer: 'DEMO-DATEN · Keine Anlageberatung. Keine Live-Marktdaten oder Kaufzusage.',
        })),
      },
    ],
    assets: [{
      id: 'landing-earth-reference',
      kind: 'image',
      sourceType: 'local-file',
      reference: 'src/assets/images/glowing_earth_nodes_1789997454893.jpg',
      mimeType: 'image/jpeg',
    }],
    transitions: [],
    renderRecipe: {
      templateId: 'capital-ai-landing-blueprint-promo',
      templateVersion: '1.0.0',
      rendererProfile: 'media-project-v2-preview',
      brandTokenSource: MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
      brandTextMode: 'deterministic',
      networkPolicy: 'offline',
      publishReady: false,
    },
    source: { type: 'manual', reference: 'frontend/src/components/Hero.tsx' },
    disclosure: {
      defaultDisclaimer: 'DEMO-DATEN · Keine Anlageberatung. Keine Live-Marktdaten oder Kaufzusage.',
      requireAtProjectEdges: true,
    },
    metadata: {
      campaign: 'homepage-blueprint-bundles',
      editor: 'capital-ai-media-studio-mvp',
      audioProviderRequested: 'GEMINI',
      audioStatus: 'NOT_PROVEN',
      voiceoverLanguage: 'de-DE',
      voiceoverText: CAPITAL_AI_LANDING_VOICEOVER_DE,
      narrationAttached: false,
      humanApprovalRequired: true,
      draftOnly: true,
      sourceRepository: 'SvenKulessa/FRONTEND',
    },
  }, 'Homepage Blueprint Video');
}
