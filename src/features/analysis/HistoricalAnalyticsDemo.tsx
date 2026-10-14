import { ScorerMethodologyDemo } from './ScorerMethodologyDemo';
import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Search } from 'lucide-react';
import { PUBLIC_ANALYTICS_DEMO, DEMO_DATES, demoMetrics } from '../../../shared/analytics-demo.mjs';
import { verifiedOwner } from '../../../shared/account-display.mjs';
type DemoAsset = {symbol:string;name:string;index:number[]};
function Sparkline({values,name}:{values:number[];name:string}) {
  const low = Math.min(...values)-.5, high = Math.max(...values)+.5;
  const points = values.map((value,i)=>`${8+i*284/(values.length-1)},${82-(value-low)/(high-low)*66}`).join(' ');
  return <svg viewBox="0 0 300 96" role="img" aria-label={`${name}: Verlauf des Index. Einzelwerte in der Datentabelle.`} className="mt-4 w-full"><path d="M8 82H292 M8 49H292 M8 16H292" stroke="#334155" strokeWidth="1"/><polyline points={points} fill="none" stroke="var(--hub-accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/></svg>;
}
export function HistoricalAnalyticsDemo({ showMethodology = true }: { showMethodology?: boolean }) {
  const [assets,setAssets] = useState<readonly DemoAsset[]>(PUBLIC_ANALYTICS_DEMO);
  const [owner,setOwner] = useState(false);
  const [archive,setArchive] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [query,setQuery] = useState('');
  const [sort,setSort] = useState('symbol');
  useEffect(()=>{const controller = new AbortController();fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',signal:controller.signal}).then(response=>response.ok?response.json():null).then(session=>{if(!controller.signal.aborted)setOwner(verifiedOwner(session));}).catch(()=>{});return ()=>controller.abort();},[]);
  async function loadArchive() {
    setBusy(true);setError('');
    try {
      const response = await fetch('/api/analytics/owner-archive-demo',{credentials:'same-origin',cache:'no-store'});
      const value = await response.json();
      if (!response.ok || value.mode !== 'owner-archive' || !Array.isArray(value.assets) || value.assets.length !== 3 || value.assets.some((asset:DemoAsset)=>!['BTC','ETH','SOL'].includes(asset.symbol)||asset.index?.length!==8||asset.index.some(point=>!Number.isFinite(point)||point<=0))) throw new Error('UNAVAILABLE');
      setAssets(value.assets);setArchive(true);
    } catch {setError('Der historische Auszug ist derzeit nicht verfügbar. Die öffentliche Beispielansicht bleibt nutzbar.');}
    finally {setBusy(false);}
  }
  const visible = assets.filter(asset=>`${asset.symbol} ${asset.name}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='change'?demoMetrics(b.index).change-demoMetrics(a.index).change:a.symbol.localeCompare(b.symbol));
  return <section data-hub="marketscreener" className="historical-demo rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-[#102734] via-[#0a172b] to-[#081020] p-4 sm:p-7" aria-labelledby="analytics-demo-heading">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="hub-heading text-sm font-bold uppercase tracking-widest">Analytics Hub · Vorschau</p><h1 id="analytics-demo-heading" className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Märkte auf einen Blick</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-200">Vergleiche Verläufe, erkenne Unterschiede und lerne, Kennzahlen einzuordnen.</p></div><span className="rounded-full border border-cyan-200/50 bg-cyan-200/10 px-4 py-2 text-sm font-bold text-cyan-100">{archive?'Privater Archiv-Auszug':'DEMO · Beispieldaten'}</span></div>
    <p className="mt-4 text-sm leading-6 text-slate-200">{archive?'Historische gespeicherte Kurse, nur im Owner-Modus.':'Synthetische Beispielkurse.'} 23.–30.09.2026 · Startindex 100 · keine Live-Kurse oder Handelssignale.</p>
    {owner && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={busy} onClick={()=>void loadArchive()} className="hub-tab border border-cyan-300/60">{busy?'Archiv wird geladen …':'Historisches Archiv ansehen'}</button>{archive && <button type="button" onClick={()=>{setAssets(PUBLIC_ANALYTICS_DEMO);setArchive(false);}} className="hub-tab">Öffentliche Demo</button>}</div>}
    {error && <p role="alert" className="mt-4 text-rose-200">{error}</p>}
    <div className="mt-6 flex flex-col gap-4 sm:flex-row"><label className="flex-1 text-sm font-semibold text-slate-200">Asset suchen<div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-500 bg-slate-950/60 px-3"><Search aria-hidden="true" className="h-5 w-5 text-slate-300"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Bitcoin, ETH …" className="w-full bg-transparent text-base text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"/></div></label><label className="text-sm font-semibold text-slate-200">Sortierung<select value={sort} onChange={event=>setSort(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-500 bg-slate-950 p-3 text-base text-white"><option value="symbol">Symbol A–Z</option><option value="change">Veränderung absteigend</option></select></label></div>
    <div className="mt-6 grid gap-4 lg:grid-cols-3">{visible.map(asset=>{const metrics = demoMetrics(asset.index);const up = metrics.change>=0;const Icon = up?ArrowUpRight:ArrowDownRight;return <article key={asset.symbol} className="rounded-2xl border border-slate-600/70 bg-slate-950/50 p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-white">{asset.name}</h2><span className="text-sm text-slate-300">{asset.symbol} · Krypto</span></div><span className="hub-heading rounded-xl border border-cyan-300/30 px-3 py-2 font-mono font-bold">{asset.symbol}</span></div><div className="mt-5 flex flex-wrap items-end justify-between gap-2"><div><span className="text-sm text-slate-300">Index am 30.09.</span><strong className="mt-1 block text-3xl text-white">{metrics.last.toFixed(2)}</strong></div><span className={`inline-flex items-center gap-1 text-base font-semibold ${up?'text-emerald-200':'text-rose-200'}`}><Icon aria-hidden="true" className="h-5 w-5"/>{up?'+':''}{metrics.change.toFixed(2)} %</span></div><Sparkline name={asset.name} values={asset.index}/><p className="mt-3 text-sm text-slate-300">Tagesschwankung: <strong className="text-white">{metrics.volatility.toFixed(2)} %</strong></p></article>;})}</div>
    {!visible.length && <p role="status" className="mt-5 text-slate-200">Kein Asset gefunden. Suche zurücksetzen.</p>}
    <details className="mt-6 rounded-2xl border border-slate-600 bg-slate-950/40 p-4"><summary className="min-h-11 cursor-pointer text-base font-semibold text-cyan-100">Datentabelle & Berechnung ansehen</summary><p className="mt-3 text-sm leading-6 text-slate-200">Index = Kurs / erster Kurs × 100. Veränderung = letzter Index / erster Index − 1. Tagesschwankung ist die Stichproben-Standardabweichung der sieben täglichen prozentualen Änderungen; keine annualisierte Volatilität und kein Score.</p><div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Historische Indexwerte"><table className="w-full text-left text-sm text-slate-200"><caption className="py-3 text-left font-semibold">{archive?'Privater historischer Index':'Synthetischer Demo-Index'} · Basis 100</caption><thead><tr><th scope="col" className="p-3">Datum</th>{visible.map(asset=><th scope="col" className="p-3" key={asset.symbol}>{asset.symbol}</th>)}</tr></thead><tbody>{DEMO_DATES.map((date,i)=><tr key={date} className="border-t border-slate-700"><th scope="row" className="whitespace-nowrap p-3 font-normal">{date}</th>{visible.map(asset=><td key={asset.symbol} className="p-3 font-mono">{asset.index[i].toFixed(2)}</td>)}</tr>)}</tbody></table></div></details>
    {showMethodology && <details className="mt-6"><summary className="hub-heading min-h-11 cursor-pointer py-3 text-base font-semibold">Enterprise Scorer: Methodik-Demo öffnen</summary><div className="mt-4"><ScorerMethodologyDemo /></div></details>}
    <a href="/learning/glossar" className="hub-tab mt-5 justify-start"><span>Die Kennzahlen verstehen</span><ChevronRight aria-hidden="true" className="h-5 w-5"/></a>
  </section>;
}
