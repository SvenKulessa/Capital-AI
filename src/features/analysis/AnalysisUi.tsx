import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { DATA_LABELS } from './analysisPresentation';
import type { DataProvenanceMode } from '../../contracts/analysisComponentRegistry';
export const panelClass =
  'rounded-2xl border border-slate-700 bg-[#090e21] p-4 sm:p-6';
export const inputClass =
  'min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400';
export const buttonClass =
  'min-h-11 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-amber-400 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-50';
export function DataStatusBadge({ mode }: { mode: DataProvenanceMode }) {
  const color =
    mode === 'live'
      ? 'border-emerald-400/50 text-emerald-200'
      : mode === 'simulated'
        ? 'border-purple-400/50 text-purple-200'
        : 'border-amber-400/40 text-amber-200';
  return (
    <span
      className={`inline-flex rounded border px-2 py-1 text-[11px] font-mono ${color}`}
    >
      {DATA_LABELS[mode]}
    </span>
  );
}
export function EmptyMetric({
  label,
  required,
}: {
  label: string;
  required: string;
}) {
  return (
    <div className="border-l-2 border-slate-600 pl-3 py-2">
      <h4 className="text-sm text-slate-100">{label}</h4>
      <p className="mt-1 font-mono text-lg text-slate-400">—</p>
      <p className="text-xs text-slate-400">{required}</p>
    </div>
  );
}
/** Native modal dialog provides focus containment, Escape handling and inert background. */
export function AnalysisDialog({
  open,
  onClose,
  title,
  children,
}: React.PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const prior = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      prior?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-slate-600 bg-[#070b19] p-0 text-slate-100 backdrop:bg-black/80"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-700 bg-[#090e21] p-4">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          className={buttonClass}
          onClick={onClose}
          aria-label="Schließen"
        >
          <X size={20} />
        </button>
      </div>
      <div className="space-y-5 p-4 sm:p-6">{children}</div>
    </dialog>
  );
}
