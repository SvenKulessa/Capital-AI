import {
  type MediaCanvas,
  type MediaLayer,
  type MediaProjectV2,
} from '../Contracts/MediaProject';
import {
  type MediaProjectValidationError,
  validateMediaProjectV2,
} from '../Contracts/MediaProjectValidation';

export type MediaStudioCanvasPreset = '16:9' | '1:1' | '9:16';

export const MEDIA_STUDIO_CANVAS_PRESETS: Record<MediaStudioCanvasPreset, MediaCanvas> = {
  '16:9': { width: 1920, height: 1080, aspectRatio: '16:9' },
  '1:1': { width: 1080, height: 1080, aspectRatio: '1:1' },
  '9:16': { width: 1080, height: 1920, aspectRatio: '9:16' },
};

export type MediaProjectEditResult =
  | { ok: true; project: MediaProjectV2 }
  | { ok: false; errors: MediaProjectValidationError[] };

type LayerMutator = (layer: MediaLayer) => void;

function editError(code: string, path: string, message: string): MediaProjectEditResult {
  return { ok: false, errors: [{ code, path, message }] };
}

function validateEditedProject(project: MediaProjectV2): MediaProjectEditResult {
  const validation = validateMediaProjectV2(project);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  return { ok: true, project };
}

function mutateLayer(
  project: MediaProjectV2,
  layerId: string,
  mutator: LayerMutator,
): MediaProjectEditResult {
  const draft = structuredClone(project);
  for (const track of draft.tracks) {
    const layer = track.layers.find((candidate) => candidate.id === layerId);
    if (!layer) continue;
    try {
      mutator(layer);
    } catch (error) {
      return editError(
        'edit_operation_invalid',
        `layers.${layerId}`,
        error instanceof Error ? error.message : 'MediaProject edit operation failed.',
      );
    }
    return validateEditedProject(draft);
  }
  return editError('edit_layer_missing', `layers.${layerId}`, `Layer ${layerId} does not exist.`);
}

export function setMediaProjectCanvasPreset(
  project: MediaProjectV2,
  preset: MediaStudioCanvasPreset,
): MediaProjectEditResult {
  const canvas = MEDIA_STUDIO_CANVAS_PRESETS[preset];
  if (!canvas) {
    return editError('edit_canvas_preset_invalid', 'canvas', `Unsupported canvas preset: ${preset}.`);
  }
  const draft = structuredClone(project);
  draft.canvas = structuredClone(canvas);
  return validateEditedProject(draft);
}

export function setMediaProjectTitle(
  project: MediaProjectV2,
  title: string,
): MediaProjectEditResult {
  const draft = structuredClone(project);
  draft.title = title;
  return validateEditedProject(draft);
}

export function setMediaLayerStartFrame(
  project: MediaProjectV2,
  layerId: string,
  startFrame: number,
): MediaProjectEditResult {
  if (!Number.isInteger(startFrame) || startFrame < 0) {
    return editError(
      'edit_start_frame_invalid',
      `layers.${layerId}.range.startFrame`,
      'startFrame must be a non-negative integer.',
    );
  }
  return mutateLayer(project, layerId, (layer) => {
    layer.range.startFrame = startFrame;
  });
}

export function moveMediaLayerByFrames(
  project: MediaProjectV2,
  layerId: string,
  deltaFrames: number,
): MediaProjectEditResult {
  if (!Number.isInteger(deltaFrames)) {
    return editError('edit_delta_invalid', `layers.${layerId}`, 'deltaFrames must be an integer.');
  }
  const layer = project.tracks.flatMap((track) => track.layers).find((candidate) => candidate.id === layerId);
  if (!layer) return editError('edit_layer_missing', `layers.${layerId}`, `Layer ${layerId} does not exist.`);
  return setMediaLayerStartFrame(project, layerId, layer.range.startFrame + deltaFrames);
}

export function setMediaLayerDurationFrames(
  project: MediaProjectV2,
  layerId: string,
  durationFrames: number,
): MediaProjectEditResult {
  if (!Number.isInteger(durationFrames) || durationFrames < 1) {
    return editError(
      'edit_duration_invalid',
      `layers.${layerId}.range.durationFrames`,
      'durationFrames must be a positive integer.',
    );
  }
  return mutateLayer(project, layerId, (layer) => {
    layer.range.durationFrames = durationFrames;
  });
}

export function resizeMediaLayerByFrames(
  project: MediaProjectV2,
  layerId: string,
  deltaFrames: number,
): MediaProjectEditResult {
  if (!Number.isInteger(deltaFrames)) {
    return editError('edit_delta_invalid', `layers.${layerId}`, 'deltaFrames must be an integer.');
  }
  const layer = project.tracks.flatMap((track) => track.layers).find((candidate) => candidate.id === layerId);
  if (!layer) return editError('edit_layer_missing', `layers.${layerId}`, `Layer ${layerId} does not exist.`);
  return setMediaLayerDurationFrames(project, layerId, layer.range.durationFrames + deltaFrames);
}

export function setMediaLayerEnabled(
  project: MediaProjectV2,
  layerId: string,
  enabled: boolean,
): MediaProjectEditResult {
  return mutateLayer(project, layerId, (layer) => {
    layer.enabled = enabled;
  });
}

export type MediaLayerTextField = 'title' | 'body' | 'kicker' | 'disclaimer' | 'text';

export function setMediaLayerText(
  project: MediaProjectV2,
  layerId: string,
  field: MediaLayerTextField,
  value: string,
): MediaProjectEditResult {
  const normalized = value.trim();

  return mutateLayer(project, layerId, (layer) => {
    if (layer.kind === 'scene') {
      if (field === 'title') layer.title = value;
      else if (field === 'body') layer.body = value;
      else if (field === 'kicker') {
        if (normalized) layer.kicker = value;
        else delete layer.kicker;
      } else if (field === 'disclaimer') {
        if (normalized) layer.disclaimer = value;
        else delete layer.disclaimer;
      } else {
        throw new Error(`Field ${field} is not supported for scene layers.`);
      }
      return;
    }

    if (layer.kind === 'text' || layer.kind === 'caption') {
      if (field !== 'text') throw new Error(`Field ${field} is not supported for ${layer.kind} layers.`);
      layer.text = value;
      return;
    }

    throw new Error(`Layer ${layer.id} does not expose editable text.`);
  });
}

export function selectMediaLayer(
  project: MediaProjectV2,
  layerId: string | null,
): MediaLayer | null {
  if (!layerId) return null;
  return project.tracks.flatMap((track) => track.layers).find((layer) => layer.id === layerId) ?? null;
}

export function framesToSeconds(project: MediaProjectV2, frames: number): number {
  return (frames * project.timebase.denominator) / project.timebase.numerator;
}

export function secondsToFrames(project: MediaProjectV2, seconds: number): number {
  return Math.round((seconds * project.timebase.numerator) / project.timebase.denominator);
}
