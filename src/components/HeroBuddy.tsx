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
type AssistReason = 'hesitation' | 'repeat' | 'oscillation' | 'dwell';

const DISCLAIMER = 'Portalhilfe aus dem Hero Buddy. Keine Anlageberatung.';
const COOLDOWN_MS = 90_000;

function answerFor(input: string) {
  const q = input.toLowerCase();
  if (q.includes('preis') || q.includes('tarif') || q.includes('vocabulary') || q.includes('glossar')) {
    return 'Market Vocabulary kostet 19,00 € einmalig und ist in Pro und Enterprise enthalten.';
  }
  if (q.includes('beratung') || q.includes('kaufen') || q.includes('verkaufen')) {
    return 'Ich erkläre nur die Plattform. Keine Kauf- oder Verkaufshinweise.';
  }
  return 'Tarife, Vocabulary, Analyse, Whale Radar und Alerts kann ich direkt öffnen.';
}

function lineFor(reason: AssistReason) {
  if (reason === 'repeat') return 'Mehrfach an derselben Stelle. Ich öffne das passende Modul.';
  if (reason === 'oscillation') return 'Du wechselst die Richtung. Soll ich die Navigation übernehmen?';
  if (reason === 'dwell') return 'Längerer Halt ohne Eingabe. Kurze Hilfe?';
  return 'Kurzes Zögern. Ich zeige den nächsten Schritt.';
}

export function HeroBuddy(props: HeroBuddyProps) {
  const [open, setOpen] = useState(false);
  const [speech, setSpeech] = useState<AssistReason | null>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<BuddyMessage[]>([
    { id: 'welcome', role: 'buddy', text: 'Ich bin der Hero Buddy und der Support-Agent in einer Figur.' },
  ]);
  const lastAssist = useRef(0);
  const reducedMotion = usePrefersReducedMotion();

  useAssistanceSignal((reason) => {
    if (open || Date.now() - lastAssist.current < COOLDOWN_MS) return;
    lastAssist.current = Date.now();
    setSpeech(reason);
  });

  const actions = useMemo(() => [
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
    setOpen(true);
    setSpeech(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[45] flex items-end gap-2" data-hero-buddy="agent">
      {(speech || open) && (
        <div className="relative w-[min(88vw,320px)] rounded-2xl border border-amber-300/40 bg-[#10182e] px-3 py-2 text-xs text-slate-100 shadow-lg">
          <span className="absolute -right-1.5 bottom-5 h-3 w-3 rotate-45 border-b border-r border-amber-300/40 bg-[#10182e]" aria-hidden="true" />
          {open ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold text-amber-300">Hero Buddy · Support</p>
                <button type="button" aria-label="Chat schließen" onClick={() => setOpen(false)} className="text-slate-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {messages.map((message) => (
                  <p key={message.id} className={`rounded-xl px-2 py-1.5 ${message.role === 'user' ? 'ml-6 bg-amber-400 text-black' : 'mr-4 bg-slate-900'}`}>{message.text}</p>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {actions.map((action) => (
                  <button key={action.label} type="button" onClick={action.run} className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300">{action.label}</button>
                ))}
              </div>
              <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); send(draft); }}>
                <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={400} placeholder="Frage zur Plattform" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#030716] px-2 py-1.5 text-xs text-white outline-none" />
                <button type="submit" className="rounded-xl bg-amber-400 px-2 text-xs font-bold text-black">Senden</button>
              </form>
              <p className="mt-2 text-[10px] text-slate-500">{DISCLAIMER}</p>
            </div>
          ) : (
            <div>
              <p>{speech ? lineFor(speech) : ''}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="rounded-lg bg-amber-400 px-2 py-1 font-bold text-black" onClick={() => { setOpen(true); setSpeech(null); }}>Antworten</button>
                <button type="button" className="rounded-lg border border-slate-600 px-2 py-1 text-slate-300" onClick={() => setSpeech(null)}>Später</button>
              </div>
            </div>
          )}
        </div>
      )}
      <button type="button" aria-expanded={open} aria-label="Hero Buddy Support öffnen" onClick={() => { setOpen((value) => !value); setSpeech(null); }} className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-300/50 bg-[#10182e] shadow-[0_8px_24px_rgba(245,176,20,0.28)]">
        <BuddyMark pulse={!reducedMotion && !open} speaking={Boolean(speech) && !open} />
      </button>
    </div>
  );
}

function useAssistanceSignal(onAssist: (reason: AssistReason) => void) {
  const onAssistRef = useRef(onAssist);
  onAssistRef.current = onAssist;
  useEffect(() => {
    const points: { x: number; y: number; t: number }[] = [];
    const clicks: { x: number; y: number; t: number }[] = [];
    let scrollDir = 0;
    let scrollFlips = 0;
    let lastScroll = 0;
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
    const onPointer = (event: PointerEvent) => { if (event.pointerType === 'mouse') remember(event.clientX, event.clientY); };
    const onTouch = (event: TouchEvent) => { const touch = event.touches[0]; if (touch) remember(touch.clientX, touch.clientY); };
    const onClick = (event: MouseEvent) => {
      const now = Date.now();
      clicks.push({ x: event.clientX, y: event.clientY, t: now });
      const recent = clicks.filter((click) => now - click.t < 1200 && Math.hypot(click.x - event.clientX, click.y - event.clientY) < 56);
      if (recent.length >= 3) onAssistRef.current('repeat');
    };
    const onScroll = () => {
      const now = Date.now();
      const next = Math.sign(window.scrollY - lastScroll);
      if (next && scrollDir && next !== scrollDir) scrollFlips += 1;
      scrollDir = next || scrollDir;
      lastScroll = window.scrollY;
      if (scrollFlips >= 4 && now - lastScroll < 3000) {
        scrollFlips = 0;
        onAssistRef.current('oscillation');
      }
    };
    const armDwell = () => { window.clearTimeout(dwellTimer); dwellTimer = window.setTimeout(() => onAssistRef.current('dwell'), 8000); };
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

function BuddyMark({ pulse, speaking }: { pulse: boolean; speaking: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={`h-8 w-8 ${pulse ? 'animate-pulse' : ''}`} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#F5B014" />
      <circle cx="24" cy="20" r="8" fill="#10182e" />
      <circle cx="21" cy="19" r="1.4" fill="#F5B014" />
      <circle cx="27" cy="19" r="1.4" fill="#F5B014" />
      <path d={speaking ? 'M19 23h10' : 'M20 23c1.2 1.4 2.5 2 4 2s2.8-.6 4-2'} stroke="#F5B014" strokeWidth="1.4" fill="none" />
      <path d="M14 34c2.5-4 5.8-6 10-6s7.5 2 10 6" stroke="#10182e" strokeWidth="2.4" fill="none" />
    </svg>
  );
}
