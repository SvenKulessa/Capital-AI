import { importWorkspace, exportWorkspace, type GrowthSnapshot } from './growthOwnerWorkspaceModel';

export const ROADMAP_PREFIX = 'commercial-roadmap-';
export const ROADMAP_ARCHIVE = '/api/profile/growth-intelligence/evidence-history';

export function parseCommercialRoadmap(raw: string): GrowthSnapshot[] {
  const snapshots = importWorkspace(raw);
  if (snapshots.some(s => !s.rows.length || s.rows.some(r => !r.id.startsWith(ROADMAP_PREFIX))))
    throw Error('ROADMAP_SCOPE_INVALID');
  return snapshots;
}

export function serializeCommercialRoadmap(snapshots: GrowthSnapshot[]): string {
  const validated = parseCommercialRoadmap(exportWorkspace(snapshots));
  return exportWorkspace(validated.map(snapshot => {
    // The existing archive requires canonical UTC milliseconds. Do not silently
    // truncate a timestamp with meaningful sub-millisecond precision.
    const fraction = /\.(\d+)Z$/.exec(snapshot.at)?.[1] ?? '';
    if (/[^0]/.test(fraction.slice(3))) throw Error('WORKSPACE_TIMESTAMP_PRECISION');
    return { ...snapshot, at: new Date(snapshot.at).toISOString() };
  }));
}

export function isOwnerRoadmapSession(raw: unknown, userId: string): boolean {
  if (!raw || typeof raw !== 'object' || !userId) return false;
  const body = raw as { authenticated?: unknown; mfaRequired?: unknown; user?: { id?: unknown }; account?: { available?: unknown; iamRole?: unknown } };
  return body.authenticated === true && body.mfaRequired !== true &&
    body.user?.id === userId && body.account?.available === true && body.account?.iamRole === 'owner';
}
