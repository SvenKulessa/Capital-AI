export const VOCABULARY_OFFER = {
  sku: 'market-vocabulary',
  badgeId: 'vocabulary' as const,
  productId: 'prod_VNTsrtlf2ZL8ja',
  priceId: 'price_1UMiuIPKr4joNbEclpn8AwFW',
  amountCents: 1900,
  currency: 'eur',
  taxBehavior: 'inclusive',
  includedIn: ['pro', 'enterprise'],
  name: 'Market Vocabulary',
} as const;

export const VOCABULARY_GRANT_KEY = 'capital-ai-vocabulary-grant';
export const VOCABULARY_QUIZ_USED_KEY = 'capital-ai-vocabulary-quiz-used-v1';

export function formatVocabularyPrice() {
  return (VOCABULARY_OFFER.amountCents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}