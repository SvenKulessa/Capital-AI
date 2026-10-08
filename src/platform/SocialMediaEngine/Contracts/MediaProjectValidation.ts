import {
  MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
  MEDIA_PROJECT_LIMITS,
  MEDIA_PROJECT_SCHEMA_VERSION,
  type MediaAssetReference,
  type MediaLayer,
  type MediaProjectV2,
  type MediaTrackKind,
  type MediaTransition,
} from './MediaProject';

export interface MediaProjectValidationError {
  code: string;
  path: string;
  message: string;
}

export interface MediaProjectValidationResult {
  ok: boolean;
  errors: MediaProjectValidationError[];
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SHA256 = /^[0-9a-f]{64}$/i;
const MIME = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

const TRACK_LAYER_COMPATIBILITY: Record<MediaTrackKind, ReadonlySet<MediaLayer['kind']>> = {
  video: new Set(['scene', 'image']),
  graphics: new Set(['scene', 'text', 'shape', 'image', 'chart']),
  text: new Set(['text']),
  chart: new Set(['chart']),
  audio: new Set(['audio']),
  caption: new Set(['caption']),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function add(errors: MediaProjectValidationError[], code: string, path: string, message: string): void {
  errors.push({ code, path, message });
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isNonEmptyString(
  value: unknown,
  maxChars: number = MEDIA_PROJECT_LIMITS.maxTextChars,
): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxChars;
}

function isSafeOpaqueOrRelativeReference(value: unknown): value is string {
  if (!isNonEmptyString(value, 512)) return false;
  const text = value.trim();
  if (URI_SCHEME.test(text)) return false;
  if (text.startsWith('/') || text.startsWith('\\')) return false;
  const normalized = text.replace(/\\/g, '/');
  return !normalized.split('/').some((part) => part === '..');
}

function validateRate(
  value: unknown,
  path: string,
  errors: MediaProjectValidationError[],
): value is { numerator: number; denominator: number } {
  if (!isRecord(value)) {
    add(errors, 'rate_not_object', path, 'Rate must be an object.');
    return false;
  }
  const numeratorOk = isIntegerInRange(value.numerator, 1, 240_000);
  const denominatorOk = isIntegerInRange(value.denominator, 1, 10_000);
  if (!numeratorOk) add(errors, 'rate_numerator_invalid', `${path}.numerator`, 'Numerator must be an integer between 1 and 240000.');
  if (!denominatorOk) add(errors, 'rate_denominator_invalid', `${path}.denominator`, 'Denominator must be an integer between 1 and 10000.');
  return numeratorOk && denominatorOk;
}

function validateAsset(asset: unknown, index: number, errors: MediaProjectValidationError[]): asset is MediaAssetReference {
  const path = `assets[${index}]`;
  if (!isRecord(asset)) {
    add(errors, 'asset_not_object', path, 'Asset must be an object.');
    return false;
  }
  if (!isNonEmptyString(asset.id, 128) || !ID.test(asset.id)) add(errors, 'asset_id_invalid', `${path}.id`, 'Asset id is invalid.');
  if (!['image', 'audio', 'video'].includes(String(asset.kind))) add(errors, 'asset_kind_invalid', `${path}.kind`, 'Unsupported asset kind.');
  if (!['local-file', 'asset-registry', 'generated'].includes(String(asset.sourceType))) add(errors, 'asset_source_type_invalid', `${path}.sourceType`, 'Unsupported asset source type.');
  if (!isSafeOpaqueOrRelativeReference(asset.reference)) add(errors, 'asset_reference_invalid', `${path}.reference`, 'Asset reference must be opaque or repository-relative and must not use a URI scheme, absolute path or traversal path.');
  if (asset.sha256 !== undefined && (typeof asset.sha256 !== 'string' || !SHA256.test(asset.sha256))) add(errors, 'asset_sha256_invalid', `${path}.sha256`, 'sha256 must be 64 hexadecimal characters.');
  if (asset.mimeType !== undefined && (typeof asset.mimeType !== 'string' || !MIME.test(asset.mimeType))) add(errors, 'asset_mime_invalid', `${path}.mimeType`, 'mimeType is invalid.');
  for (const dimension of ['width', 'height'] as const) {
    const value = asset[dimension];
    if (value !== undefined && !isIntegerInRange(value, 1, MEDIA_PROJECT_LIMITS.maxCanvasDimension)) add(errors, 'asset_dimension_invalid', `${path}.${dimension}`, `${dimension} must be a bounded positive integer.`);
  }
  if (asset.durationFrames !== undefined && !isIntegerInRange(asset.durationFrames, 1, Number.MAX_SAFE_INTEGER)) add(errors, 'asset_duration_invalid', `${path}.durationFrames`, 'durationFrames must be a positive integer.');
  return true;
}

function validateLayerShape(layer: Record<string, unknown>, path: string, errors: MediaProjectValidationError[]): void {
  switch (layer.kind) {
    case 'scene':
      if (!isNonEmptyString(layer.title, 200)) add(errors, 'scene_title_invalid', `${path}.title`, 'Scene title is required and bounded.');
      if (!isNonEmptyString(layer.body)) add(errors, 'scene_body_invalid', `${path}.body`, 'Scene body is required and bounded.');
      if (layer.kicker !== undefined && !isNonEmptyString(layer.kicker, 120)) add(errors, 'scene_kicker_invalid', `${path}.kicker`, 'Scene kicker is invalid.');
      if (layer.disclaimer !== undefined && !isNonEmptyString(layer.disclaimer, 500)) add(errors, 'scene_disclaimer_invalid', `${path}.disclaimer`, 'Scene disclaimer is invalid.');
      break;
    case 'text':
      if (!isNonEmptyString(layer.text)) add(errors, 'text_value_invalid', `${path}.text`, 'Text is required and bounded.');
      if (!['headline', 'body', 'label', 'disclaimer', 'caption'].includes(String(layer.role))) add(errors, 'text_role_invalid', `${path}.role`, 'Unsupported text role.');
      break;
    case 'shape':
      if (!['rectangle', 'circle', 'line', 'network-node', 'network-edge'].includes(String(layer.shape))) add(errors, 'shape_type_invalid', `${path}.shape`, 'Unsupported shape.');
      break;
    case 'image':
      if (!isNonEmptyString(layer.assetRefId, 128) || !ID.test(layer.assetRefId)) add(errors, 'image_asset_ref_invalid', `${path}.assetRefId`, 'Image assetRefId is invalid.');
      if (!['contain', 'cover', 'fill'].includes(String(layer.fit))) add(errors, 'image_fit_invalid', `${path}.fit`, 'Unsupported image fit.');
      break;
    case 'chart':
      if (!['line', 'bar', 'area', 'scatter', 'gauge'].includes(String(layer.chartType))) add(errors, 'chart_type_invalid', `${path}.chartType`, 'Unsupported chart type.');
      if (!isSafeOpaqueOrRelativeReference(layer.dataRef)) add(errors, 'chart_data_ref_invalid', `${path}.dataRef`, 'Chart dataRef must be an opaque or repository-relative reference.');
      if (layer.deterministicLabels !== true) add(errors, 'chart_labels_not_deterministic', `${path}.deterministicLabels`, 'Financial/chart labels must be deterministic.');
      break;
    case 'audio':
      if (!isNonEmptyString(layer.assetRefId, 128) || !ID.test(layer.assetRefId)) add(errors, 'audio_asset_ref_invalid', `${path}.assetRefId`, 'Audio assetRefId is invalid.');
      if (!['voiceover', 'music', 'effect'].includes(String(layer.role))) add(errors, 'audio_role_invalid', `${path}.role`, 'Unsupported audio role.');
      if (layer.gainDb !== undefined && (typeof layer.gainDb !== 'number' || !Number.isFinite(layer.gainDb) || layer.gainDb < -96 || layer.gainDb > 24)) add(errors, 'audio_gain_invalid', `${path}.gainDb`, 'gainDb must be between -96 and 24.');
      break;
    case 'caption':
      if (!isNonEmptyString(layer.text)) add(errors, 'caption_text_invalid', `${path}.text`, 'Caption text is required and bounded.');
      if (!['de', 'en'].includes(String(layer.language))) add(errors, 'caption_language_invalid', `${path}.language`, 'Caption language must be de or en.');
      break;
    default:
      add(errors, 'layer_kind_invalid', `${path}.kind`, 'Unsupported layer kind.');
  }
}

export function validateMediaProjectV2(input: unknown): MediaProjectValidationResult {
  const errors: MediaProjectValidationError[] = [];
  if (!isRecord(input)) return { ok: false, errors: [{ code: 'project_not_object', path: '$', message: 'MediaProject must be an object.' }] };

  if (input.schemaVersion !== MEDIA_PROJECT_SCHEMA_VERSION) add(errors, 'schema_version_invalid', 'schemaVersion', `schemaVersion must be ${MEDIA_PROJECT_SCHEMA_VERSION}.`);
  if (!isNonEmptyString(input.projectId, 128) || !ID.test(input.projectId)) add(errors, 'project_id_invalid', 'projectId', 'projectId is invalid.');
  if (!isNonEmptyString(input.slug, 80) || !SLUG.test(input.slug)) add(errors, 'project_slug_invalid', 'slug', 'slug must be lowercase kebab-case.');
  if (!isNonEmptyString(input.title, 240)) add(errors, 'project_title_invalid', 'title', 'title is required and bounded.');
  if (input.description !== undefined && !isNonEmptyString(input.description)) add(errors, 'project_description_invalid', 'description', 'description is invalid.');
  if (input.contentPackageId !== undefined && (!isNonEmptyString(input.contentPackageId, 128) || !ID.test(input.contentPackageId))) add(errors, 'content_package_id_invalid', 'contentPackageId', 'contentPackageId is invalid.');

  const rateOk = validateRate(input.timebase, 'timebase', errors);

  if (!isRecord(input.canvas)) {
    add(errors, 'canvas_not_object', 'canvas', 'canvas must be an object.');
  } else {
    if (!isIntegerInRange(input.canvas.width, 64, MEDIA_PROJECT_LIMITS.maxCanvasDimension)) add(errors, 'canvas_width_invalid', 'canvas.width', 'canvas width is out of bounds.');
    if (!isIntegerInRange(input.canvas.height, 64, MEDIA_PROJECT_LIMITS.maxCanvasDimension)) add(errors, 'canvas_height_invalid', 'canvas.height', 'canvas height is out of bounds.');
    if (!['16:9', '1:1', '9:16', 'custom'].includes(String(input.canvas.aspectRatio))) add(errors, 'canvas_aspect_invalid', 'canvas.aspectRatio', 'Unsupported aspect ratio.');
    if (input.canvas.pixelAspectRatio !== undefined) validateRate(input.canvas.pixelAspectRatio, 'canvas.pixelAspectRatio', errors);
  }

  const projectDurationFrames = input.durationFrames;
  const durationFramesOk = isIntegerInRange(projectDurationFrames, 1, Number.MAX_SAFE_INTEGER);
  if (!durationFramesOk) add(errors, 'duration_frames_invalid', 'durationFrames', 'durationFrames must be a positive integer.');
  if (rateOk && durationFramesOk) {
    const rate = input.timebase as { numerator: number; denominator: number };
    const seconds = projectDurationFrames * rate.denominator / rate.numerator;
    if (!Number.isFinite(seconds) || seconds > MEDIA_PROJECT_LIMITS.maxDurationSeconds) add(errors, 'duration_limit_exceeded', 'durationFrames', `Project duration must not exceed ${MEDIA_PROJECT_LIMITS.maxDurationSeconds} seconds.`);
  }

  const assets = Array.isArray(input.assets) ? input.assets : [];
  if (!Array.isArray(input.assets)) add(errors, 'assets_not_array', 'assets', 'assets must be an array.');
  if (assets.length > MEDIA_PROJECT_LIMITS.maxAssets) add(errors, 'assets_limit_exceeded', 'assets', `At most ${MEDIA_PROJECT_LIMITS.maxAssets} assets are allowed.`);
  const assetIds = new Set<string>();
  const assetById = new Map<string, Record<string, unknown>>();
  assets.forEach((asset, index) => {
    validateAsset(asset, index, errors);
    if (!isRecord(asset) || typeof asset.id !== 'string') return;
    if (assetIds.has(asset.id)) add(errors, 'asset_id_duplicate', `assets[${index}].id`, `Duplicate asset id ${asset.id}.`);
    assetIds.add(asset.id);
    assetById.set(asset.id, asset);
  });

  const tracks = Array.isArray(input.tracks) ? input.tracks : [];
  if (!Array.isArray(input.tracks)) add(errors, 'tracks_not_array', 'tracks', 'tracks must be an array.');
  if (tracks.length < 1 || tracks.length > MEDIA_PROJECT_LIMITS.maxTracks) add(errors, 'tracks_count_invalid', 'tracks', `tracks must contain between 1 and ${MEDIA_PROJECT_LIMITS.maxTracks} entries.`);

  const trackIds = new Set<string>();
  const layerIds = new Set<string>();
  const layerById = new Map<string, { layer: Record<string, unknown>; trackId: string }>();

  tracks.forEach((track, trackIndex) => {
    const trackPath = `tracks[${trackIndex}]`;
    if (!isRecord(track)) {
      add(errors, 'track_not_object', trackPath, 'Track must be an object.');
      return;
    }
    const trackId = typeof track.id === 'string' ? track.id : '';
    if (!ID.test(trackId)) add(errors, 'track_id_invalid', `${trackPath}.id`, 'Track id is invalid.');
    if (trackIds.has(trackId)) add(errors, 'track_id_duplicate', `${trackPath}.id`, `Duplicate track id ${trackId}.`);
    trackIds.add(trackId);
    const trackKind = String(track.kind) as MediaTrackKind;
    if (!(trackKind in TRACK_LAYER_COMPATIBILITY)) add(errors, 'track_kind_invalid', `${trackPath}.kind`, 'Unsupported track kind.');
    if (typeof track.enabled !== 'boolean') add(errors, 'track_enabled_invalid', `${trackPath}.enabled`, 'enabled must be boolean.');
    const layers = Array.isArray(track.layers) ? track.layers : [];
    if (!Array.isArray(track.layers)) add(errors, 'layers_not_array', `${trackPath}.layers`, 'layers must be an array.');
    if (layers.length > MEDIA_PROJECT_LIMITS.maxLayersPerTrack) add(errors, 'layers_limit_exceeded', `${trackPath}.layers`, `Track exceeds ${MEDIA_PROJECT_LIMITS.maxLayersPerTrack} layers.`);

    const ranges: Array<{ start: number; end: number; path: string }> = [];
    layers.forEach((layer, layerIndex) => {
      const layerPath = `${trackPath}.layers[${layerIndex}]`;
      if (!isRecord(layer)) {
        add(errors, 'layer_not_object', layerPath, 'Layer must be an object.');
        return;
      }
      const layerId = typeof layer.id === 'string' ? layer.id : '';
      if (!ID.test(layerId)) add(errors, 'layer_id_invalid', `${layerPath}.id`, 'Layer id is invalid.');
      if (layerIds.has(layerId)) add(errors, 'layer_id_duplicate', `${layerPath}.id`, `Duplicate layer id ${layerId}.`);
      layerIds.add(layerId);
      layerById.set(layerId, { layer, trackId });
      if (typeof layer.enabled !== 'boolean') add(errors, 'layer_enabled_invalid', `${layerPath}.enabled`, 'enabled must be boolean.');
      if (!isRecord(layer.range)) {
        add(errors, 'layer_range_invalid', `${layerPath}.range`, 'Layer range must be an object.');
      } else {
        const start = layer.range.startFrame;
        const duration = layer.range.durationFrames;
        if (!isIntegerInRange(start, 0, Number.MAX_SAFE_INTEGER)) add(errors, 'layer_start_invalid', `${layerPath}.range.startFrame`, 'startFrame must be a non-negative integer.');
        if (!isIntegerInRange(duration, 1, Number.MAX_SAFE_INTEGER)) add(errors, 'layer_duration_invalid', `${layerPath}.range.durationFrames`, 'durationFrames must be a positive integer.');
        if (Number.isInteger(start) && Number.isInteger(duration)) {
          const end = Number(start) + Number(duration);
          if (durationFramesOk && end > projectDurationFrames) add(errors, 'layer_out_of_project_bounds', `${layerPath}.range`, 'Layer extends beyond project duration.');
          ranges.push({ start: Number(start), end, path: layerPath });
        }
      }
      if (TRACK_LAYER_COMPATIBILITY[trackKind] && !TRACK_LAYER_COMPATIBILITY[trackKind].has(String(layer.kind) as MediaLayer['kind'])) add(errors, 'track_layer_kind_mismatch', `${layerPath}.kind`, `${String(layer.kind)} is not valid on a ${trackKind} track.`);
      validateLayerShape(layer, layerPath, errors);
    });

    ranges.sort((a, b) => a.start - b.start || a.end - b.end);
    for (let i = 1; i < ranges.length; i += 1) {
      if (ranges[i - 1].end > ranges[i].start) add(errors, 'track_layer_overlap', ranges[i].path, 'Layers on the same track must not overlap; use separate tracks for compositing.');
    }
  });

  for (const [layerId, entry] of layerById) {
    const layer = entry.layer;
    if (layer.kind !== 'image' && layer.kind !== 'audio') continue;
    const ref = typeof layer.assetRefId === 'string' ? layer.assetRefId : '';
    const asset = assetById.get(ref);
    if (!asset) {
      add(errors, 'layer_asset_missing', `layer:${layerId}.assetRefId`, `Referenced asset ${ref || '<missing>'} does not exist.`);
      continue;
    }
    if (layer.kind === 'image' && asset.kind !== 'image') add(errors, 'image_asset_kind_mismatch', `layer:${layerId}.assetRefId`, 'Image layer must reference an image asset.');
    if (layer.kind === 'audio' && asset.kind !== 'audio') add(errors, 'audio_asset_kind_mismatch', `layer:${layerId}.assetRefId`, 'Audio layer must reference an audio asset.');
  }

  const transitions = Array.isArray(input.transitions) ? input.transitions : [];
  if (!Array.isArray(input.transitions)) add(errors, 'transitions_not_array', 'transitions', 'transitions must be an array.');
  if (transitions.length > MEDIA_PROJECT_LIMITS.maxTransitions) add(errors, 'transitions_limit_exceeded', 'transitions', `At most ${MEDIA_PROJECT_LIMITS.maxTransitions} transitions are allowed.`);
  const transitionIds = new Set<string>();
  transitions.forEach((transition, index) => {
    const path = `transitions[${index}]`;
    if (!isRecord(transition)) {
      add(errors, 'transition_not_object', path, 'Transition must be an object.');
      return;
    }
    const id = typeof transition.id === 'string' ? transition.id : '';
    if (!ID.test(id)) add(errors, 'transition_id_invalid', `${path}.id`, 'Transition id is invalid.');
    if (transitionIds.has(id)) add(errors, 'transition_id_duplicate', `${path}.id`, `Duplicate transition id ${id}.`);
    transitionIds.add(id);
    const type = String(transition.type) as MediaTransition['type'];
    if (!['cut', 'fade', 'crossfade', 'wipe'].includes(type)) add(errors, 'transition_type_invalid', `${path}.type`, 'Unsupported transition type.');
    const duration = transition.durationFrames;
    if (!isIntegerInRange(duration, 0, Number.MAX_SAFE_INTEGER)) add(errors, 'transition_duration_invalid', `${path}.durationFrames`, 'Transition duration must be a non-negative integer.');
    if (type === 'cut' && duration !== 0) add(errors, 'cut_duration_nonzero', `${path}.durationFrames`, 'Cut transition duration must be 0.');
    if (type !== 'cut' && duration === 0) add(errors, 'transition_duration_zero', `${path}.durationFrames`, 'Non-cut transitions require positive duration.');

    const from = typeof transition.fromLayerId === 'string' ? layerById.get(transition.fromLayerId) : undefined;
    const to = typeof transition.toLayerId === 'string' ? layerById.get(transition.toLayerId) : undefined;
    if (!from) add(errors, 'transition_from_missing', `${path}.fromLayerId`, 'fromLayerId does not exist.');
    if (!to) add(errors, 'transition_to_missing', `${path}.toLayerId`, 'toLayerId does not exist.');
    if (from && to) {
      if (from.trackId !== to.trackId) add(errors, 'transition_cross_track', path, 'Transitions must connect layers on the same track.');
      const fromRange = isRecord(from.layer.range) ? from.layer.range : null;
      const toRange = isRecord(to.layer.range) ? to.layer.range : null;
      if (fromRange && toRange && Number.isInteger(fromRange.startFrame) && Number.isInteger(fromRange.durationFrames) && Number.isInteger(toRange.startFrame)) {
        const fromEnd = Number(fromRange.startFrame) + Number(fromRange.durationFrames);
        if (fromEnd !== Number(toRange.startFrame)) add(errors, 'transition_layers_not_adjacent', path, 'Transition layers must be temporally adjacent.');
      }
    }
  });

  if (!isRecord(input.renderRecipe)) {
    add(errors, 'render_recipe_not_object', 'renderRecipe', 'renderRecipe must be an object.');
  } else {
    if (!isNonEmptyString(input.renderRecipe.templateId, 128) || !ID.test(input.renderRecipe.templateId)) add(errors, 'template_id_invalid', 'renderRecipe.templateId', 'templateId is invalid.');
    if (typeof input.renderRecipe.templateVersion !== 'string' || !SEMVER.test(input.renderRecipe.templateVersion)) add(errors, 'template_version_invalid', 'renderRecipe.templateVersion', 'templateVersion must be SemVer.');
    if (!isNonEmptyString(input.renderRecipe.rendererProfile, 128)) add(errors, 'renderer_profile_invalid', 'renderRecipe.rendererProfile', 'rendererProfile is required.');
    if (input.renderRecipe.brandTokenSource !== MEDIA_PROJECT_BRAND_TOKEN_SOURCE) add(errors, 'brand_token_source_invalid', 'renderRecipe.brandTokenSource', `brandTokenSource must be ${MEDIA_PROJECT_BRAND_TOKEN_SOURCE}.`);
    if (input.renderRecipe.brandTextMode !== 'deterministic') add(errors, 'brand_text_mode_invalid', 'renderRecipe.brandTextMode', 'Brand-critical text must remain deterministic.');
    if (!['offline', 'provider-isolated'].includes(String(input.renderRecipe.networkPolicy))) add(errors, 'network_policy_invalid', 'renderRecipe.networkPolicy', 'Unsupported networkPolicy.');
    if (input.renderRecipe.publishReady !== false) add(errors, 'publish_ready_forbidden', 'renderRecipe.publishReady', 'MediaProject render recipes cannot self-authorize publishing.');
  }

  if (!isRecord(input.source)) {
    add(errors, 'source_not_object', 'source', 'source must be an object.');
  } else {
    if (!['legacy-render-manifest', 'script-scene', 'content-package', 'manual'].includes(String(input.source.type))) add(errors, 'source_type_invalid', 'source.type', 'Unsupported source type.');
    if (!isSafeOpaqueOrRelativeReference(input.source.reference)) add(errors, 'source_reference_invalid', 'source.reference', 'source.reference must not use a URI scheme, absolute path or traversal path.');
    if (input.source.sha256 !== undefined && (typeof input.source.sha256 !== 'string' || !SHA256.test(input.source.sha256))) add(errors, 'source_sha256_invalid', 'source.sha256', 'source sha256 must be 64 hexadecimal characters.');
  }

  if (!isRecord(input.disclosure)) {
    add(errors, 'disclosure_not_object', 'disclosure', 'disclosure must be an object.');
  } else {
    if (input.disclosure.defaultDisclaimer !== undefined && !isNonEmptyString(input.disclosure.defaultDisclaimer, 500)) add(errors, 'default_disclaimer_invalid', 'disclosure.defaultDisclaimer', 'defaultDisclaimer is invalid.');
    if (typeof input.disclosure.requireAtProjectEdges !== 'boolean') add(errors, 'disclosure_edge_flag_invalid', 'disclosure.requireAtProjectEdges', 'requireAtProjectEdges must be boolean.');
  }

  return { ok: errors.length === 0, errors };
}

export function assertMediaProjectV2(input: unknown): asserts input is MediaProjectV2 {
  const result = validateMediaProjectV2(input);
  if (result.ok) return;
  const detail = result.errors.map((error) => `${error.code} [${error.path}]: ${error.message}`).join('\n');
  throw new Error(`MediaProject v2 validation failed with ${result.errors.length} error(s):\n${detail}`);
}
