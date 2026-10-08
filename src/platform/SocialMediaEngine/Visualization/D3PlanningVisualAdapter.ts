import { scalePoint } from 'd3-scale';
import {
  validatePlanningVisualSpec,
  type PlanningVisualAspectRatio,
  type PlanningVisualSpec,
  type PlanningVisualStatus,
} from './PlanningVisual';

export interface PlanningVisualCanvas {
  width: number;
  height: number;
}

export interface PlanningVisualNodeGeometry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  laneId: string;
  status?: PlanningVisualStatus;
}

export interface PlanningVisualEdgeGeometry {
  id: string;
  source: string;
  target: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PlanningVisualGeometry {
  renderer: 'd3';
  deterministic: true;
  canvas: PlanningVisualCanvas;
  nodes: PlanningVisualNodeGeometry[];
  edges: PlanningVisualEdgeGeometry[];
}

const CANVAS_BY_ASPECT: Record<PlanningVisualAspectRatio, PlanningVisualCanvas> = {
  '16:9': { width: 1920, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '1:1': { width: 1080, height: 1080 },
};

const DEFAULT_LANE_ID = 'planning-default';

function ordered<T extends { id: string; order?: number }>(values: T[]): T[] {
  return [...values].sort((left, right) => {
    const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.id.localeCompare(right.id);
  });
}

export function resolvePlanningVisualCanvas(aspectRatio: PlanningVisualAspectRatio): PlanningVisualCanvas {
  return { ...CANVAS_BY_ASPECT[aspectRatio] };
}

export function layoutPlanningVisualWithD3(spec: PlanningVisualSpec): PlanningVisualGeometry {
  const validation = validatePlanningVisualSpec(spec);
  if (!validation.ok) {
    throw new Error(`PLANNING_VISUAL_INVALID:${validation.errors.map((error) => error.code).join(',')}`);
  }

  const canvas = resolvePlanningVisualCanvas(spec.render.aspectRatio);
  const horizontalPadding = Math.max(72, Math.round(canvas.width * 0.07));
  const topPadding = Math.max(120, Math.round(canvas.height * 0.12));
  const bottomPadding = Math.max(72, Math.round(canvas.height * 0.07));
  const nodeWidth = Math.min(360, Math.max(220, Math.round(canvas.width * 0.2)));
  const nodeHeight = Math.min(132, Math.max(92, Math.round(canvas.height * 0.09)));

  const declaredLanes = ordered(spec.lanes);
  const hasUnassignedNodes = spec.nodes.some((node) => node.laneId === undefined);
  const laneIds = [
    ...declaredLanes.map((lane) => lane.id),
    ...(declaredLanes.length === 0 || hasUnassignedNodes ? [DEFAULT_LANE_ID] : []),
  ];
  const laneX = scalePoint<string>()
    .domain(laneIds)
    .range([horizontalPadding + nodeWidth / 2, canvas.width - horizontalPadding - nodeWidth / 2])
    .padding(0.45);

  const nodeGeometry: PlanningVisualNodeGeometry[] = [];
  for (const laneId of laneIds) {
    const laneNodes = ordered(
      spec.nodes.filter((node) => (node.laneId ?? DEFAULT_LANE_ID) === laneId),
    );
    if (laneNodes.length === 0) continue;

    const nodeY = scalePoint<string>()
      .domain(laneNodes.map((node) => node.id))
      .range([topPadding + nodeHeight / 2, canvas.height - bottomPadding - nodeHeight / 2])
      .padding(0.45);

    for (const node of laneNodes) {
      nodeGeometry.push({
        id: node.id,
        x: Math.round(laneX(laneId) ?? canvas.width / 2),
        y: Math.round(nodeY(node.id) ?? canvas.height / 2),
        width: nodeWidth,
        height: nodeHeight,
        laneId,
        status: node.status,
      });
    }
  }

  const byId = new Map(nodeGeometry.map((node) => [node.id, node]));
  const edgeGeometry: PlanningVisualEdgeGeometry[] = spec.edges
    .map((edge) => {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) return null;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
      };
    })
    .filter((edge): edge is PlanningVisualEdgeGeometry => edge !== null)
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    renderer: 'd3',
    deterministic: true,
    canvas,
    nodes: nodeGeometry.sort((left, right) => left.id.localeCompare(right.id)),
    edges: edgeGeometry,
  };
}
