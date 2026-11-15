import { useEffect, useId, useRef, useState } from 'react';
import type { NotesConflict } from './privateNotesOcc';

/** Inline WCAG-friendly conflict review. An explicit merge is the only resubmit path. */
export function NotesConflictPanel({
  conflict, onUseServer, onMerge, busy = false,
}: {
  conflict: NotesConflict;
  onUseServer: () => void;
  onMerge: (text: string) => void;
  busy?: boolean;
}) {
  const [merged, setMerged] = useState(conflict.localDraft);
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { setMerged(conflict.localDraft); heading.current?.focus(); }, [conflict]);
  return (
    <section aria-labelledby={id + "-title"}
      className="mt-3 space-y-3 rounded-xl border border-amber-400/70 bg-slate-900 p-3 text-white">
      <h3 id={id + "-title"} ref={heading} tabIndex={-1}
        className="text-base font-bold text-amber-200">Notizkonflikt erkannt</h3>
      <p role="alert" className="text-sm">
        Diese Notizen wurden in einem anderen Tab geändert. Dein Entwurf bleibt erhalten.
        Entscheide, welche Fassung du behalten möchtest.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <h4 className="mb-1 font-semibold">Dein Entwurf</h4>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded border border-slate-600 p-2 text-sm">{conflict.localDraft}</pre>
        </div>
        <div>
          <h4 className="mb-1 font-semibold">Aktuelle Serverfassung</h4>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded border border-slate-600 p-2 text-sm">{conflict.serverNotes}</pre>
        </div>
      </div>
      <label htmlFor={id + "-merge"} className="block font-semibold">
        Manuell zusammengeführte Notizen (maximal 10.000 Zeichen)
      </label>
      <textarea id={id + "-merge"} rows={5} maxLength={10000} disabled={busy}
        value={merged} onChange={event => setMerged(event.target.value)}
        className="w-full rounded border border-slate-500 bg-slate-950 p-3 text-base text-white focus-visible:outline-2 focus-visible:outline-amber-300" />
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onUseServer} disabled={busy}
          className="min-h-11 rounded border border-slate-400 px-3 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-amber-300">
          Serverfassung übernehmen
        </button>
        <button type="button" onClick={() => onMerge(merged)} disabled={busy || merged.length > 10000}
          className="min-h-11 rounded bg-amber-400 px-3 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-white">
          Zusammenführung speichern
        </button>
      </div>
      <p className="text-xs text-slate-300">
        Es wird nichts automatisch überschrieben. Bei einer weiteren Serveränderung erscheint erneut ein Konflikt.
      </p>
    </section>
  );
}
