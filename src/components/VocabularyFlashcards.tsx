import React from 'react';
import { VOCABULARY_TERMS, type VocabularyTerm } from '../data/vocabularyData';
import { VocabularyCard } from '../features/learning/VocabularyCard';
import { useLearningFavorites } from '../features/learning/LearningFavorites';

/** Rotate through the current session deck without growing it. */
export function advanceVocabularyDeck(deck: readonly string[]): string[] {
  return deck.length <= 1 ? [...deck] : [...deck.slice(1), deck[0]];
}

/** Put a missed term behind two other cards, including across the former end of the deck. */
export function rescheduleMissedVocabulary(deck: readonly string[]): string[] {
  return deck.length <= 1 ? [...deck] : [...deck.slice(1, 3), deck[0], ...deck.slice(3)];
}

export function vocabularySwipeDirection(dx:number,dy:number):'left'|'right'|null {
  return Math.abs(dx)>=56 && Math.abs(dx)>Math.abs(dy)*1.4 ? (dx<0?'left':'right') : null;
}

/** A small, accessible flashcard deck. Incorrect terms reappear after two other cards. */
export function VocabularyFlashcards({ onNavigate, terms: suppliedTerms, entitled = false }: {
  onNavigate: (path: string) => void; terms?: VocabularyTerm[]; entitled?: boolean;
}) {
  const favorites = useLearningFavorites();
  const terms = React.useMemo(
    () => (suppliedTerms ?? VOCABULARY_TERMS).slice(0,entitled?undefined:5),
    [suppliedTerms, entitled],
  );
  const [deck, setDeck] = React.useState<string[]>(() => terms.map(term => term.id));
  const [seen, setSeen] = React.useState(0);
  const pointerStart = React.useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = React.useState(0);
  const [feedback, setFeedback] = React.useState('');

  React.useEffect(() => {
    setDeck(terms.map(term => term.id));
    setSeen(0);
  }, [terms]);

  const term = terms.find(candidate => candidate.id === deck[0]);
  const next = () => {
    setDeck(current => advanceVocabularyDeck(current));
    setSeen(current => current + 1);
  };
  const missed = async () => {
    if (!term) return;
    if (favorites.pending) return;
    if (!await favorites.add(term.id)) return;
    setFeedback(`${term.term} wurde im privaten Lernfeld gespeichert.`);
    setDeck(current => rescheduleMissedVocabulary(current));
    setSeen(current => current + 1);
  };

  return <section aria-labelledby="learning-vocabulary-title" className="space-y-5" data-design-profile="CAPITAL_AI_VOCABULARY_FLASHCARD@3">
    <div>
      <h2 id="learning-vocabulary-title" className="text-2xl font-bold text-amber-200">Mein Vocabulary-Karteikasten</h2>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        {entitled ? 'Alle verfügbaren Begriffe in deinem Lernzugang.' : 'Kostenlos: fünf feste Wörter. Learning Hub schaltet den vollständigen Karteikasten frei.'}
        {' '}Wische nach links: „Weiß ich nicht“ speichert das Wort im privaten Lernfeld und plant eine Wiederholung. Wische nach rechts: „Ist mir bekannt“ zeigt die nächste Karte. Am Desktop kannst du die Karte mit der Maus ziehen oder die Buttons nutzen.
      </p>
    </div>
    {favorites.error && <p role="alert" className="text-sm text-rose-200">{favorites.error}</p>}
    {term ? <>
      <p aria-live="polite" className="text-sm font-semibold text-amber-200">Karte {deck.length ? (seen % deck.length) + 1 : 0} von {deck.length} · {terms.length} unterschiedliche Begriffe</p>
      <p role="status" className="text-sm text-emerald-200">{feedback}</p>
      <div onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || favorites.pending || (event.target instanceof Element && event.target.closest('button,a'))) return;
          pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const start=pointerStart.current;
          if (!start || start.id!==event.pointerId) return;
          const dx=event.clientX-start.x, dy=event.clientY-start.y;
          if (Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>16) {pointerStart.current=null;setDrag(0);return;}
          setDrag(Math.max(-100,Math.min(100,dx)));
        }}
        onPointerUp={event => {
          const start = pointerStart.current;
          pointerStart.current = null;setDrag(0);
          if (!start || start.id!==event.pointerId) return;
          const direction=vocabularySwipeDirection(event.clientX-start.x,event.clientY-start.y);
          if(direction==='left') void missed();
          if(direction==='right') {setFeedback(`${term.term}: bekannt. Nächste Karte.`);next();}
        }}
        onPointerCancel={() => { pointerStart.current = null;setDrag(0); }}
        onLostPointerCapture={() => { pointerStart.current = null;setDrag(0); }}
        className="mx-auto max-w-2xl touch-pan-y"
        aria-label="Karteikarte: links für Weiß ich nicht, rechts für Ist mir bekannt">
        <div style={{transform:`translateX(${drag*.3}px) rotate(${drag*.025}deg)`}}>
          <VocabularyCard key={term.id} term={term} flashcard saved={favorites.ids.includes(term.id)}
            pending={favorites.pending} onFavorite={id => void favorites.toggle(id)} onMissed={()=>void missed()} />
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" disabled={favorites.pending} onClick={()=>void missed()}
          className="min-h-11 rounded-xl border border-rose-400/50 bg-rose-500/10 px-5 py-2 text-sm font-bold text-rose-200 focus-visible:outline-2 focus-visible:outline-rose-200 disabled:opacity-50">
          ← Weiß ich nicht
        </button>
        <button type="button" disabled={favorites.pending} onClick={next}
          className="min-h-11 rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:opacity-50">
          Ist mir bekannt · Weiter →
        </button>
      </div>
    </> : <p role="status" className="rounded-xl border border-slate-700 p-5 text-sm text-slate-300">Noch keine Karteikarten vorhanden.</p>}
    <button type="button" onClick={() => onNavigate('/learning?tab=glossar')}
      className="min-h-11 rounded-xl border border-amber-400/30 px-4 text-sm text-amber-200 hover:bg-amber-400/10">
      Zum Glossar
    </button>
  </section>;
}
