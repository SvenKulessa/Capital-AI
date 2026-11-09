import React, { useState } from 'react';
import { INSTAGRAM_PILOT_CAPTION, INSTAGRAM_PILOT_SLIDES,
  INSTAGRAM_PILOT_PACKAGE, INSTAGRAM_PILOT_STATUS } from '../../data/instagramLearningPilot.ts';

async function downloadPng(path: string, filename: string): Promise<void> {
  if (!INSTAGRAM_PILOT_SLIDES.some(slide => slide.path === path)) throw Error('UNKNOWN_DRAFT_ASSET');
  const img = new Image();
  img.src = path;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('CANVAS_UNAVAILABLE');
  ctx.fillStyle = '#090f21'; ctx.fillRect(0, 0, 1080, 1350);
  ctx.drawImage(img, 0, 0, 1080, 1350);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(data => data ? resolve(data) : reject(Error('PNG_EXPORT_FAILED')), 'image/png'));
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url; link.download = filename+'.png';
    document.body.append(link); link.click(); link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export function InstagramLearningPilot(): React.ReactElement {
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function download(path: string, filename: string) {
    setActive(path); setError('');
    try { await downloadPng(path, filename); }
    catch { setError('PNG-Export fehlgeschlagen. Die Bildvorschau ist weiterhin verfuegbar.'); }
    finally { setActive(null); }
  }
  return <section aria-labelledby="studio-instagram-pilot" className="rounded-2xl border border-cyan-400/30 bg-[#0b1424] p-4 text-white sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="studio-instagram-pilot" className="text-lg font-bold text-cyan-100">Instagram · ETF-Kosten verstehen</h2>
      <span className="rounded border border-amber-400/40 p-2 text-xs text-amber-200">
        {INSTAGRAM_PILOT_STATUS.status} · {INSTAGRAM_PILOT_STATUS.review}
      </span>
    </div>
    <p className="mt-2 text-sm text-slate-300">
      Drei originale 4:5-Lernkarten mit synthetischen Zahlen. PNG-Export erfolgt lokal im Browser,
      ohne Anbieteraufruf oder automatische Veroeffentlichung.
    </p>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {INSTAGRAM_PILOT_SLIDES.map((slide, i) => <figure key={slide.id} className="rounded-xl border border-white/10 bg-slate-950 p-3">
        <img src={slide.path} alt={slide.alt} width={1080} height={1350} loading="lazy"
          className="aspect-[4/5] w-full rounded-lg object-contain"/>
        <figcaption className="mt-2 text-xs font-semibold">{i+1}. {slide.title}</figcaption>
        <button type="button" disabled={active !== null}
          onClick={() => { void download(slide.path, slide.id); }}
          className="mt-3 min-h-11 w-full rounded border border-cyan-400/40 p-3 text-sm font-semibold text-cyan-100 disabled:opacity-50">
          {active === slide.path ? 'Export...' : 'PNG herunterladen'}
        </button>
      </figure>)}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}
    <label htmlFor="studio-instagram-caption" className="mt-5 block text-sm font-semibold">Caption-Entwurf</label>
    <textarea id="studio-instagram-caption" readOnly rows={10} value={INSTAGRAM_PILOT_CAPTION}
      className="mt-2 w-full rounded border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
    <p className="mt-3 text-xs text-slate-300">
      Die SVG-Originale sind im Social-Package hashgebunden.
      Freigaben: {INSTAGRAM_PILOT_PACKAGE.approvals.length}. PNG-Exporte sind neue Bytes
      und benoetigen vor einer Veroeffentlichung eine eigene Hash- und Rechtepruefung.
      Redaktion, Accessibility und Provider-Readback: NOT_PROVEN.
    </p>
    <a href="/learning" className="mt-3 inline-flex min-h-11 items-center rounded border border-cyan-400/40 p-3 text-sm text-cyan-100">
      Learning Hub ansehen
    </a>
  </section>;
}
