import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';

/** Public navigation model. No synthetic lesson counts or learner metrics. */
export const LEARNING_UNIVERSE_ATOMS = Object.freeze([
  { id: 'aktien', label: 'Aktien', summary: 'Unternehmen, Börsen und Bewertungen', target: 'glossar', color: BRAND_COLORS.blue },
  { id: 'krypto', label: 'Krypto', summary: 'Blockchain, Begriffe und Chancen', target: 'glossar', color: BRAND_COLORS.gold },
  { id: 'makro', label: 'Makro', summary: 'Zinsen, Inflation und Wirtschaft', target: 'guides', color: BRAND_COLORS.cyan },
  { id: 'risiko', label: 'Risiko', summary: 'Risiken erkennen und verstehen', target: 'quizzes', color: BRAND_COLORS.rose },
  { id: 'portfolios', label: 'Portfolios', summary: 'Diversifikation und Szenarien', target: 'simulator', color: BRAND_COLORS.violet },
  { id: 'charts', label: 'Charts', summary: 'Marktmuster und Chart-Lernatlas', target: 'patterns', color: BRAND_COLORS.green },
  { id: 'ki', label: 'KI', summary: 'Modelle, Daten und Einordnung', target: 'news', color: BRAND_COLORS.pink },
]);

export function filterLearningUniverseAtoms(query) {
  const needle = String(query ?? '').trim().toLocaleLowerCase('de');
  if (!needle) return LEARNING_UNIVERSE_ATOMS;
  return LEARNING_UNIVERSE_ATOMS.filter(atom =>
    (atom.label + ' ' + atom.summary).toLocaleLowerCase('de').includes(needle));
}
