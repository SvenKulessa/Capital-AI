export const STRIPE_CATALOG_VERSION = '2026-10-04-vocabulary' as const;

export type BillingCycle = 'monthly' | 'annual';
export type PaidTier = 'starter' | 'pro' | 'enterprise';

export const PRICING_CATALOG = {
  starter: {
    label: 'Starter',
    productId: 'prod_VMtsmoPBqTHdww',
    monthly: { priceId: 'price_1UMA4qPKr4joNbEcvJXFWw45', amountCents: 700 },
    annual: { priceId: 'price_1UMA4wPKr4joNbEc1tgkxagi', amountCents: 7560 },
  },
  pro: {
    label: 'Pro',
    productId: 'prod_VMtsNeuSad0Dvx',
    monthly: { priceId: 'price_1UMA4yPKr4joNbEckWSj3cJE', amountCents: 2900 },
    annual: { priceId: 'price_1UMA50PKr4joNbEcrj0Lm79I', amountCents: 24800 },
  },
  enterprise: {
    label: 'Enterprise',
    productId: 'prod_VMtsvVRz0nORcx',
    monthly: { priceId: 'price_1UMA51PKr4joNbEcbtWNCcCc', amountCents: 10900 },
    annual: { priceId: 'price_1UMA53PKr4joNbEc3E3XyzgG', amountCents: 128000 },
  },
} as const;

export const VOCABULARY_PRICE = {
  label: 'Market Vocabulary',
  productId: 'prod_VNTsrtlf2ZL8ja',
  priceId: 'price_1UMiuIPKr4joNbEclpn8AwFW',
  amountCents: 1900,
  taxBehavior: 'inclusive',
} as const;

export function annualDiscountPercent(tier: PaidTier) {
  const item = PRICING_CATALOG[tier];
  const fullYear = item.monthly.amountCents * 12;
  return Math.round((1 - item.annual.amountCents / fullYear) * 1000) / 10;
}

export function displayPriceEur(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
