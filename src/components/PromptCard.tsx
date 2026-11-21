import { Check, Copy, AlertCircle } from 'lucide-react';
import { useRef, useState } from 'react';

export type PromptCardProps = {
  id: string;
  title: string;
  prompt: string;
  badges?: string[];
  compact?: boolean;
};

export function PromptCard({ id, title, prompt, badges = [], compact = false }: PromptCardProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'fallback'>('idle');
  const sequence = useRef(0);
  async function copy() {
    const current = ++sequence.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(prompt);
      if (sequence.current === current) setState('copied');
    } catch {
      if (sequence.current === current) setState('fallback');
    }
  }
  return (
    <article data-prompt-card={id} className="min-w-0 rounded-xl border border-violet-400/30 bg-slate-900/85 p-3 text-slate-100">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          {!!badges.length && <ul aria-label="Domain und Skills" className="mt-2 flex flex-wrap gap-1.5">{badges.map(badge => <li key={badge} className="rounded-full border border-blue-300/30 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-100">{badge}</li>)}</ul>}
        </div>
        <button type="button" onClick={() => { void copy(); }} aria-label={`${title}: Prompt kopieren`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-violet-300/50 bg-violet-500/15 px-3 text-xs font-semibold text-violet-100 hover:bg-violet-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300">
          {state === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {state === 'copied' ? 'Kopiert' : 'Prompt kopieren'}
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{state === 'copied' ? 'Prompt erfolgreich kopiert' : state === 'fallback' ? 'Automatisches Kopieren nicht verfügbar' : ''}</p>
      {state === 'fallback' && <div className="mt-3 rounded-lg border border-amber-400/40 p-2"><p className="flex items-center gap-1 text-xs text-amber-200"><AlertCircle className="h-4 w-4" aria-hidden="true" />Text markieren und manuell kopieren.</p><textarea readOnly value={prompt} rows={compact ? 3 : 5} onFocus={event => event.currentTarget.select()} aria-label="Vollständigen Prompt manuell kopieren" className="mt-2 w-full min-w-0 resize-y rounded-lg border border-slate-600 bg-slate-950 p-2 text-xs text-slate-100" /></div>}
    </article>
  );
}
