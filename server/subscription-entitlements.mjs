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

  if ((subscription?.livemode ?? subscription?.attrs?.livemode) !== true) return null;
  const metadataPlan = String(stripeMetadata(subscription).plan_id || '').trim();
  const metadataTier = canonicalTier(metadataPlan);
  if (metadataPlan && !metadataTier) return null;
  const items = stripeItems(subscription);
  if (items.length !== 1) return null;
  const priceTier = paidTierForPriceId(itemPriceId(items[0]));
  if (!priceTier || (metadataTier && metadataTier !== priceTier)) return null;
  return priceTier;
}

export function normalizeStoredPaidTier(subscription) {
  const status = String(subscription?.status || '').trim().toLowerCase();
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) return null;
  return canonicalTier(subscription?.tier);
}
