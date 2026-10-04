export const PLAN_CAPABILITIES = Object.freeze({
  free: Object.freeze({ repositoryScan: true, obligationReport: false, prGate: false, evidenceHistory: false, policyProfiles: false, auditExport: false, api: false }),
  pro: Object.freeze({ repositoryScan: true, obligationReport: true, prGate: false, evidenceHistory: false, policyProfiles: false, auditExport: false, api: false }),
  team: Object.freeze({ repositoryScan: true, obligationReport: true, prGate: true, evidenceHistory: true, policyProfiles: false, auditExport: true, api: false }),
  enterprise: Object.freeze({ repositoryScan: true, obligationReport: true, prGate: true, evidenceHistory: true, policyProfiles: true, auditExport: true, api: true }),
});

export function normalizePlanName(name) {
  return String(name ?? 'free').trim().toLowerCase();
}

export function entitlementForSubscription(subscription) {
  const plan = normalizePlanName(subscription?.marketplace_purchase?.plan?.name ?? subscription?.plan?.name ?? 'free');
  return { plan: PLAN_CAPABILITIES[plan] ? plan : 'free', capabilities: PLAN_CAPABILITIES[plan] ?? PLAN_CAPABILITIES.free };
}
