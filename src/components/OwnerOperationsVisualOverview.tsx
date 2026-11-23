import { Activity, Bot, ChartColumnIncreasing, Cloud, Crown, GitPullRequest, Info, Layers3, LockKeyhole, ShieldCheck } from 'lucide-react';
import { isVerified, isSnapshotStale, type DashboardReadback } from './ownerOperationsModel';
import {
  ownerAgentRows, ownerEvidenceCounts, ownerEvidenceRows, ownerGa4Metrics,
  ownerPrTimeline, ownerSourceCounts,
} from './ownerOperationsVisualModel';
import './ownerOperationsVisual.css';

const pretty = (value: number | null | undefined) =>
  value === null || value === undefined ? '–' : new Intl.NumberFormat('de-DE').format(value);
function OrbitMascot() {
  // Original first-party SVG ornament: no personal images, provider metrics or external fetch.
  return <svg className="ops-mock-mascot" viewBox="0 0 240 200" role="img" aria-label="Goldener CAPITAL-AI-Buddy mit Analyse-Hologramm">
    <defs>
      <linearGradient id="ops-gold-robot" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff3a8"/><stop offset=".28" stopColor="#f9bf21"/><stop offset=".65" stopColor="#a9670b"/><stop offset="1" stopColor="#e2a62c"/>
      </linearGradient>
      <radialGradient id="ops-gold-glow"><stop stopColor="#e9a526" stopOpacity=".42"/><stop offset="1" stopColor="#e9a526" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="119" cy="165" rx="113" ry="29" fill="url(#ops-gold-glow)"/>
    <ellipse cx="112" cy="163" rx="105" ry="25" fill="none" stroke="#f9bf21" strokeWidth="1.4" opacity=".82"/>
    <ellipse cx="112" cy="163" rx="66" ry="16" fill="none" stroke="#fff2aa" opacity=".5"/>
    <g transform="translate(137 13) rotate(7)">
      <rect width="95" height="96" rx="8" fill="#111930" fillOpacity=".83" stroke="#b794f4" strokeWidth="2"/>
      <path d="M12 27H47M12 40H39M12 53H43" stroke="#8184b3" strokeWidth="2" opacity=".5"/>
      <rect x="50" y="63" width="10" height="20" rx="2" fill="#ab751d"/>
      <rect x="63" y="46" width="10" height="37" rx="2" fill="#e6a626"/>
      <rect x="76" y="29" width="10" height="54" rx="2" fill="#f9bf21"/>
    </g>
    <g stroke="#633600" strokeWidth="1.4" fill="url(#ops-gold-robot)">
      <rect x="64" y="68" width="65" height="60" rx="26"/>
      <rect x="58" y="18" width="77" height="62" rx="24"/>
      <circle cx="57" cy="52" r="10"/><circle cx="137" cy="52" r="10"/>
      <rect x="52" y="82" width="14" height="42" rx="7" transform="rotate(10 52 82)"/>
      <rect x="129" y="82" width="14" height="42" rx="7" transform="rotate(-10 129 82)"/>
      <rect x="73" y="119" width="19" height="37" rx="8"/><rect x="105" y="119" width="19" height="37" rx="8"/>
      <ellipse cx="82" cy="158" rx="15" ry="6"/><ellipse cx="114" cy="158" rx="15" ry="6"/>
    </g>
    <rect x="69" y="35" width="56" height="28" rx="12" fill="#111629" stroke="#ffdd78" strokeWidth="1.3"/>
    <ellipse cx="88" cy="48" rx="6" ry="4.5" fill="#ffe17a"/>
    <ellipse cx="108" cy="48" rx="6" ry="4.5" fill="#ffe17a"/>
    <circle cx="98" cy="95" r="8" fill="#342117" stroke="#fff0a6" strokeWidth="2"/>
  </svg>;
}
function OwnerKpi({ type, title, value, detail, verified }: {
  type: 'github' | 'render' | 'ga4' | 'evidence'; title: string; value: string; detail: string; verified: boolean;
}) {
  const Icon = type === 'github' ? GitPullRequest : type === 'render' ? Cloud : type === 'ga4' ? ChartColumnIncreasing : ShieldCheck;
  return <div className={'ops-mock-kpi ops-mock-kpi--' + type}>
    <div className="ops-mock-kpi-head"><Icon aria-hidden="true" className="h-5 w-5"/><span>{title}</span></div>
    <strong className="ops-mock-kpi-value">{value}</strong>
    <span className={'ops-mock-kpi-foot ' + (verified ? 'ops-mock-good' : 'ops-mock-muted')}>
      {verified ? '● ' : '○ '}{detail}
    </span>
  </div>;
}
function LineChart({ points }: { points: ReturnType<typeof ownerPrTimeline> }) {
  if (!points) return <p role="status" className="ops-mock-empty">NOT_PROVEN · vollständige PR-Zeitreihe nicht verfügbar.</p>;
  const max = Math.max(1, ...points.map(point => point.count));
  const nodes = points.map((point,i) => ({x:28 + i*72, y:157 - point.count/max * 128}));
  const path = nodes.map((point,i) => (i ? 'L' : 'M') + point.x + ' ' + point.y).join(' ');
  const area = path + ' L460 159 L28 159 Z';
  return <div className="ops-mock-chart-area">
    <svg viewBox="0 0 490 202" role="img" aria-label={'Letzte Aktualisierungen offener Pull Requests: ' + points.map(p=>p.day + ' ' + p.count).join(', ')}>
      <defs><linearGradient id="ops-line-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8d26ff" stopOpacity=".46"/><stop offset="1" stopColor="#8d26ff" stopOpacity=".01"/></linearGradient></defs>
      {[29,73,116,159].map(y=><line key={y} x1="28" x2="460" y1={y} y2={y} stroke="#a5b4fc" opacity=".19"/>)}
      <path d={area} fill="url(#ops-line-fill)"/>
      <path d={path} fill="none" stroke="var(--color-brand-ai)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
      {nodes.map((point,i)=><circle key={i} cx={point.x} cy={point.y} r="4" fill="#f9bf21" stroke="#aa87ff" strokeWidth="2"/>)}
      {points.map((point,i)=><text key={i} x={28+i*72} y="187" textAnchor="middle" fontSize="12" fill="#cbd5e1">{point.day}</text>)}
    </svg>
  </div>;
}
function EvidenceDonut({ rows }: { rows: ReturnType<typeof ownerEvidenceRows> }) {
  const counts = ownerEvidenceCounts(rows);
  const percent = counts.total ? Math.round(counts.verified / counts.total * 100) : 0;
  const first = counts.total ? counts.verified / counts.total * 100 : 0;
  const second = counts.total ? (counts.verified + counts.blocked) / counts.total * 100 : 0;
  const segments = `conic-gradient(#4ade80 0% ${first}%, #f9bf21 ${first}% ${second}%, #f87171 ${second}% 100%)`;
  return <div className="ops-mock-donut-layout">
    <div className="ops-mock-donut" style={{background:segments}} role="img" aria-label={`${counts.verified} verified, ${counts.blocked} blocked, ${counts.notProven} not proven`}>
      <div className="ops-mock-donut-hole"><strong>{percent}%</strong><span>VERIFIED</span></div>
    </div>
    <div className="ops-mock-legend">
      {[['VERIFIED',counts.verified,'#4ade80'],['BLOCKED',counts.blocked,'#f9bf21'],['NOT_PROVEN',counts.notProven,'#f87171']].map(([label,value,color])=>
        <div key={String(label)}><span className="ops-mock-key" style={{background:String(color)}}></span>
          <span>{label}</span><strong>{value} / {counts.total}</strong></div>)}
    </div>
  </div>;
}
function MixedBarChart({ snapshot }: { snapshot: DashboardReadback }) {
  const values = ownerSourceCounts(snapshot);
  const max = Math.max(1, ...values.map(row=>row.count ?? 0));
  return <div className="ops-mock-bars" role="group" aria-label="Umfänge der drei verschiedenen Provider-Projektionen">
    {values.map((row)=><div key={row.label} className="ops-mock-bar-column">
      <div className="ops-mock-bar-scale">
        {row.count !== null && <div className="ops-mock-bar-fill" style={{height:(row.count === 0 ? 0 : Math.max(8, row.count / max * 100))+'%'}}/>}
      </div>
      <strong>{pretty(row.count)}</strong>
      <span>{row.label}</span>
      <small>{row.scope}</small>
    </div>)}
  </div>;
}
function AgentCards({ snapshot }: { snapshot: DashboardReadback }) {
  return <div className="ops-mock-agent-grid">{ownerAgentRows(snapshot).map(({agent,prCount,runtime})=>
    <div key={agent} className="ops-mock-agent"><strong>{agent}</strong>
      <span><i aria-hidden="true"/> {runtime}</span>
      <small>PRs: {pretty(prCount)}</small>
    </div>)}</div>;
}
/** Exact visual structure of the owner-approved reference, but with evidence-only metrics. */
export function OwnerOperationsVisualOverview({ snapshot }: { snapshot: DashboardReadback }) {
  const gh = snapshot.github, render = snapshot.render, ga4 = snapshot.ga4;
  const rows = ownerEvidenceRows(snapshot);
  const counts = ownerEvidenceCounts(rows);
  const events = ownerGa4Metrics(snapshot);
  const ga4Rows = isVerified(ga4)
    ? (ga4?.events ?? []).filter(row => Number.isSafeInteger(row.eventCount) && row.eventCount >= 0) : [];
  const ga4Cards = [
    { label: 'page_view', count: events.views },
    { label: 'session_start', count: events.sessionStarts },
    { label: 'view_item', count: events.viewedItems },
    { label: 'generate_lead', count: events.leads },
    { label: 'purchase (Event)', count: events.purchaseEvents },
    { label: 'page_view (Echtzeit)', count: events.realtimeViews },
  ];
  const maxGa4 = Math.max(1, ...ga4Rows.map(row => row.eventCount));
  const active = isSnapshotStale(snapshot, Date.now());
  const prValue = isVerified(gh) && gh.openPrCountStatus === 'VERIFIED' ? pretty(gh.openPrCount) : '–';
  const renderLive = isVerified(render) && render.deployStatus === 'live';
  return <div className="ops-mock" aria-label="Owner Operations Center mit Live-Evidence">
    <header className="ops-mock-header">
      <div className="ops-mock-header-copy">
        <p className="ops-mock-eyebrow">CAPITAL-AI / OWNER OPERATIONS</p>
        <h3><Crown aria-hidden="true"/> Owner Operations Center</h3>
        <p>Zentrale Übersicht für Provider, Deployments, Evidence und Multi-Agent Operations.</p>
      </div>
      <span className="ops-mock-owner-badge"><LockKeyhole aria-hidden="true" className="h-4 w-4"/> Owner-Bereich · angemeldet</span>
      <div className="ops-mock-orbit" aria-hidden="true"><OrbitMascot/></div>
    </header>
    <div className="ops-mock-kpis">
      <OwnerKpi type="github" title="GitHub" value={prValue} detail={prValue === '–' ? 'NOT_PROVEN' : 'Offene PRs'} verified={prValue !== '–'}/>
      <OwnerKpi type="render" title="Render" value={isVerified(render) ? render.deployStatus ?? '–' : '–'}
        detail={renderLive ? 'Provider meldet LIVE' : 'Kein bestätigter LIVE-Status'} verified={renderLive}/>
      <OwnerKpi type="ga4" title="GA4" value={pretty(events.views)} detail={events.views === null ? 'NOT_PROVEN' : 'page_view · 7 Tage'} verified={events.views !== null}/>
      <OwnerKpi type="evidence" title="Evidence" value={Math.round(counts.verified/counts.total*100)+'%'}
        detail={counts.verified+' / '+counts.total+' Provider-Nachweise'} verified={counts.verified>0}/>
    </div>
    <div className="ops-mock-panels">
      <section className="ops-mock-card">
        <h4><Activity aria-hidden="true"/> PR-Aktivität</h4>
        <p className="ops-mock-subtitle">Letztes Update aktuell offener PRs · 7 Tage · UTC</p>
        <LineChart points={ownerPrTimeline(snapshot,Date.now())}/>
      </section>
      <section className="ops-mock-card">
        <h4><ShieldCheck aria-hidden="true"/> Evidence Status</h4>
        <p className="ops-mock-subtitle">Tatsächlicher Provider-Readback · keine Freigabe</p>
        <EvidenceDonut rows={rows}/>
      </section>
      <section className="ops-mock-card">
        <h4><Layers3 aria-hidden="true"/> CI / Deployments / Events</h4>
        <p className="ops-mock-subtitle">Zählwerte mit jeweils eigenem Quellenumfang</p>
        <MixedBarChart snapshot={snapshot}/>
      </section>
      <section className="ops-mock-card">
        <h4><Bot aria-hidden="true"/> Multi-Agent Operations</h4>
        <p className="ops-mock-subtitle">PR-Zuordnung · kein verifizierter Agenten-Heartbeat</p>
        <AgentCards snapshot={snapshot}/>
      </section>
    </div>
    <section className="ops-mock-card ops-mock-ga4" aria-labelledby="ops-ga4-analysis-title">
      <h4 id="ops-ga4-analysis-title"><ChartColumnIncreasing aria-hidden="true"/> GA4 · Website und Conversion</h4>
      <p className="ops-mock-subtitle">
        {isVerified(ga4) ? ga4?.property : 'NOT_PROVEN · Serverseitiger Property-Readback fehlt'}
        {' · '}7 Kalendertage einschließlich heute · Ereignisse sind keine Zahlungen.
      </p>
      <div className="ops-mock-ga4-grid">
        {ga4Cards.map(({ label, count }) => <div key={label} className="ops-mock-ga4-metric">
          <span>{label}</span>
          <strong>{pretty(count)}</strong>
          <small>{count === null ? 'NOT_PROVEN' : 'GA4-Provider-Ereignisse'}</small>
        </div>)}
      </div>
      {ga4Rows.length > 0 ? <div className="ops-mock-ga4-bars" role="group" aria-label="GA4 Ereignisverteilung über sieben Kalendertage">
        {ga4Rows.map(row => <div key={row.eventName} className="ops-mock-ga4-bar-row">
          <span>{row.eventName}</span>
          <div className="ops-mock-ga4-bar-track"><div className="ops-mock-ga4-bar-fill" style={{width: (row.eventCount / maxGa4 * 100) + '%'}} /></div>
          <strong>{pretty(row.eventCount)}</strong>
        </div>)}
      </div> : <p className="ops-mock-ga4-empty" role="status">
        {isVerified(ga4) ? 'Keine erlaubten GA4-Ereignisse übermittelt.' : 'GA4 nicht aus Render bestätigt. Externe ChatGPT-Verbindungen liefern keine automatischen Render-Berechtigungen.'}
      </p>}
      <p className="ops-mock-ga4-foot">Nur freigegebene Ereignistypen · keine Personendaten, keine Umsatzschätzung · fehlende Messwerte bleiben NOT_PROVEN.</p>
    </section>
    <p className="ops-mock-readonly"><Info aria-hidden="true" className="h-5 w-5 shrink-0"/>
      <span><strong>Read-only:</strong> Geschützter Snapshot aus GitHub, Render und GA4.
      Keine synthetischen Kennzahlen, keine Zahlungs- oder Vertragsnachweise.
      {active && <b> Snapshot veraltet – bitte aktualisieren.</b>}</span>
      <LockKeyhole aria-hidden="true" className="h-5 w-5 shrink-0"/>
    </p>
  </div>;
}
