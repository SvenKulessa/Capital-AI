import { useState } from 'react';

export const PORTFOLIO_RISK_QUESTIONS = [
  { question: 'Was beschreibt Diversifikation am ehesten?', options: ['Streuung auf unterschiedliche Risiken', 'Garantierter Gewinn', 'Nur ein Wertpapier halten'], correct: 0, explanation: 'Streuung kann Konzentrationsrisiken begrenzen, aber Verluste nicht ausschließen.' },
  { question: 'Was bedeutet Volatilität?', options: ['Garantierter Ertrag', 'Schwankungsintensität', 'Auszahlungstermin'], correct: 1, explanation: 'Volatilität misst die Streuung von Renditen, nicht den schlimmsten möglichen Verlust.' },
  { question: 'Warum ist Liquidität relevant?', options: ['Sie verhindert Kursverluste', 'Sie ersetzt Risikomessung', 'Sie beeinflusst die Handelbarkeit'], correct: 2, explanation: 'Bei geringer Liquidität können Spreads und Ausführungskosten steigen.' },
  { question: 'Was ist ein Drawdown?', options: ['Ein Rückgang von einem vorherigen Hoch', 'Ein Gebührenrabatt', 'Eine feste Dividende'], correct: 0, explanation: 'Ein Drawdown beschreibt den Rückgang vom bisherigen Höchststand.' },
  { question: 'Welches Risiko erhöht ein stark konzentriertes Portfolio?', options: ['Währungsstabilität', 'Einzeltitelrisiko', 'Garantierte Streuung'], correct: 1, explanation: 'Hohe Einzelgewichtungen machen das Gesamtportfolio von wenigen Positionen abhängig.' },
  { question: 'Was ist ein Liquiditätspuffer?', options: ['Eine feste Aktienquote', 'Ein Risikoscore', 'Für kurzfristige Zahlungen verfügbare Mittel'], correct: 2, explanation: 'Ein Puffer reduziert den Druck, bei ungünstigen Preisen Positionen zu verkaufen.' },
  { question: 'Was ist ein Rebalancing?', options: ['Rückführung auf Zielgewichte', 'Garantierte Kurserholung', 'Wegfall der Handelskosten'], correct: 0, explanation: 'Rebalancing kann Zielrisiken stabilisieren, verursacht jedoch gegebenenfalls Gebühren und Steuern.' },
  { question: 'Was beschreibt Korrelation?', options: ['Die absolute Rendite', 'Den statistischen Gleichlauf', 'Die regulatorische Zulassung'], correct: 1, explanation: 'Korrelation beschreibt gemeinsame Bewegungen, die sich in Stressphasen ändern können.' },
  { question: 'Was passiert mit Anleihekursen häufig, wenn Marktzinsen steigen?', options: ['Sie steigen immer', 'Sie ändern sich nie', 'Sie fallen häufig'], correct: 2, explanation: 'Bei sonst gleichen Bedingungen verlieren bestehende niedrig verzinste Anleihen relativ an Wert.' },
  { question: 'Was ist ein Währungsrisiko?', options: ['Wertänderung durch Wechselkurse', 'Ein fixierter Gewinn', 'Ein ausgeschlossener Verlust'], correct: 0, explanation: 'Auch ein unveränderter Auslandswert kann in der Heimatwährung schwanken.' },
  { question: 'Was ist ein Stressszenario?', options: ['Eine Renditezusage', 'Eine hypothetische ungünstige Marktlage', 'Ein Kaufauftrag'], correct: 1, explanation: 'Szenarien helfen, Verlustpfade zu betrachten; sie sind keine exakten Prognosen.' },
  { question: 'Warum ist die Datenhistorie wichtig?', options: ['Sie garantiert Erträge', 'Sie beseitigt Modellfehler', 'Sie begrenzt die Aussagekraft von Schätzungen'], correct: 2, explanation: 'Kurze oder verzerrte Stichproben können Kennzahlen und Risiken falsch darstellen.' },
  { question: 'Was bedeutet ein positiver Backtest?', options: ['Ein historisches Simulationsergebnis', 'Ein garantierter Live-Erfolg', 'Keine Transaktionskosten'], correct: 0, explanation: 'Vergangene simulierte Ergebnisse sind kein Nachweis künftiger Ergebnisse.' },
  { question: 'Was schützt vor Survivorship Bias?', options: ['Nur heutige Gewinner betrachten', 'Auch historische Ausfälle berücksichtigen', 'Verlustwerte löschen'], correct: 1, explanation: 'Historische Ausfälle müssen in der Grundgesamtheit verbleiben.' },
  { question: 'Was ist die wichtigste Grenze eines Lern-Scores?', options: ['Er ist eine verbindliche Empfehlung', 'Er ersetzt Beratung', 'Er zeigt nur den Wissensstand im Test'], correct: 2, explanation: 'Ein Quiz-Badge ist kein formaler Kompetenz-, Beratungs- oder Zertifizierungsnachweis.' },
] as const;

export function portfolioRiskScore(answers: Readonly<Record<number, number>>): number {
  return PORTFOLIO_RISK_QUESTIONS.reduce((sum, item, index) => sum + (answers[index] === item.correct ? 1 : 0), 0);
}

export function PortfolioRiskQuiz() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const count = Object.keys(answers).length;
  const score = portfolioRiskScore(answers);
  return (
    <section className="space-y-5 rounded-xl border border-slate-700 p-4" aria-labelledby="portfolio-quiz-title">
      <h3 id="portfolio-quiz-title" className="text-xl font-bold text-amber-200">Portfolio-Risiko · Lernquiz</h3>
      <p className="text-sm text-slate-300">15 Fragen mit synthetischen Lernsituationen. Antworten werden nur während dieses Quiz im Browserzustand gehalten, nicht an einen Anbieter gesendet.</p>
      <p role="status" className="text-sm text-slate-300">{count} von {PORTFOLIO_RISK_QUESTIONS.length} Fragen beantwortet.</p>
      <form onSubmit={event => { event.preventDefault(); if (count === PORTFOLIO_RISK_QUESTIONS.length) setSubmitted(true); }} className="space-y-5">
        {PORTFOLIO_RISK_QUESTIONS.map((item, index) => (
          <fieldset key={index} disabled={submitted} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-100">{index + 1}. {item.question}</legend>
            <div className="mt-3 space-y-2">
              {item.options.map((option, optionIndex) => (
                <label key={optionIndex} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-white/5">
                  <input type="radio" name={'risk-' + index} checked={answers[index] === optionIndex}
                    onChange={() => setAnswers(previous => ({ ...previous, [index]: optionIndex }))}
                    className="h-4 w-4 accent-amber-400" />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {submitted && <p className="mt-3 text-sm text-amber-100">
              {answers[index] === item.correct ? 'Richtig. ' : 'Korrekte Antwort: ' + item.options[item.correct] + '. '}
              {item.explanation}
            </p>}
          </fieldset>
        ))}
        {!submitted ? (
          <button type="submit" disabled={count !== PORTFOLIO_RISK_QUESTIONS.length}
            className="min-h-11 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
            Antworten auswerten
          </button>
        ) : (
          <div role="status" className="space-y-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-5">
            <p className="text-xl font-bold text-amber-200">{score} / {PORTFOLIO_RISK_QUESTIONS.length} richtig</p>
            {score >= 12 && <p className="font-semibold text-emerald-200">Lernabzeichen: Portfolio-Risiko verstanden</p>}
            <p className="text-sm text-slate-200">Dieses Lernabzeichen ist kein offiziell anerkanntes Zertifikat und keine Anlageberatung.</p>
            <button type="button" onClick={() => { setAnswers({}); setSubmitted(false); }}
              className="min-h-11 rounded-xl border border-amber-300 px-4 py-2 text-amber-100">Erneut üben</button>
          </div>
        )}
      </form>
    </section>
  );
}
