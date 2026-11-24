import { z } from 'zod';

export const domains = ['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'] as const;
export const statuses = ['VERIFIED', 'BLOCKED', 'NOT_PROVEN'] as const;
const note = z.string().max(1000);
export const rowSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  name: z.string().min(1).max(120),
  domain: z.enum(domains),
  priority: z.enum(['P0', 'P1', 'P2']),
  status: z.enum(statuses),
  endpoint: note, auth: note, flow: note, tests: note, error: note,
  dependencies: note, approvals: note, operation: note, next: note, evidence: note,
  origin: z.enum(['OWNER_NOTE', 'GA4_READBACK']),
}).strict();
export type GrowthRow = z.infer<typeof rowSchema>;
const snapshotSchema = z.object({
  version: z.number().int().positive(), at: z.iso.datetime(),
  rows: z.array(rowSchema).max(100),
}).strict().refine(v => new Set(v.rows.map(r => r.id)).size === v.rows.length);
export type GrowthSnapshot = z.infer<typeof snapshotSchema>;
const bundleSchema = z.object({
  schema: z.literal('CAPITAL_AI_GROWTH_OWNER_WORKSPACE@1'),
  snapshots: z.array(snapshotSchema).min(1).max(30),
}).strict().refine(b => b.snapshots.every((s, i) => i === 0 || s.version > b.snapshots[i-1].version));

export function makeRow(id: string, name: string, domain: GrowthRow['domain'], next = ''): GrowthRow {
  return { id, name, domain, priority: 'P1', status: 'NOT_PROVEN', endpoint: '', auth: '',
    flow: '', tests: '', error: '', dependencies: '', approvals: '', operation: '',
    next, evidence: '', origin: 'OWNER_NOTE' };
}
export function initialRows(): GrowthRow[] {
  return [
    { ...makeRow('ga4', 'GA4 Acquisition', 'GROWTH', 'Owner-Readback ausführen'),
      priority: 'P0', endpoint: '/api/profile/growth-intelligence/ga4-readback',
      flow: 'GA4 → aggregierter Growth Data Layer; getrennt von UMAMI/GSC/Social',
      auth: 'Serverseitiger Owner-Zugriff; Live-Nachweis offen', evidence: 'PR #932: Repository-Integration' },
    makeRow('gsc', 'Google Search Console', 'GROWTH', 'Property und Leserechte verifizieren'),
    makeRow('instagram', 'Instagram Insights', 'GROWTH', 'OAuth und Insights-Leserechte prüfen'),
    makeRow('youtube', 'YouTube Analytics', 'GROWTH', 'OAuth-Scopes und Freigabestatus prüfen'),
    makeRow('umami', 'UMAMI', 'GROWTH', 'Quelle separat abgleichen'),
    { ...makeRow('marketnews', 'Marktnews-Pipeline', 'MARKET', 'Bestehende Evidence referenzieren'),
      flow: 'Read-only Status / Herkunft / Rechte' },
    { ...makeRow('content', 'Content Engine', 'PRODUCT', 'Entwurfs- und Qualitätsstatus referenzieren'),
      flow: 'Read-only Entwurfskoordination; keine Veröffentlichung' },
    makeRow('langgraph', 'LangGraph SOLO2', 'PLATFORM', 'Checkpoint und Workflow-Evidence abgleichen'),
    { ...makeRow('trust', 'Rechte, Consent, Freigaben', 'TRUST', 'Scope- und Rechte-Evidence prüfen'), priority: 'P0' },
  ];
}
export function appendSnapshot(history: GrowthSnapshot[], rows: GrowthRow[], at: string): GrowthSnapshot[] {
  const next = snapshotSchema.parse({ version: (history.at(-1)?.version ?? 0) + 1, at, rows });
  const snapshots = [...history, next].slice(-30);
  while (snapshots.length > 1 && new TextEncoder().encode(JSON.stringify(snapshots)).length > 4_000_000) snapshots.shift();
  return snapshots;
}
export function importWorkspace(raw: string): GrowthSnapshot[] {
  if (new TextEncoder().encode(raw).length > 5_000_000) throw new Error('Import zu groß');
  const bundle = bundleSchema.parse(JSON.parse(raw));
  // Imported evidence is documentation, never live authority.
  return bundle.snapshots.map(s => ({ ...s, rows: s.rows.map(r => ({
    ...r, origin: 'OWNER_NOTE' as const, status: r.status === 'VERIFIED' ? 'NOT_PROVEN' as const : r.status,
  })) }));
}
export function exportWorkspace(history: GrowthSnapshot[]): string {
  return JSON.stringify(bundleSchema.parse({ schema: 'CAPITAL_AI_GROWTH_OWNER_WORKSPACE@1', snapshots: history }));
}
export function applyOwnerEdit(row: GrowthRow): GrowthRow {
  return rowSchema.parse({ ...row, origin: 'OWNER_NOTE', status: row.status === 'VERIFIED' ? 'NOT_PROVEN' : row.status });
}
const ga4Schema = z.object({
  schema: z.literal('CAPITAL_AI_GROWTH_GA4_READBACK@1'), source: z.literal('GA4_DATA_API'),
  private: z.literal(true), readOnly: z.literal(true), publicPublishAllowed: z.literal(false),
  attributionAuthority: z.literal('SEPARATE_FROM_UMAMI_GSC_SOCIAL'),
  observedAt: z.iso.datetime(), status: z.enum(['PROVIDER_READ_VERIFIED', 'NOT_PROVEN_NO_ROWS']),
  metrics: z.object({ sessions: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    engagedSessions: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }).nullable(),
});
export function projectGa4(raw: unknown, row: GrowthRow): GrowthRow {
  const data = ga4Schema.parse(raw);
  if (row.id !== 'ga4') throw new Error('Falsche Quelle');
  if (data.status === 'PROVIDER_READ_VERIFIED' && (!data.metrics || data.metrics.engagedSessions > data.metrics.sessions))
    throw new Error('Ungültige Metriken');
  if (data.status === 'NOT_PROVEN_NO_ROWS' && data.metrics !== null) throw new Error('Widersprüchliche Metriken');
  return { ...row, name: 'GA4 Acquisition', domain: 'GROWTH', endpoint: '/api/profile/growth-intelligence/ga4-readback',
    flow: 'GA4 → aggregierter Growth Data Layer; getrennt von UMAMI/GSC/Social',
    auth: 'Owner-Readback serverseitig bestätigt', origin: 'GA4_READBACK', status: data.metrics ? 'VERIFIED' : 'NOT_PROVEN',
    operation: 'GA4 Readback: ' + data.observedAt,
    evidence: data.metrics ? '7 abgeschlossene Tage: Sessions ' + data.metrics.sessions + ', Engaged Sessions ' + data.metrics.engagedSessions : 'Keine Report-Zeilen; keine gemessene Null',
    error: '', tests: 'Server-Readback-Vertrag geprüft; keine Aussage über andere Quellen',
  };
}
