/**
 * CADS GitHub Marketplace capability packaging.
 *
 * The Marketplace channel reuses the canonical BENCHMARK_TIERS capability authority.
 * Paid plan IDs and USD prices are GitHub Marketplace authorities, not inferred from
 * website Stripe products.
 */
export type CadsMarketplaceTier = 'starter' | 'pro' | 'enterprise';

export type CadsMarketplaceCapability = {
  id:
    | 'decision-report'
    | 'evidence-export'
    | 'evidence-history'
    | 'policy-profiles'
    | 'organization-governance'
    | 'api-access';
  customerValue: string;
  includedIn: readonly CadsMarketplaceTier[];
  requires: readonly string[];
};

export const CADS_MARKETPLACE_CAPABILITIES = [
  {
    id: 'decision-report',
    customerValue: 'Versionierter CADS-Entscheidungsreport mit Kriterien, Gewichten und Evidence-Referenzen.',
    includedIn: ['starter', 'pro', 'enterprise'],
    requires: ['CADS_PROFILE@2', 'source-bound evidence', 'customer-facing report surface'],
  },
  {
    id: 'evidence-export',
    customerValue: 'Exportierbare, prüfbare Evidence-Metadaten ohne Secrets oder Source-Code-Leakage.',
    includedIn: ['pro', 'enterprise'],
    requires: ['redaction gate', 'export schema', 'artifact/source identity'],
  },
  {
    id: 'evidence-history',
    customerValue: 'Nachvollziehbare Historie von CADS-Runs und Entscheidungen.',
    includedIn: ['pro', 'enterprise'],
    requires: ['retention policy', 'tenant isolation', 'deletion lifecycle'],
  },
  {
    id: 'policy-profiles',
    customerValue: 'Versionierte kundenspezifische Bewertungsprofile und Thresholds.',
    includedIn: ['enterprise'],
    requires: ['immutable profile version', 'weight validation', 'no rights override'],
  },
  {
    id: 'organization-governance',
    customerValue: 'Organisationsweite Governance mit erzwungenem PR-Gate und Audit-Grenzen.',
    includedIn: ['enterprise'],
    requires: ['organization identity', 'role/permission model', 'audit trail'],
  },
  {
    id: 'api-access',
    customerValue: 'Maschinenlesbarer Zugriff auf zulässige CADS-Ergebnisse und Evidence-Metadaten.',
    includedIn: ['enterprise'],
    requires: ['authenticated API', 'rate limit', 'tenant isolation', 'no-store/private cache policy'],
  },
] as const satisfies readonly CadsMarketplaceCapability[];

export const CADS_MARKETPLACE_COMMERCIAL_BOUNDARY = Object.freeze({
  productId: 'cads-app',
  target: 'PAID_PRODUCTION',
  marketplacePlans: ['starter', 'pro', 'enterprise'] as const,
  freePlanEnabled: false,
  pricingAuthority: 'GITHUB_MARKETPLACE_LISTING',
  pricingCurrency: 'USD',
  monthlyAndAnnualBillingRequired: true,
  marketplacePlanIdsRuntimeBound: true,
  purchaseLifecycleImplemented: true,
  entitlementsMayOverrideSecurity: false,
  entitlementsMayOverrideLicensing: false,
  entitlementsMayOverrideProviderRights: false,
  benchmarkPassMayGrantProduction: false,
});
