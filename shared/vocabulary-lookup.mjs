import { vocabularyMetadata } from './vocabulary-metadata.mjs';

export const normalizeVocabularySearch = value => String(value ?? '').normalize('NFKC')
  .toLocaleLowerCase('de-DE').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const additionalAliases = new Map([
  ['finance-voc-docmin-0006', ['Telemetrie', 'Telemetry', 'Betriebsdatenerfassung']],
]);
const catalog = new Map(vocabularyMetadata.map(entry => [entry.id, entry]));
const aliasesFor = entry => [entry.term, ...(entry.thesaurus || []), ...(entry.searchTags || []),
  ...(additionalAliases.get(entry.id) || [])];
const index = vocabularyMetadata.map(entry => ({entry, aliases:aliasesFor(entry)
  .map(raw => ({raw, normalized:normalizeVocabularySearch(raw)})).filter(alias => alias.normalized.length >= 2)}));

/** One search contract for Hub, modal and flashcards; punctuation and aliases are normalized. */
export function matchesVocabularySearch(term, query) {
  const wanted = normalizeVocabularySearch(query);
  if (!wanted) return true;
  const metadata = catalog.get(term.id) || term;
  return [term.term,term.abbreviation,term.shortDefinition,term.description,term.detailedExplanation,
    term.formulaOrRule,term.categoryLabel,term.category,...aliasesFor(term),...aliasesFor(metadata)]
    .filter(Boolean).some(value => normalizeVocabularySearch(value).includes(wanted));
}

/** Exact phrase boundaries for answers; search substrings never become answer evidence. */
export function lookupVocabulary(question, {limit=6}={}) {
  const original = String(question ?? '').slice(0,50000);
  const query = normalizeVocabularySearch(original);
  if (!query) return [];
  const originalTokens = original.split(/[^\p{L}\p{N}]+/u);
  const bounded = ' '+query+' ';
  return index.map(({entry,aliases},position) => {
    const matches=aliases.filter(alias => bounded.includes(' '+alias.normalized+' ')
      && (alias.normalized.length>=3 || query===alias.normalized || originalTokens.includes(alias.raw)));
    const score=Math.max(0,...matches.map(alias => alias.normalized===query ? 1000 : alias.normalized.length));
    return {entry,score,position};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.position-b.position)
    .slice(0, Math.max(0,Math.min(50,Number.isFinite(limit)?Math.floor(limit):6)))
    .map(({entry})=>({id:entry.id,term:entry.term,definition:entry.description,
      category:entry.category,level:entry.level??null,thesaurus:entry.thesaurus,path:entry.path}));
}
export function contentVocabularyContext(text) {
  return {catalogCount:vocabularyMetadata.length,terms:lookupVocabulary(text,{limit:12})};
}
