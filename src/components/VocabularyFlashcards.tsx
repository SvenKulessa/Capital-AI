import React, { useMemo, useState } from 'react';
import { BookOpen, RotateCcw } from 'lucide-react';
import { VOCABULARY_TERMS } from '../data/vocabularyData';

export function VocabularyFlashcards({ onNavigate }: { onNavigate: (path: string) => void }) {
  const terms = useMemo(() => VOCABULARY_TERMS.slice(0, 3), []);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  return (
    <section
      aria-labelledby="landing-vocabulary-title"
      className="mx-5 my-6 rounded-3xl border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,rgba(245,176,20,0.08),transparent_42%),#050b18] p-4 sm:p-6"
      data-design-profile="CAPITAL_AI_VOCABULARY_FLASHCARD@1"
      data-social-engine-generated="false"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-amber-300">
            <BookOpen className="h-3.5 w-3.5" />
            Vocabulary Flashcards
          </div>
          <h2 id="landing-vocabulary-title" className="mt-2 text-xl font-black text-white sm:text-2xl">
            Drei Begriffe. Eine Karte pro Konzept.
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            Karte antippen oder per Tastatur aktivieren. Auf der Rückseite steht die Kurzdefinition aus dem öffentlichen CAPITAL-AI Vocabulary.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/learning')}
          className="min-h-10 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 text-xs font-bold text-amber-200 hover:bg-amber-400/15"
        >
          Vocabulary öffnen
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {terms.map((term, index) => {
          const isFlipped = Boolean(flipped[term.id]);
          const innerClass = [
            'relative block h-full min-h-[210px] w-full transition-transform duration-500 [transform-style:preserve-3d]',
            isFlipped ? '[transform:rotateY(180deg)]' : '',
          ].join(' ');
          return (
            <button
              key={term.id}
              type="button"
              aria-pressed={isFlipped}
              aria-label={term.term + ': ' + (isFlipped ? 'Begriff anzeigen' : 'Definition anzeigen')}
              onClick={() => setFlipped(current => ({ ...current, [term.id]: !current[term.id] }))}
              className="group min-h-[210px] [perspective:1000px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400"
            >
              <span className={innerClass}>
                <span className="absolute inset-0 flex [backface-visibility:hidden] flex-col justify-between rounded-2xl border border-slate-700/80 bg-gradient-to-br from-[#0d1630] via-[#091126] to-[#050914] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
                  <span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                      Karte {String(index + 1).padStart(2, '0')} · {term.categoryLabel}
                    </span>
                    <strong className="mt-5 block text-2xl font-black tracking-tight text-white">
                      {term.term}
                    </strong>
                    {term.abbreviation && (
                      <span className="mt-1 block font-mono text-xs text-amber-300">{term.abbreviation}</span>
                    )}
                  </span>
                  <span className="flex items-center justify-between border-t border-white/10 pt-3 text-[10px] font-mono text-slate-500">
                    <span>Vorderseite</span>
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <RotateCcw className="h-3 w-3" /> umdrehen
                    </span>
                  </span>
                </span>

                <span className="absolute inset-0 flex [backface-visibility:hidden] [transform:rotateY(180deg)] flex-col justify-between rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#17120a] via-[#11101a] to-[#060914] p-5 shadow-[0_18px_55px_rgba(245,176,20,0.08)]">
                  <span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
                      Definition
                    </span>
                    <strong className="mt-4 block text-base font-black text-white">{term.term}</strong>
                    <span className="mt-3 block text-sm leading-relaxed text-slate-300">
                      {term.shortDefinition}
                    </span>
                  </span>
                  <span className="flex items-center justify-between border-t border-white/10 pt-3 text-[10px] font-mono text-slate-500">
                    <span>Rückseite</span>
                    <span className="inline-flex items-center gap-1 text-cyan-300">
                      <RotateCcw className="h-3 w-3" /> zurück
                    </span>
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
