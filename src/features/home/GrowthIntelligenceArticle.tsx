import { useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import { GROWTH_PUBLIC_ARTICLE as article } from '../../../shared/public-search-focus.mjs';
import { BrandGlobe } from '../../components/BrandGlobe';
import { BRAND_GLOBE } from '../../platform/SocialMediaEngine/Visualization/BrandGlobeSpec';
import { InteractiveArticleScene } from './InteractiveArticleScene';

const controls='min-h-11 rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300';
const palette=BRAND_COLORS as Record<string,string>;
export function GrowthIntelligenceArticle(){
  const [selected,setSelected]=useState(0);
  const [running,setRunning]=useState(false);
  const [ready,setReady]=useState(false);
  const [paused,setPaused]=useState(false);
  const reduceMotion=useReducedMotion();
  const item=article.stages[selected];
  return <article id="growth-intelligence" lang="de" aria-labelledby="growth-intelligence-title" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <header className="overflow-hidden rounded-3xl border border-cyan-300/30 bg-[#071126] p-4 sm:p-8">
      <div data-growth-engine-label className="mb-6 flex min-w-0 items-center gap-3 rounded-2xl border border-amber-300/50 bg-slate-950 px-4 py-4 shadow-[0_0_28px_rgba(249,191,33,.12)]">
        <svg aria-hidden="true" className="h-10 w-12 shrink-0" viewBox="0 0 60 44"><path d="M4 22h12l8-15 10 30 8-15h14" fill="none" stroke="#67E8F9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="30" cy="22" r="19" fill="none" stroke="#F9BF21" strokeWidth="1.5"/><circle cx="56" cy="22" r="3" fill="#F9BF21"/></svg>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold tracking-widest text-cyan-200">CAPITAL-AI</p><p className="break-words text-lg font-black tracking-wide text-amber-200 sm:text-2xl">GROWTH INTELLIGENCE ENGINE</p><div aria-hidden="true" className="mt-2 h-1 rounded-full" style={{background:'linear-gradient(90deg,'+Object.values(BRAND_COLORS).join(',')+')'}}/></div>
      </div>
      <h2 id="growth-intelligence-title" className="text-2xl font-bold leading-tight text-white sm:text-4xl">{article.title}</h2>
      <p className="mt-4 max-w-3xl leading-7 text-slate-200">{article.intro}</p>
      <p className="mt-4 rounded-xl border border-amber-300/40 p-3 text-sm leading-6 text-amber-100">{article.status}</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <figure className="min-w-0 rounded-2xl border border-slate-700 bg-[#050916] p-3" aria-label="Holografisches Growth-Netzwerk">
          <div className="relative mx-auto aspect-square w-full max-w-[420px]">
            <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 400 400">
              {article.stages.map((stage,i)=>{const t=i*2*Math.PI/7-Math.PI/2;const x=200+150*Math.cos(t),y=200+150*Math.sin(t);return <g key={stage.id}><ellipse cx="200" cy="200" rx="172" ry="75" transform={'rotate('+i*26+' 200 200)'} stroke={palette[stage.color]} opacity=".23" fill="none"/><path d={'M200 200 Q'+(200+95*Math.cos(t+.32))+' '+(200+95*Math.sin(t+.32))+' '+x+' '+y} stroke={palette[stage.color]} strokeWidth={selected===i?3:1.2} fill="none" opacity={selected===i?1:.45}/><circle cx={x} cy={y} r="22" fill={palette[stage.color]} opacity=".12"/></g>})}
            </svg>
            <div className="absolute inset-[26%]">
              {running && reduceMotion===false ? <BrandGlobe paused={paused} onReadyChange={setReady}/> : <img src={BRAND_GLOBE.asset} alt="" width="1254" height="1254" className="h-full w-full object-contain" loading="lazy" decoding="async"/>}
            </div>
            {article.stages.map((stage,i)=>{const t=i*2*Math.PI/7-Math.PI/2;return <button key={stage.id} type="button" aria-label={stage.title} aria-pressed={selected===i} onClick={()=>setSelected(i)} className="absolute h-[17%] w-[17%] min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" style={{left:(50+37.5*Math.cos(t))+'%',top:(50+37.5*Math.sin(t))+'%',borderColor:palette[stage.color],boxShadow:selected===i?'0 0 16px '+palette[stage.color]:undefined}}><img src={'/branding/learning-universe/'+stage.art+'.svg'} alt="" width="420" height="260" className="h-full w-full object-cover" loading="lazy"/></button>})}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={controls} disabled={reduceMotion!==false} onClick={()=>{setRunning(v=>!v);setPaused(false);setReady(false);}}>{running?'Globus schließen':'3D-Globus starten'}</button>
            {running&&ready&&reduceMotion===false&&<button type="button" className={controls} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'Globus fortsetzen':'Globus pausieren'}</button>}
          </div>
          <figcaption className="mt-3 text-sm leading-6 text-slate-300">Schematisches neuronales Netzwerk mit vorhandenen Universe-Motiven. Keine Live-Daten und kein trainiertes neuronales Modell. Bei reduzierter Bewegung oder fehlendem WebGL bleibt die statische Darstellung verfügbar.</figcaption>
        </figure>
        <section aria-labelledby="growth-stage-title" className="min-w-0 rounded-2xl border border-slate-600 bg-slate-950 p-4" style={{borderTopColor:palette[item.color]}}>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Komponente {item.id} von 07</p>
          <h3 id="growth-stage-title" className="mt-2 text-xl font-bold text-white"><span aria-hidden="true">{item.emoji} </span>{item.title}</h3>
          <div aria-live="polite" aria-atomic="true"><p className="mt-3 leading-7 text-slate-200">{item.body}</p><p className="mt-4 text-sm font-medium leading-6 text-amber-200">{item.status}</p></div>
          <InteractiveArticleScene key={item.id} newsScene={{kind:'network',nodes:[{label:item.title,detail:item.body,height:1}, {label:'Quelle',detail:'Nachvollziehbare Herkunft',height:.8},{label:'Qualität',detail:'Fachliche Prüfung',height:.8},{label:'Weiterentwicklung',detail:'Kontrollierte Rückkopplung',height:.8}],description:'Schematisches 3D-Erklärmodell. Keine Messwerte oder produktiven Systemzustände.'}} draftPreview/>
        </section>
      </div>
      <section className="mt-6" aria-labelledby="growth-pipeline-title">
        <h3 id="growth-pipeline-title" className="text-lg font-bold text-white">Horizontale Intelligence-Pipeline</h3>
        <p className="mt-1 text-sm text-slate-300">Schritt auswählen oder die Leiste horizontal verschieben. Die vollständige Beschreibung folgt im Artikel.</p>
        <ol data-growth-pipeline aria-label="Sieben Prozessschritte" className="mt-3 flex gap-2 overflow-x-auto pb-3 snap-x">
          {article.stages.map((stage,i)=><li key={stage.id} className="flex shrink-0 items-center gap-2 snap-start"><button type="button" aria-pressed={selected===i} onClick={()=>setSelected(i)} className={controls+' flex w-32 flex-col items-start gap-1 text-left'} style={{borderColor:palette[stage.color],background:selected===i?'#17263d':'#0b1428'}}><span className="text-xs" style={{color:palette[stage.color]}}>{stage.id}</span><span aria-hidden="true">{stage.emoji}</span><span>{stage.title}</span></button>{i<article.stages.length-1&&<span aria-hidden="true" className="text-cyan-200">→</span>}</li>)}
        </ol>
        <p className="text-sm text-emerald-200">Rückkopplung: Erkenntnisse aus der Optimierung unterstützen die nächste Analyse.</p>
      </section>
    </header>
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      {article.sections.map(section=><section key={section.title} className="min-w-0 rounded-2xl border border-slate-700 bg-slate-950 p-5"><h3 className="text-lg font-bold text-white"><span aria-hidden="true">{section.emoji} </span>{section.title}</h3><p className="mt-3 leading-7 text-slate-200">{section.body}</p></section>)}
    </div>
    <section aria-labelledby="growth-products-title" className="mt-8">
      <h3 id="growth-products-title" className="text-xl font-bold text-white">🚀 Produkte und Entwicklungsperspektiven</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{article.products.map(product=><section key={product.title} className="rounded-xl border border-slate-700 bg-slate-950 p-4"><h4 className="font-bold text-white">{product.title}</h4><p className="mt-2 leading-6 text-sm text-slate-200">{product.body}</p>{product.href&&<a className="mt-2 inline-flex min-h-11 items-center text-amber-200 underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300" href={product.href}>{product.title} erkunden</a>}</section>)}</div>
    </section>
    <p className="mt-6 leading-7 text-slate-200">{article.closing}</p>
    <a href="/learning" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-amber-300 px-5 py-3 font-bold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Finanzwissen im Learning Hub entdecken</a>
  </article>;
}
