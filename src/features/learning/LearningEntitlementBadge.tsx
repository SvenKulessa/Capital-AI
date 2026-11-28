import React from 'react';

/**
 * Display only after the authenticated learning access RPC verifies entitlement.
 * Never infer a purchase from localStorage or a checkout URL.
 */
export function LearningEntitlementBadge() {
  const [entitled, setEntitled] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/billing/vocabulary/access', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return;
      const access = await response.json();
      if (!controller.signal.aborted) setEntitled(access?.quantProEntitled === true);
    }).catch(() => {
      // Fail closed: no verified entitlement, no badge.
    });
    return () => controller.abort();
  }, []);

  if (!entitled) return null;
  return <AccountProductBadge label="Learning Hub Paket" asset="/branding/badges/vocabulary.svg" description="Bestätigter Lernzugang. Der konkrete Leistungsumfang folgt den hinterlegten Produktrechten." verifiedLearning />;
}

export function AccountProductBadge({ label, asset, description, verifiedLearning = false }: {label:string;asset:string;description:string;verifiedLearning?:boolean}) {
  const [open,setOpen]=React.useState(false);
  const [hover,setHover]=React.useState(false);
  const id=React.useId();
  const visible=open||hover;
  return <figure data-learning-entitlement-badge={verifiedLearning?'verified':undefined} className="relative mt-4 w-full max-w-sm rounded-2xl border border-amber-400/30 bg-slate-950/80" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
    <button type="button" aria-expanded={visible} aria-controls={id} onClick={()=>{setOpen(value=>!value);setHover(false)}} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);setHover(false);}}} className="flex min-h-11 w-full items-center gap-3 rounded-2xl p-3 text-left focus-visible:outline-2 focus-visible:outline-amber-300">
      <img src={asset} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl object-contain" />
      <span className="min-w-0 flex-1 text-xs font-bold text-slate-100">{label}</span>
      <span aria-hidden="true" className="text-amber-200">ⓘ</span>
    </button>
    <figcaption id={id} hidden={!visible} className="mx-3 mb-3 rounded-xl border border-cyan-300/30 bg-slate-900 p-3 text-xs leading-5 text-slate-200">{description} <a href="/profile/rights" className="underline text-cyan-200">Meine Rechte ansehen</a></figcaption>
  </figure>;
}
