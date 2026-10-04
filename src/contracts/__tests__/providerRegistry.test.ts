/**
 * CAPITAL AI — PROVIDER REGISTRY & CAPABILITY CONTRACTS TEST SUITE (WP-004)
 * Validates ProviderContract, ProviderCapabilityContract, AP-003 Routing, AP-006 Budget Cap (< 40 EUR)
 */

import {
  PROVIDER_REGISTRY,
  ProviderContractSchema,
  ProviderRegistryService,
} from '../../config/providers/providerRegistry';

export function runProviderRegistryValidationSuite(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let allPassed = true;

  // Test 1: Verify all registered providers adhere to ProviderContractSchema
  const providerIds = Object.keys(PROVIDER_REGISTRY);
  results.push(`[TEST 1] Auditing ${providerIds.length} registered providers against ProviderContractSchema...`);

  for (const id of providerIds) {
    const provider = PROVIDER_REGISTRY[id];
    const parseResult = ProviderContractSchema.safeParse(provider);
    if (parseResult.success) {
      results.push(`  ✓ Provider "${provider.name}" (${provider.slug}) conforms strictly to ProviderContractSchema.`);
    } else {
      allPassed = false;
      results.push(`  ✗ Provider "${id}" schema validation failed: ${JSON.stringify(parseResult.error.format())}`);
    }
  }

  // Test 2: Open-Source/Open-Data admission blocks legacy routing (AP-003)
  results.push('[TEST 2] Verifying fail-closed Open-Source/Open-Data routing...');
  const cryptoProviders = ProviderRegistryService.getHealthyProvidersForAsset('crypto');
  const macroProviders = ProviderRegistryService.getHealthyProvidersForAsset('fixed_income');
  if (cryptoProviders.length === 0 && macroProviders.length === 0) {
    results.push('  ✓ Legacy provider metadata is not production-routable without OPEN_SOURCE_OPEN_DATA_ADMITTED.');
  } else {
    allPassed = false;
    results.push('  ✗ Non-admitted provider became production-routable.');
  }

  // Test 3: Budget Constraint & Monthly Operating Cap <= 40 EUR (AP-006)
  results.push('[TEST 3] Verifying Monthly Provider Operating Budget <= 40.00 EUR (AP-006)...');
  const budgetAudit = ProviderRegistryService.calculateTotalProviderSpendEur();
  if (budgetAudit.isWithinBudget && budgetAudit.totalMonthlySpendEur <= 40.0) {
    results.push(
      `  ✓ Provider budget compliant: ${budgetAudit.totalMonthlySpendEur.toFixed(2)} € / ${budgetAudit.budgetCapEur.toFixed(2)} € (Buffer: ${budgetAudit.remainingBudgetEur.toFixed(2)} €).`
    );
  } else {
    allPassed = false;
    results.push(
      `  ✗ Provider budget breach! Total: ${budgetAudit.totalMonthlySpendEur} € exceeds cap of ${budgetAudit.budgetCapEur} €`
    );
  }

  // Test 4: Comprehensive Audit Report Generation
  results.push('[TEST 4] Verifying Provider Audit & Alerting generation...');
  const auditReport = ProviderRegistryService.auditProviderHealthAndBudget();
  if (auditReport.totalProvidersCount >= 5 && auditReport.admittedProvidersCount === 0 &&
      auditReport.blockedProvidersCount === auditReport.totalProvidersCount &&
      auditReport.healthyCount === 0 && auditReport.averageLatencyMs === null) {
    results.push('  ✓ Audit report exposes no synthetic health/latency evidence for blocked providers.');
  } else {
    allPassed = false;
    results.push('  ✗ Audit report exposed blocked provider telemetry as productive evidence.');
  }

  return { passed: allPassed, results };
}
