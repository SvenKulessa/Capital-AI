import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, AlertCircle } from 'lucide-react';
import { buildChatFollowUps, serializeChatFollowUp, CHAT_BRAND, type ChatDomain } from '../contracts/chatNextStepPrompts';

/** Shared, responsive copy-only follow-up controls. No silent send or tool invocation. */
export function ChatNextStepActions({
  task, domain, compact = false,
}: { task: string; domain?: ChatDomain; compact?: boolean }): React.ReactElement | null {
  const followUps = useMemo(() => buildChatFollowUps(task, domain), [task, domain]);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState<string | null>(null);
  // An older clipboard promise must never confirm a different task or newer click.
  const currentTask = useRef({ task, domain });
  currentTask.current = { task, domain };
  const copySequence = useRef(0);
  useEffect(() => {
    copySequence.current += 1;
    setCopied(null);
    setCopyFailed(null);
  }, [task, domain]);

  async function copyPrompt(id: string, prompt: string): Promise<void> {
    const sequence = ++copySequence.current;
    const selection = { task, domain };
    const stillCurrent = () => copySequence.current === sequence &&
      currentTask.current.task === selection.task && currentTask.current.domain === selection.domain;
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('CLIPBOARD_UNAVAILABLE');
      }
      await navigator.clipboard.writeText(prompt);
      if (!stillCurrent()) return;
      setCopied(id);
      setCopyFailed(null);
    } catch {
      if (!stillCurrent()) return;
      setCopied(null);
      setCopyFailed(id);
    }
  }

  if (!followUps.length) return null;
  const fallback = followUps.find(item => item.id === copyFailed || item.id + ':json' === copyFailed);
  const fallbackText = fallback && copyFailed?.endsWith(':json') ? serializeChatFollowUp(fallback) : fallback?.prompt;
  return (
    <section data-brand-profile={followUps[0].brand.profileId} aria-label="Kopierbare nächste Schritte" className="mt-3 min-w-0 rounded-xl border border-cyan-400/25 bg-slate-950/85 p-2 text-slate-100 sm:p-3">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 140 3" className="mb-2 h-1 w-full" preserveAspectRatio="none">
        {CHAT_BRAND.signature.map((family, i) => <rect key={family} x={i * 20} y="0" width="19" height="3" fill={CHAT_BRAND.palette[family as keyof typeof CHAT_BRAND.palette]} />)}
      </svg>
      <h4 className="mb-1 text-xs font-semibold text-cyan-200">Nächste Schritte · Prompts kopieren</h4>
      <p className="mb-2 text-[11px] leading-snug text-slate-400">
        Multi-Agent-Rat und LangGraph · passende Repository-Skills · keine automatische Ausführung
      </p>
      <ol className="space-y-1.5">
        {followUps.map((item, index) => (
          <li key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-900/80 px-2 py-1.5">
            <span className="min-w-0 flex-1 text-[11px] leading-snug text-slate-100">
              <span className="block text-slate-300" data-agent-role={item.brand.role}>
                <svg aria-hidden="true" focusable="false" viewBox="0 0 10 10" className="mr-1 inline h-2.5 w-2.5"><circle cx="5" cy="5" r="4" fill={item.brand.accent}/></svg>
                {item.brand.role}
              </span>
              {index + 1}. {item.label}
            </span>
            <button
              type="button"
              aria-label={item.label + ': Prompt kopieren'}
              onClick={() => { void copyPrompt(item.id, item.prompt); }}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-3 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              {copied === item.id ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
              {copied === item.id ? 'Kopiert' : 'Prompt kopieren'}
            </button>
          </li>
        ))}
      </ol>
      <details className="mt-2 text-xs text-slate-200">
        <summary className="min-h-11 cursor-pointer py-2 focus-visible:outline focus-visible:outline-2">Maschinenlesbare Prompts (JSON)</summary>
        <p className="mb-1 text-slate-300">Nur kopieren; keine Ausführung oder Rechteübertragung.</p>
        {followUps.map(item => <button key={item.id} type="button" aria-label={item.label + ': JSON kopieren'} onClick={() => { void copyPrompt(item.id + ':json', serializeChatFollowUp(item)); }} className="mr-1 mb-1 min-h-11 rounded-lg border border-slate-500 px-2 focus-visible:outline focus-visible:outline-2">{copied === item.id + ':json' ? 'Kopiert' : item.label + ' · JSON'}</button>)}
      </details>
      <p className="sr-only" role="status" aria-live="polite">
        {copied ? 'Prompt erfolgreich kopiert' : copyFailed ? 'Automatisches Kopieren nicht verfügbar' : ''}
      </p>
      {fallback && (
        <div className="mt-2 rounded-lg border border-amber-400/40 p-2" role="group" aria-label="Manuell kopierbarer Prompt">
          <p className="flex items-center gap-1 text-[11px] text-amber-200">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Zwischenablage nicht verfügbar. Text markieren und manuell kopieren.
          </p>
          <textarea
            readOnly
            value={fallbackText}
            onFocus={event => event.currentTarget.select()}
            aria-label="Vollständigen Prompt manuell kopieren"
            rows={compact ? 3 : 4}
            className="mt-1 w-full min-w-0 resize-y rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100"
          />
        </div>
      )}
    </section>
  );
}
