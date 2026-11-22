import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';

// Decorative color identity is read from the canonical seven-color brand source.
export const LEARNING_EARTH_ATOMS = Object.freeze(
  Object.entries(BRAND_COLORS).map(([name, color]) => Object.freeze({ name, color }))
);

export const LEARNING_EARTH_LESSONS = Object.freeze([
  Object.freeze({
    id: 'diversifikation',
    title: 'Diversifikation',
    question: 'Was verändert eine breitere Streuung?',
    explanation: 'Die simulierte Portfoliovolatilität hängt von Gewichten, Einzelrisiken und Korrelationen ab. Streuung beseitigt kein Marktrisiko.',
  }),
  Object.freeze({
    id: 'korrelation',
    title: 'Korrelation',
    question: 'Warum können Risiken gemeinsam steigen?',
    explanation: 'Wenn sich Anlageklassen in Stressphasen ähnlicher bewegen, kann die Risikominderung durch Diversifikation kleiner ausfallen.',
  }),
  Object.freeze({
    id: 'szenario',
    title: 'Szenariovergleich',
    question: 'Wie beurteilt man eine Modellannahme?',
    explanation: 'Vergleiche synthetische Eingaben und Ergebnisse. Modellwerte sind weder Echtzeitkurse noch Renditeprognosen.',
  }),
]);

export function canStartLearningEarth({ requested, reducedMotion }) {
  return requested === true && reducedMotion === false;
}

export function learningEarthLesson(id) {
  return LEARNING_EARTH_LESSONS.find(lesson => lesson.id === id) ?? LEARNING_EARTH_LESSONS[0];
}
