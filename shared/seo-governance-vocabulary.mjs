/** SEO projection of the canonical governance vocabulary. Non-authorizing and non-access-controlling. */
import { ARCHITECTURE_GOVERNANCE_VOCABULARY } from './architecture-governance-vocabulary.mjs';

const CATEGORY_SEARCH_CONTEXT = Object.freeze({
  DELIVERY_GOVERNANCE: ['enterprise governance', 'governance architecture', 'controlled execution'],
  SECURITY_COMPLIANCE: ['trust infrastructure', 'security governance', 'evidence first'],
  PLATFORM_ARCHITECTURE: ['enterprise technology', 'control plane', 'platform architecture'],
  DATA_EVIDENCE: ['evidence architecture', 'data provenance', 'verifiable evidence'],
  AI_MODELS: ['agent architecture', 'ai orchestration', 'controlled ai workflow'],
  PRODUCT_UX: ['enterprise product experience'],
  MOBILE_RUNTIME: ['runtime architecture'],
});

function unique(values) {
  return [...new Set(values.filter(Boolean).map(value => String(value).trim()).filter(Boolean))];
}

/**
 * Search facets are derived from the canonical vocabulary. They never decide INDEX/NOINDEX,
 * skill visibility, authorization or subscription entitlement.
 */
export const SEO_GOVERNANCE_VOCABULARY = Object.freeze(
  ARCHITECTURE_GOVERNANCE_VOCABULARY.map(term => Object.freeze({
    id: term.id,
    term: term.term,
    category: term.category,
    level: term.level,
    description: term.shortDefinition,
    aliases: Object.freeze(unique(term.thesaurus ?? [])),
    keywords: Object.freeze(unique([
      term.term,
      ...(term.searchTags ?? []),
      ...(term.thesaurus ?? []),
      ...(CATEGORY_SEARCH_CONTEXT[term.category] ?? []),
    ])),
    searchable: true,
  })),
);

export function seoGovernanceVocabularyForId(id) {
  return SEO_GOVERNANCE_VOCABULARY.find(term => term.id === id) ?? null;
}

export function searchSeoGovernanceVocabulary(query) {
  const needle = String(query ?? '').trim().toLocaleLowerCase('de-DE');
  if (!needle) return SEO_GOVERNANCE_VOCABULARY;
  return SEO_GOVERNANCE_VOCABULARY.filter(term =>
    [term.term, term.description, term.category, term.level, ...term.aliases, ...term.keywords]
      .some(value => String(value).toLocaleLowerCase('de-DE').includes(needle)),
  );
}
