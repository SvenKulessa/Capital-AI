export const BLUEPRINT_DELIVERY_POLICY = {
  schemaVersion: 'CAPITAL_AI_BLUEPRINT_DELIVERY_POLICY@1',
  publicArchitectureDocumentation: true,
  publicFullSource: false,
  publicStaticDownloads: false,
  currentCommerceAdmission: false,
  requiredForDelivery: {
    authenticatedUser: true,
    privateEvidenceContext: true,
    blueprintSpecificEvidenceVerified: true,
    entitlementActive: true,
    commerceSkuAdmitted: true,
    licenseBound: true,
  },
  evidenceSemantics: {
    keyVaultVerifiedConnection: 'INPUT_EVIDENCE_ONLY',
    privateTestApiPass: 'INPUT_EVIDENCE_ONLY',
    blueprintEvidencePass: 'REQUIRED_NOT_SUFFICIENT',
    entitlementActive: 'REQUIRED_NOT_SUFFICIENT',
    commerceSkuAdmitted: 'REQUIRED_NOT_SUFFICIENT',
  },
  rule: 'Full blueprint delivery requires every requiredForDelivery gate. No single evidence signal grants delivery or Production approval.',
} as const;
