import { LEARNING_ARTICLES } from '../../data/learningArticles';
import type { VocabularyTerm } from '../../data/vocabularyData';

// Select before filtering: search/category/deep links cannot rotate the free sample.
export function freeVocabularySelection(terms: readonly VocabularyTerm[]): VocabularyTerm[] {
  // A predictable public sample of seven per original access level, diversified across categories.
  // Pick the first entry of each category before filling remaining slots. Filtering never expands access.
  const levels = [...new Set(terms.map(term => term.level))];
  return levels.flatMap(level => {
    const pool = terms.filter(term => term.level === level);
    const selected: VocabularyTerm[] = [];
    const seenCategories = new Set<string>();
    for (const term of pool) {
      if (seenCategories.has(term.category)) continue;
      seenCategories.add(term.category);
      selected.push(term);
      if (selected.length === 7) return selected;
    }
    for (const term of pool) {
      if (selected.some(item => item.id === term.id)) continue;
      selected.push(term);
      if (selected.length === 7) break;
    }
    return selected;
  });
}
export function berlinDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function dailyLearningQuestions(date: Date, entitled: boolean) {
  const bank = [
    {question:'Was beschreibt ein Bid-Ask-Spread?',options:['Die Differenz zwischen bestem Kauf- und Verkaufspreis','Die garantierte Rendite','Eine Steuerquote','Eine Modellversion'],correct:0,explanation:'Der Spread beschreibt eine Preisdifferenz. Gebühren, Markttiefe und Slippage wirken zusätzlich auf die Ausführung.'},
    {question:'Welche Angabe hilft, eine Newsquelle zeitlich einzuordnen?',options:['Die Schriftfarbe','Veröffentlichungszeit und Zeitpunkt des beschriebenen Ereignisses','Die Anzahl der Emojis','Ein Logo ohne Quelle'],correct:1,explanation:'Publikationszeit und Ereigniszeit sind getrennte Angaben. Beides gehört zur Bewertung der Aktualität.'},
    {question:'Warum reicht eine Schlagzeile nicht zur Bewertung eines Markt-Ereignisses?',options:['Schlagzeilen sind immer falsch','Jede Meldung garantiert eine Kursbewegung','Kontext, Originalquelle und Datum müssen geprüft werden','Ein Score ersetzt alle Quellen'],correct:2,explanation:'Eine Schlagzeile ist eine Zusammenfassung. Originalquelle, Zeitraum, Instrument und Unsicherheiten müssen separat geprüft werden.'},
    {question:'Was bedeutet ein RSI oberhalb von 70?',options:['Sicherer Kursrückgang','Automatischer Kaufauftrag','Kein Handelsrisiko','Eine verbreitete Momentum-Beobachtungsmarke'],correct:3,explanation:'Die Marke ist kein verlässliches eigenständiges Handelssignal. In starken Trends kann RSI längere Zeit hoch bleiben.'},
    {question:'Was unterscheidet eine Datenbeobachtung von einer Prognose?',options:['Beobachtungen dokumentieren Vergangenes; Prognosen enthalten Unsicherheit','Prognosen sind immer Beweise','Beides ist identisch','Eine Beobachtung garantiert Gewinne'],correct:0,explanation:'Daten dokumentieren beobachtete Sachverhalte. Eine Aussage über die Zukunft benötigt Annahmen und bleibt unsicher.'},
    {question:'Was passiert bei einer Preisorder durch Slippage?',options:['Der Broker entfernt alle Gebühren','Der Ausführungspreis weicht vom erwarteten Preis ab','Der Kurs wird fest garantiert','Es entsteht automatisch ein Abo'],correct:1,explanation:'Slippage kann durch Markttiefe, Volatilität oder Verzögerung entstehen. Ein angezeigter Preis ist keine Ausführungsgarantie.'},
    {question:'Welche Quelle stützt die Interpretation einer Unternehmensmeldung?',options:['Ein Screenshot ohne Datum','Ein anonymes Kursziel','Die Originalveröffentlichung mit Datum und Kontext','Ein beliebiger Kommentar'],correct:2,explanation:'Originalpublikationen und nachvollziehbare Zeitangaben erleichtern die Verifikation. Auch Primärquellen brauchen Kontext.'},
  ];
  const key=berlinDay(date);
  // Calendar-based offset gives a different first question on consecutive days.
  const offset=Math.floor(Date.parse(key+'T12:00:00Z')/86400000)%bank.length;
  const referenced = bank.map((question,index)=>({...question,reference: LEARNING_ARTICLES[index]}));
  return [...referenced.slice(offset),...referenced.slice(0,offset)].slice(0,entitled?5:1);
}
