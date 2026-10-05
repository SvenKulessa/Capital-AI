import { useEffect, useState } from 'react';
import { BrandLogo } from '../../components/BrandLogo';

export function RouteLoadingFallback() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!timedOut) {
    return (
      <div role="status" className="p-8 text-center text-sm text-slate-400">
        Ansicht wird geladen…
      </div>
    );
  }

  return (
    <div role="alert" className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <BrandLogo variant="stacked" size="lg" showSubtitle={false} />
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
        <h2 className="text-lg font-black text-white">Seite konnte nicht vollständig aufgebaut werden</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Der Seitenaufbau dauert länger als 10 Sekunden. Bitte lade die Seite erneut.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 min-h-11 rounded-xl bg-amber-400 px-4 text-xs font-black text-black"
        >
          Seite neu laden
        </button>
      </div>
    </div>
  );
}
