import {
  AGENT_ROLES, agentFromTitle, ga4EventCount, ga4RealtimeEventCount, isVerified, runtimeEvidence,
  type DashboardReadback, type AgentRole,
} from './ownerOperationsModel';

export type OwnerEvidenceStatus = 'VERIFIED' | 'BLOCKED' | 'NOT_PROVEN';
export type OwnerEvidenceRow = { label: string; status: OwnerEvidenceStatus; detail: string };
export type TimelinePoint = { day: string; count: number };
export type SourceCount = { label: string; count: number | null; scope: string };

const requiredFailed = (snapshot: DashboardReadback) =>
  snapshot.github.ci?.status === 'VERIFIED_PROVIDER_READ' &&
  snapshot.github.ci.runs.some(run => run.requiredByRootPolicy &&
    run.status === 'completed' && ['failure', 'timed_out', 'cancelled'].includes(run.conclusion ?? ''));

export function ownerEvidenceRows(snapshot: DashboardReadback): OwnerEvidenceRow[] {
  const ci = snapshot.github.ci;
  return [
    { label: 'GitHub Main / PRs',
      status: isVerified(snapshot.github) && snapshot.github.openPrCountStatus === 'VERIFIED' ? 'VERIFIED' : 'NOT_PROVEN',
      detail: 'GitHub Control Plane, nicht Runtime' },
    { label: 'Main-CI / Security-Gates',
      status: requiredFailed(snapshot) ? 'BLOCKED' :
        isVerified(snapshot.github) && ci?.status === 'VERIFIED_PROVIDER_READ' ? 'VERIFIED' : 'NOT_PROVEN',
      detail: 'Check-Run-Readback, keine Merge-Erlaubnis' },
    { label: 'Render Deployments',
      status: isVerified(snapshot.render) ? 'VERIFIED' : 'NOT_PROVEN',
      detail: 'Render Provider-Status, kein OCI-Attest' },
    { label: 'GA4 Events',
      status: isVerified(snapshot.ga4) ? 'VERIFIED' : 'NOT_PROVEN',
      detail: '7-Tage-Events, keine Zahlungen' },
    { label: 'Runtime-SHA / Healthz', ...runtimeEvidence(snapshot) },
    { label: 'Stripe-Umsatz',
      status: 'NOT_PROVEN',
      detail: 'Kein signierter Zahlungs- oder Transaktionsnachweis' },
  ];
}
export function ownerEvidenceCounts(rows: OwnerEvidenceRow[]) {
  return {
    verified: rows.filter(row => row.status === 'VERIFIED').length,
    blocked: rows.filter(row => row.status === 'BLOCKED').length,
    notProven: rows.filter(row => row.status === 'NOT_PROVEN').length,
    total: rows.length,
  };
}
/**
 * This time series is ONLY "last update to currently open PRs", never general GitHub
 * activity. It is unavailable when the paginated PR inventory is incomplete.
 */
export function ownerPrTimeline(snapshot: DashboardReadback, nowMs: number): TimelinePoint[] | null {
  const github = snapshot.github;
  if (!isVerified(github) || github.pullRequestsStatus !== 'VERIFIED' || !Array.isArray(github.pullRequests)) return null;
  if (!Number.isFinite(nowMs)) return null;
  const anchor = new Date(nowMs);
  if (!Number.isFinite(anchor.getTime())) return null;
  const midnight = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
  const points = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(midnight - (6-i) * 86400000);
    return { day: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }), count: 0 };
  });
  for (const pr of github.pullRequests) {
    if (typeof pr.updatedAt !== 'string' || !Number.isFinite(Date.parse(pr.updatedAt))) return null;
    const timestamp = Date.parse(pr.updatedAt);
    if (timestamp > nowMs + 60000) return null;
    const index = Math.floor((timestamp - (midnight - 6*86400000)) / 86400000);
    if (index >= 0 && index < 7) points[index].count++;
  }
  return points;
}
/** Mixed source counts are shown with explicit, different observation scopes. */
export function ownerSourceCounts(snapshot: DashboardReadback): SourceCount[] {
  const ci = snapshot.github.ci;
  return [
    { label: 'CI-Checks', count: isVerified(snapshot.github) && ci?.status === 'VERIFIED_PROVIDER_READ' ? ci.runs.length : null,
      scope: 'Aktueller Main-Commit · begrenzte Check-Run-Liste' },
    { label: 'Deployments', count: isVerified(snapshot.render) && snapshot.render.deployments ? snapshot.render.deployments.length : null,
      scope: 'Bis zu fünf letzte Render-Deployments' },
    { label: 'GA4-Events', count: isVerified(snapshot.ga4) && Array.isArray(snapshot.ga4.events) &&
      snapshot.ga4.events.every(row => Number.isSafeInteger(row.eventCount) && row.eventCount >= 0)
      ? snapshot.ga4.events.reduce((sum, x) => sum + x.eventCount, 0) : null,
      scope: '7 Tage · allowlistierte Eventtypen' },
  ];
}
export function ownerAgentRows(snapshot: DashboardReadback) {
  return AGENT_ROLES.map((agent: AgentRole) => ({
    agent,
    prCount: isVerified(snapshot.github) && snapshot.github.pullRequestsStatus === 'VERIFIED' &&
      snapshot.github.pullRequests ? snapshot.github.pullRequests.filter(pr => agentFromTitle(pr.title) === agent).length : null,
    runtime: 'NOT_PROVEN' as const,
  }));
}
export function ownerGa4Metrics(snapshot: DashboardReadback) {
  return {
    views: ga4EventCount(snapshot, 'page_view'),
    sessionStarts: ga4EventCount(snapshot, 'session_start'),
    viewedItems: ga4EventCount(snapshot, 'view_item'),
    leads: ga4EventCount(snapshot, 'generate_lead'),
    purchaseEvents: ga4EventCount(snapshot, 'purchase'),
    realtimeViews: ga4RealtimeEventCount(snapshot, 'page_view'),
    confirmedRevenue: null as null,
  };
}
