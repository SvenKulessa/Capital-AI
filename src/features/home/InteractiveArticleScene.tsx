import { useEffect, useRef, useState } from 'react';
import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import { learningArticleScene, type ArticleScene } from './articleSceneModel';

type Renderer = ReturnType<typeof import('./ArticleSceneRenderer').createArticleSceneRenderer>;
type Props = { articleId: string; newsScene?: never; draftPreview?: never } | { articleId?: never; newsScene: ArticleScene; draftPreview?: boolean };

/** Opt-in WebGL, no autoplay or background animation. Text and the model controls remain usable without WebGL. */
export function InteractiveArticleScene(props: Props) {
  const [value,setValue]=useState<number>();
  const [enabled,setEnabled]=useState(false);
  const [ready,setReady]=useState(false);
  const [failed,setFailed]=useState(false);
  const [angle,setAngle]=useState(30);
  const [zoom,setZoom]=useState(1);
  const canvas=useRef<HTMLCanvasElement>(null);
  const api=useRef<Renderer|null>(null);
  const model=props.newsScene ?? learningArticleScene(props.articleId ?? '',value);
  const current=useRef({model,angle,zoom});
  current.current={model,angle,zoom};
  useEffect(()=>{
    if(!enabled||!canvas.current)return;
    const element=canvas.current;
    let disposed=false, renderer:Renderer|undefined;
    let observer:ResizeObserver|undefined;
    const fail=()=>{if(disposed)return;renderer?.dispose();renderer=undefined;api.current=null;setReady(false);setFailed(true);};
    const redraw=()=>{try{const c=current.current;if(renderer&&c.model){renderer.resize();renderer.draw(c.model,c.angle,c.zoom);}}catch{fail();}};
    const lost=(e:Event)=>{e.preventDefault();fail();};
    element.addEventListener('webglcontextlost',lost);
    window.addEventListener('resize',redraw);
    void import('./ArticleSceneRenderer').then(({createArticleSceneRenderer})=>{
      if(disposed)return;
      renderer=createArticleSceneRenderer(element);api.current=renderer;
      if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(redraw);observer.observe(element);}
      redraw();if(renderer)setReady(true);
    }).catch(fail);
    return()=>{disposed=true;observer?.disconnect();window.removeEventListener('resize',redraw);element.removeEventListener('webglcontextlost',lost);renderer?.dispose();api.current=null;};
  },[enabled]);
  useEffect(()=>{if(!enabled||!ready||!model)return;try{api.current?.draw(model,angle,zoom);}catch{setEnabled(false);setReady(false);setFailed(true);}},[enabled,ready,model,angle,zoom]);
  if(!model)return null;
  const palette=Object.values(BRAND_COLORS);
  return <section data-article-scene={model.kind} data-scene-state={ready && enabled ? "3d" : failed ? "fallback" : enabled ? "loading" : "text"} aria-label="Interaktives Artikelmodell" className="mt-4 min-w-0 rounded-xl border border-slate-700 bg-[#071126] p-3">
    <div aria-hidden="true" className="mb-3 h-[3px] rounded-full" style={{background:'linear-gradient(90deg, '+palette.join(', ')+')'}}/>
    <p className="text-xs font-semibold text-cyan-200">{props.draftPreview?'3D-Entwurfsmodell':props.newsScene?'Interaktives Quellenmodell':'Interaktive Lernsimulation'}</p>
    <p className="mt-1 text-xs leading-5 text-slate-300" aria-live="polite">{model.description}</p>
    {enabled&&<div className="relative mt-3 h-52 overflow-hidden rounded-lg border border-slate-700">
      <canvas ref={canvas} aria-hidden="true" className="block h-full w-full" />
      {!ready&&<p role="status" className="absolute inset-0 grid place-items-center bg-slate-950 px-3 text-center text-sm text-slate-200">{failed?'3D nicht verfügbar. Textmodell bleibt nutzbar.':'3D-Modell wird geladen …'}</p>}
    </div>}
    <ol className="mt-3 grid gap-2">{model.nodes.map((node,i)=><li key={i} className="flex min-w-0 items-start gap-2 rounded-md bg-slate-900 p-2 text-xs"><span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{backgroundColor:palette[i%palette.length]}}/><span className="min-w-0 break-words"><strong className="text-white">{node.label}</strong><span className="block text-slate-300">{node.detail}</span></span></li>)}</ol>
    {model.control&&<label className="mt-3 block text-xs font-semibold text-slate-200">{model.control.label}
      <input type="range" className="block min-h-11 w-full accent-amber-300" min={model.control.min} max={model.control.max} step={model.control.step} value={value??model.control.initial} onChange={e=>setValue(Number(e.target.value))}/>
    </label>}
    <button type="button" aria-expanded={enabled} className="mt-2 min-h-11 w-full rounded-lg border border-cyan-300/50 px-3 text-sm font-semibold text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300" onClick={()=>{setReady(false);setFailed(false);setEnabled(!enabled);}}>{enabled?'3D schließen':'3D-Modell erkunden'}</button>
    {ready&&enabled&&<div className="mt-3 grid gap-2">
      <label className="text-xs text-slate-200">Perspektive drehen ({angle}°)<input type="range" className="block min-h-11 w-full accent-amber-300" min={-180} max={180} step={5} value={angle} onChange={e=>setAngle(Number(e.target.value))}/></label>
      <label className="text-xs text-slate-200">Zoom<input type="range" className="block min-h-11 w-full accent-amber-300" min={.75} max={1.35} step={.05} value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
      <button type="button" className="min-h-11 text-sm text-amber-200 underline" onClick={()=>{setAngle(30);setZoom(1);setValue(undefined);}}>Ansicht zurücksetzen</button>
    </div>}
    {failed&&!enabled&&<p role="status" className="text-xs text-slate-300">3D nicht verfügbar. Das Textmodell bleibt nutzbar.</p>}
  </section>;
}
