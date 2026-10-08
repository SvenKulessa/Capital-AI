import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
  MEDIA_PROJECT_SCHEMA_VERSION,
} from '../Contracts/MediaProject';
import { validateMediaProjectV2 } from '../Contracts/MediaProjectValidation';
import {
  moveMediaLayerByFrames,
  setMediaLayerText,
} from '../Editing/MediaProjectEditing';
import { createCapitalAiMediaStudioProject } from '../Editing/MediaStudioTemplates';
import {
  PLANNING_VISUAL_SCHEMA_VERSION,
  type PlanningVisualSpec,
  validatePlanningVisualSpec,
} from '../Visualization/PlanningVisual';
import {
  layoutPlanningVisualWithD3,
  resolvePlanningVisualCanvas,
} from '../Visualization/D3PlanningVisualAdapter';
import { createPlanningVisualMediaProject } from '../Visualization/PlanningVisualMediaProjectAdapter';

function planningSpec(): PlanningVisualSpec {
  return {
    schemaVersion: PLANNING_VISUAL_SCHEMA_VERSION,
    kind: 'roadmap',
    title: 'CAPITAL-AI Social Core',
    description: 'Deterministische modellfreie Social-Core-Projektion.',
    lanes: [
      { id: 'implemented', label: 'Implementiert', order: 1 },
      { id: 'open', label: 'Offen', order: 2 },
    ],
    nodes: [
      { id: 'media-project', label: 'MediaProjectV2', laneId: 'implemented', status: 'done', order: 1 },
      { id: 'renderer', label: 'Deterministischer Renderer', laneId: 'implemented', status: 'active', order: 2 },
      { id: 'publishing', label: 'Publishing Cutover', laneId: 'open', status: 'pending', order: 1 },
    ],
    edges: [
      { id: 'e1', source: 'media-project', target: 'renderer', kind: 'sequence' },
      { id: 'e2', source: 'renderer', target: 'publishing', kind: 'sequence' },
    ],
    evidence: {
      source: 'CAPITAL-AI-GROWTH/social-audio-model-removal-20261008.json',
    },
    render: {
      aspectRatio: '4:5',
      rendererProfile: 'd3-deterministic-layout',
      brandTokenSource: MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
      networkPolicy: 'offline',
      publishReady: false,
    },
  };
}

test('MediaProjectV2 uses the current CAPITAL-AI branding authority and stays draft-only', () => {
  assert.equal(MEDIA_PROJECT_SCHEMA_VERSION, '2.0.0');
  assert.equal(
    MEDIA_PROJECT_BRAND_TOKEN_SOURCE,
    'public/branding/asset-pack/meta/social-render-tokens.json',
  );
  assert.equal(existsSync(resolve(MEDIA_PROJECT_BRAND_TOKEN_SOURCE)), true);

  const project = createCapitalAiMediaStudioProject();
  assert.deepEqual(validateMediaProjectV2(project), { ok: true, errors: [] });
  assert.equal(project.renderRecipe.publishReady, false);
  assert.equal(project.renderRecipe.networkPolicy, 'offline');
  assert.equal(project.tracks.some((track) => track.kind === 'audio'), false);

  const serialized = JSON.stringify(project).toLowerCase();
  for (const removed of ['qwen', 'chatterbox', 'whisper']) {
    assert.equal(serialized.includes(removed), false);
  }
});

test('validated editing is immutable and fails closed outside the timeline', () => {
  const original = createCapitalAiMediaStudioProject();
  const edited = setMediaLayerText(original, 'scene-01', 'title', 'DATA → EVIDENCE → INTELLIGENCE');
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.notEqual(edited.project, original);
  assert.equal(original.tracks[0]?.layers[0]?.kind, 'scene');

  const invalid = moveMediaLayerByFrames(original, 'scene-01', -1);
  assert.equal(invalid.ok, false);
  if (invalid.ok) return;
  assert.equal(invalid.errors.some((error) => error.code === 'edit_start_frame_invalid'), true);
});

test('planning visual layout is deterministic, offline and model-free', () => {
  const spec = planningSpec();
  assert.deepEqual(validatePlanningVisualSpec(spec), { ok: true, errors: [] });

  const first = layoutPlanningVisualWithD3(spec);
  const second = layoutPlanningVisualWithD3(spec);
  assert.deepEqual(second, first);
  assert.equal(first.renderer, 'd3');
  assert.equal(first.deterministic, true);
  assert.deepEqual(resolvePlanningVisualCanvas('4:5'), { width: 1080, height: 1350 });

  const project = createPlanningVisualMediaProject(spec);
  assert.deepEqual(validateMediaProjectV2(project), { ok: true, errors: [] });
  assert.equal(project.renderRecipe.publishReady, false);
  assert.equal(project.renderRecipe.networkPolicy, 'offline');
  assert.equal(project.metadata?.planningVisualRendererProvider, 'd3');
});

function collectFiles(root: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = resolve(root, entry);
    if (statSync(path).isDirectory()) {
      if (entry === '__tests__') continue;
      output.push(...collectFiles(path));
    } else output.push(path);
  }
  return output;
}

test('active Social runtime paths contain none of the removed audio-model implementations', () => {
  const roots = [
    resolve('src/platform/SocialMediaEngine'),
    resolve('scripts/media'),
    resolve('deploy/social-media'),
  ];
  const forbidden = ['qwen', 'chatterbox', 'whisper'];
  const violations: string[] = [];
  for (const file of roots.flatMap(collectFiles)) {
    if (!/\.(?:ts|tsx|js|mjs|py|json|ya?ml|txt|renderer)$/.test(file)) continue;
    const content = readFileSync(file, 'utf8').toLowerCase();
    for (const model of forbidden) {
      if (content.includes(model)) violations.push(`${file}:${model}`);
    }
  }
  assert.deepEqual(violations, []);
});
