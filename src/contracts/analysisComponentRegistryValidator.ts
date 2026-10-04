import { z } from 'zod';
import { AnalysisComponentRegistryEntrySchema, CANONICAL_50_COMPONENTS } from './analysisComponentRegistry';
import { AssetClassSchema } from './common';
import { AssetIdentitySchema, DataProvenanceSchema, FeatureValueSchema, ScoreResultSchema, FinalRankResultSchema } from './canonicalContracts';
import { ProviderRegistryService } from '../config/providers/providerRegistry';

// Only existing schemas resolve. Descriptive names in planned entries are not fabricated DTOs.
const contracts: Record<string, z.ZodType> = {
  AssetIdentity: AssetIdentitySchema, DataProvenance: DataProvenanceSchema, FeatureValue: FeatureValueSchema,
  ScoreResult: ScoreResultSchema, FinalRankResult: FinalRankResultSchema,
};
const providerAliases: Record<string, string> = {
  binance: 'binance_market_data',
  kraken: 'kraken_websocket',
  twelvedata: 'twelve_data_market',
  fred: 'fred_stlouis_fed',
  alchemy: 'alchemy_ethereum_rpc',
};
export interface RegistryIssue { componentId: string; code: string; reference: string; }
export function validateAnalysisComponentRegistry(entries: unknown = CANONICAL_50_COMPONENTS,
  implementedLiveFeatureIds: ReadonlySet<string> = new Set()) {
  const parsed = z.array(AnalysisComponentRegistryEntrySchema).safeParse(entries);
  const issues: RegistryIssue[] = [];
  if (!parsed.success) return { schemaValid: false, activationAllowed: false, issues: [
    { componentId: 'registry', code: 'REGISTRY_SCHEMA_INVALID', reference: parsed.error.message },
  ] };
  const ids = new Set<string>();
  const registeredProviders = new Set(
    ProviderRegistryService.getSelectableProviders().map(provider => provider.id)
  );
  const productionAdmittedProviders = new Set(
    ProviderRegistryService.getProductionAdmittedProviders().map(provider => provider.id)
  );
  if (parsed.data.length !== 50) issues.push({ componentId: 'registry', code: 'REGISTRY_COUNT_INVALID', reference: String(parsed.data.length) });
  for (const entry of parsed.data) {
    const add = (code: string, reference: string) => issues.push({ componentId: entry.componentId, code, reference });
    if (ids.has(entry.componentId)) add('DUPLICATE_COMPONENT_ID', entry.componentId);
    ids.add(entry.componentId);
    for (const ref of [...entry.inputContracts, entry.outputContract]) {
      if (!Object.hasOwn(contracts, ref)) add('CONTRACT_REFERENCE_UNRESOLVED', ref);
    }
    for (const ref of entry.providerDependencies) {
      const providerId = Object.hasOwn(providerAliases, ref) ? providerAliases[ref] : ref;
      if (!registeredProviders.has(providerId)) {
        add('PROVIDER_REFERENCE_UNRESOLVED', ref);
      } else if (!productionAdmittedProviders.has(providerId)) {
        add('PROVIDER_NOT_PRODUCTION_ADMITTED', ref);
      }
    }
    // Raw mathematical formulas alone do not establish normalized live FeatureValues or admission.
    for (const ref of entry.featureDependencies) {
      if (!implementedLiveFeatureIds.has(ref)) add('FEATURE_REFERENCE_UNRESOLVED', ref);
    }
    for (const scope of entry.assetClassScope) {
      if (!AssetClassSchema.safeParse(scope).success) add('ASSET_CLASS_UNRESOLVED', scope);
    }
    if (entry.status === 'active' && (!entry.lastValidatedAt ||
        ['unavailable', 'simulated', 'degraded'].includes(entry.provenanceMode))) {
      add('ACTIVE_COMPONENT_WITHOUT_VALIDATION', entry.componentId);
    }
    if (entry.status === 'mock' && entry.provenanceMode !== 'simulated') add('MOCK_PROVENANCE_MISMATCH', entry.componentId);
  }
  return { schemaValid: true, activationAllowed: issues.length === 0, issues };
}

// Admission is evaluated against the existing registry, never a second status catalogue.
export function componentActivationReasons(componentId: string): string[] {
  const entry = CANONICAL_50_COMPONENTS.find(item => item.componentId === componentId);
  if (!entry) return ['COMPONENT_UNREGISTERED'];
  const report = validateAnalysisComponentRegistry();
  const codes = report.issues.filter(issue => issue.componentId === componentId || issue.componentId === 'registry')
    .map(issue => issue.code);
  if (entry.status !== 'active') codes.push('COMPONENT_NOT_ACTIVE');
  return [...new Set(codes)];
}
