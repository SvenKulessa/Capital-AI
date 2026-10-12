import { useState } from 'react';
import demo from '../../../shared/quant-learning-demo.json';
import { VocabularyCard } from './VocabularyCard';
import { useLearningFavorites } from './LearningFavorites';
import type { VocabularyTerm } from '../../data/vocabularyData';
export function QuantLearningDemo() {
  const favorites=useLearningFavorites();
  const [saved,setSaved]=useState(false);
  return <section aria-labelledby="quant-demo-title" className="my-6 space-y-3">
    <h2 id="quant-demo-title" className="text-xl font-bold text-amber-200">Quant-Karteikarte · kostenlose Demo</h2>
    <p className="text-base leading-7 text-slate-300">Lerne am synthetischen Beispiel, wie zeitgerechte Daten einen Backtest verbessern. Aus dem Quant-Research-Fach-Skill; keine geprüfte Anlagestrategie.</p>
    <VocabularyCard term={demo as VocabularyTerm} initialExpanded saved={favorites.ids.includes(demo.id)} pending={favorites.pending} onFavorite={id=>void favorites.toggle(id)} />
    <button type="button" disabled={favorites.pending} onClick={()=>void favorites.add(demo.id).then(ok=>setSaved(ok))} className="min-h-11 rounded-xl border border-rose-400/40 px-4 text-rose-200 focus-visible:outline-2 focus-visible:outline-amber-200">Weiß ich nicht · im Lernfeld speichern</button>
    {saved&&<p role="status" className="text-emerald-200">Die Demo-Karte wurde im privaten Lernfeld gespeichert.</p>}
    {favorites.error&&<p role="alert" className="text-rose-200">{favorites.error}</p>}
    <p className="text-sm text-slate-300">Quelle: <a className="text-cyan-200 underline" href="https://github.com/SvenKulessa/Capital-AI/pull/406" target="_blank" rel="noreferrer">PR #406 · Quant Research</a></p>
  </section>;
}
