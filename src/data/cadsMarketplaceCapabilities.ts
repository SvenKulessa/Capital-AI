/**
 * CADS Marketplace capability catalog.
 *
 * Capabilities are deliberately not assigned to paid plans here. Pricing and
 * Marketplace plan IDs are separate authorities and remain fail-closed.
 */
export type CadsMarketplaceCapability = {
  id:
    | 'decision-report'
    | 'evidence-export'
    | 'evidence-history'
    | 'policy-profiles'
    | 'organization-governance'
    | 'api-access';
  customerValue: string;
  requires: string[];
  planAssignment: 'UNASSIGNED';
};

export const CADS_MARKETPLACE_CAPABILITIES = [
  {
    id: 'decision-report',
    customerValue: 'Versionierter CADS-Entscheidungsreport mit Kriterien, Gewichten und Evidence-Referenzen.',
    requires: ['CADS_PROFILE@2', 'source-bound evidence', 'customer-facing report surface'],
    planAssignment: 'UNASSIGNED',
  },
  {
    id: 'evidence-export',
    customerValue: 'Exportierbare, prüfbare Evidence-Metadaten ohne Secrets oder Source-Code-Leakage.',
    requires: ['redaction gate', 'export schema', 'artifact/source identity'],
    planAssignment: 'UNASSIGNED',
  },
  {
    id: 'evidence-history',
    customerValue: 'Nachvollziehbare Historie von CADS-Runs und Entscheidungen.',
    requires: ['retention policy', 'tenant isolation', 'deletion lifecycle'],
    planAssignment: 'UNASSIGNED',
  },
  {
    id: 'policy-profiles',
    customerValue: 'Versionierte Bewertungsprofile für unterschiedliche Tool- und Architekturklassen.',
    requires: ['immutable profile version', 'weight validation', 'no rights override'],
    planAssignment: 'UNASSIGNED',
  },
  {
    id: 'organization-governance',
    customerValue: 'Organisationsweite Governance für CADS-Profile, Evidence und Freigabegrenzen.',
    requires: ['organization identity', 'role/permission model', 'audit trail'],
    planAssignment: 'UNASSIGNED',
  },
  {
    id: 'api-access',
    customerValue: 'Maschinenlesbarer Zugriff auf zulässige CADS-Ergebnisse und Evidence-Metadaten.',
    requires: ['authenticated API', 'rate limit', 'tenant isolation', 'no-store/private cache policy'],
    planAssignment: 'UNASSIGNED',
  },
] as const satisfies readonly CadsMarketplaceCapability[];

export const CADS_MARKETPLACE_COMMERCIAL_BOUNDARY = Object.freeze({
  productId: 'cads-app',
  pricingAssigned: false,
  marketplacePlanIdsAssigned: false,
  purchaseEnabled: false,
  entitlementsMayOverrideSecurity: false,
  entitlementsMayOverrideLicensing: false,
  entitlementsMayOverrideProviderRights: false,
});
