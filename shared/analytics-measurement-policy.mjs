// Measurement permission is independent of search-engine indexing permission.
// Explicit public allowlist; private account, admin and document routes fail closed.
import { vocabularyMetadata } from './vocabulary-metadata.mjs';
const PUBLIC = new Set(['/', '/learning', '/vocabulary', '/pricing', '/blueprints', '/checkout/confirmation', '/blog', '/faq', '/lizenz', '/datenprovider-lizenzen', '/opensource-lizenzen', '/impressum', '/datenschutz', '/agb']);
export function isAnalyticsMeasurable(path) {
  if (typeof path !== 'string' || /[?#%\\]/.test(path)) return false;
  return PUBLIC.has(path) || ['/blog/barrierefreie-finanzcharts', '/blog/datenkonzept-blueprint', '/blog/screener-scoring-lernen', '/blog/x-api-expansions-kosten'].includes(path) ||
    (path.startsWith('/vocabulary/') && !path.startsWith('/vocabulary/capital-') && vocabularyMetadata.some(term => path === '/vocabulary/' + term.id));
}
