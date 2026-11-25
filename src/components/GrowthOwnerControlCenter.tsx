import { useRef, useState } from 'react';
import { appendSnapshot, applyOwnerEdit, addMissingPublicSurfaceRows, publicSurfaceResearchTask, billingRecoveryResearchTask, domains, exportWorkspace, importWorkspace, initialRows, makeRow, projectGa4, projectXCampaignGa4, projectGsc, projectGraphHandoff, statuses, type GrowthRow } from './growthOwnerWorkspaceModel';

const control = 'min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white';
const button = 'min-h-11 rounded-lg border border-indigo-400/40 px-3 py-2 text-sm font-semibold text-indigo-100 disabled:opacity-50';
const fields = [
  ['endpoint', 'Endpunkt (nur Referenz, ohne Zugangsdaten)'], ['auth', 'Authentifizierungsstatus'],
  ['flow', 'Datenfluss'], ['tests', 'Tests'], ['error', 'Fehler'], ['dependencies', 'Abhängigkeiten'],
  ['approvals', 'Freigaben (Dokumentation)'], ['operation', 'Betriebsstatus'], ['next', 'Nächster Schritt'],
  ['evidence', 'Evidence-Referenz / SHA / Run-ID'],
] as const;
const archivePath = '/api/profile/growth-intelligence/evidence-history';
type ArchiveItem = { id: string; version: number; at: string };
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
  const restoreInput = useRef<HTMLInputElement>(null);
  const graphInput = useRef<HTMLInputElement>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [archiveReady, setArchiveReady] = useState(false);
  const current = history[history.length - 1];
  const rows = current.rows;
  const ordered = [...rows].sort((a,b) => a.priority.localeCompare(b.priority) || a.name.localeCompare(b.name));
  const filtered = ordered.filter(r => (domain === 'ALL' || r.domain === domain) && (status === 'ALL' || r.status === status));
  const before = history.find(s => s.version === baseline) ?? history[0];
  function save(row: GrowthRow) {
    const next = rows.some(r => r.id === row.id) ? rows.map(r => r.id === row.id ? row : r) : [...rows, row];
    setHistory(appendSnapshot(history, next, new Date().toISOString()));
  }
  function saveDraft() {
    if (!draft) return;
    try { save(applyOwnerEdit(draft)); setDraft(null); setView('matrix'); setMessage('Arbeitsstand versioniert. Keine operative Änderung.'); }
    catch { setMessage('Eingaben ungültig oder Integrationslimit erreicht.'); }
  }
  async function readAnalytics() {
    if(pending)return;
    setPending(true);setMessage('');
    try{
      const readRow=async (id:'ga4'|'gsc'|'x-campaign')=>{
        const row=rows.find(r=>r.id===id)??makeRow(id,id==='ga4'?'GA4 Acquisition':id==='x-campaign'?'X Growth · GA4 Kampagne':'Google Search Console','GROWTH');
        try{
          const response=await fetch('/api/profile/growth-intelligence/'+id+'-readback',{method:'GET',credentials:'same-origin',
            cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
          if(!response.ok)throw Error('Readback unavailable');
          const raw:unknown=await response.json();
          return id==='ga4'?projectGa4(raw,row):id==='x-campaign'?projectXCampaignGa4(raw,row):projectGsc(raw,row);
        }catch{
          return {...row,status:'NOT_PROVEN' as const,origin:'OWNER_NOTE' as const,evidence:'',
            operation:'Aktueller Readback nicht nachgewiesen',error:'Readback nicht verfügbar, nicht berechtigt oder ungültig.'};
        }
      };
      // Existing GA4 client has a shared in-flight lock; never query both GA4 kinds concurrently.
      const updates=await Promise.all([readRow('ga4'),readRow('gsc')]);
      updates.push(await readRow('x-campaign'));
      const byId=new Map(updates.map(r=>[r.id,r]));
      const next=rows.map(r=>byId.get(r.id)??r);
      for(const r of updates)if(!rows.some(existing=>existing.id===r.id))next.push(r);
      setHistory(appendSnapshot(history,next,new Date().toISOString()));
      setMessage('GA4, X-Kampagne und GSC getrennt erfasst. Fehlende Readbacks bleiben NOT_PROVEN; vorherige Version erhalten.');
    }catch{setMessage('Analytics-Arbeitsstand nicht übernommen; Historie unverändert.');}
    finally{setPending(false);}
  }
  async function archiveRequest(mode: 'list' | 'save' | 'load' | 'restore', id?: string, file?: File) {
    if (pending) return;
    setPending(true);
    setMessage('');
    let writeConfirmed=false;
    const digestText=async(raw:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');
    try {
      if (id && !/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid archive id');
      if (mode === 'restore' && (!id || !file || file.size > 7_000_000)) throw new Error('Invalid backup');
      const target = mode === 'load' ? archivePath + '/file/' + id : mode === 'restore' ? archivePath + '/restore/' + id : archivePath;
      const write = mode === 'save' || mode === 'restore';
      const raw = mode === 'save' ? exportWorkspace(history) : undefined;
      const expected = raw === undefined ? id : await digestText(raw);
      const response = await fetch(target, {method: write ? 'POST' : 'GET', credentials:'same-origin',cache:'no-store',
        headers: {Accept:'application/json', ...(write ? {'Content-Type':mode==='restore'?'application/octet-stream':'application/json'} : {})},
        body: mode==='save'?raw:mode==='restore'?file:undefined, signal:AbortSignal.timeout(20000)});
      if (!response.ok) throw new Error('Archive unavailable');
      if (mode === 'load') {
        const raw=await response.text();
        if(await digestText(raw)!==id)throw new Error('Archive digest mismatch');
        const imported=importWorkspace(raw);
        setHistory(imported); setBaseline(imported[0].version); setDraft(null); setView('matrix');
        setMessage('Historie geladen; frühere VERIFIED-Angaben müssen erneut zurückgelesen werden.');
      } else {
        if(write){const receipt=await response.json();if(receipt.archived!==true||receipt.authority!=='DOCUMENTATION_ONLY'||receipt.id!==expected||!Number.isSafeInteger(receipt.version)||receipt.version<1)throw new Error('Invalid write receipt');writeConfirmed=true;}
        const inventory = mode==='list' ? response : await fetch(archivePath,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000)});
        if (!inventory.ok) throw new Error('Archive unavailable');
        const data=await inventory.json();
        if(data.schema!=='CAPITAL_AI_GROWTH_EVIDENCE_ARCHIVE@1'||data.private!==true||data.authority!=='DOCUMENTATION_ONLY'||
          !Array.isArray(data.items)||data.items.length>128||!data.items.every((v:ArchiveItem)=>v&&/^[a-f0-9]{64}$/.test(v.id)&&Number.isSafeInteger(v.version)&&v.version>0&&typeof v.at==='string'&&Number.isFinite(Date.parse(v.at)))) throw new Error('Invalid inventory');
        setArchiveItems(data.items);setArchiveReady(true);
        setMessage(mode==='save'?'Arbeitsstand unveränderlich archiviert.':mode==='restore'?'Verschlüsseltes Backup wiederhergestellt.':'Archiv-Inventar gelesen.');
      }
    } catch {
      setArchiveReady(false);setArchiveItems([]);
      setMessage(writeConfirmed?'Archiv-Schreibreceipt bestätigt; Inventar-Readback nicht nachgewiesen.':'Archiv nicht verfügbar oder Eingabe ungültig. Lokaler Arbeitsstand bleibt erhalten. Aktivierung und Recovery-Evidence separat prüfen.');
    } finally {
      setPending(false);if(restoreInput.current)restoreInput.current.value='';
    }
  }
  async function readEngines() {
    if (pending) return;
    setPending(true);setMessage('');
    try {
      const response=await fetch('/api/profile/growth-intelligence/engine-readback',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('Engine readback unavailable');
      const data=await response.json();
      const digest=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
      const count=(n:unknown,max:number)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=max;
      const m=data.market,c=data.content,g=data.langgraph;
      if(data.schema!=='CAPITAL_AI_OWNER_ENGINE_SNAPSHOT@1'||data.scope!=='BUILD_ARTIFACT_ONLY'||data.private!==true||data.readOnly!==true||data.publicPublishAllowed!==false||
        m?.state!=='SOURCE_SNAPSHOT_ONLY'||typeof m.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(m.date)||!count(m.homepage,3)||!count(m.overview,3)||!count(m.archive,10000)||!digest(m.editionSha256)||!digest(m.indexSha256)||
        c?.state!=='DRAFT_ONLY'||!count(c.drafts,100)||!digest(c.sourceSha256)||!digest(c.bundleSha256)||
        g?.state!=='SOURCE_ONLY_RUNTIME_NOT_PROVEN'||!digest(g.sourceSha256))throw new Error('Invalid engine snapshot');
      const updates:GrowthRow[]=[
        {...makeRow('marketnews','Marktnews-Pipeline','MARKET','Live-Scheduler und Rechte-Evidence separat prüfen'),operation:'Build-Snapshot '+m.date,
          evidence:'Homepage '+m.homepage+' / Überblick '+m.overview+' / Archiv '+m.archive+'; Edition SHA-256 '+m.editionSha256+'; Index '+m.indexSha256},
        {...makeRow('content','Content Engine','PRODUCT','Entwurfsqualität und Freigaben separat prüfen'),operation:'DRAFT_ONLY · '+c.drafts+' Entwürfe',
          evidence:'Plan SHA-256 '+c.sourceSha256+'; Bundle '+c.bundleSha256},
        {...makeRow('langgraph','LangGraph SOLO2','PLATFORM','Laufzeit-Checkpoint und Graph-Evidence separat prüfen'),operation:'Graph-Quelle vorhanden · Runtime NOT_PROVEN',
          evidence:'SOLO2 Graph-Quellcode SHA-256 '+g.sourceSha256}
      ];
      const byId=new Map(updates.map(x=>[x.id,x]));
      const next=rows.map(row=>{
        const update=byId.get(row.id);if(!update)return row;byId.delete(row.id);
        return {...row,name:update.name,domain:update.domain,status:'NOT_PROVEN' as const,origin:'OWNER_NOTE' as const,operation:update.operation,evidence:update.evidence,error:''};
      });
      for(const row of byId.values())next.push(row);
      const nextHistory=appendSnapshot(history,next,new Date().toISOString());
      setHistory(nextHistory);setView('handoff');
      setMessage('Build-Artefakte gelesen. Keine laufende Engine, Live-Publikation oder Graph-Ausführung nachgewiesen.');
    }catch{setMessage('Engine-Readback nicht nachgewiesen; vorhandene Historie bleibt unverändert.');}
    finally{setPending(false);}
  }
  async function importGraph(file:File|undefined) {
    if(!file||pending)return;
    setPending(true);
    try{
      if(file.size>16384)throw Error('Graph report too large');
      const bytes=await file.arrayBuffer();
      const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      const updated=projectGraphHandoff(raw,digest,rows);
      setHistory(appendSnapshot(history,updated,new Date().toISOString()));setView('handoff');setDraft(null);
      setMessage('Graph-Statusbericht als Dokumentation übernommen. Kein Provider- oder Runtime-Nachweis; bestehende Live-Readbacks unverändert.');
    }catch{setMessage('Graph-Import abgelehnt: Schema, Größe oder Inhalt ungültig. Historie unverändert.');}
    finally{setPending(false);if(graphInput.current)graphInput.current.value='';}
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportWorkspace(history)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'capital-ai-growth-owner-v' + current.version + '.json';
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function upload(file: File | undefined) {
    if (!file || pending) return;
    setPending(true);
    try {
      if (file.size > 5_000_000) throw new Error('Import too large');
      const imported = importWorkspace(await file.text());
      setHistory(imported); setBaseline(imported[0].version); setDraft(null); setView('matrix');
      setMessage('Import übernommen. Importierte VERIFIED-Angaben sind NOT_PROVEN bis zum neuen Readback.');
    } catch { setMessage('Import abgelehnt: Schema, Größe oder Inhalt ungültig.'); }
    finally { setPending(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  return <section aria-label="Growth Intelligence Control Center" className="space-y-4 rounded-2xl border border-indigo-400/30 bg-[#070b19] p-4 text-slate-100 sm:p-5">
    <header>
      <p className="text-xs font-bold tracking-widest text-indigo-300">CAPITAL-AI / OWNER / GROWTH</p>
      <h2 className="mt-2 text-xl font-black">Growth Intelligence Control Center</h2>
      <p className="mt-2 text-sm text-slate-300">SOLO2 · Arbeitsstand v{current.version} · {new Date(current.at).toLocaleString('de-DE')}</p>
      <p className="mt-2 text-xs text-slate-400">Arbeitsstand in der aktuellen Sitzung; JSON-Export und freigegebenes verschlüsseltes Owner-Archiv zur Wiederverwendung. Bis zu 30 Versionen (4 MB Historie). Keine Tokens, Kundendaten oder Secrets eingeben. Dokumentierte Freigaben erteilen keine Berechtigungen.</p>
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
      <button type="button" className={button} disabled={pending} onClick={() => void readAnalytics()}>GA4, X-Kampagne und GSC Read-only prüfen</button>
      <button type="button" className={button} disabled={pending} onClick={()=>void readEngines()}>Engine-Readback prüfen</button>
      <button type="button" className={button} disabled={pending} onClick={()=>graphInput.current?.click()}>LangGraph-Statusbericht importieren</button>
      <input type="file" accept=".json,application/json" ref={graphInput} hidden onChange={e=>void importGraph(e.target.files?.[0])}/>
      <button type="button" className={button} disabled={pending} onClick={download}>JSON exportieren</button>
      <button type="button" className={button} disabled={pending} onClick={() => fileInput.current?.click()}>JSON importieren (ersetzt Arbeitsstand)</button>
      <input type="file" accept=".json,application/json" ref={fileInput} hidden onChange={e => void upload(e.target.files?.[0])}/>
    </div>
    <details className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <summary className="cursor-pointer text-sm font-bold">Persistente Evidence-Historie · verschlüsselt</summary>
      <p className="text-xs text-slate-300">Nur nach bestätigter serverseitiger Aktivierung und Recovery-Prüfung verfügbar. Archivierte Evidence bleibt Dokumentation. Laden ersetzt nur den Arbeitsstand; keine operative Änderung.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={pending} onClick={()=>void archiveRequest('list')}>Archiv prüfen</button>
        <button type="button" className={button} disabled={pending||!archiveReady} onClick={()=>void archiveRequest('save')}>Aktuellen Stand archivieren</button>
        <button type="button" className={button} disabled={pending||!archiveReady} onClick={()=>restoreInput.current?.click()}>Backup wiederherstellen</button>
        <input type="file" accept=".caige,application/octet-stream" hidden ref={restoreInput} onChange={e=>{
          const f=e.target.files?.[0],id=f?.name.match(/^([a-f0-9]{64})[.]caige$/)?.[1];
          if(f&&id)void archiveRequest('restore',id,f);else{setMessage('Backup-Dateiname ungültig.');e.target.value='';}
        }}/>
      </div>
      {archiveReady&&archiveItems.map(item=><div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 p-2">
        <span className="min-w-0 flex-1 text-xs">v{item.version} · {new Date(item.at).toLocaleString('de-DE')} · {item.id.slice(0,12)}</span>
        <button type="button" className={button} disabled={pending} onClick={()=>void archiveRequest('load',item.id)}>Laden</button>
        <a className={button} href={archivePath+'/backup/'+item.id} download={item.id+'.caige'}>Backup</a>
      </div>)}
    </details>
    {message && <p role="status" className="rounded-lg border border-white/10 p-2 text-sm">{message}</p>}
    {view === 'matrix' && <>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">Domain<select className={control} value={domain} onChange={e => setDomain(e.target.value)}><option value="ALL">Alle Domains</option>{domains.map(d => <option key={d}>{d}</option>)}</select></label>
        <label className="text-xs">Evidence-Status<select className={control} value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">Alle Status</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
      <button type="button" disabled={pending || rows.length >= 100} className={button} onClick={() => { setDraft(makeRow('integration-' + crypto.randomUUID(), 'Neue Integration', 'GROWTH')); setView('edit'); }}>Integration hinzufügen</button>
      <div className="grid gap-2 sm:grid-cols-2">{filtered.map(r => <article key={r.id} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-slate-400">{r.domain} · {r.priority}</p><h3 className="font-bold break-words">{r.name}</h3>
        <p className={'text-xs font-semibold ' + colors[r.status]}>{r.status} · {r.origin === 'GA4_READBACK' ? 'GA4 Readback' : r.origin === 'GSC_READBACK' ? 'GSC Readback' : 'Dokumentation'}</p>
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
      <button type="button" className={button} disabled={pending} onClick={() => {
        const next = addMissingPublicSurfaceRows(rows);
        if (next.length !== rows.length) {
          try { setHistory(h => appendSnapshot(h, next, new Date().toISOString())); }
          catch { setMessage('Audit-Inventar konnte nicht ergänzt werden.'); }
        }
      }}>Public-Surface-Audit ergänzen</button>
      <p className="text-xs text-slate-400">Audit-Aufgaben können als lokale Offline-Recherchedatei exportiert werden. Kein Worker-Start und keine Freigabe.</p>
      {rows.filter(r => r.id.startsWith('audit-') || r.id === 'cai664-billing').map(r => <button key={r.id} type="button" className={button} disabled={pending} onClick={() => {
        try {
          const task = r.id === 'cai664-billing' ? billingRecoveryResearchTask() : publicSurfaceResearchTask(r.id);
          const url = URL.createObjectURL(new Blob([JSON.stringify(task,null,2)], {type:'application/json'}));
          const link = document.createElement('a'); link.href = url; link.download = r.id + '.json'; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { setMessage('Unbekannte Audit-Aufgabe.'); }
      }}>{r.name} · Offline-Aufgabe exportieren</button>)}
      {ordered.filter(r => r.status !== 'VERIFIED').map(r => <article key={r.id} className="rounded-lg border border-white/10 p-3"><p className="text-xs text-indigo-300">{r.priority} · {r.domain} · {r.status}</p><p className="font-bold">{r.name}</p><p className="text-sm break-words">{r.next || 'Nächsten Schritt bestimmen'}</p><p className="text-xs text-slate-400 break-words">{r.dependencies || 'Abhängigkeiten nicht dokumentiert'}</p></article>)}
    </div>}
  </section>;
}
