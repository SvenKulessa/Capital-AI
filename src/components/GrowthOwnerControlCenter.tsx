import { useRef, useState } from 'react';
import { appendSnapshot, applyOwnerEdit, domains, exportWorkspace, importWorkspace, initialRows, makeRow, projectGa4, statuses, type GrowthRow } from './growthOwnerWorkspaceModel';

const control = 'min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white';
const button = 'min-h-11 rounded-lg border border-indigo-400/40 px-3 py-2 text-sm font-semibold text-indigo-100 disabled:opacity-50';
const fields = [
  ['endpoint', 'Endpunkt (nur Referenz, ohne Zugangsdaten)'], ['auth', 'Authentifizierungsstatus'],
  ['flow', 'Datenfluss'], ['tests', 'Tests'], ['error', 'Fehler'], ['dependencies', 'Abhängigkeiten'],
  ['approvals', 'Freigaben (Dokumentation)'], ['operation', 'Betriebsstatus'], ['next', 'Nächster Schritt'],
  ['evidence', 'Evidence-Referenz / SHA / Run-ID'],
] as const;
const colors = { VERIFIED: 'text-emerald-300', BLOCKED: 'text-rose-300', NOT_PROVEN: 'text-amber-200' };
type View = 'matrix' | 'edit' | 'compare' | 'handoff';

export function GrowthOwnerControlCenter() {
  const [history, setHistory] = useState(() => appendSnapshot([], initialRows(), new Date().toISOString()));
  const [view, setView] = useState<View>('matrix');
  const [domain, setDomain] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [draft, setDraft] = useState<GrowthRow | null>(null);
  const [baseline, setBaseline] = useState(1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const current = history[history.length - 1];
  const rows = current.rows;
  const ordered = [...rows].sort((a,b) => a.priority.localeCompare(b.priority) || a.name.localeCompare(b.name));
  const filtered = ordered.filter(r => (domain === 'ALL' || r.domain === domain) && (status === 'ALL' || r.status === status));
  const before = history.find(s => s.version === baseline) ?? history[0];
  function save(row: GrowthRow) {
    const next = rows.some(r => r.id === row.id) ? rows.map(r => r.id === row.id ? row : r) : [...rows, row];
    setHistory(h => appendSnapshot(h, next, new Date().toISOString()));
  }
  function saveDraft() {
    if (!draft) return;
    try { save(applyOwnerEdit(draft)); setDraft(null); setView('matrix'); setMessage('Arbeitsstand versioniert. Keine operative Änderung.'); }
    catch { setMessage('Eingaben ungültig oder Integrationslimit erreicht.'); }
  }
  async function readGa4() {
    const row = rows.find(r => r.id === 'ga4');
    if (!row || pending) return;
    setPending(true); setMessage('');
    try {
      const response = await fetch('/api/profile/growth-intelligence/ga4-readback', {
        method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error('Readback unavailable');
      save(projectGa4(await response.json(), row));
      setMessage('GA4-Antwort geprüft und als neue Version erfasst.');
    } catch {
      save({ ...row, status: 'NOT_PROVEN', origin: 'OWNER_NOTE', evidence: '', operation: 'Aktueller Readback nicht nachgewiesen',
        error: 'Readback nicht verfügbar, nicht berechtigt oder ungültig.' });
      setMessage('GA4 aktuell NOT_PROVEN. Vorherige Version bleibt erhalten.');
    } finally { setPending(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportWorkspace(history)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'capital-ai-growth-owner-v' + current.version + '.json';
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('Import too large');
      const imported = importWorkspace(await file.text());
      setHistory(imported); setBaseline(imported[0].version); setDraft(null); setView('matrix');
      setMessage('Import übernommen. Importierte VERIFIED-Angaben sind NOT_PROVEN bis zum neuen Readback.');
    } catch { setMessage('Import abgelehnt: Schema, Größe oder Inhalt ungültig.'); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }

  return <section aria-label="Growth Intelligence Control Center" className="space-y-4 rounded-2xl border border-indigo-400/30 bg-[#070b19] p-4 text-slate-100 sm:p-5">
    <header>
      <p className="text-xs font-bold tracking-widest text-indigo-300">CAPITAL-AI / OWNER / GROWTH</p>
      <h2 className="mt-2 text-xl font-black">Growth Intelligence Control Center</h2>
      <p className="mt-2 text-sm text-slate-300">SOLO2 · Arbeitsstand v{current.version} · {new Date(current.at).toLocaleString('de-DE')}</p>
      <p className="mt-2 text-xs text-slate-400">Nur aktuelle Sitzung; JSON-Export zur Wiederverwendung. Keine Tokens, Kundendaten oder Secrets eingeben. Dokumentierte Freigaben erteilen keine Berechtigungen.</p>
    </header>
    <div className="grid grid-cols-3 gap-2" aria-label="Evidence-Matrix">
      {statuses.map(s => <button key={s} type="button" onClick={() => { setStatus(s); setView('matrix'); }} className="min-h-16 rounded-xl border border-white/10 bg-white/5 p-2">
        <span className={'block text-xl font-bold ' + colors[s]}>{rows.filter(r => r.status === s).length}</span><span className="block break-words text-[10px] sm:text-xs">{s}</span>
      </button>)}
    </div>
    <nav aria-label="Growth Ansichten" className="flex flex-wrap gap-2">
      {([['matrix','Integrationen'],['edit','Bearbeiten'],['compare','Vorher / Nachher'],['handoff','SOLO2 / Koordination']] as const).map(([key,label]) =>
        <button key={key} type="button" className={button + (view === key ? ' bg-indigo-500/25' : '')} aria-pressed={view === key} disabled={pending}
          onClick={() => { setView(key); if (key === 'edit' && !draft) setDraft(rows[0] ?? makeRow('new', 'Neue Integration', 'GROWTH')); }}>{label}</button>)}
    </nav>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={pending || !rows.some(r => r.id === 'ga4')} onClick={() => void readGa4()}> {pending ? 'GA4 wird geprüft …' : 'GA4 Read-only prüfen'}</button>
      <button type="button" className={button} disabled={pending} onClick={download}>JSON exportieren</button>
      <button type="button" className={button} disabled={pending} onClick={() => fileInput.current?.click()}>JSON importieren (ersetzt Arbeitsstand)</button>
      <input type="file" accept=".json,application/json" ref={fileInput} hidden onChange={e => void upload(e.target.files?.[0])}/>
    </div>
    {message && <p role="status" className="rounded-lg border border-white/10 p-2 text-sm">{message}</p>}
    {view === 'matrix' && <>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">Domain<select className={control} value={domain} onChange={e => setDomain(e.target.value)}><option value="ALL">Alle Domains</option>{domains.map(d => <option key={d}>{d}</option>)}</select></label>
        <label className="text-xs">Evidence-Status<select className={control} value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">Alle Status</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
      <button type="button" disabled={pending || rows.length >= 100} className={button} onClick={() => { setDraft(makeRow('integration-' + crypto.randomUUID(), 'Neue Integration', 'GROWTH')); setView('edit'); }}>Integration hinzufügen</button>
      <div className="grid gap-2 sm:grid-cols-2">{filtered.map(r => <article key={r.id} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-slate-400">{r.domain} · {r.priority}</p><h3 className="font-bold break-words">{r.name}</h3>
        <p className={'text-xs font-semibold ' + colors[r.status]}>{r.status} · {r.origin === 'GA4_READBACK' ? 'GA4 Readback' : 'Dokumentation'}</p>
        <p className="break-words text-xs text-slate-300">{r.next || 'Nächster Schritt offen'}</p>
        {r.evidence && <p className="break-words text-xs text-slate-400">{r.evidence}</p>}
        <button type="button" disabled={pending} className={button} onClick={() => { setDraft({...r}); setView('edit'); }}>Details bearbeiten</button>
      </article>)}</div>
      {!filtered.length && <p className="text-sm">Keine Einträge für diesen Filter.</p>}
    </>}
    {view === 'edit' && draft && <div className="space-y-3">
      <label className="block text-xs">Name<input className={control} maxLength={120} value={draft.name} onChange={e => setDraft({...draft,name:e.target.value})}/></label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs">Domain<select className={control} value={draft.domain} onChange={e => setDraft({...draft,domain:e.target.value as GrowthRow['domain']})}>{domains.map(d => <option key={d}>{d}</option>)}</select></label>
        <label className="text-xs">Priorität<select className={control} value={draft.priority} onChange={e => setDraft({...draft,priority:e.target.value as GrowthRow['priority']})}>{['P0','P1','P2'].map(p => <option key={p}>{p}</option>)}</select></label>
        <label className="text-xs">Dokumentationsstatus<select className={control} value={draft.status === 'VERIFIED' ? 'NOT_PROVEN' : draft.status} onChange={e => setDraft({...draft,status:e.target.value as GrowthRow['status']})}><option>NOT_PROVEN</option><option>BLOCKED</option></select></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key,label]) => <label className="block text-xs" key={key}>{label}<textarea className={control} maxLength={1000} rows={2} value={draft[key]} onChange={e => setDraft({...draft,[key]:e.target.value})}/></label>)}</div>
      <button type="button" disabled={pending} className={button} onClick={saveDraft}>Neue Version speichern</button>
    </div>}
    {view === 'compare' && <div className="space-y-3">
      <label className="block text-xs">Vergleichsbasis<select className={control} value={before.version} onChange={e => setBaseline(Number(e.target.value))}>{history.map(s => <option key={s.version} value={s.version}>v{s.version} · {new Date(s.at).toLocaleString('de-DE')}</option>)}</select></label>
      {[...new Set([...before.rows.map(r => r.id), ...rows.map(r => r.id)])].map(id => {
        const a = before.rows.find(r => r.id === id); const b = rows.find(r => r.id === id);
        if (JSON.stringify(a) === JSON.stringify(b)) return null;
        return <article key={id} className="rounded-xl border border-white/10 p-3"><h3 className="font-bold">{b?.name ?? a?.name}</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{([['Vorher',a],['Nachher',b]] as const).map(([label,row]) => <div key={label} className="min-w-0 rounded-lg bg-white/5 p-2"><p className="text-xs font-bold">{label}</p><pre className="whitespace-pre-wrap break-all text-xs">{row ? JSON.stringify(row,null,2) : 'Nicht vorhanden'}</pre></div>)}</div>
        </article>;
      })}
      {JSON.stringify(before.rows) === JSON.stringify(rows) && <p className="text-sm">Keine Unterschiede.</p>}
    </div>}
    {view === 'handoff' && <div className="space-y-3">
      <p className="text-sm">Marktnews → Quellen und Rechte (read-only) · Growth → getrennte Datenquellen · Content → Entwurfsstatus (read-only) · TRUST → Freigaben · PLATFORM → Betrieb und CI.</p>
      <p className="text-xs text-slate-400">ANALYZED → IMPLEMENTED → TESTED → MERGE_READY → MERGED → DEPLOYED → VERIFIED. Diese Ansicht startet keine Agenten, Publikationen oder Deployments.</p>
      {ordered.filter(r => r.status !== 'VERIFIED').map(r => <article key={r.id} className="rounded-lg border border-white/10 p-3"><p className="text-xs text-indigo-300">{r.priority} · {r.domain} · {r.status}</p><p className="font-bold">{r.name}</p><p className="text-sm break-words">{r.next || 'Nächsten Schritt bestimmen'}</p><p className="text-xs text-slate-400 break-words">{r.dependencies || 'Abhängigkeiten nicht dokumentiert'}</p></article>)}
    </div>}
  </section>;
}
