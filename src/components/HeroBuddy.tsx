import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

type HeroBuddyProps = {
  onNavigate?: (path: string) => void;
  onOpenMonetization?: () => void;
  onOpenVocabulary?: () => void;
  onOpenAlerts?: () => void;
  onOpenWhaleRadar?: () => void;
  onOpenAnalysis?: () => void;
};

type BuddyMessage = {
  id: string;
  role: 'buddy' | 'user';
  text: string;
};

type SupportAction = {
  label: string;
  run: () => void;
};

const DISCLAIMER =
  'Informationshilfe zur Plattform. Keine Anlageberatung, keine Empfehlung und keine Freigabe von Marktdaten.';

function answerFor(input: string): { text: string; actions: SupportAction[] } {
  const q = input.toLowerCase();
  if (q.includes('preis') || q.includes('tarif') || q.includes('abo') || q.includes('stripe')) {
    return {
      text: 'SaaS-Tarife sind Starter, Pro und Enterprise. Die Preisautorität ist der Stripe-Katalog. Ein Tarifbutton öffnet die Übersicht, kein stiller Kauf.',
      actions: [],
    };
  }
  if (q.includes('scorer') || q.includes('score')) {
    return {
      text: 'Der Enterprise Scorer zeigt erklärbare Scores. Er ist nicht decisionEligible und ersetzt keine Anlageentscheidung.',
      actions: [],
    };
  }
  if (q.includes('whale')) {
    return {
      text: 'Whale Radar ist ein Beobachtungsmodul. Live-Rechte und ein Paid-Gate sind noch offen.',
      actions: [],
    };
  }
  if (q.includes('vokabel') || q.includes('lernen') || q.includes('vocabulary')) {
    return {
      text: 'Market Vocabulary erklärt Begriffe. Es ist ein Lernmodul, kein Beratungsprodukt.',
      actions: [],
    };
  }
  if (q.includes('alert') || q.includes('alarm')) {
    return {
      text: 'Preis-Alerts lassen sich in der Oberfläche anlegen. Tariflimits werden noch nicht serverseitig erzwungen.',
      actions: [],
    };
  }
  if (q.includes('bafin') || q.includes('beratung') || q.includes('kaufen') || q.includes('verkaufen')) {
    return {
      text: 'CAPITAL-AI ist ein Informationsdienst. Ich gebe keine Kauf- oder Verkaufshinweise und bestätige keine regulatorische Freigabe.',
      actions: [],
    };
  }
  return {
    text: 'Ich helfe bei Navigation, Tarifen und Modulstatus. Formuliere die Frage zur Plattform, nicht zu einer konkreten Order.',
    actions: [],
  };
}

export function HeroBuddy({
  onNavigate,
  onOpenMonetization,
  onOpenVocabulary,
  onOpenAlerts,
  onOpenWhaleRadar,
  onOpenAnalysis,
}: HeroBuddyProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<BuddyMessage[]>([
    {
      id: 'welcome',
      role: 'buddy',
      text: 'Ich bin der Capital-AI Hero Buddy. Kurze Hilfe zu Tarifen, Modulen und Navigation.',
    },
  ]);

  const quickActions = useMemo<SupportAction[]>(
    () => [
      { label: 'Tarife', run: () => onOpenMonetization?.() },
      { label: 'Analyse', run: () => onOpenAnalysis?.() },
      { label: 'Whale Radar', run: () => onOpenWhaleRadar?.() },
      { label: 'Vokabular', run: () => onOpenVocabulary?.() },
      { label: 'Alerts', run: () => onOpenAlerts?.() },
      { label: 'Login', run: () => onNavigate?.('/login') },
    ],
    [onNavigate, onOpenAlerts, onOpenAnalysis, onOpenMonetization, onOpenVocabulary, onOpenWhaleRadar],
  );

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const reply = answerFor(clean);
    setMessages((current) => [
      ...current,
      { id: `u-${current.length}`, role: 'user', text: clean },
      { id: `b-${current.length}`, role: 'buddy', text: reply.text },
    ]);
    setDraft('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-[45] flex flex-col items-end gap-2">
      {open && (
        <section
          aria-label="Capital-AI Hero Buddy"
          className="w-[min(92vw,340px)] rounded-2xl border border-amber-400/30 bg-[#070e22] text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
        >
          <header className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
            <BuddyMark />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-300">Hero Buddy</p>
              <p className="truncate text-[10px] text-slate-400">Portal-Support · fail-closed</p>
            </div>
            <button type="button" aria-label="Chat schließen" onClick={() => setOpen(false)} className="rounded-full p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="max-h-64 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((message) => (
              <p
                key={message.id}
                className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  message.role === 'user' ? 'ml-8 bg-amber-400 text-black' : 'mr-6 bg-slate-900 text-slate-200'
                }`}
              >
                {message.text}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 px-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.run}
                className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:border-amber-400/60 hover:text-amber-200"
              >
                {action.label}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={400}
              placeholder="Frage zur Plattform"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#030716] px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
            />
            <button type="submit" className="rounded-xl bg-amber-400 px-3 text-xs font-bold text-black">
              Senden
            </button>
          </form>
          <p className="px-3 pb-3 text-[10px] leading-snug text-slate-500">{DISCLAIMER}</p>
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label="Capital-AI Hero Buddy öffnen"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/50 bg-[#10182e] shadow-[0_8px_24px_rgba(245,176,20,0.28)]"
      >
        <BuddyMark />
      </button>
    </div>
  );
}

function BuddyMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#F5B014" />
      <circle cx="24" cy="20" r="8" fill="#10182e" />
      <circle cx="21" cy="19" r="1.4" fill="#F5B014" />
      <circle cx="27" cy="19" r="1.4" fill="#F5B014" />
      <path d="M20 23c1.2 1.4 2.5 2 4 2s2.8-.6 4-2" stroke="#F5B014" strokeWidth="1.4" fill="none" />
      <path d="M14 34c2.5-4 5.8-6 10-6s7.5 2 10 6" stroke="#10182e" strokeWidth="2.4" fill="none" />
    </svg>
  );
}
