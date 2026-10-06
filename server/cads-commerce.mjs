import { BENCHMARK_TIERS, benchmarkEntitlementForTier } from '../packages/benchmark-core/index.mjs';
import { BILLING_CATALOG } from './billing-catalog.mjs';
import { publicCadsMarketplaceReadiness } from './cads-marketplace.mjs';

function publicTierProjection() {
  return Object.fromEntries(Object.entries(BENCHMARK_TIERS).map(([tier, entitlement]) => [
    tier,
    {
      label: entitlement.label,
      capabilities: { ...entitlement.capabilities },
      stripeProductId: BILLING_CATALOG.tiers[tier]?.productId || null,
    },
  ]));
}

export function createCadsCommerce({ auth, env = process.env } = {}) {
  async function handle(req, res, url, json) {
    if (url.pathname === '/api/cads/commerce/readiness') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      json(res, 200, {
        schema: 'CAPITAL_AI_CADS_COMMERCE_READINESS@1',
        product: 'CADS Benchmark Engine',
        websiteBillingAuthority: 'server/billing-catalog.mjs',
        websiteEntitlementAuthority: 'public.subscriptions via auth.resolvePaidTier',
        benchmarkCapabilityAuthority: 'packages/benchmark-core/index.mjs',
        catalogVersion: BILLING_CATALOG.version,
        tiers: publicTierProjection(),
        checkoutPath: '/api/billing/subscriptions/checkout',
        benchmarkReadinessPath: '/api/benchmark/readiness',
        githubMarketplace: {
          ...publicCadsMarketplaceReadiness(env),
          billingAuthority: 'GITHUB_MARKETPLACE',
          entitlementAuthority: 'GITHUB_MARKETPLACE_API_PLUS_SUPABASE_LEDGER',
          stripeStatusAuthoritative: false,
          marketplacePurchaseLifecycleImplemented: true,
        },
        productionEligible: false,
        decisionEligible: false,
      });
      return true;
    }

    if (url.pathname !== '/api/cads/commerce/entitlement') return false;
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }

    const user = await auth?.verify?.(req, res);
    if (!user?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return true;
    }

    const tier = await auth?.resolvePaidTier?.(req, res);
    if (!tier) {
      json(res, 403, {
        error: 'paid_cads_entitlement_required',
        checkoutPath: '/api/billing/subscriptions/checkout',
      });
      return true;
    }

    let entitlement;
    try {
      entitlement = benchmarkEntitlementForTier(tier);
    } catch {
      json(res, 403, { error: 'paid_cads_entitlement_required' });
      return true;
    }

    json(res, 200, {
      schema: 'CAPITAL_AI_CADS_ENTITLEMENT@1',
      product: 'CADS Benchmark Engine',
      tier,
      label: entitlement.label,
      capabilities: { ...entitlement.capabilities },
      billingAuthority: 'STRIPE_SUBSCRIPTION',
      entitlementAuthority: 'PUBLIC_SUBSCRIPTIONS',
      marketplaceEntitlement: false,
      benchmarkEvidenceOnly: true,
      productionEligible: false,
      decisionEligible: false,
    });
    return true;
  }

  return { handle };
}
