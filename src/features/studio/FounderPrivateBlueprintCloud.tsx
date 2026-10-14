import React, { useCallback, useEffect, useState } from 'react';
import { Database, ShieldCheck, UploadCloud, Download, RefreshCcw } from 'lucide-react';

type Release = { sku: 'CAP-BP-001' | 'CAP-BP-002'; ready: boolean; sha256: string | null; disk: string };
type CloudStatus = { available: boolean; encrypted?: boolean; writable?: boolean; reason?: string; persistence: string; releases: Release[] };
const ROOT = '/api/billing/blueprints/private-cloud/';
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200';

/** Existing authenticated owner role only. This component never grants permissions. */
export function FounderPrivateBlueprintCloud() {
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [isOwner, setOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [restoreFiles, setRestoreFiles] = useState<Record<string, File | undefined>>({});
  const refresh = useCallback(async () => {
    try {
      const result = await fetch(ROOT + 'verify', { cache:'no-store', credentials:'same-origin' });
      if (result.status === 401 || result.status === 403) { setOwner(false); setStatus(null); return; }
      const data = await result.json() as CloudStatus;
      setOwner(true);
      setStatus(data);
    } catch { setNotice('Cloud-Status konnte nicht überprüft werden.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function send(sku: Release['sku'], type: 'import' | 'restore') {
    const file = (type === 'import' ? files : restoreFiles)[sku];
    const entry = status?.releases?.find(x => x.sku === sku);
    if (!file || !entry?.ready || !entry.sha256 || busy) return;
    if (file.size < 128 || file.size > (type === 'import' ? 1048576 : 1500000)) {
      setNotice('Dateigröße liegt außerhalb des zulässigen Bereichs.'); return;
    }
    setBusy(true); setNotice('');
    try {
      const contents = await file.arrayBuffer();
      if (type === 'import') {
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', contents)), x => x.toString(16).padStart(2,'0')).join('');
        if (hash !== entry.sha256) throw new Error('Datei stimmt nicht mit dem freigegebenen Blueprint-SHA überein.');
      }
      const response = await fetch(ROOT + type + '/' + sku, {
        method: 'POST', credentials:'same-origin', cache:'no-store',
        headers: { 'Content-Type': type === 'import' ? 'text/markdown' : 'application/octet-stream',
          'X-Blueprint-Release-SHA256': entry.sha256 },
        body: contents,
      });
      if (!response.ok) throw new Error(response.status === 409
        ? 'Version bereits vorhanden oder Freigabe nicht identisch.'
        : 'Privater Cloud-Vorgang nicht verfügbar.');
      setNotice('Verschlüsselter Artefaktstand abgelegt; Cloud-Evidence wird erneut geprüft.');
      await refresh();
    } catch(error) { setNotice(error instanceof Error ? error.message : 'Vorgang fehlgeschlagen.'); }
    finally { setBusy(false); }
  }
  if (!isOwner && !loading) return null;
  return <section aria-label="Founder Private Blueprint Cloud" className="mt-5 rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 text-white">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-bold"><Database size={18} aria-hidden="true" /> Founder · Private Blueprint Cloud</h3>
      <button type="button" disabled={busy} onClick={() => void refresh()} className={'flex min-h-11 items-center gap-2 rounded-lg border border-slate-600 px-3 text-xs ' + focus}>
        <RefreshCcw size={15} aria-hidden="true" /> Erneut prüfen
      </button>
    </div>
    {loading ? <p role="status" className="mt-3 text-sm text-slate-300">Berechtigung wird geprüft…</p> :
      <>
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-200">
          <ShieldCheck size={18} aria-hidden="true" />
          {status?.available ? 'Private Disk beschreibbar · AES-256-GCM aktiv' : 'Private Cloud noch nicht betriebsbereit'}
        </p>
        <p className="mt-1 text-xs text-slate-400">Persistence- und Drive-Restore-Nachweise sind von diesem Schreibtest getrennt. Schlüssel bleiben ausschließlich serverseitig.</p>
        {!status?.available && <p role="status" className="mt-2 text-sm text-amber-200">{status?.reason ?? 'Fehlende Runtime-Evidence'}</p>}
        {notice && <p role="status" className="mt-3 rounded-lg border border-amber-500/40 p-3 text-sm text-amber-100">{notice}</p>}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {status?.releases?.map(item => <article key={item.sku} className="space-y-3 rounded-lg border border-slate-700 p-3">
            <h4 className="font-semibold">{item.sku} · v1.0.0</h4>
            <p className="text-xs text-slate-300">Release: {item.ready ? 'VERIFIED' : 'NOT_PROVEN'} · Disk: {item.disk}</p>
            <label className="block text-sm" htmlFor={'cloud-import-'+item.sku}>Original-Markdown importieren</label>
            <input id={'cloud-import-'+item.sku} type="file" accept=".md,text/markdown" className="w-full text-xs file:mr-2 file:rounded file:bg-cyan-800 file:p-2 file:text-white"
              onChange={e=>setFiles(prev=>({...prev,[item.sku]:e.target.files?.[0]}))}/>
            <button type="button" disabled={busy || !status?.available || !item.ready || !files[item.sku]}
              onClick={()=>void send(item.sku,'import')} className={'flex min-h-11 items-center gap-2 rounded-lg border border-cyan-500/40 px-3 text-sm disabled:opacity-50 ' + focus}>
              <UploadCloud size={17} aria-hidden="true" /> Unveränderliches Original speichern
            </button>
            {item.disk === 'VERIFIED' &&
              <a href={ROOT + 'backup/' + item.sku} className={'flex min-h-11 items-center gap-2 rounded-lg border border-slate-500 px-3 text-sm ' + focus}>
                <Download size={17} aria-hidden="true" /> Verschlüsseltes Drive-Backup exportieren
              </a>}
            {item.disk === 'MISSING' && <>
              <label className="block text-sm" htmlFor={'cloud-restore-'+item.sku}>Verschlüsseltes Backup wiederherstellen</label>
              <input id={'cloud-restore-'+item.sku} type="file" accept=".caibak,application/octet-stream" className="w-full text-xs file:mr-2 file:rounded file:bg-cyan-800 file:p-2 file:text-white"
                onChange={e=>setRestoreFiles(prev=>({...prev,[item.sku]:e.target.files?.[0]}))}/>
              <button type="button" disabled={busy || !status?.available || !restoreFiles[item.sku]}
                onClick={()=>void send(item.sku,'restore')} className={'min-h-11 rounded-lg border border-slate-500 px-3 text-sm disabled:opacity-50 ' + focus}>Backup prüfen und restaurieren</button>
            </>}
          </article>)}
        </div>
      </>}
  </section>;
}
