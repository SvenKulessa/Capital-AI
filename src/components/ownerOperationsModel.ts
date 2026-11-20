// Owner-only operations view model. Never synthesize missing provider facts.
export const OPERATIONS_SCHEMA = 'CAPITAL_AI_EVIDENCE_DASHBOARD_READBACK@1';
export const AGENT_ROLES = ['TRUST', 'SECURITY', 'PLATFORM', 'PRODUCT', 'MARKET', 'GROWTH'] as const;
export type AgentRole = typeof AGENT_ROLES[number];
export type OperationsView = 'overview' | 'github' | 'render' | 'analytics' | 'evidence';
export type ProviderEvidence = { status: string; observedAt?: string; reason?: string };
export type PullRequest = { number: number; title: string; draft: boolean; headSha: string | null; updatedAt: string | null };
export type CheckRun = { name: string; status: string; conclusion: string | null; requiredByRootPolicy: boolean };
export type Deployment = { deployId: string | null; deployStatus: string; sourceCommitSha: string; finishedAt: string | null };
export type AcodeXArchiveFile = { url: string; sha256: string };
export type AcodeXArchive = {
  workstream: string; evidenceVersion: string;
  classification: 'HISTORICAL_REFERENCE_ONLY';
  provenance: 'OWNER_TERMINAL_OUTPUT_AND_DRIVE_SHA256_READBACK';
  archiveStatus: 'VERIFIED'; currentDeviceStatus: 'NOT_PROVEN';
  baselineUtc: string; expectedStartUtc: string; latestSuccessUtc: string; checkedUtc: string;
  healthExit: 0; outerExit: 0; guardAuditExit: 0; lockClear: true;
  newOAuthFailures: 0; newPullFailures: 0;
  evidence: { v1: AcodeXArchiveFile; v11: AcodeXArchiveFile; standard: AcodeXArchiveFile };
};
export type DashboardReadback = {
  schema: string; private: true; readOnly: true; syntheticDataUsed: false; generatedAt: string;
  github: ProviderEvidence & {
    repository?: string; mainSha?: string; openPrCount?: number | null;
    openPrCountStatus?: string; pullRequests?: PullRequest[]; pullRequestsStatus?: string;
    ci?: { status: string; reason?: string | null; scope?: string; runs: CheckRun[] };
    evidence?: string;
  };
  render: ProviderEvidence & {
    serviceId?: string; workspaceId?: string; deployId?: string | null;
    deployStatus?: string; sourceCommitSha?: string;
    deployments?: Deployment[]; deploymentIdentityStatus?: string;
  };
  ga4: ProviderEvidence & {
    property?: string; period?: string; events?: { eventName: string; eventCount: number }[];
    revenue?: number | null; revenueStatus?: string;
  };
  comparison: { mainVsDeploy: string; runtimeBuildIdentity: string };
  acodex?: AcodeXArchive;
  baseline?: { status: string; valuesImported: boolean };
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const safeDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
const archiveFile = (value: unknown): boolean =>
  isRecord(value) && typeof value.url === 'string' &&
  /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{15,}\/view\?usp=drivesdk$/.test(value.url) &&
  typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256);
const archiveRecord = (value: unknown): boolean => {
  if (!isRecord(value) || value.classification !== 'HISTORICAL_REFERENCE_ONLY' ||
      value.provenance !== 'OWNER_TERMINAL_OUTPUT_AND_DRIVE_SHA256_READBACK' ||
      value.archiveStatus !== 'VERIFIED' || value.currentDeviceStatus !== 'NOT_PROVEN' ||
      value.workstream !== 'PLATFORM / ACODEX_P1_V2' || value.evidenceVersion !== '1.1.0' ||
      ![value.baselineUtc, value.expectedStartUtc, value.latestSuccessUtc, value.checkedUtc].every(safeDate) ||
      value.healthExit !== 0 || value.outerExit !== 0 || value.guardAuditExit !== 0 ||
      value.lockClear !== true || value.newOAuthFailures !== 0 || value.newPullFailures !== 0 ||
      !isRecord(value.evidence)) return false;
  return ['v1', 'v11', 'standard'].every(k => archiveFile((value.evidence as Record<string, unknown>)[k]));
};
export function readDashboardSnapshot(value: unknown): DashboardReadback | null {
  if (!isRecord(value) || value.schema !== OPERATIONS_SCHEMA || value.private !== true ||
      value.readOnly !== true || value.syntheticDataUsed !== false || !safeDate(value.generatedAt)) return null;
  if (!isRecord(value.github) || !isRecord(value.render) || !isRecord(value.ga4) || !isRecord(value.comparison)) return null;
  if (typeof value.github.status !== 'string' || typeof value.render.status !== 'string' ||
      typeof value.ga4.status !== 'string' || typeof value.comparison.mainVsDeploy !== 'string' ||
      typeof value.comparison.runtimeBuildIdentity !== 'string') return null;
  if (value.github.pullRequests !== undefined && !Array.isArray(value.github.pullRequests)) return null;
  if (value.github.ci !== undefined && (!isRecord(value.github.ci) || !Array.isArray(value.github.ci.runs))) return null;
  if (value.render.deployments !== undefined && !Array.isArray(value.render.deployments)) return null;
  if (value.ga4.events !== undefined && !Array.isArray(value.ga4.events)) return null;
  if (value.acodex !== undefined && !archiveRecord(value.acodex)) return null;
  return value as unknown as DashboardReadback;
}
export const isVerified = (value?: { status?: string }): boolean => value?.status === 'VERIFIED_PROVIDER_READ';
export function agentFromTitle(title: string): AgentRole | null {
  const match = /^\[CAPITAL-AI-(TRUST|SECURITY|PLATFORM|PRODUCT|MARKET|GROWTH)\]/.exec(title);
  return match ? match[1] as AgentRole : null;
}
export function visiblePullRequests(snapshot: DashboardReadback, agent: AgentRole | 'ALL', term = ''): PullRequest[] {
  if (!isVerified(snapshot.github)) return [];
  const search = term.trim().toLocaleLowerCase('de-DE');
  return (snapshot.github.pullRequests ?? []).filter(pr =>
    Number.isSafeInteger(pr.number) && pr.number > 0 && typeof pr.title === 'string' &&
    (agent === 'ALL' || agentFromTitle(pr.title) === agent) &&
    (!search || pr.title.toLocaleLowerCase('de-DE').includes(search) || String(pr.number) === search));
}
export function ga4EventCount(snapshot: DashboardReadback, event: string): number | null {
  if (!isVerified(snapshot.ga4) || !Array.isArray(snapshot.ga4.events)) return null;
  const row = snapshot.ga4.events.find(entry => entry.eventName === event);
  return row && Number.isSafeInteger(row.eventCount) && row.eventCount >= 0 ? row.eventCount : null;
}
export function evidenceState(snapshot: DashboardReadback, source: 'github' | 'render' | 'ga4' | 'ci' | 'revenue' | 'runtime'): string {
  if (source === 'revenue' || source === 'runtime') return 'NOT_PROVEN';
  if (source === 'ci') return snapshot.github.ci?.status === 'VERIFIED_PROVIDER_READ' && isVerified(snapshot.github) ? 'VERIFIED' : 'NOT_PROVEN';
  return isVerified(snapshot[source]) ? 'VERIFIED' : 'NOT_PROVEN';
}
export function isSnapshotStale(snapshot: DashboardReadback, nowMs: number, maxAgeMs = 10 * 60_000): boolean {
  const timestamp = Date.parse(snapshot.generatedAt);
  return !Number.isFinite(timestamp) || timestamp > nowMs + 60_000 || nowMs - timestamp > maxAgeMs;
}
