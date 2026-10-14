import { useEffect, useState } from 'react';
import { BrandLogo } from '../../components/BrandLogo';
type Grant={authorized:true;role:'owner'|'invited_partner';sections:('sponsoring'|'investor-relations')[]};
type Status='loading'|'allowed'|'denied'|'error';
/** No Founder content from browser identity claims. Only the private API grants access. */
export function FounderRelationsPage(){
 const [grant,setGrant]=useState<Grant|null>(null);
 const [status,setStatus]=useState<Status>('loading');
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/private/founder/access',{credentials:'same-origin',cache:'no-store',
   headers:{Accept:'application/json'},signal:controller.signal})
  .then(async r=>{
   if(r.status===401||r.status===403){setStatus('denied');return}
   if(!r.ok)throw new Error('UNAVAILABLE');
   const value:unknown=await r.json();
   if(!value||typeof value!=='object'||!('authorized' in value)||value.authorized!==true||
     !('sections' in value)||!Array.isArray(value.sections)||!value.sections.length||
     value.sections.some(x=>x!=='sponsoring'&&x!=='investor-relations'))throw new Error('BAD_ACCESS');
   setGrant(value as Grant);setStatus('allowed');
  }).catch(()=>{if(!controller.signal.aborted)setStatus('error')});
  return ()=>controller.abort();
 },[]);
 return <main className="min-h-screen bg-[#02050e] px-4 py-8 text-slate-100">
  <section className="mx-auto max-w-3xl rounded-2xl border border-amber-400/30 bg-slate-900/80 p-5 sm:p-8">
   <BrandLogo variant="stacked" size="md" showSubtitle={false}/>
   <p className="mt-4 text-xs font-bold uppercase tracking-widest text-amber-300">Privater Founder-Zugang</p>
   <h1 className="mt-2 text-2xl font-bold">Sponsoring & Investor Relations</h1>
   <p className="mt-2 text-sm text-slate-300">Google-/X-Login und Founder-Berechtigung sind getrennt. Nur verifizierte eingeladene Partner oder der bestehende IAM-Owner erhalten Zugriff.</p>
   {status==='loading'&&<p role="status" className="mt-5">Founder-Berechtigung wird serverseitig geprüft …</p>}
   {status==='denied'&&<div role="status" className="mt-5 space-y-3">
    <p>Kein Founder-Zugriff nachgewiesen. Melde dich mit dem eingeladenen Account an oder stelle eine vertrauliche Anfrage.</p>
    <div className="flex flex-wrap gap-3">
     <a className="rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950" href="/login?next=%2Ffounder">Anmelden</a>
     <a className="rounded-lg border border-slate-500 px-4 py-3" href="/studio?tab=kontakt">Private Anfrage</a>
    </div>
   </div>}
   {status==='error'&&<p role="alert" className="mt-5 text-amber-200">Berechtigungsstatus nicht prüfbar. Keine privaten Informationen wurden freigegeben.</p>}
   {status==='allowed'&&grant&&<div className="mt-6 space-y-4">
    <p role="status" className="text-emerald-200">Zugriff bestätigt ({grant.role==='owner'?'Owner':'eingeladener Partner'}).</p>
    {grant.sections.includes('sponsoring')&&<section className="rounded-xl border border-slate-700 p-4">
     <h2 className="font-semibold">Sponsoring</h2>
     <p className="mt-1 text-sm text-slate-300">Vertrauliche Abstimmung zu Sponsoring und strategischen Kooperationen. Konkrete Unterlagen und Konditionen werden erst nach individueller Rechteprüfung bereitgestellt.</p>
    </section>}
    {grant.sections.includes('investor-relations')&&<section className="rounded-xl border border-slate-700 p-4">
     <h2 className="font-semibold">Investor Relations</h2>
     <p className="mt-1 text-sm text-slate-300">Vertraulicher Kommunikationsbereich, keine öffentliche Investitionsofferte, kein Wertpapierverkauf oder Renditeversprechen.</p>
    </section>}
    <p className="text-xs text-slate-400">Private Investment-Dokumente sind noch nicht freigegeben. Der Zugang ist keine Vertrags- oder Kapitalanlagezusage.</p>
    <a className="inline-flex min-h-11 items-center rounded-lg border border-amber-400/40 px-4 py-2 text-amber-200" href="/studio?tab=kontakt">Vertraulichen Kontakt aufnehmen</a>
   </div>}
  </section>
 </main>;
}
