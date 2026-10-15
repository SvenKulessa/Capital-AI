import React, { useState } from 'react';

const QUESTIONS = [
  { id: 1, question: 'Was beschreibt die modellierte Portfoliovolatilität σₚ?', options: ['Nur die höchste Einzelvolatilität', 'Gewichtete Kombination aus Einzelvolatilitäten und Korrelationen', 'Den erwarteten Gewinn', 'Eine Garantie'], correct: 1, graphic: null },
  { id: 2, question: 'Wie wirken niedrige Korrelationen auf die Diversifikation?', options: ['Sie erhöhen immer das Gesamtrisiko', 'Sie können Diversifikationseffekte verstärken und σₚ senken', 'Sie haben keinen Einfluss', 'Sie garantieren Gewinne'], correct: 1, graphic: 'matrix-low' },
  { id: 3, question: 'Was passiert typischerweise in Stressphasen mit Korrelationen?', options: ['Sie fallen stark', 'Sie steigen oft an und schwächen Diversifikation', 'Sie bleiben konstant', 'Sie werden negativ'], correct: 1, graphic: null },
  { id: 4, question: 'Welche Matrix ist symmetrisch und hat 1.0 auf der Diagonale?', options: ['Korrelationsmatrix', 'Kovarianzmatrix ohne Normalisierung', 'Volatilitätsvektor', 'Gewichtungsvektor'], correct: 0, graphic: 'matrix' },
  { id: 5, question: 'Warum sind alle Beispiele im Simulator synthetisch?', options: ['Weil reale Daten verboten sind', 'Für reine didaktische Veranschaulichung ohne Prognosen', 'Weil echte Daten zu teuer sind', 'Weil das Modell ungenau ist'], correct: 1, graphic: null },
  { id: 6, question: 'Was zeigt der Side-by-Side-Vergleich im Korrelations-Labor?', options: ['Zwei echte Portfolios', 'Basis-Korrelationen vs. erhöhte Korrelationen bei gleichen Gewichten', 'Vergangene Performance', 'Zukünftige Renditen'], correct: 1, graphic: 'bars' },
  { id: 7, question: 'Welcher Wert steht auf der Diagonale einer Korrelationsmatrix?', options: ['0', '1.0', '-1', '0.5'], correct: 1, graphic: 'matrix' },
  { id: 8, question: 'Wie beeinflusst eine höhere Korrelation die modellierte σₚ bei positiv gewichteten Assets?', options: ['Sie senkt sie immer', 'Sie kann sie erhöhen, weil Diversifikation abnimmt', 'Kein Einfluss', 'Sie macht sie negativ'], correct: 1, graphic: null },
  { id: 9, question: 'Was ist eine positive Korrelation?', options: ['Assets bewegen sich gegenläufig', 'Assets bewegen sich tendenziell gleichgerichtet', 'Keine Beziehung', 'Immer Gewinn'], correct: 1, graphic: null },
  { id: 10, question: 'Welche Aussage ist korrekt für das Learning Hub?', options: ['Alle Daten sind Live-Marktdaten', 'Alle Beispiele sind synthetisch und keine Anlageberatung', 'Es gibt garantierte Ergebnisse', 'Prognosen sind enthalten'], correct: 1, graphic: null },
  { id: 11, question: 'Was bedeutet σₚ im Kontext des Simulators?', options: ['Portfolio-Rendite', 'Modellierte Portfoliovolatilität', 'Einzelasset-Risiko', 'Korrelationskoeffizient'], correct: 1, graphic: null },
  { id: 12, question: 'Wie kannst du die Zusammenhänge interaktiv testen?', options: ['Nur durch Lesen', 'Im Financial Learning Simulator (Korrelations-Labor)', 'Durch echte Trades', 'In der Chartanalyse'], correct: 1, graphic: null },
  { id: 13, question: 'Was ist der Unterschied zwischen Basis- und risingCorrelations?', options: ['Zwei verschiedene Assets', 'Unterschiedliche Korrelationsannahmen für denselben Gewichtssatz', 'Vergangene vs. zukünftige Daten', 'Live vs. historisch'], correct: 1, graphic: 'bars' },
  { id: 14, question: 'Warum sollte man Korrelationen nicht isoliert betrachten?', options: ['Sie sind irrelevant', 'Weil Gewichte und Einzelvolatilitäten ebenfalls σₚ beeinflussen', 'Weil sie immer 1 sind', 'Weil sie keine Bedeutung haben'], correct: 1, graphic: null },
  { id: 15, question: 'Welches Ergebnis erwartet man bei höheren Korrelationen im Modell?', options: ['Niedrigere σₚ', 'Höhere oder gleich hohe σₚ (weniger Diversifikation)', 'Immer Gewinn', 'Keine Änderung'], correct: 1, graphic: 'bars' },
];

const PASS_THRESHOLD = 12; // 80%

export function PortfolioRiskQuiz({ coverSrc = '/learning/editorial/portfolio-risiko-cover-20261015.jpg' }: { coverSrc?: string }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(-1));
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswer = (idx: number) => {
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);
  };

  const nextQuestion = () => {
    if (current < QUESTIONS.length - 1) setCurrent(current + 1);
    else finish();
  };

  const finish = () => {
    const correct = answers.filter((a, i) => a === QUESTIONS[i].correct).length;
    setScore(correct);
    setFinished(true);
  };

  const downloadCertificate = () => {
    // Simple download trigger for the certificate image (user places the asset)
    const link = document.createElement('a');
    link.href = '/learning/editorial/learning-certificate-template.jpg'; // or generated
    link.download = 'Capital-AI-Learning-Certificate.jpg';
    link.click();
    // Optional: mark badge locally
    try { localStorage.setItem('capital-ai-learning-badge-portfolio-risk', 'true'); } catch {}
  };

  if (finished) {
    const passed = score >= PASS_THRESHOLD;
    return (
      <div className="space-y-4 rounded-2xl border border-amber-400/30 bg-slate-950 p-6">
        <h2 className="text-2xl font-bold text-amber-200">Quiz abgeschlossen</h2>
        <p className="text-slate-300">Ergebnis: {score} / {QUESTIONS.length} ({Math.round(score / QUESTIONS.length * 100)} %)</p>
        {passed ? (
          <>
            <p className="text-emerald-300">Bestanden! Du kannst das Zertifikat / Badge herunterladen.</p>
            <button type="button" onClick={downloadCertificate} className="min-h-11 rounded-lg bg-amber-400 px-4 text-black font-bold">Zertifikat herunterladen</button>
            <p className="text-xs text-slate-400">Das Badge erscheint nach Speicherung im Profil (clientseitig vorbereitet).</p>
          </>
        ) : (
          <p className="text-amber-200">Nicht bestanden. Versuche es erneut oder übe im Korrelations-Labor.</p>
        )}
        <button type="button" onClick={() => { setCurrent(0); setAnswers(Array(QUESTIONS.length).fill(-1)); setFinished(false); }} className="min-h-11 rounded-lg border border-amber-400/50 px-4 text-amber-200">Nochmal versuchen</button>
      </div>
    );
  }

  const q = QUESTIONS[current];
  return (
    <div className="space-y-4 rounded-2xl border border-amber-400/30 bg-slate-950 p-6">
      <img src={coverSrc} alt="Portfolio-Risiko Quiz Cover" className="mb-4 w-full rounded-lg object-cover" />
      <h2 className="text-xl font-bold text-amber-200">Portfolio-Risiko Quiz · Frage {current + 1} / {QUESTIONS.length}</h2>
      <p className="text-slate-300">{q.question}</p>
      {q.graphic && <div className="my-3 rounded border border-slate-700 p-3 text-xs text-slate-400">[Grafische Aufgabe: {q.graphic === 'matrix' ? 'Korrelationsmatrix' : 'Volatilitätsbalken'} – siehe Simulator]</div>}
      <div className="grid gap-2">
        {q.options.map((opt, i) => (
          <button key={i} type="button" onClick={() => handleAnswer(i)} className={`min-h-11 rounded-lg border p-3 text-left ${answers[current] === i ? 'border-amber-400 bg-amber-400/20' : 'border-slate-600'}`}>
            {opt}
          </button>
        ))}
      </div>
      <button type="button" disabled={answers[current] === -1} onClick={nextQuestion} className="min-h-11 rounded-lg bg-amber-400 px-4 text-black font-bold disabled:opacity-50">
        {current === QUESTIONS.length - 1 ? 'Abschließen' : 'Weiter'}
      </button>
    </div>
  );
}
