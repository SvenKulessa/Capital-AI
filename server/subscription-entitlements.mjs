import { BILLING_CATALOG } from './billing-catalog.mjs';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
const PAID_TIERS = new Set(['starter', 'pro', 'enterprise']);

const priceToTier = new Map(
  Object.entries(BILLING_CATALOG.tiers).flatMap(([tier, item]) => [
    [item.monthlyPriceId, tier],
    [item.annualPriceId, tier],
  ]),
);

function canonicalTier(value) {
  const tier = String(value || '').trim().toLowerCase();
  return PAID_TIERS.has(tier) ? tier : null;
}

function stripeMetadata(subscription) {
  const direct = subscription?.metadata;
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;
  const attrs = subscription?.attrs?.metadata;
  return attrs && typeof attrs === 'object' && !Array.isArray(attrs) ? attrs : {};
}

function stripeItems(subscription) {
  const direct = subscription?.items?.data;
  if (Array.isArray(direct)) return direct;
  const attrs = subscription?.attrs?.items?.data;
  return Array.isArray(attrs) ? attrs : [];
}

function itemPriceId(item) {
  if (typeof item?.price === 'string') return item.price;
  return typeof item?.price?.id === 'string' ? item.price.id : null;
}

export function paidTierForPriceId(priceId) {
  return priceToTier.get(String(priceId || '')) || null;
}

export function normalizeStripeSubscriptionTier(subscription) {
  const status = String(subscription?.status || subscription?.attrs?.status || '').trim().toLowerCase();
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) return null;

  const metadataTier = canonicalTier(stripeMetadata(subscription).plan_id);
  const priceTiers = [...new Set(
    stripeItems(subscription)
      .map(itemPriceId)
      .map(paidTierForPriceId)
      .filter(Boolean),
  )];

  if (priceTiers.length > 1) return null;
  const priceTier = priceTiers[0] || null;

  if (metadataTier && priceTier && metadataTier !== priceTier) return null;
  return metadataTier || priceTier || null;
}

export function normalizeStoredPaidTier(subscription) {
  const status = String(subscription?.status || '').trim().toLowerCase();
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) return null;
  return canonicalTier(subscription?.tier);
}
