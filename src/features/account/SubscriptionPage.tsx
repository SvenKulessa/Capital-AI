import { useState } from 'react';
import { Mail, ExternalLink } from 'lucide-react';
import { AccountPageShell } from './AccountPageShell';
import { ProductDisclaimer } from '../../components/ProductDisclaimer';
export function SubscriptionPage({onNavigate}: {onNavigate:(path:string)=>void}) {
 const [busy,setBusy] = useState(false); const [error,setError] = useState('');
 async function portal() {
  setBusy(true); setError('');
  try {
   const response = await fetch('/api/billing/subscriptions/portal',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
   const body = await response.json();
   if (!response.ok) throw new Error(body.error === 'no_subscription' ? 'Für dieses Konto ist kein verwaltbares Abo hinterlegt. Wähle einen Tarif oder kontaktiere uns.' : 'Die Abo-Verwaltung ist momentan nicht verfügbar. Bitte erneut versuchen oder Kontakt aufnehmen.');
   const url = new URL(body.url); if (url.protocol !== 'https:' || url.hostname !== 'billing.stripe.com') throw new Error('Ungültiges Ziel der Abo-Verwaltung.');
   window.location.assign(url.href);
  } catch(e) { setError(e instanceof Error ? e.message : 'Abo-Verwaltung nicht verfügbar.'); setBusy(false); }
 }
 return <AccountPageShell active="/profile/subscription" title="Abo verwalten" description="Laufzeit, Verlängerung, Kündigung und Tarifwechsel." onNavigate={onNavigate}>{session=><section className="rounded-2xl border border-white/10 bg-slate-950 p-5">
 <h2 className="text-xl font-bold">{session.account?.iamRole === 'owner' ? 'Owner' : session.account?.subscription?.tier || 'Kein Tarif'}</h2>
 <p className="mt-3 text-sm text-slate-300">Im Kundenportal kannst du dein Abo kündigen, eine geplante Kündigung zurücknehmen und verfügbare Tarifwechsel verwalten. Eine Verlängerung folgt der vereinbarten Laufzeit.</p>
 <div className="mt-4 flex flex-wrap gap-3"><button onClick={()=>void portal()} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-4 text-black disabled:opacity-50"><ExternalLink className="h-4 w-4"/>{busy ? 'Wird geöffnet …' : 'Abo im Kundenportal verwalten'}</button><a href="/pricing" className="rounded-xl border border-slate-500 px-4 py-3">Tarife ansehen</a></div>
 {error && <p role="alert" className="mt-4 text-rose-200">{error}</p>}
 <a href="/kontakt" className="mt-6 inline-flex min-h-11 items-center gap-2 text-cyan-200 underline"><Mail aria-hidden="true" className="h-5 w-5"/>Kontakt aufnehmen</a>
 <ProductDisclaimer kind="commerce"/>
 </section>}</AccountPageShell>;
}
