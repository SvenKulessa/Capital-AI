import { z } from 'zod';
import publicSurfacePlan from '../data/publicSurfaceDeliveryPlan.json';

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
  origin: z.enum(['OWNER_NOTE', 'GA4_READBACK', 'GSC_READBACK']),
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
export function publicSurfaceRows(): GrowthRow[] {
  return publicSurfacePlan.tasks.map(task => rowSchema.parse({
    ...makeRow('audit-' + task.id.toLowerCase(), task.id + ' · ' + task.name, task.domain as GrowthRow['domain'],
      'Acceptance Criteria und aktuellen CI-/Runtime-Nachweis prüfen'),
    priority: task.id.slice(0,2),
    dependencies: task.dependencies.join(', '),
    operation: 'CAI-PUBLIC-SURFACE@1 · ' + task.milestone + ' · Planung',
    flow: 'Public-safe Roadmap; keine operative Berechtigung',
  }));
}

export function addMissingPublicSurfaceRows(rows: GrowthRow[]): GrowthRow[] {
  const ids = new Set(rows.map(row => row.id));
  return [...rows, ...publicSurfaceRows().filter(row => !ids.has(row.id))];
}

// Export only a fixed, public-safe research task for the existing offline worker.
// Never submit to its inbox or derive authority from edited notes.
export function publicSurfaceResearchTask(id: string) {
  const task = publicSurfacePlan.tasks.find(t => 'audit-' + t.id.toLowerCase() === id);
  if (!task) throw new Error('Unknown audit task');
  return { schema: 'CAPITAL_AI_OFFLINE_RESEARCH@1', task_id: 'CAI-PUBLIC-SURFACE:' + task.id,
    domain: task.domain, query: 'Review repository evidence for CAI-PUBLIC-SURFACE@1 ' + task.id + ' ' + task.name + '. Report gaps; no mutation authority.' };
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
    { ...makeRow('x-growth-budget', 'X Growth · Budget', 'GROWTH', 'Kontoweite Freigabe, belastbare Recovery und Runtime-Reservierung verifizieren'),
      priority: 'P0', flow: '30-Tage-Pilot · 20 EUR Obergrenze · keine automatische Aufladung',
      approvals: 'Owner-Kostenfreigabe, aktuelles Guthaben und Kostenobergrenzen separat belegen',
      operation: 'Planung; keine produktive Budgetkontrolle behauptet' },
    { ...makeRow('x-growth-attribution', 'X Growth · Conversion-Funnel', 'GROWTH', 'Kampagnenspezifische GA4-, Supabase- und Stripe-Readbacks abgleichen'),
      priority: 'P1', flow: 'UTM → consentierte Sessions → Registrierungen → bestätigte bezahlte Abos',
      auth: 'Quellen getrennt; keine Kundendaten im Workspace; fehlend ist nicht Null',
      operation: 'Kohorten- und Zuordnungsevidence offen' },
    { ...makeRow('x-growth-graph', 'X Growth · LangGraph', 'PLATFORM', 'Budget- und Conversion-Evidence in bestehende Graph-Review integrieren'),
      priority: 'P1', flow: 'Nur Status-Referenzen, keine Publishing- oder Kostenautorität',
      operation: 'Runtime-Evidence offen' },
    ...publicSurfaceRows(),
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

const xCampaignSchema = z.object({
  schema:z.literal('CAPITAL_AI_X_CAMPAIGN_GA4_READBACK@1'),source:z.literal('GA4_DATA_API'),
  private:z.literal(true),readOnly:z.literal(true),publicPublishAllowed:z.literal(false),
  observedAt:z.iso.datetime(),period:z.object({start:z.literal('7daysAgo'),end:z.literal('yesterday'),timeZone:z.string().max(80).nullable()}).strict(),
  campaignId:z.literal('capital-ai-growth-20261120'),contentId:z.literal('CAP-GROW-005'),
  utmSource:z.literal('x'),utmMedium:z.literal('social'),attributionAuthority:z.literal('SESSION_UTM_ONLY'),
  status:z.enum(['PROVIDER_READ_VERIFIED','NOT_PROVEN_NO_ROWS']),
  metrics:z.object({sessions:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),engagedSessions:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict().nullable(),
  registrations:z.null(),paidSubscriptions:z.null(),
}).strict();
export function projectXCampaignGa4(raw:unknown,row:GrowthRow):GrowthRow {
  const d=xCampaignSchema.parse(raw);
  if(row.id!=='x-campaign')throw Error('Falsche Quelle');
  const verified=d.status==='PROVIDER_READ_VERIFIED',m=d.metrics;
  if(verified?(!m||m.engagedSessions>m.sessions):m!==null)throw Error('Ungültige Kampagnenmetriken');
  return {...row,name:'X Growth · GA4 Kampagne',domain:'GROWTH',origin:'GA4_READBACK',status:verified?'VERIFIED':'NOT_PROVEN',
    endpoint:'/api/profile/growth-intelligence/x-campaign-readback',flow:'GA4 Session-UTM · keine Klick-, Registrierungs- oder Zahlungsbestätigung',
    auth:'Owner-Readback',operation:'GA4 Kampagne: '+d.observedAt,error:'',
    evidence:m?'7 abgeschlossene Tage: '+m.sessions+' Sessions, '+m.engagedSessions+' Engaged Sessions; '+d.campaignId+'/'+d.contentId:'Keine bestätigte Kampagnenzeile; keine gemessene Null',
    tests:'Quellengetrennte Projektion; Registrierungen und zahlende Abos NOT_PROVEN'};
}

const graphSources = ['GA4','GSC','INSTAGRAM','YOUTUBE'] as const;
const graphDigest = z.string().regex(/^[a-f0-9]{64}$/);
const graphSource = z.object({
  source:z.enum(graphSources),
  status:z.enum(['SOURCE_RECORDED_NOT_AUTHENTICATED','BLOCKED_DUPLICATE_SOURCE','NOT_PROVEN_NO_READBACK',
    'BLOCKED_IDENTITY_NOT_CONFIGURED','BLOCKED_IDENTITY_OR_ENVELOPE','BLOCKED_INVALID_PERIOD',
    'NOT_PROVEN_STALE','NOT_PROVEN_INVALID_OR_EMPTY_REPORT','NOT_PROVEN_INVALID_METRICS']),
  transport:z.enum(['DISABLED','AUTH_REQUIRED','RATE_LIMITED','PROVIDER_UNAVAILABLE','INVALID_RESPONSE',
    'IDENTITY_MISMATCH','INCOMPLETE_PERIOD','READ_RESPONSE_RECEIVED']),
  evidenceSha256:graphDigest.nullable(),
}).strict();
const graphHandoff = z.object({
  contractVersion:z.literal('CAPITAL_AI_GROWTH_GRAPH_HANDOFF@1'), engine:z.literal('langgraph'),
  quality:z.enum(['PASS_WITH_GAPS','BLOCKED']), sources:z.array(graphSource).max(4),
  eligibleForDraftReview:z.boolean(), providerAuthentication:z.literal('NOT_PROVEN_BY_GRAPH'),
  attributionEvents:z.array(z.never()).length(0), publicationAllowed:z.literal(false),
  costActivationAllowed:z.literal(false), automaticChanges:z.literal(false),
}).strict();

/** Untrusted offline status-only report; separate rows never overwrite live owner readbacks. */
export function projectGraphHandoff(raw:string, reportSha:string, rows:GrowthRow[]):GrowthRow[] {
  if(new TextEncoder().encode(raw).length>16384)throw Error('Graph report too large');
  graphDigest.parse(reportSha);
  const data=graphHandoff.parse(JSON.parse(raw));
  const recorded=data.sources.filter(s=>s.status==='SOURCE_RECORDED_NOT_AUTHENTICATED');
  if(data.quality==='BLOCKED'?(data.sources.length!==0||data.eligibleForDraftReview):
    (data.sources.length!==4||new Set(data.sources.map(s=>s.source)).size!==4||
     data.eligibleForDraftReview!==(recorded.length>0)))throw Error('Invalid graph report');
  for(const s of data.sources){
    const hasRecord=s.status==='SOURCE_RECORDED_NOT_AUTHENTICATED';
    if(hasRecord?(s.evidenceSha256===null||s.transport!=='READ_RESPONSE_RECEIVED'):s.evidenceSha256!==null)
      throw Error('Invalid source digest');
  }
  const updates:GrowthRow[]=[{
    ...makeRow('growth-graph-handoff','Growth LangGraph · Import','PLATFORM','Trusted Runtime und Provider-Readbacks separat verifizieren'),
    operation:'Importierte Graph-Qualität: '+data.quality, flow:'Offline-Graph → Owner-Dokumentation',
    evidence:'Importdatei SHA-256 '+reportSha, auth:'NOT_PROVEN_BY_GRAPH',
  }];
  for(const s of data.sources)updates.push({
    ...makeRow('graph-source-'+s.source.toLowerCase(),s.source+' · Graph-Import','GROWTH','Provider-Identität und Readback separat verifizieren'),
    operation:s.status, auth:s.transport, flow:'Quellengetrennte Graph-Referenz; kein Live-Readback',
    evidence:'Importdatei SHA-256 '+reportSha+(s.evidenceSha256?'; Projektion SHA-256 '+s.evidenceSha256:''),
  });
  // Remove stale graph-import sources on a blocked/new report; preserve every other row.
  return [...rows.filter(r=>r.id!=='growth-graph-handoff'&&!graphSources.some(s=>r.id==='graph-source-'+s.toLowerCase())),...updates];
}

const gscSchema=z.object({
  schema:z.literal('CAPITAL_AI_GROWTH_GSC_READBACK@1'),source:z.literal('GSC_SEARCH_ANALYTICS_API'),
  private:z.literal(true),readOnly:z.literal(true),publicPublishAllowed:z.literal(false),
  attributionAuthority:z.literal('SEPARATE_FROM_GA4_UMAMI_SOCIAL'),property:z.literal('sc-domain:capital-ai.online'),
  observedAt:z.iso.datetime(),status:z.enum(['PROVIDER_READ_VERIFIED','NOT_PROVEN']),
  transport:z.enum(['DISABLED','AUTH_REQUIRED','RATE_LIMITED','PROVIDER_UNAVAILABLE','INVALID_RESPONSE','IDENTITY_MISMATCH','INCOMPLETE_PERIOD','READ_RESPONSE_RECEIVED']),
  period:z.object({startDate:z.iso.date(),endDate:z.iso.date()}).strict().nullable(),
  metrics:z.object({clicks:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    impressions:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    ctr:z.number().min(0).max(1),position:z.number().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict().nullable(),
  evidenceSha256:graphDigest.nullable(),
}).strict();
export function projectGsc(raw:unknown,row:GrowthRow):GrowthRow {
  const data=gscSchema.parse(raw);
  if(row.id!=='gsc')throw Error('Falsche Quelle');
  const verified=data.status==='PROVIDER_READ_VERIFIED';
  const m=data.metrics,p=data.period;
  if(verified?(!m||!p||!data.evidenceSha256||data.transport!=='READ_RESPONSE_RECEIVED'||
      m.clicks>m.impressions||Math.abs(m.ctr-m.clicks/m.impressions)>1e-12||
      Date.parse(p.endDate)-Date.parse(p.startDate)!==6*86400000||p.endDate>=data.observedAt.slice(0,10)):
      (m!==null||p!==null||data.evidenceSha256!==null))throw Error('Ungültiger GSC-Readback');
  return {...row,origin:'GSC_READBACK',status:verified?'VERIFIED':'NOT_PROVEN',name:'Google Search Console',domain:'GROWTH',
    endpoint:'/api/profile/growth-intelligence/gsc-readback',flow:'GSC → aggregierter Growth Data Layer; keine Attribution',
    auth:data.transport,operation:'GSC Readback: '+data.observedAt,error:verified?'':'Kein bestätigter Report',
    evidence:m&&p?p.startDate+' – '+p.endDate+': Klicks '+m.clicks+', Impressionen '+m.impressions+', CTR '+(m.ctr*100).toFixed(2)+' %, Position '+m.position+'; SHA-256 '+data.evidenceSha256:'',
    tests:'Quellengetrennter serverseitiger Readback; keine Aussage über andere Quellen'};
}
