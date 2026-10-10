export const VOCABULARY_OFFER = {
  sku: 'learning-portal',
  amountCents: 2500,
  currency: 'eur',
  taxBehavior: 'inclusive',
  name: 'Learning Portal',
} as const;

export const VOCABULARY_GRANT_KEY = 'capital-ai-vocabulary-grant';
export const VOCABULARY_QUIZ_USED_KEY = 'capital-ai-vocabulary-quiz-used-v1';

export function formatVocabularyPrice() {
  return (VOCABULARY_OFFER.amountCents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}
