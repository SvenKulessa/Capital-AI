import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

type HeroBuddyProps = {
  onNavigate?: (path: string) => void;
  onOpenMonetization?: () => void;
  onOpenVocabulary?: () => void;
  onOpenAlerts?: () => void;
  onOpenWhaleRadar?: () => void;
  onOpenAnalysis?: () => void;
};

type BuddyMessage = { id: string; role: 'buddy' | 'user'; text: string };
type AssistReason = 'hesitation' | 'repeat' | 'oscillation' | 'dwell' | null;

const DISCLAIMER = 'Portalhilfe. Keine Anlageberatung und keine Freigabe von Marktdaten.';
const COOLDOWN_MS = 90_000;

function answerFor(input: string) {
  const q = input.toLowerCase();
  if (q.includes('preis') || q.includes('tarif') || q.includes('vocabulary') || q.includes('glossar')) {
    return 'Market Vocabulary kostet 19,00 € einmalig und ist in Pro und Enterprise enthalten. Acht Begriffe bleiben als Vorschau offen.';
  }
  if (q.includes('beratung') || q.includes('kaufen') || q.includes('verkaufen')) {
    return 'Ich erkläre nur die Plattform. Keine Kauf- oder Verkaufshinweise.';
  }
  return 'Ich kann Tarife, Vocabulary, Analyse, Whale Radar und Alerts öffnen. Die Frage darf die Bedienung betreffen, nicht eine Order.';
}

function promptFor(reason: AssistReason) {
  if (reason === 'repeat') return 'Mehrfach an derselben Stelle. Soll ich das passende Modul öffnen?';
  if (reason === 'oscillation') return 'Du suchst offenbar zwischen Bereichen. Ich kann die Navigation übernehmen.';
  if (reason === 'dwell') return 'Längerer Halt ohne Aktion. Kurze Hilfe dazu?';
  return 'Kurzes Zögern erkannt. Ich kann die nächsten Schritte zeigen.';
}

export function HeroBuddy(props: HeroBuddyProps) {
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<AssistReason>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<BuddyMessage[]>([
    { id: 'welcome', role: 'buddy', text: 'Portal-Support. Hilfe bleibt lokal, ohne Maus-Tracking an Dritte.' },
  ]);
  const lastAssist = useRef(0);
  const reducedMotion = usePrefersReducedMotion();

  useAssistanceSignal((reason) => {
    if (open || Date.now() - lastAssist.current < COOLDOWN_MS) return;
    lastAssist.current = Date.now();
    setBubble(reason);
  });

  const quickActions = useMemo(() => [
    { label: 'Tarife', run: () => props.onOpenMonetization?.() },
    { label: 'Vocabulary', run: () => props.onOpenVocabulary?.() },
    { label: 'Analyse', run: () => props.onOpenAnalysis?.() },
    { label: 'Whale Radar', run: () => props.onOpenWhaleRadar?.() },
    { label: 'Alerts', run: () => props.onOpenAlerts?.() },
    { label: 'Login', run: () => props.onNavigate?.('/login') },
  ], [props]);

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setMessages((current) => [
      ...current,
      { id: `u-${current.length}`, role: 'user', text: clean },
      { id: `b-${current.length}`, role: 'buddy', text: answerFor(clean) },
    ]);
    setDraft('');
    setBubble(null);
    setOpen(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[45] flex flex-col items-end gap-2" data-hero-buddy="support">
      {bubble && !open && (
        <div role="status" className="w-[min(88vw,280px)] rounded-2xl border border-amber-300/40 bg-[#10182e] px-3 py-2 text-xs text-slate-100 shadow-lg">
          <p>{promptFor(bubble)}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded-lg bg-amber-400 px-2 py-1 font-bold text-black" onClick={() => { setOpen(true); setBubble(null); }}>Hilfe</button>
            <button type="button" className="rounded-lg border border-slate-600 px-2 py-1 text-slate-300" onClick={() => setBubble(null)}>Später</button>
          </div>
        </div>
      )}
      {open && (
        <section aria-label="Capital-AI Hero Buddy" className="w-[min(92vw,340px)] rounded-2xl border border-amber-400/30 bg-[#070e22] text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <header className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
            <BuddyMark pulse={!reducedMotion} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-300">Hero Buddy</p>
              <p className="truncate text-[10px] text-slate-400">Portalweit · lokal · kommerziell eigen</p>
            </div>
            <button type="button" aria-label="Chat schließen" onClick={() => setOpen(false)} className="rounded-full p-1 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
          </header>
          <div className="max-h-64 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((message) => (
              <p key={message.id} className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${message.role === 'user' ? 'ml-8 bg-amber-400 text-black' : 'mr-6 bg-slate-900 text-slate-200'}`}>{message.text}</p>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 px-3">
            {quickActions.map((action) => (
              <button key={action.label} type="button" onClick={action.run} className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:border-amber-400/60 hover:text-amber-200">{action.label}</button>
            ))}
          </div>
          <form className="flex gap-2 p-3" onSubmit={(event) => { event.preventDefault(); send(draft); }}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={400} placeholder="Frage zur Plattform" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#030716] px-3 py-2 text-xs text-white outline-none focus:border-amber-400" />
            <button type="submit" className="rounded-xl bg-amber-400 px-3 text-xs font-bold text-black">Senden</button>
          </form>
          <p className="px-3 pb-3 text-[10px] leading-snug text-slate-500">{DISCLAIMER}</p>
        </section>
      )}
      <button type="button" aria-expanded={open} aria-label="Capital-AI Hero Buddy öffnen" onClick={() => { setOpen((value) => !value); setBubble(null); }} className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/50 bg-[#10182e] shadow-[0_8px_24px_rgba(245,176,20,0.28)]">
        <BuddyMark pulse={!reducedMotion && !open} />
      </button>
    </div>
  );
}

function useAssistanceSignal(onAssist: (reason: Exclude<AssistReason, null>) => void) {
  const onAssistRef = useRef(onAssist);
  onAssistRef.current = onAssist;

  useEffect(() => {
    const points: { x: number; y: number; t: number }[] = [];
    const clicks: { x: number; y: number; t: number }[] = [];
    let scrollDir = 0;
    let scrollFlips = 0;
    let scrollWindow = 0;
    let dwellTimer = 0;

    const remember = (x: number, y: number) => {
      const now = Date.now();
      points.push({ x, y, t: now });
      while (points.length && now - points[0].t > 4500) points.shift();
      if (points.length < 8) return;
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      const span = Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys);
      const travel = points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
      if (span < 140 && travel > 180) onAssistRef.current('hesitation');
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') remember(event.clientX, event.clientY);
    };
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) remember(touch.clientX, touch.clientY);
    };
    const onClick = (event: MouseEvent) => {
      const now = Date.now();
      clicks.push({ x: event.clientX, y: event.clientY, t: now });
      const recent = clicks.filter((click) => now - click.t < 1200 && Math.hypot(click.x - event.clientX, click.y - event.clientY) < 56);
      if (recent.length >= 3) onAssistRef.current('repeat');
    };
    const onScroll = () => {
      const now = Date.now();
      const next = Math.sign(window.scrollY - scrollWindow);
      if (next && scrollDir && next !== scrollDir && now - scrollWindow < 3000) scrollFlips += 1;
      scrollDir = next || scrollDir;
      scrollWindow = now;
      if (scrollFlips >= 4) {
        scrollFlips = 0;
        onAssistRef.current('oscillation');
      }
    };
    const armDwell = () => {
      window.clearTimeout(dwellTimer);
      dwellTimer = window.setTimeout(() => onAssistRef.current('dwell'), 8000);
    };
    const clearDwell = () => window.clearTimeout(dwellTimer);

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('click', onClick);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('focusin', armDwell);
    window.addEventListener('input', clearDwell);
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('focusin', armDwell);
      window.removeEventListener('input', clearDwell);
      clearDwell();
    };
  }, []);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return reduced;
}

function BuddyMark({ pulse }: { pulse: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={`h-8 w-8 ${pulse ? 'animate-pulse' : ''}`} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#F5B014" />
      <circle cx="24" cy="20" r="8" fill="#10182e" />
      <circle cx="21" cy="19" r="1.4" fill="#F5B014" />
      <circle cx="27" cy="19" r="1.4" fill="#F5B014" />
      <path d="M20 23c1.2 1.4 2.5 2 4 2s2.8-.6 4-2" stroke="#F5B014" strokeWidth="1.4" fill="none" />
      <path d="M14 34c2.5-4 5.8-6 10-6s7.5 2 10 6" stroke="#10182e" strokeWidth="2.4" fill="none" />
    </svg>
  );
}
