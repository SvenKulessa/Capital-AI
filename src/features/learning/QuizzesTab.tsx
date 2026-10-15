import React, { useState } from 'react';
import { PortfolioRiskQuiz } from './PortfolioRiskQuiz';
import { dailyLearningQuestions } from './learningPolicy';

type QuizCategory = 'quant' | 'portfolio';

export function QuizzesTab({ entitled = false }: { entitled?: boolean }) {
  const [category, setCategory] = useState<QuizCategory>('quant');
  const [quizDate] = useState(() => new Date());
  const quantQuestions = dailyLearningQuestions(quizDate, entitled);

  return (
    <section aria-labelledby="quizzes-heading" className="space-y-6">
      <h2 id="quizzes-heading" className="text-2xl font-bold text-amber-200">Quizzes · Skill-Checks</h2>
      <p className="text-slate-300">Zwei Kategorien: Quant & Trader Skill-Check und Portfolio-Risiko. Alle Inhalte sind didaktisch, synthetisch und keine Anlageberatung.</p>

      <div role="tablist" aria-label="Quiz-Kategorien" className="flex gap-2 border-b border-slate-700">
        <button
          role="tab"
          aria-selected={category === 'quant'}
          aria-controls="panel-quant"
          id="tab-quant"
          type="button"
          onClick={() => setCategory('quant')}
          className={`min-h-11 px-4 py-2 text-sm font-medium ${category === 'quant' ? 'border-b-2 border-amber-400 text-amber-200' : 'text-slate-400'}`}
        >
          Quant & Trader
        </button>
        <button
          role="tab"
          aria-selected={category === 'portfolio'}
          aria-controls="panel-portfolio"
          id="tab-portfolio"
          type="button"
          onClick={() => setCategory('portfolio')}
          className={`min-h-11 px-4 py-2 text-sm font-medium ${category === 'portfolio' ? 'border-b-2 border-amber-400 text-amber-200' : 'text-slate-400'}`}
        >
          Portfolio-Risiko
        </button>
      </div>

      <div
        role="tabpanel"
        id="panel-quant"
        aria-labelledby="tab-quant"
        hidden={category !== 'quant'}
        className="space-y-4"
      >
        <h3 className="text-lg font-semibold text-amber-100">Quant & Trader Skill-Check</h3>
        <p className="text-sm text-slate-400">Tägliche Fragen aus dem öffentlichen Lernbestand. {entitled ? 'Vollzugang' : 'Eingeschränkt'}.</p>
        {/* Existing quiz rendering logic can be inlined or reused here */}
        <div className="rounded border border-slate-700 p-4 text-sm text-slate-300">
          {quantQuestions.length} Fragen verfügbar. Bestehende Logik aus LearningPortalPage wird hier integriert.
        </div>
      </div>

      <div
        role="tabpanel"
        id="panel-portfolio"
        aria-labelledby="tab-portfolio"
        hidden={category !== 'portfolio'}
        className="space-y-4"
      >
        <h3 className="text-lg font-semibold text-amber-100">Portfolio-Risiko Quiz</h3>
        <PortfolioRiskQuiz />
      </div>
    </section>
  );
}
