export const VOCABULARY_OFFER = {
  sku: 'market-vocabulary',
  productId: 'prod_VNTsrtlf2ZL8ja',
  priceId: 'price_1UMiuIPKr4joNbEclpn8AwFW',
  amountCents: 1900,
  currency: 'eur',
  taxBehavior: 'inclusive',
  includedIn: ['pro', 'enterprise'],
  previewCount: 8,
  name: 'Market Vocabulary',
} as const;

export const VOCABULARY_GRANT_KEY = 'capital-ai-vocabulary-grant';

export function formatVocabularyPrice() {
  return (VOCABULARY_OFFER.amountCents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}
