import React from 'react';
import { Database, X } from 'lucide-react';

export function DataUnavailable({ title, required, id, onClose }: { title: string; required: string; id?: string; onClose?: () => void }) {
  return <section id={id} className="px-3 sm:px-5 py-6" aria-label={title}>
    <div className="rounded-3xl bg-[#091129]/95 border border-slate-800 p-5 sm:p-6 text-slate-100">
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-xl flex gap-2 items-center"><Database className="text-amber-400" />{title}</h2>
        {onClose && <button onClick={onClose} aria-label="Schließen"><X /></button>}</div>
      <p role="status" className="mt-4 text-amber-300">Daten nicht verfügbar</p>
      <p className="mt-2 text-sm text-slate-400">Benötigte Daten: {required}.</p>
      <p className="mt-2 text-sm text-slate-400">Auswertung und Alerts bleiben gesperrt, bis Quelle, Pflichtdaten und Evidence validiert sind.</p>
    </div>
  </section>;
}
export function UnavailableModal({ title, required, onClose }: { title: string; required: string; onClose: () => void }) {
  React.useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [onClose]);
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-2xl"><DataUnavailable title={title} required={required} onClose={onClose} /></div></div>;
}
