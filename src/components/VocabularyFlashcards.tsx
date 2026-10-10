import React from 'react';
import { VOCABULARY_TERMS, type VocabularyTerm } from '../data/vocabularyData';
import { VocabularyCard } from '../features/learning/VocabularyCard';
import { useLearningFavorites } from '../features/learning/LearningFavorites';

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
  const [index, setIndex] = React.useState(0);
  const pointerStart = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    setDeck(terms.map(term => term.id));
    setIndex(0);
  }, [terms]);

  const term = terms.find(candidate => candidate.id === deck[index]);
  const next = () => setIndex(current => (current + 1) % Math.max(1, deck.length));
  const missed = () => {
    if (!term) return;
    // Misses are session-local learning signals, never persisted as a public/tenant-shared cache.
    setDeck(current => {
      const updated = [...current];
      updated.splice(Math.min(index + 3, updated.length), 0, term.id);
      return updated;
    });
    next();
  };

  return <section aria-labelledby="learning-vocabulary-title" className="space-y-5" data-design-profile="CAPITAL_AI_VOCABULARY_FLASHCARD@3">
    <div>
      <h2 id="learning-vocabulary-title" className="text-2xl font-bold text-amber-200">Mein Vocabulary-Karteikasten</h2>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        {entitled ? 'Alle verfügbaren Begriffe in deinem Lernzugang.' : 'Kostenlos: fünf feste Wörter. Learning Portal schaltet den vollständigen Karteikasten frei.'}
        {' '}Wische eine Karte nach oben oder wähle „Nächste Karte“. Der rote X-Button plant eine frühere Wiederholung ein. Der Stern speichert einen Begriff weiterhin in deinem Profil.
      </p>
    </div>
    {favorites.error && <p role="alert" className="text-sm text-rose-200">{favorites.error}</p>}
    {term ? <>
      <p aria-live="polite" className="text-sm font-semibold text-amber-200">Karte {index + 1} von {deck.length} · {terms.length} unterschiedliche Begriffe</p>
      <div onPointerDown={event => {
          if (event.target instanceof Element && event.target.closest('button')) return;
          pointerStart.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={event => {
          const start = pointerStart.current;
          pointerStart.current = null;
          if (!start) return;
          if (start.y - event.clientY > 56 && Math.abs(event.clientX - start.x) < 110) next();
        }}
        onPointerCancel={() => { pointerStart.current = null; }}
        className="mx-auto max-w-2xl touch-pan-x"
        aria-label="Karteikarte: nach oben wischen für die nächste Karte">
        <VocabularyCard key={term.id} term={term} flashcard saved={favorites.ids.includes(term.id)}
          pending={favorites.pending} onFavorite={id => void favorites.toggle(id)} onMissed={missed} />
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={next}
          className="min-h-11 rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
          Nächste Karte ↑
        </button>
      </div>
    </> : <p role="status" className="rounded-xl border border-slate-700 p-5 text-sm text-slate-300">Noch keine Karteikarten vorhanden.</p>}
    <button type="button" onClick={() => onNavigate('/learning?tab=glossar')}
      className="min-h-11 rounded-xl border border-amber-400/30 px-4 text-sm text-amber-200 hover:bg-amber-400/10">
      Zum Glossar
    </button>
  </section>;
}
