import { ARCHITECTURE_GOVERNANCE_VOCABULARY } from './architecture-governance-vocabulary.mjs';

export const ENTERPRISE_SEO_LEVELS = Object.freeze({
  L0: 'Foundation',
  L1: 'Practitioner',
  L2: 'Professional',
  L3: 'Enterprise',
});

export const ENTERPRISE_SEO_CATEGORIES = Object.freeze([
  'enterprise-technology',
  'control-plane',
  'trust-infrastructure',
  'evidence',
  'market-intelligence',
  'platform-runtime',
  'product-experience',
  'growth-seo',
]);

const explicitTerms = [
  ['enterprise-technology', 'CAPITAL-AI Enterprise Technology', ['Enterprise Technology'], 'L0', 'enterprise-technology', 'GROWTH', 'Übergeordneter Begriff für das enterprise-orientierte CAPITAL-AI-Technologiesystem.', ['capital ai enterprise technology', 'enterprise ai architecture'], ['PUBLIC', 'DEVELOPER', 'STUDIO', 'BUSINESS', 'ENTERPRISE']],
  ['control-plane', 'Control Plane', ['CAPITAL-AI Control Plane'], 'L2', 'control-plane', 'PLATFORM', 'Koordinations- und Entscheidungsarchitektur für Tenant-Kontext, Policy, Entitlements, Zustand, Limits, Evidence und geschützte Wirkungen.', ['ai control plane', 'enterprise control plane'], ['STUDIO', 'BUSINESS', 'ENTERPRISE']],
  ['trust-infrastructure', 'Trust Infrastructure', ['CAPITAL-AI Trust Infrastructure'], 'L2', 'trust-infrastructure', 'TRUST', 'Querschnittliche Security-, Provenance-, Rechte-, Evidence- und Fail-Closed-Fähigkeiten.', ['ai trust infrastructure', 'enterprise trust infrastructure'], ['STUDIO', 'BUSINESS', 'ENTERPRISE']],
  ['evidence-first', 'Evidence-First', ['evidence-bound architecture'], 'L1', 'evidence', 'TRUST', 'Prinzip, nach dem folgenreiche Aussagen und Zustandsübergänge an reproduzierbare Evidence ihres exakten Scopes gebunden bleiben.', ['evidence first ai', 'evidence bound architecture'], ['DEVELOPER', 'STUDIO', 'BUSINESS', 'ENTERPRISE']],
  ['trust-boundary', 'Trust Boundary', ['security boundary'], 'L3', 'trust-infrastructure', 'TRUST', 'Grenze, an der Identität, Tenant, Secret, Rechte, Privileg oder Produktionswirkung den Sicherheitskontext ändern.', ['ai trust boundary', 'security boundary architecture'], ['BUSINESS', 'ENTERPRISE']],
  ['runtime-readback', 'RuntimeReadback', ['runtime readback'], 'L2', 'evidence', 'PLATFORM', 'Beobachtung nach einer Aktion, die Runtime-Identität oder die extern sichtbare Wirkung einer ausgeführten Änderung prüft.', ['runtime evidence', 'deployment readback'], ['STUDIO', 'BUSINESS', 'ENTERPRISE']],
  ['canonical-market-data', 'Canonical Market Data', [], 'L1', 'market-intelligence', 'MARKET', 'Normalisierte Marktdaten, deren Provider- und Evidence-Kontext mit dem Wert geführt werden kann.', ['canonical market data', 'market data provenance'], ['DEVELOPER', 'STUDIO', 'BUSINESS', 'ENTERPRISE']],
  ['fail-closed', 'Fail-Closed', ['fail closed'], 'L2', 'trust-infrastructure', 'TRUST', 'Geschützte Wirkungen bleiben abgelehnt oder inaktiv, wenn erforderliche Autorität, Rechte oder Evidence ungeklärt sind.', ['fail closed ai', 'fail closed security'], ['STUDIO', 'BUSINESS', 'ENTERPRISE']],
].map(([id, term, aliases, level, category, domain, description, keywords, subscriptions]) => Object.freeze({
  id, term, aliases: Object.freeze(aliases), level, category, domain, description,
  keywords: Object.freeze(keywords), subscriptions: Object.freeze(subscriptions),
  searchableForAll: true, subscriptionControlsDiscovery: false,
}));

const governanceTerms = ARCHITECTURE_GOVERNANCE_VOCABULARY.map(entry => Object.freeze({
  id: entry.id,
  term: entry.term,
  aliases: Object.freeze([...entry.thesaurus]),
  level: entry.level === 'Fortgeschritten' ? 'L2' : 'L1',
  category: entry.category === 'SECURITY_COMPLIANCE' ? 'trust-infrastructure'
    : entry.category === 'DATA_EVIDENCE' ? 'evidence'
      : entry.category === 'PLATFORM_ARCHITECTURE' ? 'platform-runtime'
        : entry.category === 'DELIVERY_GOVERNANCE' ? 'control-plane'
          : 'enterprise-technology',
  domain: entry.category === 'SECURITY_COMPLIANCE' ? 'TRUST'
    : entry.category === 'DATA_EVIDENCE' ? 'MARKET'
      : entry.category === 'AI_MODELS' ? 'PRODUCT'
        : 'PLATFORM',
  description: entry.shortDefinition,
  keywords: Object.freeze([...entry.searchTags]),
  subscriptions: Object.freeze(['DEVELOPER', 'STUDIO', 'BUSINESS', 'ENTERPRISE']),
  searchableForAll: true,
  subscriptionControlsDiscovery: false,
}));

export const ENTERPRISE_SEO_TERMINOLOGY = Object.freeze([...explicitTerms, ...governanceTerms]);
export const ENTERPRISE_SEO_TERMINOLOGY_BY_ID = new Map(ENTERPRISE_SEO_TERMINOLOGY.map(entry => [entry.id, entry]));

export function searchEnterpriseTerminology(query) {
  const needle = String(query ?? '').trim().toLocaleLowerCase('de-DE');
  if (!needle) return ENTERPRISE_SEO_TERMINOLOGY;
  return ENTERPRISE_SEO_TERMINOLOGY.filter(entry => [entry.term, entry.category, entry.domain, entry.description, ...entry.aliases, ...entry.keywords]
    .some(value => String(value).toLocaleLowerCase('de-DE').includes(needle)));
}

export function subscriptionsForEnterpriseTerm(id) {
  return ENTERPRISE_SEO_TERMINOLOGY_BY_ID.get(id)?.subscriptions ?? Object.freeze([]);
}

export function validateEnterpriseSeoTerminology() {
  const errors = [];
  const ids = new Set();
  const normalizedTerms = new Set();
  const levels = new Set(Object.keys(ENTERPRISE_SEO_LEVELS));
  const categories = new Set(ENTERPRISE_SEO_CATEGORIES);
  const domains = new Set(['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH']);
  for (const entry of ENTERPRISE_SEO_TERMINOLOGY) {
    const normalized = entry.term.trim().toLocaleLowerCase('de-DE');
    if (!entry.id || ids.has(entry.id)) errors.push(`${entry.id || '<missing>'}: duplicate or missing id`);
    if (!normalized || normalizedTerms.has(normalized)) errors.push(`${entry.id}: duplicate or missing term`);
    if (!levels.has(entry.level)) errors.push(`${entry.id}: invalid level`);
    if (!categories.has(entry.category)) errors.push(`${entry.id}: invalid category`);
    if (!domains.has(entry.domain)) errors.push(`${entry.id}: invalid domain`);
    if (entry.searchableForAll !== true) errors.push(`${entry.id}: terminology must remain searchable for all`);
    if (entry.subscriptionControlsDiscovery !== false) errors.push(`${entry.id}: subscription must not control discovery`);
    if (!entry.description || !entry.keywords.length) errors.push(`${entry.id}: incomplete SEO projection`);
    if (!entry.subscriptions.length) errors.push(`${entry.id}: missing subscription assignment`);
    ids.add(entry.id);
    normalizedTerms.add(normalized);
  }
  return errors;
}
