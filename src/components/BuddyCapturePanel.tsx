import {useEffect, useRef, useState, type ChangeEvent, type PointerEvent} from 'react';
import {Camera, Check, PenLine, RotateCcw, Upload, X} from 'lucide-react';

export type BuddyPrivateImage = {id:string; name:string; blob:Blob; previewUrl:string};
type Props={onAttach:(image:BuddyPrivateImage)=>void;onClose:()=>void};
const MAX_BYTES=4*1024*1024;
const ACCEPTED=new Set(['image/png','image/jpeg','image/webp']);

/** Client-only capture: browser permission for screen-share; no network or storage writes. */
export function BuddyCapturePanel({onAttach,onClose}:Props){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const sourceUrl=useRef<string|null>(null);
  const drawing=useRef(false);
  const [source,setSource]=useState<string|null>(null);
  const [inking,setInking]=useState(false);
  const [resetSerial,setResetSerial]=useState(0);
  const [message,setMessage]=useState('Bildausschnitt im Browser freigeben oder eigenes Bild auswählen.');
  const [busy,setBusy]=useState(false);
  useEffect(()=>()=>{if(sourceUrl.current)URL.revokeObjectURL(sourceUrl.current);},[]);
  useEffect(()=>{
    if(!source)return;
    const image=new Image();
    image.onload=()=>{
      const canvas=canvasRef.current;
      if(!canvas)return;
      const scale=Math.min(1,1200/image.naturalWidth,1200/image.naturalHeight);
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
      canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const ctx=canvas.getContext('2d');
      ctx?.drawImage(image,0,0,canvas.width,canvas.height);
    };
    image.onerror=()=>setMessage('Das Bild konnte nicht dargestellt werden.');
    image.src=source;
  },[source,resetSerial]);
  const accept=(blob:Blob)=>{
    if(!ACCEPTED.has(blob.type)||blob.size>MAX_BYTES||blob.size<1){
      setMessage('Nur PNG, JPG oder WebP bis 4 MB sind erlaubt.');return;
    }
    if(sourceUrl.current)URL.revokeObjectURL(sourceUrl.current);
    const url=URL.createObjectURL(blob);sourceUrl.current=url;setSource(url);setInking(false);
    setMessage('Bild lokal geladen. Mit dem Stift wichtige Bereiche markieren.');
  };
  const choose=(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.currentTarget.files?.[0];if(file)accept(file);
    event.currentTarget.value='';
  };
  const screen=async()=>{
    if(busy)return;
    if(!navigator.mediaDevices?.getDisplayMedia){setMessage('Dieser Browser unterstützt keine Bildschirmaufnahme. Bitte ein Bild hochladen.');return;}
    setBusy(true);
    let stream:MediaStream|null=null;
    try{
      stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
      const video=document.createElement('video');
      video.muted=true;video.playsInline=true;video.srcObject=stream;
      await new Promise<void>((resolve,reject)=>{
        video.onloadedmetadata=()=>resolve();
        video.onerror=()=>reject(new Error('DISPLAY_MEDIA'));
        setTimeout(()=>reject(new Error('DISPLAY_TIMEOUT')),8000);
      });
      await video.play();
      if(video.videoWidth<1||video.videoHeight<1)throw new Error('DISPLAY_EMPTY');
      const canvas=document.createElement('canvas');
      const scale=Math.min(1,1200/video.videoWidth,1200/video.videoHeight);
      canvas.width=Math.round(video.videoWidth*scale);
      canvas.height=Math.round(video.videoHeight*scale);
      canvas.getContext('2d')?.drawImage(video,0,0,canvas.width,canvas.height);
      const png=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!png)throw new Error('CAPTURE_FAILED');
      accept(png);
    }catch{
      setMessage('Aufnahme abgebrochen oder nicht verfügbar. Kein Bild übertragen. Alternativ Bild hochladen.');
    }finally{
      stream?.getTracks().forEach(track=>track.stop());
      setBusy(false);
    }
  };
  const point=(event:PointerEvent<HTMLCanvasElement>)=>{
    const canvas=event.currentTarget;const rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
  };
  const start=(event:PointerEvent<HTMLCanvasElement>)=>{
    if(!inking)return;
    drawing.current=true;event.currentTarget.setPointerCapture(event.pointerId);
    const p=point(event),ctx=event.currentTarget.getContext('2d');
    if(!ctx)return;
    ctx.strokeStyle='#F87171';ctx.lineWidth=Math.max(3,event.currentTarget.width/250);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.02,p.y+.02);ctx.stroke();
  };
  const move=(event:PointerEvent<HTMLCanvasElement>)=>{
    if(!drawing.current||!inking)return;
    const ctx=event.currentTarget.getContext('2d'),p=point(event);
    ctx?.lineTo(p.x,p.y);ctx?.stroke();
  };
  const end=(event:PointerEvent<HTMLCanvasElement>)=>{
    drawing.current=false;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const attach=()=>{
    const canvas=canvasRef.current;if(!canvas||!source)return;
    canvas.toBlob(blob=>{
      if(!blob||blob.size>MAX_BYTES){setMessage('Bild zu groß. Bitte einen kleineren Ausschnitt verwenden.');return;}
      const name='jaja-markierung-'+Date.now()+'.png';
      onAttach({id:crypto.randomUUID(),name,blob,previewUrl:URL.createObjectURL(blob)});
      onClose();
    },'image/png');
  };
  return <section aria-label="JaJa Screenshot und Markierung" className="space-y-2 rounded-xl border border-cyan-400/40 bg-slate-950 p-3">
    <div className="flex items-center justify-between"><h3 className="font-bold text-cyan-100">JaJa CAM · Markierung</h3>
      <button type="button" onClick={onClose} aria-label="Bildwerkzeug schließen" className="min-h-11 rounded p-2"><X className="h-4 w-4"/></button>
    </div>
    <p className="text-xs text-slate-300">Aufnahmen bleiben lokal im aktuellen Browser-Entwurf. Kein automatischer Upload zu Notion oder CAPITAL-AI.</p>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={()=>void screen()} disabled={busy} className="flex min-h-11 items-center gap-2 rounded bg-cyan-900 px-3 text-white disabled:opacity-50"><Camera className="h-4 w-4"/> Screenshot</button>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded border border-slate-500 px-3 py-2 text-white"><Upload className="h-4 w-4"/> Bild wählen
        <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={choose} />
      </label>
      {source&&<button type="button" aria-pressed={inking} onClick={()=>setInking(v=>!v)} className="flex min-h-11 items-center gap-2 rounded border border-rose-300 px-3"><PenLine className="h-4 w-4"/> Stift {inking?'an':'aus'}</button>}
      {source&&<button type="button" onClick={()=>setResetSerial(v=>v+1)} className="flex min-h-11 items-center gap-2 rounded border border-slate-500 px-3"><RotateCcw className="h-4 w-4"/> Zurücksetzen</button>}
    </div>
    {source&&<canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      className={`max-h-64 max-w-full rounded border border-white/20 object-contain ${inking?'touch-none cursor-crosshair':''}`} aria-label="Screenshot mit Markierungen" />}
    <p role="status" className="text-xs text-slate-300">{message}</p>
    {source&&<button type="button" onClick={attach} className="flex min-h-11 items-center gap-2 rounded bg-emerald-700 px-3 font-bold text-white"><Check className="h-4 w-4"/> Bild zum Prompt-Entwurf hinzufügen</button>}
  </section>;
}
