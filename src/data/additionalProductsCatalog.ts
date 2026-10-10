import { VOCABULARY_OFFER } from './vocabularyOffer';

export type AdditionalProductCatalogItem = {
  id: string;
  label: string;
  state: 'available';
  billing: 'one_time' | 'subscription';
  amountCents: number;
  badgeAsset: string;
  badgeLicense: string;
  entitlement: string;
  productPath: string;
};

export const ADDITIONAL_PRODUCTS_CATALOG = [
  {
    id: 'market-vocabulary',
    label: VOCABULARY_OFFER.name,
    state: 'available',
    billing: 'one_time',
    amountCents: VOCABULARY_OFFER.amountCents,
    badgeAsset: new URL('../../CAPITAL-AI-PRODUCT/badge.svg', import.meta.url).href,
    badgeLicense: 'LicenseRef-CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-1.0',
    entitlement: 'capital-ai-vocabulary',
    productPath: '/learning',
  },
] as const satisfies readonly AdditionalProductCatalogItem[];
