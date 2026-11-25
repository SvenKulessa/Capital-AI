import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, GitPullRequest, RefreshCw, ShieldCheck, Server, TrendingUp } from 'lucide-react';
import {
  AGENT_ROLES, evidenceState, ga4DiagnosticLabel, ga4EventCount, ga4RealtimeEventCount, isSnapshotStale, isVerified,
  readDashboardSnapshot, visiblePullRequests,
  type AgentRole, type DashboardReadback, type OperationsView,
} from './ownerOperationsModel';
import { OwnerOperationsVisualOverview } from './OwnerOperationsVisualOverview';
import { readGa4ConfigResult, type Ga4ConfigResult } from './ownerGa4ConfigModel';
import { OwnerGa4ConfigView } from './OwnerGa4ConfigView';

const ENDPOINT = '/api/profile/evidence-dashboard-readback';
const GA4_CONFIG_ENDPOINT = '/api/profile/google-analytics-config-diagnostic';
const VIEWS: { id: OperationsView; label: string }[] = [
  { id: 'overview', label: 'Übersicht' }, { id: 'github', label: 'GitHub & CI' },
  { id: 'render', label: 'Deployments' }, { id: 'analytics', label: 'Analytics' },
  { id: 'evidence', label: 'Evidence' },
];
function tint(status: string) {
  if (status === 'VERIFIED' || status === 'success' || status === 'live') return 'text-emerald-300';
  if (status === 'failure' || status === 'failed' || status === 'BLOCKED') return 'text-rose-300';
  return 'text-amber-200';
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-[#0b1428] p-4 sm:p-5">
    <h3 className="mb-3 text-base font-bold text-white">{title}</h3>{children}
  </section>;
}
function Metric({ title, value, note }: { title: string; value: string | number; note?: string }) {
  return <div className="min-w-0 rounded-xl border border-white/10 bg-[#111f36] p-3">
    <p className="text-xs text-slate-400">{title}</p>
    <p className="mt-1 break-words text-xl font-black tabular-nums text-white">{value}</p>
    {note && <p className="mt-1 text-[11px] text-slate-400">{note}</p>}
  </div>;
}
function Source({ status }: { status?: string }) {
  return <span className={'text-xs font-semibold ' + tint(status === 'VERIFIED_PROVIDER_READ' ? 'VERIFIED' : 'NOT_PROVEN')}>
    {status === 'VERIFIED_PROVIDER_READ' ? 'VERIFIED · Provider' : 'NOT_PROVEN'}
  </span>;
}
const shortSha = (sha?: string | null) => sha ? sha.slice(0, 12) : '–';
const dateText = (value?: string | null) =>
  value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('de-DE') : 'Zeitpunkt nicht belegt';

async function verifySession(userId: string, signal: AbortSignal) {
  const response = await fetch('/api/auth/session', { method: 'GET', credentials: 'same-origin', cache: 'no-store', signal });
  const body = response.ok ? await response.json() : null;
  if (!body || body.authenticated !== true || body.mfaRequired === true || body.user?.id !== userId ||
      body.account?.available !== true || body.account?.iamRole !== 'owner')
    throw Error('SESSION_CHANGED');
}

export function OwnerAgentOperationsPanel({ userId }: { userId: string }) {
  const [snapshot, setSnapshot] = useState<DashboardReadback | null>(null);
  const [view, setView] = useState<OperationsView>('overview');
  const [agent, setAgent] = useState<AgentRole | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [ga4Config, setGa4Config] = useState<Ga4ConfigResult | null>(null);
  const [ga4ConfigFailure, setGa4ConfigFailure] = useState(false);
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError('');
    // Do not retain owner data across session switches or failed revalidation.
    setSnapshot(null);
    setGa4Config(null);
    setGa4ConfigFailure(false);
    try {
      await verifySession(userId, controller.signal);
      const response = await fetch(ENDPOINT, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw Error('READBACK_UNAVAILABLE');
      const body = readDashboardSnapshot(await response.json());
      if (!body) throw Error('INVALID_READBACK');
      if (!controller.signal.aborted) setSnapshot(body);
      // A missing or failed diagnostic never invalidates independently verified dashboard evidence.
      try {
        const configResponse = await fetch(GA4_CONFIG_ENDPOINT, {
          method: 'GET', credentials: 'same-origin', cache: 'no-store',
          signal: controller.signal, headers: { Accept: 'application/json' },
        });
        if (!configResponse.ok) throw Error('CONFIG_DIAGNOSTIC_UNAVAILABLE');
        const result = readGa4ConfigResult(await configResponse.json());
        if (!result) throw Error('CONFIG_DIAGNOSTIC_INVALID');
        if (!controller.signal.aborted) setGa4Config(result);
      } catch {
        if (!controller.signal.aborted) setGa4ConfigFailure(true);
      }
    } catch {
      if (!controller.signal.aborted) setError('Owner-Readback nicht verfügbar. Keine Ersatzdaten oder gespeicherten Kennzahlen angezeigt.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, [userId]);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controllerRef.current?.abort();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  const gh = snapshot?.github, render = snapshot?.render, ga4 = snapshot?.ga4;
  const ts7 = gh?.typescript;
  const prs = snapshot ? visiblePullRequests(snapshot, agent, search) : [];
  const checks = agent === 'ALL' || agent === 'PLATFORM' || agent === 'SECURITY' ? gh?.ci?.runs ?? [] : [];
  const views = snapshot ? ga4EventCount(snapshot, 'page_view') : null;
  const sessionStarts = snapshot ? ga4EventCount(snapshot, 'session_start') : null;
  const itemViews = snapshot ? ga4EventCount(snapshot, 'view_item') : null;
  const realtimeViews = snapshot ? ga4RealtimeEventCount(snapshot, 'page_view') : null;
  const leads = snapshot ? ga4EventCount(snapshot, 'generate_lead') : null;
  const purchaseEvents = snapshot ? ga4EventCount(snapshot, 'purchase') : null;
  const evidence = snapshot ? [
    { name: 'GitHub Main / PR', state: evidenceState(snapshot, 'github'), detail: shortSha(gh?.mainSha) },
    { name: 'Main-Commit-Checks', state: evidenceState(snapshot, 'ci'), detail: gh?.ci?.scope || gh?.ci?.reason || 'Nicht nachgewiesen' },
    { name: 'Render Control Plane', state: evidenceState(snapshot, 'render'), detail: render?.deployId || render?.reason || 'Nicht nachgewiesen' },
    { name: 'GA4-Event-Readback', state: evidenceState(snapshot, 'ga4'), detail: ga4?.period || ga4?.reason || 'Nicht nachgewiesen' },
    { name: 'Echte Zahlung / Umsatz', state: 'NOT_PROVEN', detail: 'Kein signierter Payment-Readback' },
    { name: 'Runtime-BuildIdentity', state: 'NOT_PROVEN', detail: snapshot.comparison.runtimeBuildIdentity },
  ] : [];

  return <section aria-labelledby="agent-ops-title" className="space-y-4 rounded-2xl border border-indigo-400/30 bg-[#070f21] p-3 text-white sm:p-5">
    {snapshot && <OwnerOperationsVisualOverview snapshot={snapshot} />}
    {snapshot && !isVerified(snapshot.github) && (
      <p role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-sm text-amber-100">
        Owner-Zugriff bestätigt. Die GitHub-PR-Zahlen sind derzeit nicht durch den Server-Provider-Readback nachgewiesen
        (kein Hinweis auf fehlende Owner-Rechte).{' '}
        <a href="https://github.com/SvenKulessa/Capital-AI/pulls"
          target="_blank" rel="noopener noreferrer"
          className="font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-200">
          Offene PRs direkt auf GitHub ansehen
        </a>.
      </p>
    )}
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">CAPITAL-AI / Owner Operations</p>
        <h2 id="agent-ops-title" className="mt-1 text-xl font-black">Multi-Agent Operations Center</h2>
        <p className="mt-1 text-xs text-slate-400">Details und Filter · Read-only-Provider-Evidence · keine Demo-Werte</p>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-300/30 px-3 text-xs font-bold text-indigo-100 disabled:opacity-50">
        <RefreshCw aria-hidden="true" className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')}/> Aktualisieren
      </button>
    </div>
    <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100">
      <ShieldCheck aria-hidden="true" className="mr-2 inline h-4 w-4"/>
      VERIFIED bedeutet nur bestätigter Provider-Readback, nicht Freigabe für Merge, Deployment oder Zahlung.
      Fehlende Messwerte bleiben NOT_PROVEN und werden nicht mit Null oder synthetischen Daten ersetzt.
    </p>
    {busy && <p role="status" className="text-sm text-slate-300">Sitzung und Providerquellen werden geprüft …</p>}
    {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    {snapshot && <>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-400">
        <span>Snapshot {dateText(snapshot.generatedAt)} · serverseitiger Cache</span>
        <span className={isSnapshotStale(snapshot, Date.now()) ? 'text-amber-200' : 'text-emerald-200'}>
          {isSnapshotStale(snapshot, Date.now()) ? 'STALE – erneut prüfen' : 'Zeitlich aktueller Snapshot'}
        </span>
      </div>
      <div role="tablist" aria-label="Operations-Ansichten" className="flex flex-wrap gap-2">
        {VIEWS.map(item => <button key={item.id} type="button" role="tab" aria-selected={view === item.id}
          onClick={() => setView(item.id)}
          // Certain mobile Chromium touch streams do not synthesize a click.
          // Touch-only pointer activation is idempotent with any later click.
          onPointerUp={event => {
            if (event.isPrimary && event.pointerType === 'touch') setView(item.id);
          }}
          className={'min-h-11 rounded-lg border px-3 text-xs font-semibold ' +
            (view === item.id ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-white/10 text-slate-300')}>
          {item.label}
        </button>)}
      </div>
      {(view === 'overview' || view === 'github') && <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="agent-ops-filter" className="text-xs text-slate-300">PR-Agenten-Domain</label>
        <select id="agent-ops-filter" value={agent} onChange={event => setAgent(event.target.value as AgentRole | 'ALL')}
          className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3 text-sm text-white">
          <option value="ALL">Alle Rollen</option>{AGENT_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
      </div>}
      {(view === 'overview' || view === 'evidence') && <div className="space-y-3" role="tabpanel">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric title="Offene GitHub-PRs" value={isVerified(gh) && gh?.openPrCountStatus === 'VERIFIED' ? gh.openPrCount ?? '–' : '–'} note={gh?.openPrCountStatus || 'NOT_PROVEN'}/>
          <Metric title="Render-Deployment" value={isVerified(render) ? render?.deployStatus || '–' : '–'} note={isVerified(render) ? 'Plattformstatus, kein Health-Attest' : 'NOT_PROVEN'}/>
          <Metric title="GA4 page_view (7 Tage)" value={views ?? '–'} note={views === null ? 'NOT_PROVEN' : 'Eventzahl, keine Unique Users'}/>
          <Metric title="Umsatz" value="–" note="NOT_PROVEN · keine Zahlungsdaten"/>
        </div>
        {view === 'overview' && <Section title="Agentenrollen – Laufzeitstatus nicht nachgewiesen">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AGENT_ROLES.filter(role => agent === 'ALL' || agent === role).map(role =>
              <div key={role} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-bold">{role}</p><p className="mt-1 text-[11px] text-amber-200">Runtime: NOT_PROVEN</p>
              </div>)}
          </div>
        </Section>}
        {view === 'evidence' && <Section title="Evidence und Provenance">
          <div className="space-y-2">{evidence.map(row =>
            <div key={row.name} className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-2 text-sm">
              <div className="min-w-0 flex-1"><p>{row.name}</p><p className="break-all text-[11px] text-slate-400">{row.detail}</p></div>
              <strong className={'text-xs ' + tint(row.state)}>{row.state}</strong>
            </div>)}
          </div>
        </Section>}
        {view === 'evidence' && <Section title="TypeScript 7 · Sicherheitsentscheidung">
          {isVerified(gh) && ts7?.status === 'VERIFIED_PROVIDER_READ' ? <div className="space-y-3 text-sm">
            <p><strong className="font-bold text-rose-300">{ts7.state}</strong>
              {' · '}{ts7.classification}{' · '}nur Repository-Entscheidung, kein neuer Binary-Scan.</p>
            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div><dt className="text-slate-400">Installierte / blockierte Version</dt>
                <dd>{ts7.currentVersion} / {ts7.candidateVersion}</dd></div>
              <div><dt className="text-slate-400">Nächste Überprüfung (UTC)</dt>
                <dd>{ts7.reviewOnOrAfter}</dd></div>
              <div><dt className="text-slate-400">Letzte Evidence-Auswertung</dt>
                <dd>{dateText(ts7.evaluatedAt)}</dd></div>
              <div><dt className="text-slate-400">Begründung</dt>
                <dd>{ts7.reasonCode}</dd></div>
            </dl>
            <p className="break-all text-xs text-slate-400">Historischer Binary-Fingerprint: {ts7.binarySha256}</p>
            <a href={ts7.evidenceUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-semibold text-indigo-200 underline underline-offset-2">
              Evidence auf exakt diesem Main-SHA öffnen
            </a>
            <p className="text-xs text-amber-200">Keine TypeScript-7-Freigabe. Die automatische
              Suppression-Fristdurchsetzung wurde in PR #808 entfernt; diese Ansicht validiert nur
              den GitHub-Evidence-Eintrag, nicht die aktuelle Registry- oder Scanner-Lage.</p>
          </div> : <p className="text-sm text-amber-200">NOT_PROVEN · TypeScript-Entscheidung
            aus der unveränderlichen Main-Evidence nicht nachgewiesen.</p>}
        </Section>}
        {view === 'evidence' && <Section title="AcodeX P1-v2 · archivierte Geräteabnahme">
          {snapshot.acodex ? <div className="space-y-3 text-sm">
            <p className="text-slate-300">Historischer Owner-Terminalnachweis mit unabhängig zurückgelesener Drive-Provenance. Keine Live-Verbindung zum Android-Gerät.</p>
            <div className="flex flex-wrap items-center gap-3">
              <span>Archiv <strong className="text-emerald-300">{snapshot.acodex.archiveStatus}</strong></span>
              <span>Aktueller Gerätestatus <strong className="text-amber-200">{snapshot.acodex.currentDeviceStatus}</strong></span>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div><dt className="text-slate-400">Erwarteter Neustart (UTC)</dt><dd>{snapshot.acodex.expectedStartUtc}</dd></div>
              <div><dt className="text-slate-400">Bestätigter Pull (UTC)</dt><dd>{snapshot.acodex.latestSuccessUtc}</dd></div>
              <div><dt className="text-slate-400">Geräteabnahme (UTC)</dt><dd>{snapshot.acodex.checkedUtc}</dd></div>
              <div><dt className="text-slate-400">Exit / Guard / Sperre</dt>
                <dd>Health {snapshot.acodex.healthExit} · Guard {snapshot.acodex.guardAuditExit} · {snapshot.acodex.lockClear ? 'LOCK_CLEAR' : 'NOT_PROVEN'}</dd></div>
            </dl>
            <p className="text-xs text-slate-400">Keine neuen OAuth- oder Pull-Fehler im archivierten Logfenster. Dies bestätigt keine spätere Geräteverfügbarkeit.</p>
            {snapshot.acodex.recovery && <div className="rounded-lg border border-white/10 p-3 space-y-2">
              <h4 className="font-semibold">Recovery · 25.11.2026</h4>
              <p>Recovery-Nachweis <strong className="text-emerald-300">{snapshot.acodex.recovery.status}</strong> · historische Incidents dokumentiert · kein Live-Gerätenachweis.</p>
              <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div><dt>Recovery-Baseline (UTC)</dt><dd>{snapshot.acodex.recovery.baselineUtc}</dd></div>
                <div><dt>Neustart (UTC)</dt><dd>{snapshot.acodex.recovery.expectedStartUtc}</dd></div>
                <div><dt>Startup-Pull (UTC)</dt><dd>{snapshot.acodex.recovery.latestSuccessUtc}</dd></div>
                <div><dt>Abnahme (UTC)</dt><dd>{snapshot.acodex.recovery.checkedUtc}</dd></div>
                <div><dt>Health / Outer / Guard / acopy</dt><dd>{snapshot.acodex.recovery.healthExit} / {snapshot.acodex.recovery.outerExit} / {snapshot.acodex.recovery.guardAuditExit} / {snapshot.acodex.recovery.acopyCommandExit}</dd></div>
                <div><dt>Neue OAuth- / Pull-Fehler</dt><dd>{snapshot.acodex.recovery.newOAuthFailures} / {snapshot.acodex.recovery.newPullFailures}</dd></div>
              </dl>
              <p className="text-xs text-slate-400">Owner-Terminalnachweis. Bridge-ACK und aktueller Gerätestatus: NOT_PROVEN.</p>
            </div>}
            <ul className="space-y-2 text-xs">
              {([
                ['Abschluss v1.1', snapshot.acodex.evidence.v11],
                ['Historische v1', snapshot.acodex.evidence.v1],
                ['Governance-Standard', snapshot.acodex.evidence.standard],
              ] as const).map(([name, file]) => <li key={name} className="rounded-lg border border-white/10 p-2">
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-200 underline underline-offset-2">{name}</a>
                <p className="mt-1 break-all text-slate-400">SHA-256 {file.sha256}</p>
              </li>)}
            </ul>
          </div> : <p className="text-amber-200">NOT_PROVEN · Keine archivierte AcodeX-Evidence im aktuellen Snapshot.</p>}
        </Section>}
      </div>}
      {view === 'github' && <div role="tabpanel" className="space-y-3">
        <Section title="GitHub Pull Requests">
          <div className="mb-3 flex flex-wrap justify-between gap-2">
            <Source status={gh?.status}/><span className="text-xs text-slate-400">Main {shortSha(gh?.mainSha)} · {gh?.pullRequestsStatus || 'NOT_PROVEN'}</span>
          </div>
          <label htmlFor="agent-ops-search" className="text-xs text-slate-300">PR suchen</label>
          <input id="agent-ops-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Titel oder PR-Nummer"
            className="mb-3 mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white"/>
          {prs.length ? <ul className="space-y-2">{prs.map(pr => <li key={pr.number} className="rounded-xl border border-white/10 p-3">
            <a href={'https://github.com/SvenKulessa/Capital-AI/pull/' + pr.number} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-200 hover:underline">
              <GitPullRequest className="h-4 w-4" aria-hidden="true"/> PR #{pr.number}
            </a>
            <p className="mt-1 break-words text-sm">{pr.title}</p>
            <p className="mt-1 text-xs text-slate-400">{pr.draft ? 'DRAFT' : 'OPEN'} · Head {shortSha(pr.headSha)} · {dateText(pr.updatedAt)}</p>
          </li>)}</ul> : <p className="text-sm text-slate-400">Keine belegten PRs für diesen Filter.</p>}
        </Section>
        <Section title="Main-CI / Security-Gates">
          <Source status={gh?.ci?.status}/>
          <p className="my-2 text-xs text-slate-400">{gh?.ci?.scope || gh?.ci?.reason || 'Kein Main-Check-Run-Readback'}</p>
          {checks.length ? <ul className="space-y-2">{checks.map((run, index) => <li key={run.name + index}
            className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 p-3">
            <div><p className="text-sm">{run.name}</p>
              <p className="text-xs text-slate-400">{run.requiredByRootPolicy ? 'Root Required Check' : 'Weitere Prüfung'} · {run.status}</p></div>
            <span className={'text-xs font-bold ' + tint(run.conclusion || 'NOT_PROVEN')}>{run.conclusion || 'PENDING'}</span>
          </li>)}</ul> : <p className="text-sm text-amber-200">Keine passenden Checks nachgewiesen.</p>}
        </Section>
      </div>}
      {view === 'render' && <div role="tabpanel"><Section title="Render Deployments">
        <Source status={render?.status}/>
        <p className="my-2 break-all text-xs text-slate-400">
          Service {render?.serviceId || 'NOT_PROVEN'} · Runtime-Identität {render?.deploymentIdentityStatus || 'NOT_PROVEN'}
        </p>
        {isVerified(render) && render?.deployments?.length ? <ul className="space-y-2">{render.deployments.map((dep, index) =>
          <li key={(dep.deployId || '') + index} className="flex gap-3 rounded-xl border border-white/10 p-3">
            <Server aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-indigo-300"/>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap justify-between gap-2"><span className="break-all text-xs font-bold">{dep.deployId || 'Unbekannt'}</span>
                <span className={'text-xs font-bold ' + tint(dep.deployStatus)}>{dep.deployStatus}</span></div>
              <p className="mt-1 text-xs text-slate-400">Commit {shortSha(dep.sourceCommitSha)} · {dateText(dep.finishedAt)}</p>
            </div>
          </li>)}</ul> : <p className="text-sm text-amber-200">Keine verifizierten Deployments.</p>}
      </Section></div>}
      {view === 'analytics' && <div role="tabpanel" className="space-y-3">
        <OwnerGa4ConfigView config={ga4Config} unavailable={ga4ConfigFailure}/>
        <Section title="GA4 / 7-Tage-Eventmessung">
          <Source status={ga4?.status}/>
          <p className="my-2 text-xs text-slate-400">{ga4?.period || 'NOT_PROVEN'} · {ga4?.property || 'Keine bestätigte Property'}</p>
          {!isVerified(ga4) && ga4?.reason && <p role="status" className="my-2 break-all rounded-lg border border-amber-300/25 bg-amber-300/5 p-2 text-xs text-amber-100">Diagnose: {ga4DiagnosticLabel(ga4.reason)} · Code: {ga4.reason}</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric title="page_view Events" value={views ?? '–'}/>
            <Metric title="session_start Events" value={sessionStarts ?? '–'}/>
            <Metric title="view_item Events" value={itemViews ?? '–'}/>
            <Metric title="generate_lead Events" value={leads ?? '–'}/>
            <Metric title="purchase Events" value={purchaseEvents ?? '–'} note="Event, keine Zahlungsbestätigung"/>
            <Metric title="page_view Echtzeit" value={realtimeViews ?? '–'} note={ga4?.realtimeStatus || 'NOT_PROVEN'}/>
            <Metric title="Umsatz / MRR" value="–" note="NOT_PROVEN · Kein Zahlungsnachweis"/>
          </div>
          <p className="mt-3 text-xs text-slate-400">Provider-Ereignisse werden nicht als Besucherzahlen, Zahlungen oder Umsatzbelege interpretiert; Echtzeitwerte bleiben getrennt.</p>
          {isVerified(ga4) && ga4?.events?.length ? <div className="mt-4 space-y-3">
            {ga4.events.filter(row => Number.isSafeInteger(row.eventCount) && row.eventCount >= 0).map(row => {
              const largest = Math.max(1, ...(ga4.events || []).map(v => v.eventCount));
              return <div key={row.eventName}>
                <div className="mb-1 flex justify-between text-xs"><span>{row.eventName}</span><span>{row.eventCount}</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full rounded-full bg-indigo-400" style={{ width: String(Math.min(100, row.eventCount / largest * 100)) + '%' }}/>
                </div>
              </div>;
            })}
          </div> : <p className="mt-3 text-sm text-amber-200">Keine GA4-Events verifiziert.</p>}
        </Section>
        <Section title="Monetarisierung und Conversion"><TrendingUp aria-hidden="true" className="mb-2 h-5 w-5 text-amber-200"/>
          <p className="text-sm text-slate-300">Stripe-Umsatz, MRR, Checkout und tatsächliche Verkäufe werden nicht abgefragt. Kein Umsatz wird aus GA4-Events geschätzt.</p>
          <p className="mt-2 text-xs font-bold text-amber-200">NOT_PROVEN – kein signierter Zahlungs-Readback</p>
        </Section>
      </div>}
      <p className="flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-slate-400">
        <Activity aria-hidden="true" className="h-4 w-4"/> Owner-only · GET-only · keine Agentensteuerung oder produktiven Mutationen.
      </p>
    </>}
  </section>;
}
