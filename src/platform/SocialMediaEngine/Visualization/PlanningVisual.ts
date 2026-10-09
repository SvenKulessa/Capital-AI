import { MEDIA_PROJECT_BRAND_TOKEN_SOURCE } from '../Contracts/MediaProject';

export const PLANNING_VISUAL_SCHEMA_VERSION = 'planning-visual/1.0.0' as const;

export const PLANNING_VISUAL_LIMITS = {
  maxNodes: 96,
  maxEdges: 192,
  maxLanes: 24,
  maxTextChars: 240,
} as const;

export type PlanningVisualKind = 'roadmap' | 'dependency-map' | 'process-map';
export type PlanningVisualStatus = 'active' | 'live' | 'pending' | 'held' | 'done';
export type PlanningVisualAspectRatio = '16:9' | '4:5' | '1:1';
export type PlanningVisualEdgeKind = 'dependency' | 'sequence' | 'relationship';

export interface PlanningVisualLane {
  id: string;
  label: string;
  order?: number;
}

export interface PlanningVisualNode {
  id: string;
  label: string;
  laneId?: string;
  status?: PlanningVisualStatus;
  order?: number;
  detail?: string;
}

export interface PlanningVisualEdge {
  id: string;
  source: string;
  target: string;
  kind: PlanningVisualEdgeKind;
  label?: string;
}

export interface PlanningVisualEvidence {
  source: string;
  currentMainSha?: string;
  observedAt?: string;
}

export interface PlanningVisualRenderContract {
  aspectRatio: PlanningVisualAspectRatio;
  rendererProfile: 'd3-deterministic-layout';
  brandTokenSource: typeof MEDIA_PROJECT_BRAND_TOKEN_SOURCE;
  networkPolicy: 'offline';
  publishReady: false;
}

export interface PlanningVisualSpec {
  schemaVersion: typeof PLANNING_VISUAL_SCHEMA_VERSION;
  kind: PlanningVisualKind;
  title: string;
  description?: string;
  lanes: PlanningVisualLane[];
  nodes: PlanningVisualNode[];
  edges: PlanningVisualEdge[];
  evidence: PlanningVisualEvidence;
  render: PlanningVisualRenderContract;
}

export interface PlanningVisualValidationError {
  code: string;
  path: string;
  message: string;
}

export interface PlanningVisualValidationResult {
  ok: boolean;
  errors: PlanningVisualValidationError[];
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA = /^[0-9a-f]{40}$/i;
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedText(
  value: unknown,
  limit: number = PLANNING_VISUAL_LIMITS.maxTextChars,
): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}

function safeRepositoryReference(value: unknown): value is string {
  if (!boundedText(value, 512)) return false;
  const text = value.trim();
  if (URI_SCHEME.test(text) || text.startsWith('/') || text.startsWith('\\')) return false;
  return !text.replace(/\\/g, '/').split('/').some((part) => part === '..');
}

function add(
  errors: PlanningVisualValidationError[],
  code: string,
  path: string,
  message: string,
): void {
  errors.push({ code, path, message });
}

export function validatePlanningVisualSpec(input: unknown): PlanningVisualValidationResult {
  const errors: PlanningVisualValidationError[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: [{ code: 'spec_not_object', path: '$', message: 'PlanningVisualSpec must be an object.' }] };
  }

  if (input.schemaVersion !== PLANNING_VISUAL_SCHEMA_VERSION) add(errors, 'schema_version_invalid', 'schemaVersion', 'Unsupported planning visual schema version.');
  if (!['roadmap', 'dependency-map', 'process-map'].includes(String(input.kind))) add(errors, 'kind_invalid', 'kind', 'Unsupported planning visual kind.');
  if (!boundedText(input.title, 200)) add(errors, 'title_invalid', 'title', 'Title is required and bounded.');
  if (input.description !== undefined && !boundedText(input.description, 1_000)) add(errors, 'description_invalid', 'description', 'Description is invalid.');

  const lanes = Array.isArray(input.lanes) ? input.lanes : [];
  if (!Array.isArray(input.lanes)) add(errors, 'lanes_not_array', 'lanes', 'lanes must be an array.');
  if (lanes.length > PLANNING_VISUAL_LIMITS.maxLanes) add(errors, 'lanes_limit_exceeded', 'lanes', 'Too many lanes.');
  const laneIds = new Set<string>();
  lanes.forEach((lane, index) => {
    const path = `lanes[${index}]`;
    if (!isRecord(lane)) {
      add(errors, 'lane_not_object', path, 'Lane must be an object.');
      return;
    }
    const id = typeof lane.id === 'string' ? lane.id : '';
    if (!ID.test(id)) add(errors, 'lane_id_invalid', `${path}.id`, 'Lane id is invalid.');
    if (laneIds.has(id)) add(errors, 'lane_id_duplicate', `${path}.id`, `Duplicate lane id ${id}.`);
    laneIds.add(id);
    if (!boundedText(lane.label, 120)) add(errors, 'lane_label_invalid', `${path}.label`, 'Lane label is invalid.');
    if (lane.order !== undefined && !Number.isInteger(lane.order)) add(errors, 'lane_order_invalid', `${path}.order`, 'Lane order must be an integer.');
  });

  const nodes = Array.isArray(input.nodes) ? input.nodes : [];
  if (!Array.isArray(input.nodes)) add(errors, 'nodes_not_array', 'nodes', 'nodes must be an array.');
  if (nodes.length < 1 || nodes.length > PLANNING_VISUAL_LIMITS.maxNodes) add(errors, 'nodes_count_invalid', 'nodes', 'nodes must contain a bounded non-empty set.');
  const nodeIds = new Set<string>();
  nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    if (!isRecord(node)) {
      add(errors, 'node_not_object', path, 'Node must be an object.');
      return;
    }
    const id = typeof node.id === 'string' ? node.id : '';
    if (!ID.test(id)) add(errors, 'node_id_invalid', `${path}.id`, 'Node id is invalid.');
    if (nodeIds.has(id)) add(errors, 'node_id_duplicate', `${path}.id`, `Duplicate node id ${id}.`);
    nodeIds.add(id);
    if (!boundedText(node.label)) add(errors, 'node_label_invalid', `${path}.label`, 'Node label is invalid.');
    if (node.laneId !== undefined && (typeof node.laneId !== 'string' || !laneIds.has(node.laneId))) add(errors, 'node_lane_missing', `${path}.laneId`, 'Node lane must reference a declared lane.');
    if (node.status !== undefined && !['active', 'live', 'pending', 'held', 'done'].includes(String(node.status))) add(errors, 'node_status_invalid', `${path}.status`, 'Node status is invalid.');
    if (node.order !== undefined && !Number.isInteger(node.order)) add(errors, 'node_order_invalid', `${path}.order`, 'Node order must be an integer.');
    if (node.detail !== undefined && !boundedText(node.detail, 1_000)) add(errors, 'node_detail_invalid', `${path}.detail`, 'Node detail is invalid.');
  });

  const edges = Array.isArray(input.edges) ? input.edges : [];
  if (!Array.isArray(input.edges)) add(errors, 'edges_not_array', 'edges', 'edges must be an array.');
  if (edges.length > PLANNING_VISUAL_LIMITS.maxEdges) add(errors, 'edges_limit_exceeded', 'edges', 'Too many edges.');
  const edgeIds = new Set<string>();
  edges.forEach((edge, index) => {
    const path = `edges[${index}]`;
    if (!isRecord(edge)) {
      add(errors, 'edge_not_object', path, 'Edge must be an object.');
      return;
    }
    const id = typeof edge.id === 'string' ? edge.id : '';
    if (!ID.test(id)) add(errors, 'edge_id_invalid', `${path}.id`, 'Edge id is invalid.');
    if (edgeIds.has(id)) add(errors, 'edge_id_duplicate', `${path}.id`, `Duplicate edge id ${id}.`);
    edgeIds.add(id);
    if (typeof edge.source !== 'string' || !nodeIds.has(edge.source)) add(errors, 'edge_source_missing', `${path}.source`, 'Edge source must reference a declared node.');
    if (typeof edge.target !== 'string' || !nodeIds.has(edge.target)) add(errors, 'edge_target_missing', `${path}.target`, 'Edge target must reference a declared node.');
    if (edge.source === edge.target) add(errors, 'edge_self_reference', path, 'Self-referencing edges are not allowed.');
    if (!['dependency', 'sequence', 'relationship'].includes(String(edge.kind))) add(errors, 'edge_kind_invalid', `${path}.kind`, 'Edge kind is invalid.');
    if (edge.label !== undefined && !boundedText(edge.label, 120)) add(errors, 'edge_label_invalid', `${path}.label`, 'Edge label is invalid.');
  });

  if (!isRecord(input.evidence)) {
    add(errors, 'evidence_invalid', 'evidence', 'Evidence must be an object.');
  } else {
    if (!safeRepositoryReference(input.evidence.source)) add(errors, 'evidence_source_unsafe', 'evidence.source', 'Evidence source must be opaque or repository-relative.');
    if (input.evidence.currentMainSha !== undefined && (typeof input.evidence.currentMainSha !== 'string' || !SHA.test(input.evidence.currentMainSha))) add(errors, 'evidence_sha_invalid', 'evidence.currentMainSha', 'CURRENT_MAIN SHA must be a 40-character Git SHA.');
    if (input.evidence.observedAt !== undefined && (typeof input.evidence.observedAt !== 'string' || Number.isNaN(Date.parse(input.evidence.observedAt)))) add(errors, 'evidence_time_invalid', 'evidence.observedAt', 'observedAt must be an ISO-compatible timestamp.');
  }

  if (!isRecord(input.render)) {
    add(errors, 'render_invalid', 'render', 'Render contract must be an object.');
  } else {
    if (!['16:9', '4:5', '1:1'].includes(String(input.render.aspectRatio))) add(errors, 'render_aspect_invalid', 'render.aspectRatio', 'Unsupported aspect ratio.');
    if (input.render.rendererProfile !== 'd3-deterministic-layout') add(errors, 'renderer_profile_invalid', 'render.rendererProfile', 'Renderer profile must be d3-deterministic-layout.');
    if (input.render.brandTokenSource !== MEDIA_PROJECT_BRAND_TOKEN_SOURCE) add(errors, 'brand_source_invalid', 'render.brandTokenSource', 'Canonical brand token source is required.');
    if (input.render.networkPolicy !== 'offline') add(errors, 'network_policy_invalid', 'render.networkPolicy', 'Planning visuals must render offline.');
    if (input.render.publishReady !== false) add(errors, 'publish_authority_invalid', 'render.publishReady', 'Planning visuals cannot grant publication authority.');
  }

  return { ok: errors.length === 0, errors };
}
