import React from 'react';
import { VOCABULARY_TERMS, type VocabularyTerm } from '../data/vocabularyData';
import { VocabularyCard } from '../features/learning/VocabularyCard';
import { useLearningFavorites } from '../features/learning/LearningFavorites';
export function VocabularyFlashcards({onNavigate,terms:suppliedTerms,entitled=false}: {onNavigate:(path:string)=>void;terms?:VocabularyTerm[];entitled?:boolean}) {
 const favorites=useLearningFavorites();
 const terms=(suppliedTerms??VOCABULARY_TERMS).slice(0,entitled?undefined:5);
 return <section aria-labelledby="learning-vocabulary-title" className="space-y-5" data-design-profile="CAPITAL_AI_VOCABULARY_FLASHCARD@2">
   <div><h2 id="learning-vocabulary-title" className="text-2xl font-bold text-amber-200">Mein Vocabulary-Karteikasten</h2>
   <p className="mt-2 text-sm leading-7 text-slate-300">{entitled?'Alle verfügbaren Begriffe in deinem Lernzugang.':'Kostenlos: fünf feste Wörter. Learning Portal schaltet den vollständigen Karteikasten frei.'} Kategorie-Farben helfen beim Einordnen. Decke die Definition per Button auf und speichere wichtige Begriffe mit dem Stern.</p></div>
   {favorites.error&&<p role="alert" className="text-sm text-rose-200">{favorites.error}</p>}
   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{terms.map(term=><VocabularyCard key={term.id} term={term} flashcard saved={favorites.ids.includes(term.id)} pending={favorites.pending} onFavorite={id=>void favorites.toggle(id)}/>)}</div>
   <button type="button" onClick={()=>onNavigate('/learning?tab=glossar')} className="min-h-11 rounded-xl border border-amber-400/30 px-4 text-sm text-amber-200">Zum Glossar</button>
 </section>;
}
