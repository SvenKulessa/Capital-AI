export const MEDIA_PROJECT_SCHEMA_VERSION = '2.0.0' as const;
export const MEDIA_PROJECT_BRAND_TOKEN_SOURCE = 'docs/frontend/design-tokens.json' as const;

export const MEDIA_PROJECT_LIMITS = {
  maxTracks: 32,
  maxLayersPerTrack: 128,
  maxAssets: 256,
  maxTransitions: 256,
  maxDurationSeconds: 4 * 60 * 60,
  maxCanvasDimension: 8192,
  maxTextChars: 4_000,
} as const;

export type MediaJsonPrimitive = string | number | boolean | null;
export type MediaJsonValue = MediaJsonPrimitive | MediaJsonValue[] | { [key: string]: MediaJsonValue };
export type MediaMetadata = Record<string, MediaJsonValue>;

export interface MediaRationalRate {
  numerator: number;
  denominator: number;
}

export interface MediaCanvas {
  width: number;
  height: number;
  aspectRatio: '16:9' | '1:1' | '9:16' | 'custom';
  pixelAspectRatio?: MediaRationalRate;
}

export interface MediaTimeRange {
  startFrame: number;
  durationFrames: number;
}

export type MediaTrackKind = 'video' | 'graphics' | 'text' | 'chart' | 'audio' | 'caption';
export type MediaLayerKind = 'scene' | 'text' | 'shape' | 'image' | 'chart' | 'audio' | 'caption';

export interface MediaLayerBase {
  id: string;
  kind: MediaLayerKind;
  name?: string;
  range: MediaTimeRange;
  enabled: boolean;
  metadata?: MediaMetadata;
}

export interface MediaSceneLayer extends MediaLayerBase {
  kind: 'scene';
  title: string;
  body: string;
  kicker?: string;
  disclaimer?: string;
  sourceSceneRef?: string;
}

export interface MediaTextLayer extends MediaLayerBase {
  kind: 'text';
  text: string;
  role: 'headline' | 'body' | 'label' | 'disclaimer' | 'caption';
}

export interface MediaShapeLayer extends MediaLayerBase {
  kind: 'shape';
  shape: 'rectangle' | 'circle' | 'line' | 'network-node' | 'network-edge';
}

export interface MediaImageLayer extends MediaLayerBase {
  kind: 'image';
  assetRefId: string;
  fit: 'contain' | 'cover' | 'fill';
}

export interface MediaChartLayer extends MediaLayerBase {
  kind: 'chart';
  chartType: 'line' | 'bar' | 'area' | 'scatter' | 'gauge';
  dataRef: string;
  deterministicLabels: true;
}

export interface MediaAudioLayer extends MediaLayerBase {
  kind: 'audio';
  assetRefId: string;
  role: 'voiceover' | 'music' | 'effect';
  gainDb?: number;
}

export interface MediaCaptionLayer extends MediaLayerBase {
  kind: 'caption';
  text: string;
  language: 'de' | 'en';
}

export type MediaLayer =
  | MediaSceneLayer
  | MediaTextLayer
  | MediaShapeLayer
  | MediaImageLayer
  | MediaChartLayer
  | MediaAudioLayer
  | MediaCaptionLayer;

export interface MediaTrack {
  id: string;
  kind: MediaTrackKind;
  name?: string;
  enabled: boolean;
  layers: MediaLayer[];
  metadata?: MediaMetadata;
}

export type MediaAssetKind = 'image' | 'audio' | 'video';
export type MediaAssetSourceType = 'local-file' | 'asset-registry' | 'generated';

export interface MediaAssetReference {
  id: string;
  kind: MediaAssetKind;
  sourceType: MediaAssetSourceType;
  reference: string;
  sha256?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationFrames?: number;
  metadata?: MediaMetadata;
}

export interface MediaTransition {
  id: string;
  type: 'cut' | 'fade' | 'crossfade' | 'wipe';
  fromLayerId: string;
  toLayerId: string;
  durationFrames: number;
  metadata?: MediaMetadata;
}

export interface MediaRenderRecipe {
  templateId: string;
  templateVersion: string;
  rendererProfile: string;
  brandTokenSource: typeof MEDIA_PROJECT_BRAND_TOKEN_SOURCE;
  brandTextMode: 'deterministic';
  networkPolicy: 'offline' | 'provider-isolated';
  publishReady: false;
}

export interface MediaProjectSource {
  type: 'legacy-render-manifest' | 'script-scene' | 'content-package' | 'manual';
  reference: string;
  sha256?: string;
}

export interface MediaProjectDisclosure {
  defaultDisclaimer?: string;
  requireAtProjectEdges: boolean;
}

/**
 * Canonical editable/renderable media representation for CAPITAL-AI.
 *
 * Contract invariants are enforced by validateMediaProjectV2(). Serialized
 * external inputs should additionally be checked against media-project-v2.schema.json.
 */
export interface MediaProjectV2 {
  schemaVersion: typeof MEDIA_PROJECT_SCHEMA_VERSION;
  projectId: string;
  slug: string;
  title: string;
  description?: string;
  contentPackageId?: string;
  timebase: MediaRationalRate;
  canvas: MediaCanvas;
  durationFrames: number;
  tracks: MediaTrack[];
  assets: MediaAssetReference[];
  transitions: MediaTransition[];
  renderRecipe: MediaRenderRecipe;
  source: MediaProjectSource;
  disclosure: MediaProjectDisclosure;
  metadata?: MediaMetadata;
}
