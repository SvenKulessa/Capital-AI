import { useEffect } from 'react';
import { VOCABULARY_OFFER } from '../data/vocabularyOffer';
import { PRICING_CATALOG, type PaidTier, type BillingCycle } from '../data/pricingCatalog';
export function offerMeasurement(sku: string, name: string, amountCents: number) {
  return { currency: 'EUR', value: amountCents / 100, items: [{ item_id: sku, item_name: name, price: amountCents / 100, quantity: 1 }] };
}
export const learningMeasurement = () => offerMeasurement(VOCABULARY_OFFER.sku, VOCABULARY_OFFER.name, VOCABULARY_OFFER.amountCents);
export function subscriptionMeasurement(tier: PaidTier, cycle: BillingCycle) {
  const item = PRICING_CATALOG[tier];
  return offerMeasurement(`saas-${tier}-${cycle}`, `${item.label} (${cycle})`, item[cycle].amountCents);
}

export function useCommerceViews(payloads: unknown[]) {
  const key = JSON.stringify(payloads);
  useEffect(() => {
    const send = () => { void import('./analytics').then(({trackCommerceEvent}) => {
      for (const payload of JSON.parse(key)) void trackCommerceEvent('view_item', payload);
    }); };
    send();
    window.addEventListener('capital-ai:analytics-ready', send);
    return () => window.removeEventListener('capital-ai:analytics-ready', send);
  }, [key]);
}
