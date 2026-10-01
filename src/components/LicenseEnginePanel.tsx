import React, { useEffect, useState } from 'react';
import { assessExpression, importScannerReport, MAX_REPORT_BYTES } from '../../shared/license-engine.mjs';

type Snapshot = {
  evidenceReviewDate: string; evidenceSourceSha: string; lockfileSha256: string;
  packages: { name: string; version: string; expression: string; status: string; obligations: string[] }[];
  providers: { id: string; status: string; missingFields: string[]; nextAction: string }[];
  osPackages: { name: string; version: string; status: string; nextAction: string }[];
  remainingGates: string[];
  tools: { id: string; version: string; license: string; mode: string; source: string }[];
  documents: { name: string; sha256: string }[];
};
export function LicenseEnginePanel() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [imported, setImported] = useState<ReturnType<typeof importScannerReport> | null>(null);
  const [expression, setExpression] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    fetch('/license-engine/report.json', { signal: abort.signal, cache: 'no-store' }).then(r => {
      if (!r.ok) throw new Error('Lizenzinventar ist momentan nicht verfügbar.');
      return r.json();
    }).then(r => {
      if (r.schemaVersion !== 1 || r.deployEligible !== false || !Array.isArray(r.packages) || !Array.isArray(r.tools)) throw new Error('Ungültiger Lizenzbericht.');
      setSnapshot(r);
    }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, []);
  const assessment = assessExpression(expression);
  async function onImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImported(null); setError('');
    if (!file) return;
    try {
      if (file.size > MAX_REPORT_BYTES) throw new Error('Maximal 2 MiB pro Bericht.');
      setImported(importScannerReport(await file.text()));
    } catch (e) { setError(e instanceof Error ? e.message : 'Import fehlgeschlagen.'); }
    event.target.value = '';
  }
  function download() {
    if (!imported) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(imported, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'lizenzpruefung.json'; link.click(); URL.revokeObjectURL(url);
  }
  const rows = (imported?.rows || snapshot?.packages || []).filter(p => `${p.name} ${p.expression}`.toLowerCase().includes(query.toLowerCase()));
  return <section aria-labelledby="license-engine-heading" className="space-y-5 rounded-2xl border border-amber-400/20 bg-slate-950 p-4 sm:p-6">
    <h2 id="license-engine-heading" className="text-xl font-bold text-amber-400">Lizenzierungsengine</h2>
    <p className="text-sm text-slate-300">Originaltexte, Lizenzpflichten und offene Rechtefragen an einem Ort. Freigabe offen: Ein Scan oder SPDX-Ausdruck bestätigt keine Nutzungs- oder Verteilungsrechte.</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!snapshot && !error && <p role="status">Lizenzinventar wird geladen …</p>}
    {snapshot && <>
      <p className="text-xs text-slate-400 break-all">Rechte-Snapshot vom {snapshot.evidenceReviewDate} · Referenz {snapshot.evidenceSourceSha}. Lockfile SHA-256: {snapshot.lockfileSha256}. Aktive Laufzeit und Image-Digest sind separat zu validieren.</p>
      <h3 className="font-bold">Aktuelle Nachweislücken</h3>
      <ul className="list-disc pl-5 text-sm space-y-2">{snapshot.remainingGates.map(g => <li key={g}>{g}</li>)}</ul>
      <div className="grid gap-3 sm:grid-cols-2">{snapshot.providers.map(p => <article key={p.id} className="rounded-xl border border-slate-700 p-3">
        <h4 className="font-bold">{p.id}</h4><p className="text-sm text-amber-300">{p.status}</p><p className="text-sm my-2">{p.nextAction}</p>
        <details><summary className="cursor-pointer text-sm">{p.missingFields.length} fehlende Vertragsfelder</summary><ul className="text-xs text-slate-400 list-disc pl-5">{p.missingFields.map(f => <li key={f}>{f}</li>)}</ul></details>
      </article>)}</div>
      <details><summary className="cursor-pointer">{snapshot.osPackages.length} Container-Komponenten mit offenen Quellnachweisen</summary><ul className="text-sm space-y-2 mt-3">{snapshot.osPackages.map(p => <li key={p.name}><strong>{p.name} {p.version}</strong> · {p.status}<p className="text-slate-400">{p.nextAction}</p></li>)}</ul></details>
      <details><summary className="cursor-pointer">Kostenlose Werkzeuge und Original-Lizenzen</summary>
        <ul className="text-sm my-3 space-y-2">{snapshot.tools.map(t => <li key={t.id}><a className="text-amber-300 underline" href={t.source} target="_blank" rel="noopener noreferrer">{t.id} {t.version}</a> · {t.license} · {t.mode === 'REPORT_IMPORT_ONLY' ? 'Berichtsimport; Scanner separat ausführen' : 'Lokal integriert'}</li>)}</ul>
        <p className="text-sm text-slate-400">Keine Lizenzgebühren, Abos oder neuen Cloud-Dienste. ORT und ScanCode werden hier über ihre Berichte angebunden.</p>
        <ul className="text-xs my-3 space-y-2">{snapshot.documents.map(d => <li key={d.name}><a href={'/license-engine/' + d.name} className="underline text-amber-300" download>{d.name}</a><span className="block text-slate-500 break-all">SHA-256 {d.sha256}</span></li>)}</ul>
      </details>
    </>}
    <div className="border-t border-slate-700 pt-4 space-y-3">
      <h3 className="font-bold">Lizenzausdruck prüfen</h3>
      <label className="block text-sm">SPDX-Ausdruck<input maxLength={400} value={expression} onChange={e => setExpression(e.target.value)} placeholder="MIT OR Apache-2.0" className="block w-full mt-2 rounded-xl bg-slate-800 p-3" /></label>
      {expression && <div aria-live="polite" className="text-sm"><p>{assessment.status === 'MISSING_OR_INVALID' ? 'Ausdruck fehlt oder ist ungültig' : 'Erkannt · Prüfung erforderlich'}</p><ul className="list-disc pl-5">{assessment.obligations.map(o => <li key={o}>{o}</li>)}</ul></div>}
      <h3 className="font-bold">Scanbericht lokal auswerten</h3>
      <p className="text-sm text-slate-400">ScanCode, ORT, Trivy, SPDX oder CycloneDX JSON · maximal 2 MiB. Die Datei bleibt im Browser und wird beim Verlassen verworfen. Importierte Befunde sind unbestätigt und werden keinem Produktionsdigest zugeordnet.</p>
      <label className="block text-sm">JSON-Bericht auswählen<input type="file" accept=".json,application/json" onChange={onImport} className="block my-2 max-w-full" /></label>
      {imported && <div className="flex flex-wrap gap-3"><span className="text-sm">{imported.tool}: {imported.rows.length} Einträge · Freigabe offen</span><button type="button" onClick={download} className="rounded-lg bg-amber-400 px-3 py-2 text-black">Prüfbericht herunterladen</button><button type="button" onClick={() => setImported(null)} className="underline">Import verwerfen</button></div>}
      <label className="block text-sm">Pakete oder Lizenzen filtern<input value={query} onChange={e => setQuery(e.target.value)} className="block w-full mt-2 rounded-xl bg-slate-800 p-3" /></label>
      <p className="text-xs text-slate-400">{rows.length} Einträge · {imported ? 'Lokaler Bericht' : 'Lockfile-Inventar; kein Runtime-SBOM'} · Anzeige auf 200 Treffer begrenzt.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Paket / Datei</th><th>Lizenz und nächste Prüfung</th></tr></thead><tbody>{rows.slice(0, 200).map((p, i) => <tr key={p.name + i} className="border-t border-slate-800"><td className="py-3 break-all">{p.name} {p.version}</td><td className="py-3"><details><summary className="cursor-pointer">{p.expression || 'Lizenz fehlt'} · {p.status === 'MISSING_OR_INVALID' ? 'Manuelle Zuordnung' : 'Prüfung offen'}</summary><ul className="list-disc pl-5 text-slate-400">{p.obligations.map(o => <li key={o}>{o}</li>)}</ul></details></td></tr>)}</tbody></table></div>
    </div>
  </section>;
}
