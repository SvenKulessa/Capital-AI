import { useState, type KeyboardEvent } from 'react';
import { PortfolioRiskQuiz } from './PortfolioRiskQuiz';

type Category = 'quant' | 'portfolio';
const categories: readonly Category[] = ['quant', 'portfolio'];

export function QuizzesTab({ onOpenQuant }: { onOpenQuant: () => void }) {
  const [category, setCategory] = useState<Category>('quant');
  const selectWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = categories.indexOf(category);
    const next = event.key === 'Home' ? categories[0] : event.key === 'End' ? categories[1]
      : categories[(index + (event.key === 'ArrowRight' ? 1 : -1) + categories.length) % categories.length];
    setCategory(next);
    document.getElementById('quizzes-tab-' + next)?.focus();
  };
  return (
    <section className="mx-auto max-w-3xl space-y-5" aria-labelledby="quizzes-heading">
      <h2 id="quizzes-heading" className="text-2xl font-bold text-amber-200">Quizzes & Skill-Checks</h2>
      <p className="text-sm leading-6 text-slate-300">
        Finanzbildung mit synthetischen Beispielen. Keine Anlageberatung und kein offiziell anerkanntes Zertifikat.
      </p>
      <div role="tablist" aria-label="Quiz-Kategorien" onKeyDown={selectWithKeyboard}
        className="flex flex-wrap gap-2 border-b border-slate-700">
        {categories.map(item => (
          <button key={item} id={'quizzes-tab-' + item} type="button" role="tab"
            tabIndex={item === category ? 0 : -1} aria-selected={category === item}
            aria-controls={'quizzes-panel-' + item} onClick={() => setCategory(item)}
            className={'min-h-11 rounded-t-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-amber-300 ' +
              (item === category ? 'border-b-2 border-amber-300 bg-amber-400/10 text-amber-200' : 'text-slate-300 hover:text-white')}>
            {item === 'quant' ? 'Quant & Trader' : 'Portfolio-Risiko'}
          </button>
        ))}
      </div>
      <div id="quizzes-panel-quant" role="tabpanel" aria-labelledby="quizzes-tab-quant"
        hidden={category !== 'quant'} className="space-y-4 rounded-xl border border-slate-700 p-4">
        <h3 className="text-lg font-semibold">Quant & Trader Skill-Check</h3>
        <p className="text-sm leading-6 text-slate-300">
          Der bestehende Tages-Skill-Check prüft Login, Lernrechte und die kostenlose Tagesfrage auf dem Server.
          Der neue Überblick hebt keine Nutzungsbegrenzung auf.
        </p>
        <button type="button" onClick={onOpenQuant}
          className="min-h-11 rounded-xl bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-300">
          Zum bestehenden Tages-Skill-Check
        </button>
      </div>
      <div id="quizzes-panel-portfolio" role="tabpanel" aria-labelledby="quizzes-tab-portfolio"
        hidden={category !== 'portfolio'}>
        <PortfolioRiskQuiz />
      </div>
    </section>
  );
}
