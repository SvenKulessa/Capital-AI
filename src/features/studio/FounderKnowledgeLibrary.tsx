import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Download, RefreshCcw, ShieldCheck, Upload } from 'lucide-react';

type Item = { id:string;category:string;version:string;sha256:string;bytes:number };
type Slot = { id:string;category:string };
type Verify = { available:boolean;reason?:string;encrypted?:boolean;writable?:boolean;slots:Slot[] };
const API='/api/private/knowledge/';
const NAMES:Record<string,string>={
  'architecture-glossary':'Architekturglossar',
  'single-maintainer-agent':'Autonome KI · Solo Maintainer',
  'mobile-architecture':'Mobile Architektur · separates Repository',
  'social-blog-playbook':'Blog- und Social-Playbook',
};
const focus='focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200';

/** Private owner experience only. No browser-held service credentials or agent authority. */
export function FounderKnowledgeLibrary(){
 const [verify,setVerify]=useState<Verify|null>(null);
 const [owner,setOwner]=useState(false);
 const [loading,setLoading]=useState(true);
 const [items,setItems]=useState<Item[]>([]);
 const [slot,setSlot]=useState('architecture-glossary');
 const [version,setVersion]=useState('1.0.0');
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{
   try{
    const check=await fetch(API+'verify',{cache:'no-store',credentials:'same-origin'});
    if(check.status===403||check.status===401){setOwner(false);return}
    setOwner(true);
    const data=await check.json() as Verify;
    setVerify(data);
    if(data.available){
      const list=await fetch(API+'inventory',{cache:'no-store',credentials:'same-origin'});
      if(list.ok){
        const results=await list.json() as {items?:Item[]};
        setItems(Array.isArray(results.items)?results.items:[]);
      }else{setNotice('Versionsinventar nicht nachgewiesen.')}
    }
   }catch{setNotice('Privater Wissensspeicher derzeit nicht erreichbar.')}
   finally{setLoading(false)}
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 async function upload(){
  if(!file||!verify?.available||busy||!/^(\d{1,3}\.){2}\d{1,3}$/.test(version))return;
  if(file.size<64||file.size>524288){setNotice('Markdown-Datei muss zwischen 64 Bytes und 512 KiB groß sein.');return}
  setBusy(true);setNotice('');
  try{
    const raw=await file.arrayBuffer();
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),x=>x.toString(16).padStart(2,'0')).join('');
    const r=await fetch(API+'import/'+slot+'/'+version,{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'text/markdown','X-Knowledge-SHA256':hash},body:raw});
    if(!r.ok)throw new Error(r.status===409?'Diese Version ist bereits unveränderlich gespeichert.':'Speichern fehlgeschlagen. Prüfe Disk- und Auth-Status.');
    setNotice('Verschlüsselte Architekturversion gespeichert und mit SHA-256 gebunden.');
    setFile(null);
    await refresh();
  }catch(e){setNotice(e instanceof Error?e.message:'Import fehlgeschlagen.')}
  finally{setBusy(false)}
 }
 if(!owner&&!loading)return null;
 return <section aria-labelledby="private-knowledge-heading" className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5 text-slate-100">
   <div className="flex flex-wrap items-center justify-between gap-3">
     <h3 id="private-knowledge-heading" className="flex items-center gap-2 text-lg font-bold"><BookOpen size={19} aria-hidden="true"/> Founder · Private Architektur- und Content-Bibliothek</h3>
     <button type="button" onClick={()=>void refresh()} className={'flex min-h-11 items-center gap-2 rounded-lg border border-slate-500 px-3 text-sm '+focus}>
       <RefreshCcw size={15} aria-hidden="true"/> Status prüfen
     </button>
   </div>
   {loading?<p role="status" className="mt-2 text-sm text-slate-300">IAM wird verifiziert…</p>:<>
    <p className="mt-2 flex items-center gap-2 text-sm"><ShieldCheck size={17} aria-hidden="true"/>
      {verify?.available?'Verschlüsselter Disk-Speicher beschreibbar':'Schreibzugriff noch nicht verifiziert'}
    </p>
    <p className="mt-1 text-xs text-slate-300">Nur Founder/Owner. Keine Kundenauslieferung, kein automatisches Social-Publishing und kein ungeprüfter KI-Zugriff. Backups bleiben verschlüsselt.</p>
    {!verify?.available&&<p className="mt-2 text-xs text-amber-200">{verify?.reason??'NOT_PROVEN'}</p>}
    {notice&&<p role="status" className="mt-3 text-sm text-amber-200">{notice}</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <label className="flex flex-col gap-2 text-sm">Dokumentklasse
       <select aria-label="Dokumentklasse" value={slot} onChange={e=>setSlot(e.target.value)} className={'min-h-11 rounded-lg border border-slate-500 bg-slate-900 p-2 '+focus}>
        {verify?.slots?.map(x=><option key={x.id} value={x.id}>{NAMES[x.id]??x.category}</option>)}
       </select>
      </label>
      <label className="flex flex-col gap-2 text-sm">Version (SemVer)
       <input value={version} onChange={e=>setVersion(e.target.value)} maxLength={11} autoComplete="off" className={'min-h-11 rounded-lg border border-slate-500 bg-slate-900 p-2 '+focus}/>
      </label>
      <label className="flex flex-col gap-2 text-sm">Markdown-Konzeptdatei
       <input type="file" accept=".md,text/markdown" onChange={e=>setFile(e.target.files?.[0]??null)} className="min-h-11 text-xs file:rounded file:border-0 file:bg-cyan-800 file:p-2 file:text-white"/>
      </label>
    </div>
    <button type="button" onClick={()=>void upload()} disabled={!file||!verify?.available||busy||!/^(\d{1,3}\.){2}\d{1,3}$/.test(version)}
      className={'mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-cyan-500 px-4 text-sm disabled:opacity-50 '+focus}><Upload size={17} aria-hidden="true"/> Version verschlüsselt speichern</button>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {items.map(x=><article key={x.id+'-'+x.version} className="rounded-lg border border-slate-700 p-3">
        <h4 className="font-semibold">{NAMES[x.id]??x.id}</h4>
        <p className="mt-1 break-all text-xs text-slate-400">{x.version} · {x.bytes} Bytes · SHA-256 {x.sha256.slice(0,16)}…</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a className={'flex min-h-11 items-center gap-2 rounded-lg border border-slate-500 px-3 '+focus} href={API+'file/'+x.id+'/'+x.version}><Download size={15} aria-hidden="true"/> Original nur für Owner</a>
          <a className={'flex min-h-11 items-center gap-2 rounded-lg border border-slate-500 px-3 '+focus} href={API+'backup/'+x.id+'/'+x.version}><Download size={15} aria-hidden="true"/> Verschlüsseltes Backup</a>
        </div>
      </article>)}
    </div>
   </>}
 </section>;
}
