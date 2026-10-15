import { lazy, Suspense, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { EyeOff, Move, Settings, X, StickyNote } from 'lucide-react';
import { clampHeroBuddyPoint } from './heroBuddyPosition';
import { PRICE_ALERTS_ENABLED } from '../features/alerts/featureFlags';
import { BuddyStickyNotes } from './BuddyStickyNotes';

// ... (existing types and constants preserved)

export function HeroBuddy(props: HeroBuddyProps) {
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  // ... (existing state preserved)

  const actions = useMemo(() => [
    { label: 'Tarife', run: () => props.onOpenMonetization?.() },
    { label: 'Vocabulary', run: () => props.onOpenVocabulary?.() },
    { label: 'Analyse', run: () => props.onOpenAnalysis?.() },
    { label: 'Whale Radar', run: () => props.onOpenWhaleRadar?.() },
    ...(PRICE_ALERTS_ENABLED ? [{ label: 'Alerts', run: () => props.onOpenAlerts?.() }] : []),
    { label: 'Login', run: () => props.onNavigate?.('/login') },
    { label: 'Notiz', run: () => setNotesOpen(true) },
  ], [props]);

  // ... (existing logic preserved)

  return (
    <div ref={floatingRoot} className={`fixed ${floatingXY ? '' : positionClass} z-[45] flex flex-col-reverse items-end gap-2 sm:flex-row`}
      style={floatingXY ? { left: floatingXY.x, top: floatingXY.y } : undefined} data-hero-buddy="agent">
      {(speech || open) && (
        <div id={chatPanelId} role={open ? 'dialog' : 'status'} aria-label={open ? 'JaJa Chat Buddy' : 'JaJa Hilfe'} className="relative max-h-[min(55dvh,480px)] w-[min(88vw,320px)] overflow-y-auto rounded-2xl border border-amber-300/40 bg-[#10182e] px-3 py-2 text-xs text-slate-100 shadow-lg sm:max-h-[min(70dvh,560px)]">
          {/* existing header */}
          {notesOpen ? (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-amber-300">Private Notizen</p>
                <button type="button" onClick={() => setNotesOpen(false)} aria-label="Notizen schließen" className="rounded-md p-1 text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <BuddyStickyNotes />
            </div>
          ) : (
            <>
              {/* existing chat content */}
              <div className="mt-2 flex flex-wrap gap-1">
                {actions.map((action) => (
                  <button key={action.label} type="button" onClick={action.run} className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300">
                    {action.label === 'Notiz' && <StickyNote className="inline h-3 w-3 mr-1" />}
                    {action.label}
                  </button>
                ))}
              </div>
              {/* existing form */}
            </>
          )}
        </div>
      )}
    </div>
  );
}
