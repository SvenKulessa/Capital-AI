import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCommercialRoadmap, serializeCommercialRoadmap, isOwnerRoadmapSession, ROADMAP_ARCHIVE } from './ownerCommercialRoadmapModel';
import type { GrowthSnapshot } from './growthOwnerWorkspaceModel';

const limit = 5_000_000;
const button = 'min-h-11 rounded-xl border border-indigo-300/40 px-3 py-2 text-sm font-semibold text-indigo-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-indigo-200';
const shaPattern = /^[a-f0-9]{64}$/;
async function digest(raw: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), b => b.toString(16).padStart(2,'0')).join('');
}
async function ownerSession(userId: string, signal?: AbortSignal) {
  const res = await fetch('/api/auth/session', { credentials:'same-origin', cache:'no-store', signal });
  if (!res.ok || !isOwnerRoadmapSession(await res.json(), userId)) throw Error('OWNER_REQUIRED');
}

export function OwnerCommercialRoadmap({ userId }: { userId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [history, setHistory] = useState<GrowthSnapshot[]>([]);
  const [priority, setPriority] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [message, setMessage] = useState('');
  const [archiveId, setArchiveId] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const action = useRef<AbortController | null>(null);
  const check = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    check.current?.abort();
    const controller = new AbortController();
    check.current = controller;
    setConfirmed(false);
    try {
      await ownerSession(userId, controller.signal);
      if (!controller.signal.aborted) setConfirmed(true);
    } catch {
      if (!controller.signal.aborted) {
        generation.current++;
        action.current?.abort();
        setHistory([]); setArchiveId(''); setBusy(false);
        setMessage('Owner-Sitzung nicht bestätigt. Roadmap wurde ausgeblendet.');
      }
    }
  }, [userId]);
  useEffect(() => {
    void refresh();
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh();
      else setConfirmed(false);
    };
    const focus = () => { void refresh(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', focus);
    return () => {
      generation.current++;
      check.current?.abort(); action.current?.abort();
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', focus);
    };
  }, [refresh]);
  async function run(work: (signal: AbortSignal) => Promise<() => void>) {
    if (busy || action.current) return;
    const controller = new AbortController();
    action.current = controller;
    const version = generation.current;
    setBusy(true); setMessage('');
    try {
      await ownerSession(userId, controller.signal);
      const apply = await work(controller.signal);
      await ownerSession(userId, controller.signal);
      if (!controller.signal.aborted && version === generation.current) apply();
    } catch {
      if (!controller.signal.aborted && version === generation.current) {
        setMessage('Aktion nicht bestätigt. Owner-Zugriff, Dateiformat oder Archiv-Freigabe prüfen.');
        void refresh();
      }
    } finally {
      if (action.current === controller) { action.current = null; setBusy(false); }
    }
  }
  const current = history.at(-1);
  const rows = current?.rows ?? [];
  const shown = rows.filter(r => (priority === 'ALL' || r.priority === priority) && (status === 'ALL' || r.status === status));
  return <section aria-labelledby="commercial-roadmap-title" className="space-y-4 rounded-2xl border border-cyan-300/30 bg-[#0b1428] p-4">
    <h3 id="commercial-roadmap-title" className="text-xl font-bold text-white">Zentrale Vermarktungsroadmap · Growth &amp; Commercial Readiness</h3>
    <p className="text-sm text-slate-300">Owner-only · interne Planung. Importierte Evidence ist Dokumentation und keine Verkaufs-, Kosten-, Merge- oder Produktionsfreigabe.</p>
    <label className="block text-sm text-cyan-100">Private Roadmap-Datei (JSON)
        <input type="file" accept=".json,application/json" disabled={busy} className="mt-2 block w-full min-h-11 text-sm text-slate-200"
          onChange={event => {
            const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
            if (!file) return;
            void run(async () => {
              if (file.size > limit) throw Error('SIZE');
              const imported = parseCommercialRoadmap(await file.text());
              return () => { setHistory(imported); setArchiveId(''); setMessage('Private Roadmap geladen. Kein Live-Nachweis.'); };
            });
          }}/>
      </label>
    {!confirmed ? <p role="status" className="text-amber-200">Owner-Sitzung nicht bestätigt oder Prüfung läuft.</p> : <>
      <div className="space-y-2 rounded-xl border border-white/10 p-3">
        <label className="block text-sm text-slate-200">Privates Evidence-Archiv · SHA-256
          <input value={archiveId} onChange={e=>setArchiveId(e.target.value)} maxLength={64} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 text-white"/>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={busy || !shaPattern.test(archiveId)} onClick={() => void run(async signal => {
            const id = archiveId;
            const res = await fetch(ROADMAP_ARCHIVE+'/file/'+id,{credentials:'same-origin',cache:'no-store',signal});
            if (!res.ok) throw Error('ARCHIVE');
            const raw = await res.text();
            if (new TextEncoder().encode(raw).length > limit || await digest(raw) !== id) throw Error('DIGEST');
            const imported = parseCommercialRoadmap(raw);
            return () => { setHistory(imported); setMessage('Archivdatei und Hash bestätigt; Status bleibt Dokumentation.'); };
          })}>Archiv laden</button>
          <button type="button" className={button} disabled={busy || !current} onClick={() => void run(async signal => {
            const raw = serializeCommercialRoadmap(history);
            const id = await digest(raw);
            const res = await fetch(ROADMAP_ARCHIVE,{method:'POST',credentials:'same-origin',cache:'no-store',signal,headers:{'Content-Type':'application/json'},body:raw});
            if (!res.ok) throw Error('ARCHIVE');
            const receipt = await res.json();
            if (receipt.archived !== true || receipt.authority !== 'DOCUMENTATION_ONLY' || receipt.id !== id) throw Error('RECEIPT');
            return () => { setArchiveId(id); setMessage('Archiv-Schreibreceipt bestätigt. Archiv laden für getrennten Readback.'); };
          })}>Private Roadmap archivieren</button>
        </div>
        <p className="text-xs text-slate-400">Archivierung nur über vorhandenes Owner-Archiv, bei serverseitig aktivierter Recovery. Ohne Archiv bleibt die Ansicht sitzungsbezogen; kein Browser-Speicher.</p>
      </div>
      {message && <p role="status" className="break-words text-sm text-amber-100">{message}</p>}
      {!current ? <p className="text-sm text-slate-300">Keine private Roadmap geladen.</p> : <>
        <p className="text-sm text-slate-300">Dokumentstand {current.at} · Revision {current.version} · {rows.length} Einträge</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-300">Priorität
            <select value={priority} onChange={e=>setPriority(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-2 text-white">
              {['ALL','P0','P1','P2'].map(x=><option key={x} value={x}>{x==='ALL'?'Alle':x}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-300">Status
            <select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-2 text-white">
              {['ALL','BLOCKED','NOT_PROVEN'].map(x=><option key={x} value={x}>{x==='ALL'?'Alle':x}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map(row=><article key={row.id} className="min-w-0 rounded-xl border border-white/10 bg-slate-900 p-3">
            <p className="text-xs font-semibold text-cyan-200">{row.priority} · {row.domain}</p>
            <h4 className="mt-1 break-words text-base font-bold text-white">{row.name}</h4>
            <p className={row.status==='BLOCKED'?'text-sm font-semibold text-rose-300':'text-sm font-semibold text-amber-200'}>{row.status}</p>
            <dl className="mt-3 space-y-2 text-sm">
              {([['Abhängigkeiten',row.dependencies],['Quelle / Endpunkt',row.endpoint],['Technik',row.flow],['Sicherheit',row.auth],['Tests',row.tests],['Evidence',row.evidence],['Betriebsstatus',row.operation],['Freigabe',row.approvals],['Blockade',row.error],['Nächster Schritt',row.next]] as const).filter(([,v])=>v).map(([label,value])=><div key={label}><dt className="text-xs font-semibold text-slate-400">{label}</dt><dd className="whitespace-pre-wrap break-words text-slate-200">{value}</dd></div>)}
            </dl>
          </article>)}
        </div>
        {!shown.length && <p role="status" className="text-sm text-slate-300">Keine Einträge für diese Filter.</p>}
      </>}
    </>}
  </section>;
}
