import { useEffect, useMemo, useRef, useState } from 'react';
import { EyeOff, Move, Settings, X } from 'lucide-react';

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

const DISCLAIMER = 'JaJa erklärt Zusammenhänge. Keine Anlageberatung.';
export const HERO_BUDDY_EVENT = 'capital-ai:open-hero-buddy';
export const HERO_BUDDY_HIDDEN_KEY = 'capital_ai_hero_buddy_hidden_v1';
const HERO_BUDDY_POSITION_KEY = 'capital_ai_hero_buddy_position_v1';
type BuddyPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
const BUDDY_POSITIONS: BuddyPosition[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

export function openHeroBuddy() { window.dispatchEvent(new Event(HERO_BUDDY_EVENT)); }
const COOLDOWN_MS = 90_000;

type BuddyKeyState = 'missing' | 'blocked' | 'ready' | 'unused';
type BuddyKeyRow = {
  id: string;
  env: string;
  label: string;
  needed: boolean;
  bills: boolean;
  present: boolean;
  used: boolean;
  state: BuddyKeyState;
  detail: string;
};
type BuddyKeyReport = { schema: string; active: string; keys: BuddyKeyRow[] };
type LearnHit = { path: string; title: string; snippet: string; score: number };
type LearnTool = { id: string; name: string; license: string; note: string; connected: boolean };
type LearnStatus = { files: number; chunks: number; hits: LearnHit[]; tools: LearnTool[] };

function weaveLearned(answer: string, hits: LearnHit[]) {
  if (!hits.length) return answer;
  const lead = hits[0];
  const line = `Aus dem lokalen Bestand ${lead.path}: ${lead.snippet}`;
  if (/keinen Knoten|no node|pas de nœud|no tengo nodo|non ho un nodo/i.test(answer)) return `Ja ja! ${line}`;
  return `${answer}\n${line}`;
}

async function answerFor(input: string): Promise<string> {
  const { answerLocally } = await import('../../Chat Buddy/src/index');
  return answerLocally(input, 'de', false, 2).answer;
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
  const [hidden, setHidden] = useState(() =>
    typeof window !== 'undefined' && window.localStorage.getItem(HERO_BUDDY_HIDDEN_KEY) === 'true'
  );
  const [position, setPosition] = useState<BuddyPosition>(() => {
    if (typeof window === 'undefined') return 'bottom-right';
    const stored = window.localStorage.getItem(HERO_BUDDY_POSITION_KEY) as BuddyPosition | null;
    return stored && BUDDY_POSITIONS.includes(stored) ? stored : 'bottom-right';
  });
  const [messages, setMessages] = useState<BuddyMessage[]>([
    { id: 'welcome', role: 'buddy', text: 'Ja ja. Ich bin JaJa, der Chat Buddy. Ich erkläre Zins, Bewertung und Risiko, ohne Kauf oder Verkauf.' },
  ]);
  const [sessionGreetingApplied, setSessionGreetingApplied] = useState(false);
  const [settingsOn, setSettingsOn] = useState(false);
  const [keyReport, setKeyReport] = useState<BuddyKeyReport | null>(null);
  const [learnReport, setLearnReport] = useState<LearnStatus | null>(null);
  const [keyNote, setKeyNote] = useState('');
  const lastAssist = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(session => {
        if (controller.signal.aborted || sessionGreetingApplied || !session?.authenticated) return;
        const displayName = typeof session?.user?.name === 'string' ? session.user.name.trim() : '';
        const firstName = displayName.split(/\s+/)[0];
        const tier = typeof session?.account?.subscription?.tier === 'string'
          ? session.account.subscription.tier
          : '';
        const greeting = firstName
          ? `Willkommen zurück, ${firstName}. Ich kann dir bei Navigation, Vocabulary, Analyse und deinem Konto helfen${tier ? ` · Tarif: ${tier}` : ''}.`
          : `Willkommen zurück. Ich kann dir bei Navigation, Vocabulary, Analyse und deinem Konto helfen${tier ? ` · Tarif: ${tier}` : ''}.`;
        setMessages(current => [
          ...current.filter(message => message.id !== 'welcome'),
          { id: 'welcome-session', role: 'buddy', text: greeting },
        ]);
        setSessionGreetingApplied(true);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [sessionGreetingApplied]);
  useEffect(() => {
    if (!settingsOn) return;
    const controller = new AbortController();
    fetch('/api/chat-buddy/keys', { cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((report: BuddyKeyReport) => {
        if (!controller.signal.aborted) {
          setKeyReport(report);
          setKeyNote('');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setKeyNote('Schlüsselstatus gerade nicht erreichbar.');
      });
    fetch('/api/chat-buddy/learn', { cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((report: LearnStatus) => {
        if (!controller.signal.aborted) setLearnReport(report);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [settingsOn]);

  const reducedMotion = usePrefersReducedMotion();
  useEffect(() => {
    const openFromHero = () => {
      window.localStorage.removeItem(HERO_BUDDY_HIDDEN_KEY);
      setHidden(false);
      setOpen(true);
      setSpeech(null);
    };
    window.addEventListener(HERO_BUDDY_EVENT, openFromHero);
    return () => window.removeEventListener(HERO_BUDDY_EVENT, openFromHero);
  }, []);

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
    const buddyId = `b-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: `u-${buddyId}`, role: 'user', text: clean },
      { id: buddyId, role: 'buddy', text: 'JaJa verarbeitet deine Frage lokal …' },
    ]);
    setDraft('');
    setOpen(true);
    setSpeech(null);
    void answerFor(clean).then(async (local) => {
      setMessages((current) => current.map((message) =>
        message.id === buddyId ? { ...message, text: local } : message));
      try {
        const response = await fetch(`/api/chat-buddy/learn?q=${encodeURIComponent(clean)}`,
          { cache: 'no-store', headers: { Accept: 'application/json' } });
        if (!response.ok) return;
        const report = await response.json() as LearnStatus;
        const next = weaveLearned(local, report.hits ?? []);
        if (next === local) return;
        setMessages((current) => current.map((message) =>
          message.id === buddyId ? { ...message, text: next } : message));
      } catch { /* Optional read-only retrieval. Local answer remains available. */ }
    }).catch(() => {
      setMessages((current) => current.map((message) =>
        message.id === buddyId ? { ...message, text: 'Lokale Antwort aktuell nicht verfügbar.' } : message));
    });
  };

  const cyclePosition = () => {
    const next = BUDDY_POSITIONS[(BUDDY_POSITIONS.indexOf(position) + 1) % BUDDY_POSITIONS.length];
    setPosition(next);
    window.localStorage.setItem(HERO_BUDDY_POSITION_KEY, next);
  };

  const hideBuddy = () => {
    window.localStorage.setItem(HERO_BUDDY_HIDDEN_KEY, 'true');
    setOpen(false);
    setSpeech(null);
    setHidden(true);
  };

  if (hidden) return null;

  const positionClass = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-24 right-4',
    'top-left': 'top-24 left-4',
  }[position];

  return (
    <div className={`fixed ${positionClass} z-[45] flex items-end gap-2`} data-hero-buddy="agent">
      {(speech || open) && (
        <div className="relative w-[min(88vw,320px)] rounded-2xl border border-amber-300/40 bg-[#10182e] px-3 py-2 text-xs text-slate-100 shadow-lg">
          <span className="absolute -right-1.5 bottom-5 h-3 w-3 rotate-45 border-b border-r border-amber-300/40 bg-[#10182e]" aria-hidden="true" />
          {open ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-bold text-amber-300">JaJa · Chat Buddy</p>
                <div className="flex items-center gap-1">
                  <button type="button" aria-expanded={settingsOn} aria-label="Einstellungen" title="Einstellungen" onClick={() => setSettingsOn((value) => !value)} className="rounded-md p-1 text-slate-400 hover:text-white">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Hero Buddy verschieben" title="Position ändern" onClick={cyclePosition} className="rounded-md p-1 text-slate-400 hover:text-white">
                    <Move className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Hero Buddy ausblenden" title="Ausblenden" onClick={hideBuddy} className="rounded-md p-1 text-slate-400 hover:text-white">
                    <EyeOff className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Chat schließen" onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {settingsOn ? (
                <div className="mb-2 rounded-xl border border-slate-700 bg-[#030716] px-2 py-2">
                  <p className="text-[11px] text-slate-300">Schlüssel aus Render. Kostenpflichtige Schlüssel werden nicht genutzt. Die Antwort bleibt lokal.</p>
                  {keyNote ? <p className="mt-1 text-[11px] text-amber-300">{keyNote}</p> : null}
                  <ul className="mt-2 space-y-1">
                    {(keyReport?.keys ?? []).map((item) => (
                      <li key={item.env}>
                        <span className="font-medium text-slate-100">{item.env}</span>
                        <span className="text-slate-400"> · {item.state === 'missing' ? 'fehlt' : item.state === 'blocked' ? 'gesetzt, nicht genutzt' : item.state}</span>
                        <span className="block text-[10px] text-slate-500">{item.detail}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-slate-300">
                    Gelernt aus Doku und Code
                    {learnReport ? ` · ${learnReport.files} Dateien · ${learnReport.chunks} Abschnitte` : ''}.
                  </p>
                  <ul className="mt-1 space-y-1">
                    {(learnReport?.tools ?? []).map((tool) => (
                      <li key={tool.id}>
                        <span className="font-medium text-slate-100">{tool.name}</span>
                        <span className="text-slate-400"> · {tool.license} · {tool.connected ? 'verbunden' : 'nicht verbunden'}</span>
                        <span className="block text-[10px] text-slate-500">{tool.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
      <button type="button" aria-expanded={open} aria-label="Hero Buddy Support öffnen" onClick={() => { setOpen((value) => !value); setSpeech(null); }} className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-amber-300/50 bg-[#10182e] shadow-[0_8px_24px_rgba(245,176,20,0.28)]">
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
    <svg viewBox="0 0 64 64" className={`h-12 w-12 ${pulse ? 'animate-pulse' : ''}`} aria-hidden="true">
      <style>{'@keyframes buddy-blink{0%,86%,100%{transform:scaleY(1)}92%{transform:scaleY(0.12)}}'}</style>
      <circle cx="32" cy="32" r="30" fill="#F5B014" />
      <circle cx="32" cy="30" r="16" fill="#10182e" />
      <circle cx="22" cy="31" r="2.2" fill="#F6C56A" />
      <circle cx="42" cy="31" r="2.2" fill="#F6C56A" />
      <g style={pulse ? { transformOrigin: '32px 31px', animation: 'buddy-blink 4.2s infinite' } : undefined}>
        <circle cx="25" cy="28" r="2.4" fill="#F5B014" />
        <circle cx="39" cy="28" r="2.4" fill="#F5B014" />
        <circle cx="25.8" cy="27.3" r="0.8" fill="#FFF8E7" />
        <circle cx="39.8" cy="27.3" r="0.8" fill="#FFF8E7" />
      </g>
      <path d={speaking ? 'M26 35c2 2.4 4 3.4 6 3.4s4-1 6-3.4' : 'M25 34c2.2 3.2 4.6 4.6 7 4.6s4.8-1.4 7-4.6'} stroke="#F5B014" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M18 46c3.2-5 8-8 14-8s10.8 3 14 8" stroke="#10182e" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
