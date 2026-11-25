// Owner-only operations view model. Never synthesize missing provider facts.
export const OPERATIONS_SCHEMA = 'CAPITAL_AI_EVIDENCE_DASHBOARD_READBACK@1';
export const AGENT_ROLES = ['TRUST', 'SECURITY', 'PLATFORM', 'PRODUCT', 'MARKET', 'GROWTH'] as const;
export type AgentRole = typeof AGENT_ROLES[number];
export type OperationsView = 'overview' | 'github' | 'render' | 'analytics' | 'evidence';
export type ProviderEvidence = { status: string; observedAt?: string; reason?: string };
export type PullRequest = { number: number; title: string; draft: boolean; headSha: string | null; updatedAt: string | null };
export type CheckRun = { name: string; status: string; conclusion: string | null; requiredByRootPolicy: boolean };
export type Deployment = { deployId: string | null; deployStatus: string; sourceCommitSha: string; finishedAt: string | null };
export type TypeScriptEvidence = {
  status: 'VERIFIED_PROVIDER_READ' | 'NOT_PROVEN'; reason?: 'TS7_EVIDENCE_UNAVAILABLE';
  state?: 'BLOCKED'; classification?: 'BINARY_AFFECTED'; dependency?: 'typescript';
  currentVersion?: string; candidateVersion?: '7.0.2';
  evaluatedAt?: string; reviewOnOrAfter?: string; reasonCode?: 'NATIVE_BUILD_TOOL_BINARY_VULNERABILITY';
  binarySha256?: string; evidenceScope?: 'REPOSITORY_DECISION_HISTORICAL_SCAN_NOT_LIVE_BINARY_VERIFICATION';
  evidenceUrl?: string;
};
export type AcodeXArchiveFile = { url: string; sha256: string };
export type AcodeXRecovery = {
  classification: 'OWNER_TERMINAL_RECOVERY_SNAPSHOT'; provenance: 'OWNER_TERMINAL_OUTPUT';
  status: 'VERIFIED'; historicalIncidentStatus: 'BLOCKED_OBSERVED'; currentDeviceStatus: 'NOT_PROVEN';
  baselineUtc: string; expectedStartUtc: string; latestSuccessUtc: string; checkedUtc: string;
  healthExit: 0; outerExit: 0; guardAuditExit: 0; acopyCommandExit: 0;
  lockClear: true; newOAuthFailures: 0; newPullFailures: 0; postBaselineSuccessCount: number;
  pullShaMatch: true; guardShaMatch: true; filtersPresent: true; bridgeAckStatus: 'NOT_PROVEN';
};
export type AcodeXArchive = {
  recovery?: AcodeXRecovery;
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
    evidence?: string; typescript?: TypeScriptEvidence;
  };
  render: ProviderEvidence & {
    serviceId?: string; workspaceId?: string; deployId?: string | null;
    deployStatus?: string; sourceCommitSha?: string;
    deployments?: Deployment[]; deploymentIdentityStatus?: string;
  };
  ga4: ProviderEvidence & {
    property?: string; period?: string; events?: { eventName: string; eventCount: number }[];
    realtimeStatus?: string; realtimeEvents?: { eventName: string; eventCount: number }[];
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
const isoCalendarDate = (value: unknown): boolean => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
};
const archiveFile = (value: unknown): boolean =>
  isRecord(value) && typeof value.url === 'string' &&
  /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{15,}\/view\?usp=drivesdk$/.test(value.url) &&
  typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256);
const recoveryRecord = (value: unknown): boolean => {
  if (!isRecord(value) || value.classification !== 'OWNER_TERMINAL_RECOVERY_SNAPSHOT' ||
      value.provenance !== 'OWNER_TERMINAL_OUTPUT' || value.status !== 'VERIFIED' ||
      value.historicalIncidentStatus !== 'BLOCKED_OBSERVED' || value.currentDeviceStatus !== 'NOT_PROVEN' ||
      value.bridgeAckStatus !== 'NOT_PROVEN' ||
      ![value.baselineUtc, value.expectedStartUtc, value.latestSuccessUtc, value.checkedUtc].every(safeDate) ||
      ![value.healthExit, value.outerExit, value.guardAuditExit, value.acopyCommandExit,
        value.newOAuthFailures, value.newPullFailures].every(v => v === 0) ||
      ![value.lockClear, value.pullShaMatch, value.guardShaMatch, value.filtersPresent].every(v => v === true) ||
      typeof value.postBaselineSuccessCount !== 'number' || !Number.isSafeInteger(value.postBaselineSuccessCount) ||
      value.postBaselineSuccessCount < 1) return false;
  const times = [value.baselineUtc, value.expectedStartUtc, value.latestSuccessUtc, value.checkedUtc]
    .map(v => Date.parse(v as string));
  return times[0] < times[1] && times[1] <= times[2] && times[2] <= times[3];
};
const archiveRecord = (value: unknown): boolean => {
  if (!isRecord(value) || value.classification !== 'HISTORICAL_REFERENCE_ONLY' ||
      value.provenance !== 'OWNER_TERMINAL_OUTPUT_AND_DRIVE_SHA256_READBACK' ||
      value.archiveStatus !== 'VERIFIED' || value.currentDeviceStatus !== 'NOT_PROVEN' ||
      value.workstream !== 'PLATFORM / ACODEX_P1_V2' || value.evidenceVersion !== '1.1.0' ||
      ![value.baselineUtc, value.expectedStartUtc, value.latestSuccessUtc, value.checkedUtc].every(safeDate) ||
      value.healthExit !== 0 || value.outerExit !== 0 || value.guardAuditExit !== 0 ||
      value.lockClear !== true || value.newOAuthFailures !== 0 || value.newPullFailures !== 0 ||
      !isRecord(value.evidence)) return false;
  return (value.recovery === undefined || recoveryRecord(value.recovery)) &&
    ['v1', 'v11', 'standard'].every(k => archiveFile((value.evidence as Record<string, unknown>)[k]));
};
export function readDashboardSnapshot(value: unknown): DashboardReadback | null {
  if (!isRecord(value) || value.schema !== OPERATIONS_SCHEMA || value.private !== true ||
      value.readOnly !== true || value.syntheticDataUsed !== false || !safeDate(value.generatedAt)) return null;
  if (!isRecord(value.github) || !isRecord(value.render) || !isRecord(value.ga4) || !isRecord(value.comparison)) return null;
  if (typeof value.github.status !== 'string' || typeof value.render.status !== 'string' ||
      typeof value.ga4.status !== 'string' || typeof value.comparison.mainVsDeploy !== 'string' ||
      typeof value.comparison.runtimeBuildIdentity !== 'string') return null;
  // Reject untrusted HTML URLs, mismatched SHAs and invented approval statuses.
  if (value.github.typescript !== undefined) {
    const t = value.github.typescript;
    if (!isRecord(t) || !['VERIFIED_PROVIDER_READ', 'NOT_PROVEN'].includes(String(t.status))) return null;
    if (t.status === 'NOT_PROVEN') {
      if (t.reason !== 'TS7_EVIDENCE_UNAVAILABLE' || Object.keys(t).some(k => !['status','reason'].includes(k))) return null;
    } else {
      const sha = value.github.mainSha;
      const expected = typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha)
        ? 'https://github.com/SvenKulessa/Capital-AI/blob/' + sha + '/docs/security/evidence/dependency-decisions/typescript-7.0.2.json' : null;
      if (t.state !== 'BLOCKED' || t.classification !== 'BINARY_AFFECTED' ||
          t.dependency !== 'typescript' || t.candidateVersion !== '7.0.2' ||
          typeof t.currentVersion !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(t.currentVersion) ||
          typeof t.evaluatedAt !== 'string' || !safeDate(t.evaluatedAt) ||
          !isoCalendarDate(t.reviewOnOrAfter) ||
          t.reasonCode !== 'NATIVE_BUILD_TOOL_BINARY_VULNERABILITY' ||
          typeof t.binarySha256 !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(t.binarySha256) ||
          t.evidenceScope !== 'REPOSITORY_DECISION_HISTORICAL_SCAN_NOT_LIVE_BINARY_VERIFICATION' ||
          t.evidenceUrl !== expected) return null;
    }
  }
  if (value.github.pullRequests !== undefined && !Array.isArray(value.github.pullRequests)) return null;
  if (value.github.ci !== undefined && (!isRecord(value.github.ci) || !Array.isArray(value.github.ci.runs))) return null;
  if (value.render.deployments !== undefined && !Array.isArray(value.render.deployments)) return null;
  if (value.ga4.events !== undefined && !Array.isArray(value.ga4.events)) return null;
  if (value.ga4.realtimeEvents !== undefined && !Array.isArray(value.ga4.realtimeEvents)) return null;
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
export function ga4RealtimeEventCount(snapshot: DashboardReadback, event: string): number | null {
  const source = snapshot.ga4;
  if (!isVerified(source) || source.realtimeStatus !== 'VERIFIED_PROVIDER_READ' ||
      !Array.isArray(source.realtimeEvents)) return null;
  const row = source.realtimeEvents.find(entry => entry.eventName === event);
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

/** Only approved status categories are rendered; raw provider errors are never echoed. */
const GA4_DIAGNOSTIC_LABELS = Object.freeze({
  GA4_PROPERTY_CONFIG_MISSING: 'GA4-Property-Konfiguration fehlt',
  GA4_PROPERTY_NUMBER_NOT_CONFIGURED: 'GA4-Property-Konfiguration fehlt',
  GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED: 'GA4-Leseidentität nicht konfiguriert',
  GA4_MCP_PROJECT_MISMATCH: 'Projektbindung stimmt nicht überein',
  GA4_MCP_PROCESS_START_FAILED: 'GA4-MCP-Prozess nicht verfügbar',
  GA4_MCP_REQUEST_TIMEOUT: 'GA4-MCP-Prozess hat Zeitlimit überschritten',
  GA4_PROPERTY_NOT_ACCESSIBLE: 'GA4-Property-Zugriff nicht bestätigt',
  GA4_PROPERTY_DETAILS_NOT_BOUND: 'GA4-Property-Bindung nicht bestätigt',
  GA4_PROJECT_CONFIG_MISSING: 'Google-Projektkonfiguration fehlt',
  GA4_CREDENTIAL_CONFIG_MISSING: 'GA4-Leseidentität nicht konfiguriert',
  GA4_CREDENTIAL_CONFIG_INVALID: 'GA4-Leseidentität ungültig konfiguriert',
  GA4_PROJECT_BINDING_MISMATCH: 'Projektbindung stimmt nicht überein',
  GA4_PROPERTY_ACCESS_NOT_PROVEN: 'GA4-Property-Zugriff nicht bestätigt',
  GA4_PROPERTY_BINDING_NOT_PROVEN: 'GA4-Property-Bindung nicht bestätigt',
  GA4_MCP_RUNTIME_UNAVAILABLE: 'GA4-MCP-Prozess nicht verfügbar',
  GA4_MCP_RUNTIME_TIMEOUT: 'GA4-MCP-Prozess hat Zeitlimit überschritten',
  GA4_MCP_PROVIDER_REJECTED: 'GA4-MCP-Anfrage nicht bestätigt',
  GA4_READBACK_TIMEOUT: 'GA4-Readback hat Zeitlimit überschritten',
  GA4_PROVIDER_RESPONSE_INVALID: 'GA4-Providerantwort ist ungültig',
});
export function ga4DiagnosticLabel(reason?: string): string {
  return typeof reason === 'string' && Object.hasOwn(GA4_DIAGNOSTIC_LABELS, reason)
    ? GA4_DIAGNOSTIC_LABELS[reason as keyof typeof GA4_DIAGNOSTIC_LABELS]
    : 'GA4-Readback nicht nachgewiesen';
}
