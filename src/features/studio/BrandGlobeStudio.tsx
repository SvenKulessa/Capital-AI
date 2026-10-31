import React, { useRef, useState } from 'react';
import { BrandGlobe, type BrandGlobeHandle } from '../../components/BrandGlobe';

/** Local frame export through the same renderer as the homepage background. */
export function BrandGlobeStudio() {
  const globe = useRef<BrandGlobeHandle>(null);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState('');
  const capture = async () => {
    try {
      if (!globe.current) return;
      const blob = await globe.current.capturePNG();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'capital-ai-brand-globe.png';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('PNG-Entwurf exportiert.');
    } catch {
      setStatus('3D-Export ist hier nicht verfügbar. Verwende das Originalbild.');
    }
  };
  return <section aria-labelledby="brand-globe-studio" className="rounded-2xl border border-brand-gold/30 bg-brand-canvas p-5">
    <h2 id="brand-globe-studio" className="text-lg font-bold text-brand-gold">3D-Markenstudio · Hero-Globus</h2>
    <p className="mt-2 text-base text-slate-200">Derselbe animierte Globus wie auf der Startseite. Pausiere die Vorschau und exportiere ein Motiv für deinen nächsten Beitrag.</p>
    <div className="mx-auto aspect-square w-full max-w-lg"><BrandGlobe ref={globe} paused={paused} /></div>
    <div className="flex flex-wrap gap-3">
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)} className="min-h-11 rounded-xl border border-brand-gold px-4 text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-4">{paused ? 'Fortsetzen' : 'Pausieren'}</button>
      <button type="button" onClick={capture} className="min-h-11 rounded-xl bg-brand-gold px-4 font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-4">PNG exportieren</button>
      <a href="/branding/universe/hero-universe-globe.webp" download className="inline-flex min-h-11 items-center rounded-xl border border-slate-400 px-4 text-white focus-visible:outline-2 focus-visible:outline-offset-4">Originalbild herunterladen</a>
    </div>
    <p role="status" className="mt-3 text-sm text-slate-200">{status}</p>
  </section>;
}
